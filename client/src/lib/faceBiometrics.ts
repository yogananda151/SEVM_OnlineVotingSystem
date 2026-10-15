/**
 * Utilities for Biometric Face Enrollment and Verification using Laptop Built-In Camera:
 * - Multi-device candidate probing (automatically skips disconnected virtual cameras like Smart Connect)
 * - Prioritized physical camera selection (Qualcomm Spectra, Integrated, Built-in, Front)
 * - Callback ref & auto-play synchronization
 * - Accurate Lenovo / Windows & browser permission diagnostics
 * - High quality image file upload to base64 processing
 * - Procedural sample face generation for offline demo fallback
 */

export interface CameraErrorInfo {
  title: string;
  message: string;
  actionHint: string;
}
export const CameraErrorInfo = {};

export interface CameraDeviceOption {
  deviceId: string;
  label: string;
  isVirtual: boolean;
  isBuiltIn: boolean;
}
export const CameraDeviceOption = {};

/**
 * Returns all video input devices sorted with real physical cameras first and
 * disconnected virtual cameras (Smart Connect, OBS, etc.) last.
 */
export async function getAvailableCameraDevices(): Promise<CameraDeviceOption[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((d) => d.kind === 'videoinput');

    const mapped = videoInputs.map((d, index) => {
      const label = d.label || '';
      const isVirtual = /smart\s*connect|readyfor|obs|virtual|droidcam|iriun|vysor/i.test(label);
      const isBuiltIn = /qualcomm|spectra|integrated|internal|built-in|laptop|front|hd\s*webcam/i.test(label);
      return {
        deviceId: d.deviceId,
        label: label || `Camera ${index + 1}`,
        isVirtual,
        isBuiltIn,
      };
    });

    // If labels are still empty/generic (before permission granted in Chromium),
    // reverse so that physical hardware cameras (device 1+) are probed before virtual ROOT devices (device 0)
    const hasRealLabels = mapped.some((m) => m.label && !m.label.startsWith('Camera '));
    if (!hasRealLabels && mapped.length > 1) {
      return mapped.reverse();
    }

    return mapped.sort((a, b) => {
      // Physical cameras first, virtual cameras last
      if (a.isVirtual && !b.isVirtual) return 1;
      if (!a.isVirtual && b.isVirtual) return -1;
      // Prioritize Qualcomm / Spectra / Integrated / Front cameras
      if (a.isBuiltIn && !b.isBuiltIn) return -1;
      if (!a.isBuiltIn && b.isBuiltIn) return 1;
      return 0;
    });
  } catch (err) {
    console.warn('Could not enumerate video devices:', err);
    return [];
  }
}

export interface StreamResult {
  stream: MediaStream;
  deviceId: string;
  label: string;
}

/**
 * Robustly acquires a stream from the physical laptop camera.
 * Bypasses disconnected virtual cameras (like Smart Connect) and probes
 * candidate hardware cameras with multiple constraint shapes.
 */
export async function getWebcamStream(preferredDeviceId?: string): Promise<StreamResult> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('NOT_SUPPORTED');
  }

  // Helper to test opening a video stream with different constraint configurations
  const tryOpenStream = async (constraints: MediaStreamConstraints): Promise<MediaStream | null> => {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      return null;
    }
  };

  // 1. If preferred device ID is explicitly requested, test it
  if (preferredDeviceId) {
    const stream =
      (await tryOpenStream({ video: { deviceId: { exact: preferredDeviceId } }, audio: false })) ||
      (await tryOpenStream({ video: { deviceId: preferredDeviceId }, audio: false })) ||
      (await tryOpenStream({ video: { deviceId: preferredDeviceId, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }));

    if (stream) {
      const track = stream.getVideoTracks()[0];
      return {
        stream,
        deviceId: preferredDeviceId,
        label: track?.label || 'Selected Camera',
      };
    }
  }

  // 2. Discover candidate cameras
  const devices = await getAvailableCameraDevices();

  // 3. Probe each candidate camera with lenient constraints (avoiding strict 640x480 that fails on Qualcomm Spectra)
  for (const device of devices) {
    if (device.isVirtual && devices.length > 1) {
      continue; // Skip known virtual cameras like ReadyFor / Smart Connect
    }

    // Try without resolution restrictions first (allows driver native resolution e.g. 1080p/720p)
    let s: MediaStream | null = null;
    if (device.deviceId) {
      s = await tryOpenStream({ video: { deviceId: { exact: device.deviceId } }, audio: false });
      if (!s) {
        s = await tryOpenStream({ video: { deviceId: device.deviceId }, audio: false });
      }
      if (!s) {
        s = await tryOpenStream({ video: { deviceId: device.deviceId, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      }
      if (!s) {
        s = await tryOpenStream({ video: { deviceId: device.deviceId, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      }
    }

    if (s) {
      const track = s.getVideoTracks()[0];
      return {
        stream: s,
        deviceId: device.deviceId,
        label: track?.label || device.label || 'Laptop Built-in Camera',
      };
    }
  }

  // 4. Try user-facing camera without resolution constraints
  const facingStream =
    (await tryOpenStream({ video: { facingMode: 'user' }, audio: false })) ||
    (await tryOpenStream({ video: { facingMode: { ideal: 'user' } }, audio: false }));

  if (facingStream) {
    const track = facingStream.getVideoTracks()[0];
    return {
      stream: facingStream,
      deviceId: track?.getSettings()?.deviceId || '',
      label: track?.label || 'Laptop Camera',
    };
  }

  // 5. Bare video constraint fallback
  const bareStream = (await tryOpenStream({ video: true, audio: false })) || (await tryOpenStream({ video: {}, audio: false }));
  if (bareStream) {
    const track = bareStream.getVideoTracks()[0];
    return {
      stream: bareStream,
      deviceId: track?.getSettings()?.deviceId || '',
      label: track?.label || 'Laptop Camera',
    };
  }

  // If all failed, throw a detailed error
  const err = new Error('NOT_READABLE');
  err.name = 'NotReadableError';
  throw err;
}

/**
 * Translates DOMExceptions into actionable, friendly guidance.
 */
export function getFriendlyCameraErrorMessage(err: any): CameraErrorInfo {
  const errName = err?.name || '';
  const errMsg = err?.message || '';

  if (errMsg === 'NOT_SUPPORTED' || (typeof window !== 'undefined' && !window.isSecureContext)) {
    return {
      title: 'Insecure Context / Browser Restriction',
      message: 'Camera access requires a secure origin (http://localhost:5173 or HTTPS).',
      actionHint: 'Please make sure you are accessing the app via http://localhost:5173 in Google Chrome or Microsoft Edge.',
    };
  }

  if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
    return {
      title: 'Laptop Camera Permission Blocked',
      message: 'Your browser or Windows has blocked access to your laptop camera.',
      actionHint: '1) Click the lock (🔒) or tune icon next to http://localhost:5173 in the address bar -> Turn Camera ON. 2) In Windows Settings > Privacy & security > Camera, ensure "Let apps access your camera" is ON.',
    };
  }

  if (errName === 'NotReadableError' || errName === 'TrackStartError') {
    return {
      title: 'Laptop Camera Unavailable / Switch Closed',
      message: 'Your laptop camera hardware could not be opened or the physical privacy switch is off.',
      actionHint: '1) Lenovo Yoga switch: Check the right edge of your laptop (next to the power button) and slide the Camera E-Shutter switch to ON. 2) Press Fn+F8 or check Lenovo Vantage to turn OFF Camera Privacy Mode. 3) Or click "Upload Photo" below.',
    };
  }

  if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
    return {
      title: 'Laptop Camera Not Found',
      message: 'The system could not detect your laptop built-in camera.',
      actionHint: 'Check if your laptop has a physical privacy switch or function key (Fn+F8) that disables the camera.',
    };
  }

  if (errName === 'OverconstrainedError') {
    return {
      title: 'Camera Format Not Supported',
      message: 'Your laptop camera driver did not accept the requested resolution.',
      actionHint: 'Click Retry Camera to connect with basic resolution.',
    };
  }

  return {
    title: 'Laptop Camera Unavailable',
    message: errMsg || 'Unable to start laptop camera feed.',
    actionHint: 'Check camera permissions or verify the physical privacy switch.',
  };
}

/**
 * Validates and scales an uploaded image file to a clean, square/portrait JPEG data URL.
 */
export function processUploadedPhoto(file: File, maxDim = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (JPG, PNG, WebP).'));
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      reject(new Error('File size too large. Maximum allowed size is 12MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image data.'));
      img.onload = () => {
        let { width, height } = img;
        if (width <= 0 || height <= 0) {
          reject(new Error('Invalid image dimensions.'));
          return;
        }

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available.'));
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Procedurally generates a clean, contrast-rich facial portrait for demo fallback.
 */
export function generateSampleFace(variant: 'male' | 'female' = 'male'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const bgGrad = ctx.createLinearGradient(0, 0, 0, 320);
  if (variant === 'male') {
    bgGrad.addColorStop(0, '#e2e8f0');
    bgGrad.addColorStop(1, '#94a3b8');
  } else {
    bgGrad.addColorStop(0, '#fef2f2');
    bgGrad.addColorStop(1, '#fbcfe8');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 320, 320);

  ctx.fillStyle = variant === 'male' ? '#1e3a8a' : '#7c2d12';
  ctx.beginPath();
  ctx.ellipse(160, 310, 115, 75, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = variant === 'male' ? '#e0a97a' : '#d29668';
  ctx.fillRect(140, 185, 40, 50);

  ctx.fillStyle = variant === 'male' ? '#f5c69d' : '#e8b284';
  ctx.beginPath();
  ctx.ellipse(160, 140, 65, 80, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = variant === 'male' ? '#1e293b' : '#3d1d0c';
  ctx.beginPath();
  if (variant === 'male') {
    ctx.arc(160, 115, 68, Math.PI, 0, false);
    ctx.lineTo(228, 125);
    ctx.lineTo(220, 155);
    ctx.lineTo(205, 120);
    ctx.lineTo(160, 115);
    ctx.lineTo(115, 120);
    ctx.lineTo(100, 155);
    ctx.lineTo(92, 125);
  } else {
    ctx.arc(160, 120, 72, Math.PI * 0.9, Math.PI * 2.1, false);
    ctx.lineTo(235, 230);
    ctx.lineTo(210, 230);
    ctx.lineTo(200, 140);
    ctx.lineTo(120, 140);
    ctx.lineTo(110, 230);
    ctx.lineTo(85, 230);
  }
  ctx.fill();

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(125, 120);
  ctx.quadraticCurveTo(140, 114, 152, 120);
  ctx.moveTo(168, 120);
  ctx.quadraticCurveTo(180, 114, 195, 120);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(138, 136, 12, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(182, 136, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(138, 136, 5, 0, Math.PI * 2);
  ctx.arc(182, 136, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(136, 134, 1.5, 0, Math.PI * 2);
  ctx.arc(180, 134, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#c48b5e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(160, 134);
  ctx.lineTo(157, 160);
  ctx.lineTo(164, 160);
  ctx.stroke();

  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(160, 172, 14, 0.15 * Math.PI, 0.85 * Math.PI, false);
  ctx.stroke();

  return canvas.toDataURL('image/jpeg', 0.9);
}
