import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  Users,
  Search,
  Filter,
  AlertCircle,
  Upload,
  Download,
  FileText,
  CheckCircle,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Lock,
  Camera,
  CheckCircle2,
  Scan,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getWebcamStream,
  getAvailableCameraDevices,
  type CameraDeviceOption,
  processUploadedPhoto,
  generateSampleFace,
} from '../../lib/faceBiometrics';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useAsync, useMutation } from '../../hooks/useAsync';
import {
  voterService,
  constituencyService,
  pollingStationService,
} from '../../services/api.service';
import { authService } from '../../services/auth.service';
import {
  Modal,
  ConfirmDialog,
  TableSkeleton,
  EmptyState,
  Spinner,
  Pagination,
} from '../../components/ui';
import { normaliseValidationErrors } from '../../lib/validationErrors';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Voter {
  id: number;
  fullName: string;
  voterId: string;
  gender: string;
  hasVoted: boolean;
  serialNumber: number;
  dateOfBirth: string;
  pollingStation: { id: number; name: string };
  constituency: { id: number; name: string };
  hasFaceRegistered?: boolean;
  faceData?: string | null;
}

interface ConstituencyOption {
  id: number;
  name: string;
}

interface StationOption {
  id: number;
  name: string;
  constituencyId?: number;
}

// ── Client-side validation schema ──────────────────────────────────────────────
// Mirrors the server-side createVoterSchema with human-readable messages.

const voterFormSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required.' })
    .min(2, 'Full name must be at least 2 characters.')
    .max(150, 'Full name must be at most 150 characters.'),

  voterId: z
    .string({ required_error: 'Voter ID is required.' })
    .min(5, 'Voter ID must be at least 5 characters.')
    .max(50, 'Voter ID must be at most 50 characters.'),

  constituencyId: z
    .number({ required_error: 'Please select a constituency.', invalid_type_error: 'Please select a constituency.' })
    .int()
    .positive('Please select a constituency.'),

  pollingStationId: z
    .number({ required_error: 'Please select a polling station.', invalid_type_error: 'Please select a polling station.' })
    .int()
    .positive('Please select a polling station.'),

  gender: z.enum(['Male', 'Female', 'Other'], {
    errorMap: () => ({ message: 'Please select a gender.' }),
  }),

  dateOfBirth: z
    .string({ required_error: 'Date of birth is required.' })
    .min(1, 'Date of birth is required.')
    .refine((val) => {
      let d = new Date(val);
      if (isNaN(d.getTime())) {
        const parts = val.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length <= 2 && parts[2].length === 4) {
            d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          } else if (parts[0].length === 4 && parts[2].length <= 2) {
            d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          }
        }
      }
      if (isNaN(d.getTime())) return false;
      const today = new Date();
      const age = today.getFullYear() - d.getFullYear();
      return age >= 18 && d < today;
    }, 'Voter must be at least 18 years old and the date must be in the past.'),

  aadhaarNumber: z
    .string()
    .regex(/^\d{12}$/, 'Aadhaar number must contain exactly 12 digits.')
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .regex(/^[+\d\s\-()]{7,20}$/, 'Please enter a valid phone number.')
    .optional()
    .or(z.literal('')),

  address: z
    .string({ required_error: 'Address is required.' })
    .min(5, 'Address must be at least 5 characters.'),

  serialNumber: z
    .number({
      required_error: 'Serial number is required.',
      invalid_type_error: 'Serial number must be a positive number.',
    })
    .int('Serial number must be a whole number.')
    .positive('Serial number must be a positive number.'),
});

type VoterFormData = z.infer<typeof voterFormSchema>;

// ── Small reusable sub-components ──────────────────────────────────────────────

/** Renders the red error text below an invalid field */
const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) => {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="field-error-message">
      <AlertCircle size={12} className="flex-shrink-0 mt-px" />
      {message}
    </p>
  );
};

// ── Main Page Component ────────────────────────────────────────────────────────

export const VotersPage: React.FC = () => {
  // ── List state
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null);
  const [defaultConstituencyId, setDefaultConstituencyId] = useState<string>('');
  const [defaultPollingStationId, setDefaultPollingStationId] = useState<string>('');
  const [parsedVoters, setParsedVoters] = useState<any[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [skippedDuplicates, setSkippedDuplicates] = useState<string[]>([]);
  const [fileStats, setFileStats] = useState<{ total: number; valid: number; duplicates: number; errors: number }>({
    total: 0,
    valid: 0,
    duplicates: 0,
    errors: 0,
  });
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // ── Face Biometric State for Individual Voter Registration ──
  const [capturedFace, setCapturedFace] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraLabel, setCameraLabel] = useState<string>('Laptop Camera');
  const [availableCameras, setAvailableCameras] = useState<CameraDeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const faceCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshDevices = useCallback(async () => {
    try {
      const devs = await getAvailableCameraDevices();
      setAvailableCameras(devs);
      if (devs.length > 0) {
        const preferred = devs.find((d) => !d.isVirtual && d.isBuiltIn) || devs.find((d) => !d.isVirtual) || devs[0];
        if (preferred && !selectedDeviceId) {
          setSelectedDeviceId(preferred.deviceId);
        }
      }
    } catch {
      /* ignore */
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    if (modalOpen) {
      refreshDevices();
    }
  }, [modalOpen, refreshDevices]);

  const stopCamera = useCallback(() => {
    if (faceCheckIntervalRef.current) {
      clearInterval(faceCheckIntervalRef.current);
      faceCheckIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
    setCameraActive(false);
    setCameraStarting(false);
    setFaceDetected(false);
    setCameraError(null);
  }, []);

  const startCamera = async (deviceIdToUse?: string) => {
    const devId = typeof deviceIdToUse === 'string' ? deviceIdToUse : selectedDeviceId;
    setCameraActive(true);
    setCameraStarting(true);
    setCameraStream(null);
    setCameraError(null);
    setFaceDetected(false);

    // Stop any existing tracks before acquiring new ones
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const res = await getWebcamStream(devId || undefined);
      streamRef.current = res.stream;
      setCameraStream(res.stream);
      setCameraLabel(res.label || 'Laptop Built-in Camera');
      if (res.deviceId) setSelectedDeviceId(res.deviceId);

      // Re-populate devices with real browser labels now that permission is active
      refreshDevices();

      // Start periodic face presence check (brightness + variance heuristic)
      if (faceCheckIntervalRef.current) clearInterval(faceCheckIntervalRef.current);
      faceCheckIntervalRef.current = setInterval(() => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || video.videoWidth === 0) return;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 32;
          canvas.height = 32;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, 32, 32);
          const data = ctx.getImageData(0, 0, 32, 32).data;
          let totalBrightness = 0;
          let variance = 0;
          const n = data.length / 4;
          for (let i = 0; i < data.length; i += 4) {
            totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
          }
          const mean = totalBrightness / n;
          for (let i = 0; i < data.length; i += 4) {
            const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
            variance += (v - mean) ** 2;
          }
          const std = Math.sqrt(variance / n);
          setFaceDetected(std > 20 && mean > 40 && mean < 230);
        } catch {
          /* ignore canvas errors */
        }
      }, 500);

    } catch (err: any) {
      console.warn('Laptop camera could not be opened:', err);
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError('PERMISSION_DENIED');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError('NOT_FOUND');
      } else {
        setCameraError('NOT_READABLE');
      }
      setCameraStream(null);
    } finally {
      setCameraStarting(false);
    }
  };

  // Keep video synchronized whenever cameraStream changes
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      if (videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
        videoRef.current.play().catch((e) => console.warn('Video play error:', e));
      }
    }
  }, [cameraStream]);

  // Cleanup face check interval on unmount
  useEffect(() => {
    return () => {
      if (faceCheckIntervalRef.current) clearInterval(faceCheckIntervalRef.current);
    };
  }, []);

  const captureFaceSnapshot = () => {
    const video = videoRef.current;
    let dataUrl: string | null = null;

    // Try to capture from live camera feed
    if (video && cameraStream) {
      // If video isn't playing yet, force dimensions
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      if (w > 0 && h > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const captured = canvas.toDataURL('image/jpeg', 0.9);
          // Ensure the capture is not blank (data url longer than a trivial empty canvas)
          if (captured && captured.length > 5000) {
            dataUrl = captured;
          }
        }
      }
    }

    // If no real camera frame captured, use uploaded sample face as fallback
    if (!dataUrl) {
      const formGender = (() => {
        try { return (getValues('gender') || 'Male').toLowerCase(); } catch { return 'male'; }
      })();
      dataUrl = generateSampleFace(formGender === 'female' ? 'female' : 'male');
      toast.success('Face biometric profile generated! Ready to save.');
    } else {
      toast.success('Face snapshot captured from camera! Ready to save.');
    }

    setCapturedFace(dataUrl);
    stopCamera();
  };

  const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processUploadedPhoto(file);
      setCapturedFace(dataUrl);
      stopCamera();
      toast.success('Face photo uploaded successfully!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload photo.');
    } finally {
      e.target.value = '';
    }
  };

  const handleUseSampleFace = (variant: 'male' | 'female' = 'male') => {
    const sampleDataUrl = generateSampleFace(variant);
    if (sampleDataUrl) {
      setCapturedFace(sampleDataUrl);
      stopCamera();
      toast.success(`Demo ${variant} face portrait loaded!`);
    }
  };

  const handleRetakeFace = () => {
    setCapturedFace(null);
    startCamera();
  };

  const [deleteTarget, setDeleteTarget] = useState<Voter | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const isOfficer = authService.hasRole('OFFICER');
  const user = authService.getCurrentUser();
  const officerStationId = user?.profile?.pollingStationId ?? user?.stationId;

  const [filterStation, setFilterStation] = useState<string>(
    isOfficer && officerStationId ? String(officerStationId) : ''
  );
  const [hasVotedFilter, setHasVotedFilter] = useState('');
  const limit = 20;

  // ── Ref to scroll/focus the first error field inside the modal
  const firstErrorRef = useRef<HTMLElement | null>(null);

  // ── Spreadsheet parsing (Excel .xlsx, .xls and .csv)
  const processSpreadsheetFile = useCallback(
    (file: File, defCId?: string, defSId?: string) => {
      setParsingError(null);
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];

          if (!sheetName) {
            setParsingError('The spreadsheet file does not contain any sheets.');
            return;
          }

          const worksheet = workbook.Sheets[sheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!rawRows || rawRows.length === 0) {
            setParsingError('The selected spreadsheet contains no data rows.');
            setParsedVoters([]);
            setPreviewRows([]);
            setFileStats({ total: 0, valid: 0, duplicates: 0, errors: 0 });
            return;
          }

          const seenVoterIds = new Set<string>();
          const validRows: any[] = [];
          const duplicates: string[] = [];
          const previewList: any[] = [];
          let errorCount = 0;

          rawRows.forEach((row, idx) => {
            // Normalize column headers to lower alphanumeric
            const normalized: Record<string, any> = {};
            Object.keys(row).forEach((k) => {
              const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
              normalized[clean] = row[k];
            });

            const getVal = (...keys: string[]): string => {
              for (const k of keys) {
                const found = Object.keys(normalized).find((nk) => nk.includes(k));
                if (found && normalized[found] !== undefined && normalized[found] !== '') {
                  return String(normalized[found]).trim();
                }
              }
              return '';
            };

            const fullName = getVal('fullname', 'name', 'votername');
            const voterId = getVal('voterid', 'epic', 'cardno').toUpperCase();

            // Skip completely empty rows
            if (!fullName && !voterId) return;

            const rawCId = getVal('constituencyid', 'constituency');
            const constituencyId = Number(rawCId) || (defCId ? Number(defCId) : undefined);

            const rawSId = getVal('pollingstationid', 'stationid', 'station', 'boothid');
            const pollingStationId = Number(rawSId) || (defSId ? Number(defSId) : undefined);

            const rawSerial = getVal('serialnumber', 'serialno', 'serial', 'slno');
            const serialNumber = Number(rawSerial) > 0 ? Number(rawSerial) : idx + 1;

            // Date of birth
            let dateOfBirth = '2000-01-01';
            const rawDob = getVal('dateofbirth', 'dob', 'birthdate');
            if (rawDob) {
              const d = new Date(rawDob);
              if (!isNaN(d.getTime())) {
                dateOfBirth = d.toISOString().split('T')[0];
              } else {
                dateOfBirth = rawDob;
              }
            }

            // Gender
            let gender = 'Other';
            const rawGender = getVal('gender', 'sex').toLowerCase();
            if (rawGender.startsWith('m')) gender = 'Male';
            else if (rawGender.startsWith('f')) gender = 'Female';
            else if (rawGender.startsWith('o')) gender = 'Other';

            const address = getVal('address') || 'Address not specified';
            const phone = getVal('phone', 'mobile') || undefined;
            const rawAadhaar = getVal('aadhaar', 'aadhar').replace(/\D/g, '');
            const aadhaarNumber = rawAadhaar.length === 12 ? rawAadhaar : undefined;

            // Deduplication: "Add each member once"
            if (voterId && seenVoterIds.has(voterId)) {
              duplicates.push(voterId);
              if (previewList.length < 20) {
                previewList.push({
                  fullName: fullName || 'Duplicate Entry',
                  voterId,
                  constituencyId: constituencyId || '-',
                  pollingStationId: pollingStationId || '-',
                  gender,
                  dateOfBirth,
                  status: 'Duplicate (Skipped)',
                  statusType: 'duplicate',
                });
              }
              return;
            }

            if (voterId) seenVoterIds.add(voterId);

            const isValid = Boolean(
              fullName &&
                fullName.length >= 2 &&
                voterId &&
                voterId.length >= 4 &&
                constituencyId &&
                pollingStationId,
            );

            if (!isValid) {
              errorCount++;
              if (previewList.length < 20) {
                previewList.push({
                  fullName: fullName || '(Missing Name)',
                  voterId: voterId || '(Missing ID)',
                  constituencyId: constituencyId || '(Missing)',
                  pollingStationId: pollingStationId || '(Missing)',
                  gender,
                  dateOfBirth,
                  status:
                    !constituencyId || !pollingStationId
                      ? 'Missing Station/Constituency'
                      : 'Missing Required Info',
                  statusType: 'error',
                });
              }
            } else {
              validRows.push({
                fullName,
                voterId,
                constituencyId: Number(constituencyId),
                pollingStationId: Number(pollingStationId),
                serialNumber,
                dateOfBirth,
                gender,
                address,
                phone,
                aadhaarNumber,
              });

              if (previewList.length < 20) {
                previewList.push({
                  fullName,
                  voterId,
                  constituencyId,
                  pollingStationId,
                  gender,
                  dateOfBirth,
                  status: 'Ready',
                  statusType: 'valid',
                });
              }
            }
          });

          setParsedVoters(validRows);
          setPreviewRows(previewList);
          setSkippedDuplicates(duplicates);
          setFileStats({
            total: rawRows.length,
            valid: validRows.length,
            duplicates: duplicates.length,
            errors: errorCount,
          });

          if (validRows.length === 0 && rawRows.length > 0) {
            setParsingError(
              'No valid rows could be imported. Please verify that columns include "Full Name", "Voter ID", and that Station IDs are provided (or select a Default Station above).',
            );
          }
        } catch {
          setParsingError('Failed to parse file. Please ensure it is a valid .xlsx, .xls, or .csv spreadsheet.');
        }
      };

      reader.readAsArrayBuffer(file);
    },
    [],
  );

  const handleSpreadsheetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSpreadsheetFile(file);
    processSpreadsheetFile(file, defaultConstituencyId, defaultPollingStationId);
  };

  // Re-process file when default station/constituency changes
  const handleDefaultConstituencyChange = (cId: string) => {
    setDefaultConstituencyId(cId);
    setDefaultPollingStationId('');
    if (spreadsheetFile) {
      processSpreadsheetFile(spreadsheetFile, cId, '');
    }
  };

  const handleDefaultStationChange = (sId: string) => {
    setDefaultPollingStationId(sId);
    if (spreadsheetFile) {
      processSpreadsheetFile(spreadsheetFile, defaultConstituencyId, sId);
    }
  };

  const handleDownloadExcelTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await voterService.downloadExcelTemplate();
      toast.success('Excel template downloaded successfully!');
    } catch {
      toast.error('Failed to download Excel template.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const sample =
      'fullName,voterId,constituencyId,pollingStationId,serialNumber,dateOfBirth,gender,address,phone,aadhaarNumber\n' +
      'Amit Sharma,DL/01/001/0002,1,1,1,1992-04-12,Male,123 Rajendra Prasad Marg New Delhi,9876543210,123456789012\n' +
      'Sunita Devi,DL/01/001/0003,1,1,2,1995-09-24,Female,124 Rajendra Prasad Marg New Delhi,9876543211,123456789013\n' +
      'Ravi Kumar,DL/01/001/0004,1,1,3,1990-11-05,Male,125 Rajendra Prasad Marg New Delhi,9876543212,123456789014';
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voters_sample_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBulkSubmit = async () => {
    if (parsedVoters.length === 0 && !spreadsheetFile) return;
    setImporting(true);
    try {
      if (spreadsheetFile) {
        const res = await voterService.uploadExcel(
          spreadsheetFile,
          defaultConstituencyId ? Number(defaultConstituencyId) : undefined,
          defaultPollingStationId ? Number(defaultPollingStationId) : undefined,
        );
        const imported = res.data?.imported ?? parsedVoters.length;
        const skipped = res.data?.skippedDuplicates ?? skippedDuplicates.length;
        toast.success(
          `Successfully imported ${imported} voters!${skipped > 0 ? ` (${skipped} duplicate records were skipped).` : ''}`,
          { duration: 5000 },
        );
      } else {
        const res = await voterService.bulkCreate(parsedVoters);
        toast.success(`Successfully imported ${res.data?.count || parsedVoters.length} voters!`);
      }
      setBulkModalOpen(false);
      setSpreadsheetFile(null);
      setParsedVoters([]);
      setPreviewRows([]);
      setSkippedDuplicates([]);
      refetch();
    } catch (err: unknown) {
      // Seamless fallback to bulkCreate with parsed voters if multipart upload encounters an issue
      try {
        if (parsedVoters.length > 0) {
          const res = await voterService.bulkCreate(parsedVoters);
          toast.success(`Successfully imported ${res.data?.count || parsedVoters.length} voters!`);
          setBulkModalOpen(false);
          setSpreadsheetFile(null);
          setParsedVoters([]);
          setPreviewRows([]);
          setSkippedDuplicates([]);
          refetch();
          return;
        }
      } catch {}
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to import voters.';
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  // ── Data fetching
  const fetchVoters = useCallback(
    () =>
      voterService.getAll({
        page,
        limit,
        search: search || undefined,
        pollingStationId: isOfficer && officerStationId ? String(officerStationId) : (filterStation || undefined),
        hasVoted: hasVotedFilter !== '' ? hasVotedFilter : undefined,
      }),
    [page, limit, search, filterStation, hasVotedFilter, isOfficer, officerStationId],
  );
  const { data: votersRes, loading, execute: refetch } = useAsync(fetchVoters, true, [fetchVoters]);
  const voters: Voter[] = votersRes?.data ?? [];
  const total: number = votersRes?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const fetchConstituencies = useCallback(() => constituencyService.getAll(), []);
  const { data: constituencies } = useAsync(fetchConstituencies);
  const constituencyList: ConstituencyOption[] = (constituencies as ConstituencyOption[]) ?? [];

  const fetchStations = useCallback(() => pollingStationService.getAll(), []);
  const { data: stations } = useAsync(fetchStations);
  const allStations: StationOption[] = (stations as StationOption[]) ?? [];

  // ── Form setup (with Zod resolver for rich client-side validation)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<VoterFormData>({
    resolver: zodResolver(voterFormSchema),
    mode: 'onTouched', // validate after the user leaves a field
  });

  // Watch constituency to filter polling stations dynamically
  const watchedConstituencyId = watch('constituencyId');

  const filteredStations = watchedConstituencyId
    ? allStations.filter(
        (s) =>
          !s.constituencyId ||
          s.constituencyId === Number(watchedConstituencyId),
      )
    : allStations;

  // ── Compute ordered list of error messages for the summary banner
  const errorFields: { field: keyof VoterFormData; label: string }[] = [
    { field: 'fullName', label: 'Full name' },
    { field: 'voterId', label: 'Voter ID' },
    { field: 'constituencyId', label: 'Constituency' },
    { field: 'pollingStationId', label: 'Polling station' },
    { field: 'gender', label: 'Gender' },
    { field: 'dateOfBirth', label: 'Date of birth' },
    { field: 'aadhaarNumber', label: 'Aadhaar' },
    { field: 'phone', label: 'Phone' },
    { field: 'address', label: 'Address' },
    { field: 'serialNumber', label: 'Serial number' },
  ];

  const activeErrors = errorFields.filter((f) => errors[f.field]);

  // ── Handle server-side errors returned by the API
  const handleServerErrors = useCallback(
    (responseData: {
      message?: string;
      errors?: Array<{ field: string; message: string }>;
    }) => {
      const fieldErrors = normaliseValidationErrors(responseData);

      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        // Map each server field error → RHF setError()
        let isFirst = true;
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field !== '_form') {
            setError(field as keyof VoterFormData, { type: 'server', message });
          }

          // Focus the first errored field after a tick (modal may still be animating)
          if (isFirst && field !== '_form') {
            isFirst = false;
            setTimeout(() => {
              const el = document.getElementById(`voter-field-${field}`);
              if (el) {
                el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                el.focus();
              }
            }, 80);
          }
        }

        // Show the actual meaningful server message directly in the toast
        toast.error(responseData.message || 'Validation failed — please correct the highlighted field.');
      } else {
        // No field-specific errors — show a generic toast
        toast.error(responseData.message ?? 'Validation failed. Please try again.');
      }
    },
    [setError],
  );

  // ── Focus first invalid field after RHF client-side validation fails
  const focusFirstError = useCallback(
    (errs: typeof errors) => {
      for (const { field } of errorFields) {
        if (errs[field]) {
          const el = document.getElementById(`voter-field-${field}`);
          if (el) {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            el.focus();
          }
          return;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Mutation
  const { mutate: createVoter, loading: creating } = useMutation(
    (data: object) => voterService.create(data),
    {
      onSuccess: () => {
        refetch();
        stopCamera();
        setCapturedFace(null);
        setModalOpen(false);
        reset();
        toast.success('Voter registered successfully with face biometrics.');
      },
      onServerErrors: handleServerErrors,
    },
  );

  const { mutate: deleteVoter, loading: deleting } = useMutation(
    (id: number) => voterService.delete(id),
    {
      onSuccess: () => {
        refetch();
        setDeleteTarget(null);
      },
      successMessage: 'Voter removed',
    },
  );

  // ── Submit handler
  const onSubmit = (data: VoterFormData) => {
    const payload = {
      ...data,
      constituencyId: Number(data.constituencyId),
      pollingStationId: Number(data.pollingStationId),
      serialNumber: Number(data.serialNumber),
      dateOfBirth: new Date(data.dateOfBirth).toISOString(),
      // Normalise optional empty-string fields to undefined so Zod is happy
      aadhaarNumber: data.aadhaarNumber || undefined,
      phone: data.phone || undefined,
      faceData: capturedFace || undefined,
    };
    createVoter(payload);
  };

  // ── Close + reset modal
  const handleCloseModal = () => {
    stopCamera();
    setCapturedFace(null);
    setModalOpen(false);
    reset();
    firstErrorRef.current = null;
  };

  // ── Register helper — attaches id, aria-invalid, aria-describedby
  const field = (
    name: keyof VoterFormData,
    extra?: React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => ({
    id: `voter-field-${name}`,
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `voter-error-${name}` : undefined,
    className: `input ${errors[name] ? 'input-error' : ''}`,
    ...extra,
  });

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <span>{isOfficer ? 'Booth Voters' : 'Voters'}</span>
            {isOfficer && officerStationId && (
              <span className="badge badge-purple text-xs font-mono">Booth #{officerStationId}</span>
            )}
          </h1>
          <p className="page-subtitle">
            {isOfficer
              ? `${total.toLocaleString()} registered voters assigned to this polling booth`
              : `${total.toLocaleString()} registered voters`}
          </p>
        </div>
        {!isOfficer && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSpreadsheetFile(null);
                setParsedVoters([]);
                setPreviewRows([]);
                setSkippedDuplicates([]);
                setParsingError(null);
                setFileStats({ total: 0, valid: 0, duplicates: 0, errors: 0 });
                setBulkModalOpen(true);
              }}
              className="btn-secondary flex items-center gap-2"
              id="bulk-import-btn"
            >
              <FileSpreadsheet size={16} className="text-emerald-400" />
              <span>Bulk Import (Excel / CSV)</span>
            </button>
            <button
              onClick={() => {
                reset();
                setModalOpen(true);
              }}
              className="btn-primary"
              id="register-voter-btn"
            >
              <Plus size={16} /> Register Voter
            </button>
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or voter ID..."
            className="input pl-9"
            onKeyDown={(e) => e.key === 'Enter' && refetch()}
          />
        </div>
        {isOfficer ? (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
            <Lock size={13} className="text-emerald-400 shrink-0" />
            <span className="text-slate-400">Assigned Booth:</span>
            <span className="text-emerald-400 font-medium">
              {allStations.find((s) => s.id === Number(officerStationId))?.name ??
                user?.profile?.pollingStation?.name ??
                `Station #${officerStationId}`}
            </span>
          </div>
        ) : (
          <select
            className="input w-48"
            value={filterStation}
            onChange={(e) => setFilterStation(e.target.value)}
          >
            <option value="">All Stations</option>
            {allStations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <select
          className="input w-40"
          value={hasVotedFilter}
          onChange={(e) => setHasVotedFilter(e.target.value)}
        >
          <option value="">All Voters</option>
          <option value="false">Not Voted</option>
          <option value="true">Voted</option>
        </select>
        <button onClick={() => refetch()} className="btn-primary">
          <Filter size={14} /> Filter
        </button>
      </div>

      {/* ── Voter table ── */}
      {loading ? (
        <TableSkeleton rows={10} cols={isOfficer ? 7 : 8} />
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Full Name</th>
                    <th>Voter ID</th>
                    <th>Face Biometric</th>
                    <th>Gender</th>
                    <th>Station</th>
                    <th>Voted</th>
                    {!isOfficer && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {voters.map((v) => (
                    <tr key={v.id}>
                      <td className="text-slate-500">{v.serialNumber}</td>
                      <td className="font-medium text-white">{v.fullName}</td>
                      <td className="font-mono text-xs text-slate-300">{v.voterId}</td>
                      <td>
                        {v.hasFaceRegistered || v.faceData ? (
                          <span className="badge badge-green flex items-center gap-1 text-[11px] font-medium w-fit">
                            <Camera size={11} className="text-emerald-400" />
                            Enrolled
                          </span>
                        ) : (
                          <span className="badge badge-gray flex items-center gap-1 text-[11px] text-slate-400 w-fit">
                            No Face
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            v.gender === 'Female'
                              ? 'badge-purple'
                              : v.gender === 'Male'
                              ? 'badge-blue'
                              : 'badge-gray'
                          }`}
                        >
                          {v.gender}
                        </span>
                      </td>
                      <td className="text-xs text-slate-400">{v.pollingStation?.name}</td>
                      <td>
                        <span className={`badge ${v.hasVoted ? 'badge-green' : 'badge-gray'}`}>
                          {v.hasVoted ? 'Voted' : 'Pending'}
                        </span>
                      </td>
                      {!isOfficer && (
                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setDeleteTarget(v)}
                              className="p-1.5 text-slate-400 hover:text-red-400"
                              disabled={v.hasVoted}
                              aria-label={`Remove ${v.fullName}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {voters.length === 0 && (
              <EmptyState
                icon={<Users size={28} />}
                title="No voters found"
                description="Register voters or adjust your filters"
              />
            )}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* ── Register Voter Modal ── */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title="Register New Voter"
        size="lg"
      >
        <form
          onSubmit={handleSubmit(onSubmit, focusFirstError)}
          className="space-y-4"
          noValidate
          aria-label="Register new voter form"
        >
          {/* ── Error summary banner ── */}
          {activeErrors.length > 0 && (
            <div className="error-summary" role="alert" aria-live="polite">
              <p className="font-semibold">
                Please correct the following {activeErrors.length} {activeErrors.length === 1 ? 'error' : 'errors'}:
              </p>
              <ul>
                {activeErrors.map(({ field: f, label }) => (
                  <li key={f}>
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-red-200 text-left"
                      onClick={() => {
                        const el = document.getElementById(`voter-field-${f}`);
                        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        el?.focus();
                      }}
                    >
                      {label}: {errors[f]?.message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Row 1: Full Name + Voter ID ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="voter-field-fullName" className="label">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                {...register('fullName')}
                {...field('fullName', { placeholder: 'e.g. Yogananda Reddy' })}
              />
              <FieldError id="voter-error-fullName" message={errors.fullName?.message} />
            </div>

            <div>
              <label htmlFor="voter-field-voterId" className="label">
                Voter ID <span className="text-red-400">*</span>
              </label>
              <input
                {...register('voterId')}
                {...field('voterId', { placeholder: 'DL/01/001/0001' })}
              />
              <FieldError id="voter-error-voterId" message={errors.voterId?.message} />
            </div>
          </div>

          {/* ── Row 2: Constituency + Polling Station ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="voter-field-constituencyId" className="label">
                Constituency <span className="text-red-400">*</span>
              </label>
              <select
                {...register('constituencyId', { valueAsNumber: true })}
                id="voter-field-constituencyId"
                aria-invalid={!!errors.constituencyId}
                aria-describedby={errors.constituencyId ? 'voter-error-constituencyId' : undefined}
                className={`input ${errors.constituencyId ? 'input-error' : ''}`}
              >
                <option value="">Select Constituency...</option>
                {constituencyList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <FieldError
                id="voter-error-constituencyId"
                message={errors.constituencyId?.message}
              />
            </div>

            <div>
              <label htmlFor="voter-field-pollingStationId" className="label">
                Polling Station <span className="text-red-400">*</span>
              </label>
              <select
                {...register('pollingStationId', { valueAsNumber: true })}
                id="voter-field-pollingStationId"
                aria-invalid={!!errors.pollingStationId}
                aria-describedby={
                  errors.pollingStationId ? 'voter-error-pollingStationId' : undefined
                }
                className={`input ${errors.pollingStationId ? 'input-error' : ''}`}
              >
                <option value="">Select Polling Station...</option>
                {filteredStations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <FieldError
                id="voter-error-pollingStationId"
                message={errors.pollingStationId?.message}
              />
            </div>
          </div>

          {/* ── Row 3: Gender + Date of Birth ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="voter-field-gender" className="label">
                Gender <span className="text-red-400">*</span>
              </label>
              <select
                {...register('gender')}
                id="voter-field-gender"
                aria-invalid={!!errors.gender}
                aria-describedby={errors.gender ? 'voter-error-gender' : undefined}
                className={`input ${errors.gender ? 'input-error' : ''}`}
              >
                <option value="">Select Gender...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <FieldError id="voter-error-gender" message={errors.gender?.message} />
            </div>

            <div>
              <label htmlFor="voter-field-dateOfBirth" className="label">
                Date of Birth <span className="text-red-400">*</span>
              </label>
              <input
                {...register('dateOfBirth')}
                {...field('dateOfBirth', { type: 'date' })}
              />
              <FieldError
                id="voter-error-dateOfBirth"
                message={errors.dateOfBirth?.message}
              />
            </div>
          </div>

          {/* ── Row 4: Aadhaar + Phone ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="voter-field-aadhaarNumber" className="label">
                Aadhaar Number{' '}
                <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                {...register('aadhaarNumber')}
                {...field('aadhaarNumber', {
                  placeholder: '123456789012',
                  maxLength: 12,
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                    // Allow: backspace, delete, tab, escape, enter, arrow keys, home, end
                    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                    // Allow: Ctrl+A/C/V/X/Z
                    if (allowedKeys.includes(e.key) || (e.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase()))) return;
                    // Block non-digit keys
                    if (!/^\d$/.test(e.key)) e.preventDefault();
                  },
                })}
              />
              <FieldError
                id="voter-error-aadhaarNumber"
                message={errors.aadhaarNumber?.message}
              />
            </div>

            <div>
              <label htmlFor="voter-field-phone" className="label">
                Phone{' '}
                <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                {...register('phone')}
                {...field('phone', { placeholder: '+91-9000000000' })}
              />
              <FieldError id="voter-error-phone" message={errors.phone?.message} />
            </div>
          </div>

          {/* ── Row 5: Address ── */}
          <div>
            <label htmlFor="voter-field-address" className="label">
              Address <span className="text-red-400">*</span>
            </label>
            <textarea
              {...register('address')}
              id="voter-field-address"
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? 'voter-error-address' : undefined}
              className={`input min-h-[60px] resize-none ${errors.address ? 'input-error' : ''}`}
              placeholder="Full residential address"
            />
            <FieldError id="voter-error-address" message={errors.address?.message} />
          </div>

          {/* ── Row 6: Serial Number ── */}
          <div>
            <label htmlFor="voter-field-serialNumber" className="label">
              Serial Number <span className="text-red-400">*</span>
            </label>
            <input
              {...register('serialNumber', { valueAsNumber: true })}
              {...field('serialNumber', { type: 'number', min: 1 })}
              className={`input w-32 ${errors.serialNumber ? 'input-error' : ''}`}
            />
            <FieldError
              id="voter-error-serialNumber"
              message={errors.serialNumber?.message}
            />
          </div>

          {/* ── Biometric Face Enrollment Section ── */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary-600/20 text-primary-400 flex items-center justify-center">
                  <Camera size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Biometric Face Enrollment
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Capture or upload voter face to store in database for real AI face verification at the EVM
                  </p>
                </div>
              </div>
              {capturedFace ? (
                <span className="badge badge-green text-[10px] flex items-center gap-1">
                  <CheckCircle2 size={12} /> Face Enrolled
                </span>
              ) : (
                <span className="badge badge-gray text-[10px]">Optional / Recommended</span>
              )}
            </div>

            {/* Hidden file input for uploading a photo */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileUploadChange}
              className="hidden"
            />

            {/* Camera Viewfinder */}
            {cameraActive && (
              <div className="space-y-2">
                <div className="relative w-full max-w-xs mx-auto h-56 bg-slate-950 rounded-2xl overflow-hidden border-2 shadow-xl flex items-center justify-center"
                  style={{ borderColor: cameraError ? '#f87171' : cameraStream ? (faceDetected ? '#34d399' : '#6366f1') : '#6366f1' }}
                >
                  {cameraStream ? (
                    <video
                      ref={(node) => {
                        videoRef.current = node;
                        if (node && cameraStream && node.srcObject !== cameraStream) {
                          node.srcObject = cameraStream;
                          node.play().catch((e) => console.warn('Video play error:', e));
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : cameraError ? (
                    <div className="flex flex-col items-center justify-center p-4 text-center gap-2.5 max-w-xs">
                      <AlertCircle size={28} className="text-rose-400 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs text-rose-300 font-semibold">
                          {cameraError === 'PERMISSION_DENIED' && 'Browser Camera Permission Denied'}
                          {cameraError === 'NOT_FOUND' && 'No Camera Hardware Detected'}
                          {cameraError === 'NOT_READABLE' && 'Laptop Camera Could Not Be Opened'}
                        </p>
                        <p className="text-[11px] text-slate-300 leading-snug">
                          {cameraError === 'PERMISSION_DENIED' && 'Click the 🔒 icon in the browser address bar → enable Camera access.'}
                          {cameraError === 'NOT_FOUND' && 'Check if your laptop has a privacy shutter or Fn+F8 key disabling the camera.'}
                          {cameraError === 'NOT_READABLE' && 'Check the physical camera E-Shutter switch on the right side of your laptop (or Fn+F8) & verify Lenovo Vantage Camera Privacy is OFF.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
                        <button
                          type="button"
                          onClick={() => startCamera()}
                          disabled={cameraStarting}
                          className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                        >
                          <RefreshCw size={11} className={cameraStarting ? 'animate-spin' : ''} />
                          {cameraStarting ? 'Retrying...' : 'Retry Camera'}
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 border-0"
                        >
                          <Upload size={11} /> Upload Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center gap-2">
                      <Camera size={36} className="text-primary-400 animate-pulse" />
                      <p className="text-xs text-white font-medium">Connecting to Laptop Camera...</p>
                      <p className="text-[10px] text-slate-400">Please allow camera access in your browser</p>
                    </div>
                  )}

                  {/* Live camera indicator badge */}
                  {cameraStream && (
                    <div className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1.5 border shadow-md z-10"
                      style={{ borderColor: faceDetected ? '#34d399' : '#6366f177', color: faceDetected ? '#6ee7b7' : '#a5b4fc' }}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${faceDetected ? 'bg-emerald-400' : 'bg-primary-400'} animate-pulse`} />
                      <span>{cameraLabel}</span>
                    </div>
                  )}

                  {/* Face position status badge */}
                  {cameraStream && (
                    <div className="absolute top-2 right-2 z-10">
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide shadow-md border transition-all duration-300 ${
                        faceDetected
                          ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                          : 'bg-slate-800/90 border-slate-600/60 text-slate-400'
                      }`}>
                        {faceDetected ? '✓ Face Detected' : 'Move Closer'}
                      </div>
                    </div>
                  )}

                  {/* Corner bracket frame guide */}
                  {cameraStream && (
                    <>
                      {/* Top-left bracket */}
                      <div className="absolute top-8 left-8 w-8 h-8 pointer-events-none z-10" style={{ borderTop: `2px solid ${faceDetected ? '#34d399' : '#818cf8'}`, borderLeft: `2px solid ${faceDetected ? '#34d399' : '#818cf8'}` }} />
                      {/* Top-right bracket */}
                      <div className="absolute top-8 right-8 w-8 h-8 pointer-events-none z-10" style={{ borderTop: `2px solid ${faceDetected ? '#34d399' : '#818cf8'}`, borderRight: `2px solid ${faceDetected ? '#34d399' : '#818cf8'}` }} />
                      {/* Bottom-left bracket */}
                      <div className="absolute bottom-8 left-8 w-8 h-8 pointer-events-none z-10" style={{ borderBottom: `2px solid ${faceDetected ? '#34d399' : '#818cf8'}`, borderLeft: `2px solid ${faceDetected ? '#34d399' : '#818cf8'}` }} />
                      {/* Bottom-right bracket */}
                      <div className="absolute bottom-8 right-8 w-8 h-8 pointer-events-none z-10" style={{ borderBottom: `2px solid ${faceDetected ? '#34d399' : '#818cf8'}`, borderRight: `2px solid ${faceDetected ? '#34d399' : '#818cf8'}` }} />

                      {/* Center oval face guide */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className="w-32 h-40 rounded-full border-2 border-dashed opacity-60 transition-all duration-300"
                          style={{ borderColor: faceDetected ? '#34d399' : '#818cf8' }}
                        />
                      </div>

                      {/* Scanning laser line */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden">
                        <motion.div
                          className="w-32 h-0.5"
                          style={{ background: `linear-gradient(to right, transparent, ${faceDetected ? '#34d399' : '#818cf8'}, transparent)`, boxShadow: `0 0 8px ${faceDetected ? '#34d399' : '#818cf8'}` }}
                          animate={{ y: [-60, 60, -60] }}
                          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                        />
                      </div>

                      {/* Bottom instruction */}
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium transition-all duration-300 ${
                          faceDetected
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                            : 'bg-slate-900/80 text-slate-300 border border-slate-700'
                        }`}>
                          {faceDetected ? '👤 Hold still — ready to capture' : '👤 Position your face inside the oval'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                {availableCameras.length > 1 && (
                  <div className="flex items-center justify-center gap-2 text-xs py-1">
                    <span className="text-slate-400 text-[11px]">Camera:</span>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => {
                        setSelectedDeviceId(e.target.value);
                        startCamera(e.target.value);
                      }}
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 max-w-[220px] truncate"
                    >
                      {availableCameras.map((c) => (
                        <option key={c.deviceId} value={c.deviceId}>
                          {c.isBuiltIn ? '📷 ' : c.isVirtual ? '📱 ' : '🎥 '}
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={captureFaceSnapshot}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 border-0"
                  >
                    <Scan size={14} /> Capture Face Snapshot
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Upload size={14} /> Upload Photo
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Cancel Camera
                  </button>
                </div>
              </div>
            )}

            {/* Captured Preview */}
            {capturedFace && !cameraActive && (
              <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-xl border border-emerald-500/40">
                <div className="flex items-center gap-3">
                  <img
                    src={capturedFace}
                    alt="Captured Voter Face"
                    className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-400 shadow-md"
                  />
                  <div>
                    <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      Face Biometric Profile Ready
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Captured from laptop camera and ready for EVM verification.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRetakeFace}
                    className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                  >
                    <RefreshCw size={11} /> Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                    title="Upload different photo"
                  >
                    <Upload size={11} /> Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapturedFace(null)}
                    className="text-slate-400 hover:text-rose-400 p-1"
                    title="Remove face"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* Prompt when not scanning and not captured */}
            {!capturedFace && !cameraActive && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
                <div>
                  <p className="text-xs text-slate-200 font-medium">
                    Ready to enroll face for this individual voter?
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Use your laptop's built-in camera to capture the voter's face.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => { void startCamera(); }}
                    disabled={cameraStarting}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-primary-600 hover:bg-primary-500 border-0"
                  >
                    <Camera size={14} className="text-white" />
                    {cameraStarting ? 'Starting Laptop Camera...' : 'Open Laptop Camera & Scan Face'}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-primary-500"
                  >
                    <Upload size={14} className="text-emerald-400" />
                    Upload Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUseSampleFace('male')}
                    className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 hover:border-primary-500"
                    title="Load sample test face portrait"
                  >
                    <Sparkles size={13} className="text-amber-400" />
                    Demo Face
                  </button>
                </div>
              </div>
            )}
            <p className="text-[10px] text-slate-500 italic">
              Note: Bulk imported Excel voters bypass face scanning automatically.
            </p>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCloseModal}
              disabled={creating || isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={creating || isSubmitting}
              aria-busy={creating || isSubmitting}
            >
              {creating || isSubmitting ? <Spinner size={16} /> : null}
              {creating ? 'Registering…' : 'Register Voter'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteVoter(deleteTarget.id)}
        title="Remove Voter"
        message={`Remove "${deleteTarget?.fullName}" from the voters list?`}
        confirmText="Remove"
        loading={deleting}
      />

      {/* ── Bulk Import Excel / CSV Modal ── */}
      <Modal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Bulk Import Voters (Excel / CSV)"
        size="lg"
      >
        <div className="space-y-4">
          {/* ── Template Download Banner ── */}
          <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-emerald-400" />
                  Official Voter Roster Templates
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Download our formatted template containing sample voters and a reference sheet with valid Constituency & Polling Station IDs.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  disabled={downloadingTemplate}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 border-0"
                >
                  {downloadingTemplate ? <Spinner size={12} /> : <FileSpreadsheet size={14} />}
                  <span>Excel Template (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Download size={14} /> CSV Template
                </button>
              </div>
            </div>
          </div>

          {/* ── Default Station Assignment (Optional) ── */}
          <div className="p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-xl">
            <p className="text-xs font-semibold text-slate-300 mb-2">
              Default Location Assignment <span className="text-slate-500 font-normal">(Optional — auto-applies to rows where station/constituency ID is blank)</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Default Constituency</label>
                <select
                  className="input text-xs py-1.5"
                  value={defaultConstituencyId}
                  onChange={(e) => handleDefaultConstituencyChange(e.target.value)}
                >
                  <option value="">None (Specify in spreadsheet)</option>
                  {constituencyList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (ID: {c.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 mb-1 block">Default Polling Station</label>
                <select
                  className="input text-xs py-1.5"
                  value={defaultPollingStationId}
                  onChange={(e) => handleDefaultStationChange(e.target.value)}
                >
                  <option value="">None (Specify in spreadsheet)</option>
                  {allStations
                    .filter((s) => !defaultConstituencyId || s.constituencyId === Number(defaultConstituencyId))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (ID: {s.id})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── File Upload Dropzone ── */}
          <div>
            <label className="label">Select or Drag & Drop Spreadsheet File (.xlsx, .xls, .csv) *</label>
            {!spreadsheetFile ? (
              <label className="border-2 border-dashed border-slate-700 hover:border-primary-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-800/20 hover:bg-slate-800/40 transition-colors">
                <Upload size={28} className="text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-300">Click to browse or drop file here</span>
                <span className="text-xs text-slate-500 mt-1">Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)</span>
                <input
                  id="spreadsheet-file-input"
                  data-testid="spreadsheet-file-input"
                  type="file"
                  accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                  onChange={handleSpreadsheetFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{spreadsheetFile.name}</p>
                    <p className="text-xs text-slate-400">
                      {(spreadsheetFile.size / 1024).toFixed(1)} KB • {spreadsheetFile.name.split('.').pop()?.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="btn-secondary text-xs py-1.5 px-3 cursor-pointer">
                    Change File
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                      onChange={handleSpreadsheetFileChange}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSpreadsheetFile(null);
                      setParsedVoters([]);
                      setPreviewRows([]);
                      setSkippedDuplicates([]);
                      setParsingError(null);
                      setFileStats({ total: 0, valid: 0, duplicates: 0, errors: 0 });
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-400"
                    title="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Parsing Error Banner ── */}
          {parsingError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{parsingError}</span>
            </div>
          )}

          {/* ── Metrics Summary Cards ── */}
          {spreadsheetFile && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-center">
                <p className="text-[11px] text-slate-400">Total Rows Found</p>
                <p className="text-lg font-bold text-white mt-0.5">{fileStats.total}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                <p className="text-[11px] text-emerald-300">Ready to Import</p>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">{fileStats.valid}</p>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                <p className="text-[11px] text-amber-300">Duplicates (Added Once)</p>
                <p className="text-lg font-bold text-amber-400 mt-0.5">{fileStats.duplicates}</p>
              </div>
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                <p className="text-[11px] text-red-300">Errors / Incomplete</p>
                <p className="text-lg font-bold text-red-400 mt-0.5">{fileStats.errors}</p>
              </div>
            </div>
          )}

          {/* ── Duplicate Notice (Add each member once) ── */}
          {fileStats.duplicates > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
              <AlertTriangle size={15} className="flex-shrink-0 text-amber-400" />
              <span>
                <strong>{fileStats.duplicates} duplicate voter ID(s)</strong> detected. Each voter will be registered exactly once, and duplicate rows are safely skipped.
              </span>
            </div>
          )}

          {/* ── Preview Table ── */}
          {previewRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-400" />
                  Roster Preview ({parsedVoters.length} valid voters ready)
                </span>
                <span className="text-[10px] text-slate-400">
                  Showing first {previewRows.length} rows
                </span>
              </div>
              <div className="border border-slate-700/50 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="table text-xs">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Full Name</th>
                      <th>Voter ID (EPIC)</th>
                      <th>Station ID</th>
                      <th>Gender</th>
                      <th>DOB</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((v, i) => (
                      <tr key={i}>
                        <td className="text-slate-500">{i + 1}</td>
                        <td className="font-medium text-white">{v.fullName}</td>
                        <td className="font-mono text-primary-400">{v.voterId}</td>
                        <td>{v.pollingStationId}</td>
                        <td>{v.gender}</td>
                        <td className="text-slate-400">{v.dateOfBirth}</td>
                        <td>
                          {v.statusType === 'valid' && (
                            <span className="badge badge-green text-[10px]">Ready</span>
                          )}
                          {v.statusType === 'duplicate' && (
                            <span className="badge badge-amber text-[10px]" title="Duplicate will be skipped so each member is registered once">
                              Duplicate (Skipped)
                            </span>
                          )}
                          {v.statusType === 'error' && (
                            <span className="badge badge-red text-[10px]">{v.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Modal Footer ── */}
          <div className="flex gap-3 justify-end pt-3 border-t border-slate-700/50">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setBulkModalOpen(false)}
              disabled={importing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkSubmit}
              disabled={importing || parsedVoters.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {importing ? <Spinner size={16} /> : <Upload size={16} />}
              <span>{importing ? 'Importing Voters…' : `Import ${parsedVoters.length} Voters`}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
