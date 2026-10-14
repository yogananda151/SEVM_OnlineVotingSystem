import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Vote, Shield, Scan, CheckCircle, CheckCircle2, X, RefreshCw, Clock, User, Lock,
  Camera, Fingerprint, Sparkles, AlertTriangle, Layers, KeyRound
} from 'lucide-react';
import { votingService, candidateService } from '../../services/api.service';
import { authService } from '../../services/auth.service';
import { toast } from 'react-hot-toast';
import { useCountdown } from '../../hooks/useAsync';

// ─────────────────────────────────────────────────────────────────
// Audio Synthesizer (Authentic EVM Buzzer Sound)
// ─────────────────────────────────────────────────────────────────

const playEvmBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(940, audioCtx.currentTime); // Standard EVM beep frequency
    gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.8); // 1.8-second continuous tone
  } catch {
    // Non-fatal if audio context is blocked
  }
};

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type Screen = 'welcome' | 'method' | 'verify' | 'protocol' | 'otp' | 'biometric' | 'candidates' | 'confirm' | 'vvpat';

interface VerifiedVoter {
  id: number;
  fullName: string;
  voterId: string;
  gender: string;
  pollingStationId: number;
  constituencyId: number;
  ballotToken?: string;
}

interface Candidate {
  id: number;
  fullName: string;
  serialNumber: number;
  age: number;
  photoUrl?: string;
  isIndependent: boolean;
  party?: { id: number; name: string; abbreviation: string; color: string; symbolUrl?: string };
}

interface VvpatRecord {
  candidateName: string;
  partyName: string;
  partySymbolUrl?: string;
  electionName: string;
  referenceNumber: string;
  voteHash: string;
  prevHash?: string;
  timestamp: string;
  isDigitallyInked?: boolean;
}

interface PollingStationInfo {
  id: number;
  name: string;
  code: string;
  machineStatus?: string;
  isPollingActive?: boolean;
  constituency?: { id: number; name: string } | null;
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

const EVMHeader: React.FC<{
  station?: PollingStationInfo | null;
}> = ({ station }) => {
  const isOfficer = authService.hasRole('OFFICER');

  return (
    <div className="bg-slate-900 border-b border-slate-700/50 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
          <Vote size={16} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-white leading-tight">SMART ELECTRONIC VOTING MACHINE</p>
          <p className="text-[10px] text-slate-400">
            {station ? `${station.name} (${station.code})` : 'Election Commission of India – Official System'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {isOfficer && (
          <a
            href="/officer"
            className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium bg-emerald-950/60 border border-emerald-700/40 px-2 py-0.5 rounded-lg transition-colors"
          >
            ← Officer Portal
          </a>
        )}
        {station && (
          <div
            className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-medium select-none"
            title={`Assigned to ${station.name}`}
          >
            <Lock size={10} className="text-emerald-400" />
            <span className="font-semibold text-slate-200">Booth #{station.id}</span>
            <span className="text-slate-400 font-mono text-[9px]">({station.code})</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className={`evm-led ${station?.machineStatus === 'LOCKED' ? 'evm-led-red' : station?.machineStatus === 'PAUSED' ? 'evm-led-yellow' : 'evm-led-green'}`} />
          <span className="text-[10px] text-slate-400 font-mono">{station?.machineStatus ?? 'ONLINE'}</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono hidden sm:block">{new Date().toLocaleTimeString('en-IN')}</div>
      </div>
    </div>
  );
};

const WelcomeScreen: React.FC<{
  onStart: () => void;
  station?: PollingStationInfo | null;
  allStations: PollingStationInfo[];
  onSelectStation: (id: number) => void;
  isLocked: boolean;
}> = ({ onStart, station, allStations, onSelectStation, isLocked }) => {
  const isNotActive = station && station.machineStatus && station.machineStatus !== 'ACTIVE';

  return (
    <motion.div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-600 to-blue-700 flex items-center justify-center shadow-2xl shadow-primary-900/50 mx-auto">
          <Vote size={42} className="text-white" />
        </div>
      </motion.div>
      <div>
        <h1 className="text-3xl font-black text-white leading-tight">SMART EVM</h1>
        <p className="text-base text-primary-400 font-semibold mt-0.5">Secure Electronic Voting Terminal</p>
        <p className="text-slate-400 text-xs mt-1.5 max-w-md">
          Constitutional Secret Ballot · Anti-Duplicate Locking · Cryptographic Ledger
        </p>
      </div>

      {station ? (
        <div className="flex flex-col items-center gap-1.5 max-w-lg w-full">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-md text-xs backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold shrink-0">
              <Lock size={12} className="text-emerald-400" />
              <span>{station.name}</span>
            </div>
            <span className="text-slate-400 font-mono text-[11px] bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-700/60">
              {station.code}
            </span>
            {station.constituency && (
              <span className="text-primary-300 text-[11px] font-medium border-l border-slate-700 pl-2">
                {station.constituency.name}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 flex items-center gap-1 select-none">
            <Shield size={10} className="text-primary-400" /> Authorized EVM Booth · Tamper-Evident Guard Active
          </span>
        </div>
      ) : (
        !isLocked && allStations.length > 0 && (
          <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
            <span className="text-slate-400">Initialize Booth:</span>
            <select
              value={station?.id ?? ''}
              onChange={(e) => onSelectStation(Number(e.target.value))}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              {allStations.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-800 text-white">
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        )
      )}

      {isNotActive && (
        <div className={`p-2.5 px-4 rounded-xl border text-xs flex items-center gap-2 max-w-md ${
          station?.machineStatus === 'CLOSED'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            {station?.machineStatus === 'CLOSED'
              ? 'Election is closed or concluded for this booth. The EVM terminal is permanently sealed.'
              : `Machine is currently ${station?.machineStatus ?? 'INACTIVE'}. Awaiting Presiding Officer activation.`}
          </span>
        </div>
      )}

      <motion.button
        onClick={onStart}
        disabled={isNotActive}
        className={`px-12 py-3.5 text-white text-base font-bold rounded-2xl shadow-2xl transition-all ${
          isNotActive
            ? 'bg-slate-700 opacity-50 cursor-not-allowed'
            : 'bg-gradient-to-r from-primary-600 to-blue-600 shadow-primary-900/50 hover:opacity-95'
        }`}
        whileTap={isNotActive ? {} : { scale: 0.97 }}
        whileHover={isNotActive ? {} : { scale: 1.02 }}
      >
        BEGIN VOTING PROCESS
      </motion.button>
      <p className="text-[11px] text-slate-500">Touch screen or click to proceed</p>
    </motion.div>
  );
};

const MethodScreen: React.FC<{
  onSelectAadhaar: () => void;
  onSelectVoterId: () => void;
}> = ({ onSelectAadhaar, onSelectVoterId }) => (
  <motion.div className="flex flex-col items-center justify-center h-full gap-8 px-8"
    initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white">Step 1: Identify Registered Voter</h2>
      <p className="text-slate-400 mt-2 text-sm">Select your official identity document</p>
    </div>
    <div className="grid grid-cols-2 gap-6 w-full max-w-md">
      <motion.button onClick={onSelectVoterId} whileTap={{ scale: 0.96 }}
        className="flex flex-col items-center gap-4 p-8 bg-slate-800/80 border-2 border-slate-600 rounded-2xl hover:border-emerald-500 hover:bg-emerald-600/10 transition-all duration-200">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 flex items-center justify-center">
          <Shield size={32} className="text-emerald-400" />
        </div>
        <div>
          <p className="font-bold text-white">Voter ID (EPIC)</p>
          <p className="text-xs text-slate-400 mt-0.5">Election Card Number</p>
        </div>
      </motion.button>
      <motion.button onClick={onSelectAadhaar} whileTap={{ scale: 0.96 }}
        className="flex flex-col items-center gap-4 p-8 bg-slate-800/80 border-2 border-slate-600 rounded-2xl hover:border-primary-500 hover:bg-primary-600/10 transition-all duration-200">
        <div className="w-16 h-16 rounded-2xl bg-primary-600/20 flex items-center justify-center">
          <Scan size={32} className="text-primary-400" />
        </div>
        <div>
          <p className="font-bold text-white">Aadhaar Card</p>
          <p className="text-xs text-slate-400 mt-0.5">12-digit UIDAI Number</p>
        </div>
      </motion.button>
    </div>
  </motion.div>
);

const VerifyScreen: React.FC<{
  method: 'AADHAAR' | 'VOTER_ID';
  pollingStationId: number;
  onVerified: (data: { voterId: number; voterName: string; simulatedOtp: string }) => void;
  onBack: () => void;
}> = ({ method, pollingStationId, onVerified, onBack }) => {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!value.trim()) { toast.error('Please enter your details'); return; }
    setLoading(true);
    try {
      const result = await votingService.initiateVerification({
        method,
        [method === 'AADHAAR' ? 'aadhaarNumber' : 'voterId']: value,
        pollingStationId,
      });
      onVerified(result);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Verification failed');
    } finally { setLoading(false); }
  };

  return (
    <motion.div className="flex flex-col items-center justify-center h-full gap-6 px-8 max-w-md mx-auto"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">{method === 'AADHAAR' ? 'Aadhaar Verification' : 'Voter ID Verification'}</h2>
        <p className="text-slate-400 mt-1">Enter your {method === 'AADHAAR' ? '12-digit Aadhaar number' : 'Voter ID (EPIC number)'}</p>
      </div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={method === 'AADHAAR' ? '123456789012' : 'DL/01/001/0001'}
        className="input text-center text-lg tracking-widest"
        maxLength={method === 'AADHAAR' ? 12 : 20}
      />
      <div className="flex gap-4 w-full">
        <button onClick={onBack} className="btn-secondary flex-1">← Back</button>
        <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 justify-center">
          {loading ? 'Verifying...' : 'Search Electoral Roll'}
        </button>
      </div>
      <p className="text-xs text-slate-500 text-center">Electoral roll is strictly checked for active booth registration.</p>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Protocol Choice Screen (Face Liveness / Fingerprint / OTP)
// ─────────────────────────────────────────────────────────────────

const ProtocolChoiceScreen: React.FC<{
  voterName: string;
  onSelectProtocol: (protocol: 'FACE' | 'FINGERPRINT' | 'OTP') => void;
  onBack: () => void;
}> = ({ voterName, onSelectProtocol, onBack }) => (
  <motion.div className="flex flex-col items-center justify-center h-full gap-6 px-8 max-w-lg mx-auto"
    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
    <div className="text-center">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2 text-emerald-400">
        <User size={28} />
      </div>
      <h2 className="text-xl font-bold text-white">Voter Match: {voterName}</h2>
      <p className="text-slate-400 text-xs mt-1">Select identity authentication protocol to unlock ballot</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
      {/* Face Liveness WebCam */}
      <button
        onClick={() => onSelectProtocol('FACE')}
        className="p-4 rounded-2xl bg-slate-800/80 border-2 border-slate-700 hover:border-primary-500 hover:bg-primary-950/20 transition-all text-center flex flex-col items-center gap-2.5 group"
      >
        <div className="w-12 h-12 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Camera size={24} />
        </div>
        <div>
          <p className="font-bold text-sm text-white">Face Liveness</p>
          <p className="text-[10px] text-slate-400">WebCam AI Scan</p>
        </div>
      </button>

      {/* Biometric Fingerprint */}
      <button
        onClick={() => onSelectProtocol('FINGERPRINT')}
        className="p-4 rounded-2xl bg-slate-800/80 border-2 border-slate-700 hover:border-emerald-500 hover:bg-emerald-950/20 transition-all text-center flex flex-col items-center gap-2.5 group"
      >
        <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Fingerprint size={24} />
        </div>
        <div>
          <p className="font-bold text-sm text-white">Biometric</p>
          <p className="text-[10px] text-slate-400">Fingerprint Sensor</p>
        </div>
      </button>

      {/* Mobile OTP */}
      <button
        onClick={() => onSelectProtocol('OTP')}
        className="p-4 rounded-2xl bg-slate-800/80 border-2 border-slate-700 hover:border-amber-500 hover:bg-amber-950/20 transition-all text-center flex flex-col items-center gap-2.5 group"
      >
        <div className="w-12 h-12 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
          <KeyRound size={24} />
        </div>
        <div>
          <p className="font-bold text-sm text-white">Mobile OTP</p>
          <p className="text-[10px] text-slate-400">SMS Passcode</p>
        </div>
      </button>
    </div>

    <div className="w-full flex justify-center">
      <button onClick={onBack} className="btn-secondary px-6 text-xs">← Back to ID Input</button>
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────
// Biometric & Face Liveness WebCam Screen
// ─────────────────────────────────────────────────────────────────

const BiometricScreen: React.FC<{
  voterId: number;
  voterName: string;
  type: 'FACE' | 'FINGERPRINT';
  onVerified: (voter: VerifiedVoter, token?: string) => void;
  onBack: () => void;
}> = ({ voterId, voterName, type, onVerified, onBack }) => {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize camera for FACE type
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (type === 'FACE' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            setCameraActive(true);
          }
        })
        .catch(() => {
          setCameraActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [type]);

  const handleStartScan = async () => {
    setScanning(true);
    setScanProgress(0);

    // Progressive simulated AI liveness check
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 25;
      });
    }, 400);

    setTimeout(async () => {
      clearInterval(interval);
      setLivenessPassed(true);

      try {
        const result = await votingService.simulateBiometric(voterId, type);
        toast.success(`${type === 'FACE' ? 'Face Liveness Verified' : 'Fingerprint Matched'} ✓ Ballot Unlocked`);
        setTimeout(() => {
          onVerified(result.voter, result.ballotToken);
        }, 800);
      } catch (err: unknown) {
        toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Biometric verification failed');
        setScanning(false);
        setScanProgress(0);
      }
    }, 1800);
  };

  return (
    <motion.div className="flex flex-col items-center justify-center h-full gap-5 px-8 max-w-md mx-auto text-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div>
        <h2 className="text-xl font-bold text-white">
          {type === 'FACE' ? 'WebCam Face & Liveness Verification' : 'Biometric Fingerprint Scanner'}
        </h2>
        <p className="text-slate-400 text-xs mt-1">Authenticating: <span className="text-white font-semibold">{voterName}</span></p>
      </div>

      {type === 'FACE' ? (
        <div className="relative w-64 h-64 rounded-3xl overflow-hidden border-2 border-primary-500/50 bg-slate-950 flex items-center justify-center shadow-2xl">
          {cameraActive ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center p-4">
              <Camera size={48} className="text-primary-400 mb-2 animate-pulse" />
              <p className="text-xs text-slate-400">Live Camera Feed Active</p>
            </div>
          )}

          {/* Futuristic HUD overlay */}
          <div className="absolute inset-4 border border-dashed border-emerald-400/60 rounded-2xl pointer-events-none flex items-center justify-center">
            {scanning && (
              <motion.div
                className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                animate={{ y: [-90, 90, -90] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              />
            )}
          </div>

          {livenessPassed && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-emerald-300">
              <CheckCircle2 size={42} className="text-emerald-400 mb-2 animate-bounce" />
              <p className="font-bold text-sm">LIVENESS CONFIRMED</p>
              <p className="text-[10px] text-emerald-400">Biometric Match: 98.7%</p>
            </div>
          )}
        </div>
      ) : (
        /* Fingerprint Scanner */
        <div className="relative w-48 h-48 rounded-full border-2 border-emerald-500/40 bg-slate-800/80 flex items-center justify-center shadow-2xl overflow-hidden">
          <motion.div animate={scanning ? { scale: [1, 1.15, 1] } : {}} transition={{ repeat: Infinity, duration: 1 }}>
            <Fingerprint size={80} className={`${scanning ? 'text-emerald-400' : 'text-slate-500'}`} />
          </motion.div>
          {scanning && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-emerald-400"
              animate={{ scale: [0.8, 1.4], opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
          )}
        </div>
      )}

      {/* Status Bar */}
      <div className="w-full">
        {scanning ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{type === 'FACE' ? 'Analyzing facial landmarks & blinking...' : 'Scanning dermal ridges...'}</span>
              <span className="font-mono text-emerald-400">{scanProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${scanProgress}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            {type === 'FACE' ? 'Position face inside the frame and click verify' : 'Place finger firmly on the sensor pad'}
          </p>
        )}
      </div>

      <div className="flex gap-3 w-full">
        <button onClick={onBack} disabled={scanning} className="btn-secondary flex-1">← Cancel</button>
        <button
          onClick={handleStartScan}
          disabled={scanning || livenessPassed}
          className="btn-primary flex-1 justify-center bg-gradient-to-r from-emerald-600 to-teal-600"
        >
          {scanning ? 'Verifying...' : type === 'FACE' ? 'Start AI Scan' : 'Press Sensor'}
        </button>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────
// OTP Screen
// ─────────────────────────────────────────────────────────────────

const OTPScreen: React.FC<{
  voterId: number;
  voterName: string;
  simulatedOtp: string;
  onVerified: (voter: VerifiedVoter, token?: string) => void;
  onBack: () => void;
}> = ({ voterId, voterName, simulatedOtp, onVerified, onBack }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { remaining, start } = useCountdown(300);

  useEffect(() => { start(); }, []);

  const handleVerify = async () => {
    if (otp.length !== 6) { toast.error('Enter 6-digit OTP'); return; }
    setLoading(true);
    try {
      const result = await votingService.verifyOTP(voterId, otp);
      onVerified(result.voter, result.ballotToken);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <motion.div className="flex flex-col items-center justify-center h-full gap-5 px-8 max-w-md mx-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
          <User size={28} className="text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white">{voterName}</h2>
        <p className="text-slate-400 text-xs mt-1">Enter the 6-digit OTP sent to registered mobile</p>
      </div>

      <div className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
        <p className="text-[10px] text-amber-400 mb-0.5">🔐 SIMULATION PASSCODE</p>
        <p className="text-2xl font-bold font-mono text-amber-300 tracking-[0.4em]">{simulatedOtp}</p>
      </div>

      <input
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="Enter 6-digit OTP"
        className="input text-center text-2xl tracking-[0.4em] font-mono"
        maxLength={6}
      />

      <div className="flex items-center gap-2 text-xs">
        <Clock size={13} className="text-slate-400" />
        <span className={`font-mono ${remaining < 60 ? 'text-red-400' : 'text-slate-400'}`}>
          {mins}:{String(secs).padStart(2, '0')} remaining
        </span>
      </div>

      <div className="flex gap-4 w-full">
        <button onClick={onBack} className="btn-secondary flex-1">← Back</button>
        <button onClick={handleVerify} disabled={loading || otp.length !== 6} className="btn-primary flex-1 justify-center">
          {loading ? 'Verifying...' : 'Authorize Ballot'}
        </button>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Candidate Screen (Ballot Unit)
// ─────────────────────────────────────────────────────────────────

const CandidateScreen: React.FC<{
  candidates: Candidate[];
  voter: VerifiedVoter;
  onSelect: (candidate: Candidate) => void;
}> = ({ candidates, voter, onSelect }) => {
  const [selected, setSelected] = useState<Candidate | null>(null);

  return (
    <motion.div className="flex flex-col h-full"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="px-6 py-3.5 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Official Ballot Unit</h2>
            <p className="text-xs text-slate-400">Voter: {voter.fullName} ({voter.voterId})</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-semibold">
            <CheckCircle size={13} /> BALLOT CLEARED
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {candidates.sort((a, b) => a.serialNumber - b.serialNumber).map((candidate) => {
          const isSelected = selected?.id === candidate.id;
          return (
            <motion.button
              key={candidate.id}
              onClick={() => setSelected(candidate)}
              whileTap={{ scale: 0.99 }}
              className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                  : 'border-slate-600/50 bg-slate-800/50 hover:border-slate-500'
              }`}
            >
              {/* Serial */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-base ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                {candidate.serialNumber}
              </div>

              {/* Photo */}
              {candidate.photoUrl ? (
                <img src={candidate.photoUrl} alt={candidate.fullName} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <User size={20} className="text-slate-500" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">{candidate.fullName}</p>
                {candidate.party ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: candidate.party.color }} />
                    <p className="text-xs text-slate-300">{candidate.party.name}</p>
                    <span className="text-[10px] text-slate-500">({candidate.party.abbreviation})</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Independent</p>
                )}
              </div>

              {/* Party symbol */}
              {candidate.party?.symbolUrl ? (
                <img src={candidate.party.symbolUrl} alt={candidate.party.name} className="w-10 h-10 object-contain flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-400"
                  style={{ background: `${candidate.party?.color ?? '#64748b'}20`, border: `1px solid ${candidate.party?.color ?? '#64748b'}40` }}>
                  {candidate.party?.abbreviation ?? 'IND'}
                </div>
              )}

              {/* LED */}
              <div className={`evm-led flex-shrink-0 ${isSelected ? 'evm-led-green animate-led-blink' : 'evm-led-off'}`} />
            </motion.button>
          );
        })}
      </div>

      {/* Vote Button */}
      <div className="p-4 border-t border-slate-700/50">
        <button
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
          className={`w-full py-3.5 rounded-2xl font-bold text-base transition-all duration-200 ${
            selected
              ? 'bg-gradient-to-r from-primary-600 to-blue-600 text-white shadow-lg shadow-primary-900/30 hover:opacity-95'
              : 'bg-slate-700/50 text-slate-600 cursor-not-allowed'
          }`}
        >
          {selected ? `PRESS BLUE BUTTON TO CAST VOTE FOR ${selected.fullName.toUpperCase()}` : 'SELECT A CANDIDATE ON BALLOT'}
        </button>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Confirm Screen
// ─────────────────────────────────────────────────────────────────

const ConfirmScreen: React.FC<{
  candidate: Candidate;
  voter: VerifiedVoter;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ candidate, voter, onConfirm, onCancel, loading }) => (
  <motion.div className="flex flex-col items-center justify-center h-full gap-5 px-8 max-w-md mx-auto"
    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
    <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
      <CheckCircle size={28} />
    </div>
    <div className="text-center">
      <h2 className="text-xl font-bold text-white">Confirm Ballot Choice</h2>
      <p className="text-slate-400 text-xs mt-0.5">Under Secret Ballot Law, your choice cannot be altered once cast</p>
    </div>

    <div className="w-full p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">Candidate</span>
        <span className="font-bold text-white">{candidate.fullName}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">Party</span>
        <span className="text-white">{candidate.party?.name ?? 'Independent'}</span>
      </div>
      {candidate.party && (
        <div className="flex justify-between text-xs items-center">
          <span className="text-slate-400">Symbol</span>
          {candidate.party.symbolUrl ? (
            <img src={candidate.party.symbolUrl} alt={candidate.party.name} className="w-7 h-7 object-contain" />
          ) : (
            <span className="font-bold text-primary-400">{candidate.party.abbreviation}</span>
          )}
        </div>
      )}
    </div>

    <p className="text-xs text-amber-300/90 text-center">
      ⚠️ Machine buzzer will sound and Digital VVPAT will display for 7 seconds.
    </p>

    <div className="flex gap-4 w-full">
      <button onClick={onCancel} disabled={loading} className="btn-secondary flex-1 justify-center">
        <X size={15} /> Change
      </button>
      <button
        onClick={onConfirm}
        disabled={loading}
        className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 text-sm"
      >
        {loading ? 'Recording Ballot...' : <><CheckCircle size={16} /> Confirm & Cast</>}
      </button>
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────
// VVPAT Screen with Digital Inking & Chained Block Hash
// ─────────────────────────────────────────────────────────────────

const VVPATScreen: React.FC<{ vvpat: VvpatRecord; onDone: () => void }> = ({ vvpat, onDone }) => {
  const { remaining, start } = useCountdown(7, onDone);

  useEffect(() => {
    start();
  }, []);

  return (
    <motion.div className="flex h-full gap-6 p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Left – Confirmation & Digital Inking */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
          <CheckCircle size={40} />
        </motion.div>
        <h2 className="text-2xl font-black text-white">VOTE RECORDED & INKED!</h2>
        <p className="text-slate-400 text-xs mt-2 max-w-sm">
          Your vote has been cryptographically recorded into the election ledger. Your electoral record is now marked as voted.
        </p>

        {/* Digital Inking Stamp Badge */}
        <div className="mt-4 px-3.5 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-1.5 font-bold">
          <Sparkles size={13} className="text-emerald-400" />
          <span>DIGITALLY INKED · VOTER STATUS SEALED</span>
        </div>

        <div className="mt-5 flex items-center gap-2 text-slate-500 text-xs">
          <Clock size={14} />
          <span>EVM screen resets in <span className="font-mono text-primary-400 font-bold">{remaining}s</span></span>
        </div>
      </div>

      {/* Right – VVPAT Paper Slip Display */}
      <div className="w-72 flex-shrink-0">
        <motion.div
          className="bg-white text-gray-900 rounded-2xl p-5 shadow-2xl border border-gray-200"
          initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}>
          <div className="text-center border-b border-gray-200 pb-2.5 mb-2.5">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">DIGITAL VVPAT SLIP</p>
            <p className="text-[9px] text-gray-400">Election Commission of India</p>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Election</span>
              <span className="font-bold text-gray-900 text-right max-w-[60%] truncate">{vvpat.electionName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Candidate</span>
              <span className="font-bold text-gray-900">{vvpat.candidateName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Party</span>
              <span className="font-semibold text-gray-700">{vvpat.partyName}</span>
            </div>
            {vvpat.partySymbolUrl && (
              <div className="flex justify-center py-1.5">
                <img src={vvpat.partySymbolUrl} alt="symbol" className="w-10 h-10 object-contain" />
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 mt-2.5 pt-2.5 text-center">
            <p className="text-[9px] text-gray-500">Audit Reference Number</p>
            <p className="font-mono text-xs font-bold text-primary-700">{vvpat.referenceNumber}</p>
            <p className="text-[8px] text-gray-400 mt-0.5">{new Date(vvpat.timestamp).toLocaleString('en-IN')}</p>
          </div>

          {/* Chained Hash Verification */}
          <div className="mt-2.5 p-2 bg-gray-50 rounded text-center border border-gray-100">
            <div className="flex items-center justify-center gap-1 text-[8px] text-emerald-700 font-bold mb-0.5">
              <Layers size={9} />
              <span>CRYPTOGRAPHIC BLOCK CHAIN</span>
            </div>
            <p className="text-[7.5px] font-mono text-gray-500 break-all">{vvpat.voteHash.slice(0, 24)}...</p>
          </div>

          <div className="text-center mt-2.5 flex items-center justify-center gap-1.5 text-amber-600 text-[10px]">
            <Clock size={11} />
            <span>Visible for {remaining}s before sealed</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Main VotingMachinePage Component
// ─────────────────────────────────────────────────────────────────

export const VotingMachinePage: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [method, setMethod] = useState<'AADHAAR' | 'VOTER_ID'>('VOTER_ID');
  const [initData, setInitData] = useState<{ voterId: number; voterName: string; simulatedOtp: string } | null>(null);
  const [selectedBioType, setSelectedBioType] = useState<'FACE' | 'FINGERPRINT'>('FACE');
  const [voter, setVoter] = useState<VerifiedVoter | null>(null);
  const [ballotToken, setBallotToken] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [vvpatData, setVvpatData] = useState<VvpatRecord | null>(null);
  const [castingVote, setCastingVote] = useState(false);

  // Dynamic Polling Station setup
  const [allStations, setAllStations] = useState<PollingStationInfo[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number>(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('stationId');
    if (fromUrl) return Number(fromUrl);
    const user = authService.getCurrentUser();
    const officerStation = user?.role === 'OFFICER' ? (user?.profile?.pollingStationId ?? user?.stationId) : null;
    if (officerStation) return Number(officerStation);
    const saved = localStorage.getItem('evm_station_id');
    if (saved) return Number(saved);
    return 42;
  });

  const [currentStation, setCurrentStation] = useState<PollingStationInfo | null>(null);

  const isStationLocked = Boolean(
    new URLSearchParams(window.location.search).get('stationId') ||
    (authService.getCurrentUser()?.role === 'OFFICER' && (authService.getCurrentUser()?.profile?.pollingStationId ?? authService.getCurrentUser()?.stationId))
  );

  useEffect(() => {
    if (selectedStationId) {
      votingService.getPublicStationById(selectedStationId)
        .then((station) => {
          if (station) {
            setCurrentStation(station);
            localStorage.setItem('evm_station_id', station.id.toString());
          }
        })
        .catch(() => {});
    }

    votingService.getPublicStations()
      .then((data: PollingStationInfo[]) => {
        if (data && data.length > 0) {
          setAllStations(data);
          setCurrentStation((curr) => curr || data.find((s) => s.id === selectedStationId) || data[0]);
        }
      })
      .catch(() => {});
  }, [selectedStationId]);

  // Live poll machine status
  useEffect(() => {
    if (!selectedStationId) return;
    let isMounted = true;
    const interval = setInterval(() => {
      votingService.getPublicStationById(selectedStationId)
        .then((st) => {
          if (isMounted && st) {
            setCurrentStation((prev) => {
              if (!prev) return st;
              if (prev.machineStatus !== st.machineStatus || prev.isPollingActive !== st.isPollingActive) {
                return { ...prev, machineStatus: st.machineStatus, isPollingActive: st.isPollingActive };
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedStationId]);

  const handleStationChange = (id: number) => {
    if (isStationLocked) return;
    setSelectedStationId(id);
    localStorage.setItem('evm_station_id', id.toString());
  };

  const reset = useCallback(() => {
    setScreen('welcome');
    setInitData(null);
    setVoter(null);
    setBallotToken(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setVvpatData(null);
  }, []);

  const loadCandidates = useCallback(async (constituencyId: number) => {
    try {
      const data = await votingService.getBallotCandidates(constituencyId);
      setCandidates(data || []);
    } catch {
      const data = await candidateService.getAll(undefined, constituencyId);
      setCandidates(data || []);
    }
  }, []);

  const handleVoterVerified = async (verifiedVoter: VerifiedVoter, token?: string) => {
    setVoter(verifiedVoter);
    if (token) setBallotToken(token);
    await loadCandidates(verifiedVoter.constituencyId);
    setScreen('candidates');
  };

  const handleCastVote = async () => {
    if (!voter || !selectedCandidate) return;
    setCastingVote(true);
    try {
      const result = await votingService.castVote({
        voterId: voter.id,
        candidateId: selectedCandidate.id,
        pollingStationId: selectedStationId,
        ballotToken: ballotToken ?? undefined,
      });

      // Sound official EVM buzzer tone
      playEvmBeep();

      setVvpatData(result.vvpat);
      setScreen('vvpat');
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to cast vote');
      setScreen('candidates');
    } finally { setCastingVote(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl h-[700px] bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-700/50 shadow-2xl flex flex-col">
        <EVMHeader station={currentStation} />

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {screen === 'welcome' && (
              <div key="welcome" className="absolute inset-0">
                <WelcomeScreen
                  onStart={() => setScreen('method')}
                  station={currentStation}
                  allStations={allStations}
                  onSelectStation={handleStationChange}
                  isLocked={isStationLocked}
                />
              </div>
            )}
            {screen === 'method' && (
              <div key="method" className="absolute inset-0">
                <MethodScreen
                  onSelectAadhaar={() => { setMethod('AADHAAR'); setScreen('verify'); }}
                  onSelectVoterId={() => { setMethod('VOTER_ID'); setScreen('verify'); }}
                />
              </div>
            )}
            {screen === 'verify' && (
              <div key="verify" className="absolute inset-0">
                <VerifyScreen
                  method={method}
                  pollingStationId={selectedStationId}
                  onVerified={(data) => { setInitData(data); setScreen('protocol'); }}
                  onBack={() => setScreen('method')}
                />
              </div>
            )}
            {screen === 'protocol' && initData && (
              <div key="protocol" className="absolute inset-0">
                <ProtocolChoiceScreen
                  voterName={initData.voterName}
                  onSelectProtocol={(p) => {
                    if (p === 'OTP') {
                      setScreen('otp');
                    } else {
                      setSelectedBioType(p);
                      setScreen('biometric');
                    }
                  }}
                  onBack={() => setScreen('verify')}
                />
              </div>
            )}
            {screen === 'otp' && initData && (
              <div key="otp" className="absolute inset-0">
                <OTPScreen
                  voterId={initData.voterId}
                  voterName={initData.voterName}
                  simulatedOtp={initData.simulatedOtp}
                  onVerified={handleVoterVerified}
                  onBack={() => setScreen('protocol')}
                />
              </div>
            )}
            {screen === 'biometric' && initData && (
              <div key="biometric" className="absolute inset-0">
                <BiometricScreen
                  voterId={initData.voterId}
                  voterName={initData.voterName}
                  type={selectedBioType}
                  onVerified={handleVoterVerified}
                  onBack={() => setScreen('protocol')}
                />
              </div>
            )}
            {screen === 'candidates' && voter && (
              <div key="candidates" className="absolute inset-0 flex flex-col">
                <CandidateScreen
                  candidates={candidates}
                  voter={voter}
                  onSelect={(c) => { setSelectedCandidate(c); setScreen('confirm'); }}
                />
              </div>
            )}
            {screen === 'confirm' && voter && selectedCandidate && (
              <div key="confirm" className="absolute inset-0">
                <ConfirmScreen
                  candidate={selectedCandidate}
                  voter={voter}
                  onConfirm={handleCastVote}
                  onCancel={() => setScreen('candidates')}
                  loading={castingVote}
                />
              </div>
            )}
            {screen === 'vvpat' && vvpatData && (
              <div key="vvpat" className="absolute inset-0">
                <VVPATScreen vvpat={vvpatData} onDone={reset} />
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700/50 px-6 py-2 flex items-center justify-between bg-slate-900/80">
          <p className="text-[10px] text-slate-500">ANTI-FRAUD · ZERO-DUPLICATE · SECRET BALLOT PROTECTED</p>
          <p className="text-[10px] text-slate-500">© Election Commission of India</p>
          {screen !== 'welcome' && screen !== 'vvpat' && (
            <button onClick={reset} className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1">
              <RefreshCw size={10} /> Reset Terminal
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
