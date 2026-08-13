import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Vote, Shield, Fingerprint, Scan, CheckCircle, X, RefreshCw, Clock, User } from 'lucide-react';
import { votingService, candidateService } from '../../services/api.service';
import { toast } from 'react-hot-toast';
import { useCountdown } from '../../hooks/useAsync';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type Screen = 'welcome' | 'method' | 'verify' | 'otp' | 'biometric' | 'candidates' | 'confirm' | 'vvpat' | 'thankyou';

interface VerifiedVoter {
  id: number; fullName: string; voterId: string; gender: string;
  pollingStationId: number; constituencyId: number;
}

interface Candidate {
  id: number; fullName: string; serialNumber: number; age: number;
  photoUrl?: string; isIndependent: boolean;
  party?: { id: number; name: string; abbreviation: string; color: string; symbolUrl?: string };
}

interface VvpatRecord {
  candidateName: string; partyName: string; partySymbolUrl?: string;
  electionName: string; referenceNumber: string; voteHash: string; timestamp: string;
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

const EVMHeader: React.FC = () => (
  <div className="bg-slate-900 border-b border-slate-700/50 px-6 py-3 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
        <Vote size={16} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-bold text-white leading-tight">SMART ELECTRONIC VOTING MACHINE</p>
        <p className="text-[10px] text-slate-400">Election Commission of India – Official System</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <div className="evm-led evm-led-green" />
        <span className="text-[10px] text-slate-400">POWER</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="evm-led evm-led-green" />
        <span className="text-[10px] text-slate-400">NETWORK</span>
      </div>
      <div className="text-[10px] text-slate-500 font-mono">{new Date().toLocaleString('en-IN')}</div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// Screens
// ─────────────────────────────────────────────────────────────────

const WelcomeScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <motion.div className="flex flex-col items-center justify-center h-full gap-8 text-center px-8"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
      <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary-600 to-blue-700 flex items-center justify-center shadow-2xl shadow-primary-900/50 mx-auto">
        <Vote size={56} className="text-white" />
      </div>
    </motion.div>
    <div>
      <h1 className="text-4xl font-black text-white leading-tight">SMART EVM</h1>
      <p className="text-lg text-primary-400 font-semibold mt-1">Electronic Voting Machine</p>
      <p className="text-slate-400 text-sm mt-3 max-w-md">Welcome. Please verify your identity to cast your vote. Your vote is confidential and secured.</p>
    </div>
    <motion.button
      onClick={onStart}
      className="px-12 py-4 bg-gradient-to-r from-primary-600 to-blue-600 text-white text-lg font-bold rounded-2xl shadow-2xl shadow-primary-900/50"
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
    >
      BEGIN VOTING
    </motion.button>
    <p className="text-xs text-slate-600">Touch to proceed</p>
  </motion.div>
);

const MethodScreen: React.FC<{
  onSelectAadhaar: () => void;
  onSelectVoterId: () => void;
}> = ({ onSelectAadhaar, onSelectVoterId }) => (
  <motion.div className="flex flex-col items-center justify-center h-full gap-8 px-8"
    initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white">Verify Your Identity</h2>
      <p className="text-slate-400 mt-2">Select your preferred verification method</p>
    </div>
    <div className="grid grid-cols-2 gap-6 w-full max-w-md">
      <motion.button onClick={onSelectAadhaar} whileTap={{ scale: 0.96 }}
        className="flex flex-col items-center gap-4 p-8 bg-slate-800/80 border-2 border-slate-600 rounded-2xl hover:border-primary-500 hover:bg-primary-600/10 transition-all duration-200">
        <div className="w-16 h-16 rounded-2xl bg-primary-600/20 flex items-center justify-center">
          <Scan size={32} className="text-primary-400" />
        </div>
        <div>
          <p className="font-bold text-white">Aadhaar</p>
          <p className="text-xs text-slate-400 mt-0.5">12-digit number</p>
        </div>
      </motion.button>
      <motion.button onClick={onSelectVoterId} whileTap={{ scale: 0.96 }}
        className="flex flex-col items-center gap-4 p-8 bg-slate-800/80 border-2 border-slate-600 rounded-2xl hover:border-emerald-500 hover:bg-emerald-600/10 transition-all duration-200">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 flex items-center justify-center">
          <Shield size={32} className="text-emerald-400" />
        </div>
        <div>
          <p className="font-bold text-white">Voter ID</p>
          <p className="text-xs text-slate-400 mt-0.5">EPIC number</p>
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
          {loading ? 'Verifying...' : 'Verify & Send OTP'}
        </button>
      </div>
      <p className="text-xs text-slate-500 text-center">(Simulation: OTP will be displayed on screen)</p>
    </motion.div>
  );
};

const OTPScreen: React.FC<{
  voterId: number;
  voterName: string;
  simulatedOtp: string;
  onVerified: (voter: VerifiedVoter) => void;
  onBack: () => void;
}> = ({ voterId, voterName, simulatedOtp, onVerified, onBack }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { remaining, running, start } = useCountdown(300);

  useEffect(() => { start(); }, []);

  const handleVerify = async () => {
    if (otp.length !== 6) { toast.error('Enter 6-digit OTP'); return; }
    setLoading(true);
    try {
      const result = await votingService.verifyOTP(voterId, otp);
      onVerified(result.voter);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <motion.div className="flex flex-col items-center justify-center h-full gap-6 px-8 max-w-md mx-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
          <User size={32} className="text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white">{voterName}</h2>
        <p className="text-slate-400 mt-1">Enter the OTP sent to your registered mobile</p>
      </div>

      {/* Simulated OTP display */}
      <div className="w-full p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
        <p className="text-xs text-amber-400 mb-1">🔐 SIMULATION – OTP (would be sent via SMS)</p>
        <p className="text-2xl font-bold font-mono text-amber-300 tracking-[0.5em]">{simulatedOtp}</p>
      </div>

      <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="Enter 6-digit OTP" className="input text-center text-2xl tracking-[0.5em] font-mono" maxLength={6} />

      <div className="flex items-center gap-2 text-sm">
        <Clock size={14} className="text-slate-400" />
        <span className={`font-mono ${remaining < 60 ? 'text-red-400' : 'text-slate-400'}`}>
          {mins}:{String(secs).padStart(2, '0')} remaining
        </span>
      </div>

      <div className="flex gap-4 w-full">
        <button onClick={onBack} className="btn-secondary flex-1">← Back</button>
        <button onClick={handleVerify} disabled={loading || otp.length !== 6} className="btn-primary flex-1 justify-center">
          {loading ? 'Verifying...' : 'Confirm OTP'}
        </button>
      </div>
    </motion.div>
  );
};

const CandidateScreen: React.FC<{
  candidates: Candidate[];
  voter: VerifiedVoter;
  onSelect: (candidate: Candidate) => void;
}> = ({ candidates, voter, onSelect }) => {
  const [selected, setSelected] = useState<Candidate | null>(null);

  return (
    <motion.div className="flex flex-col h-full"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Cast Your Vote</h2>
            <p className="text-xs text-slate-400">Voter: {voter.fullName} · Select one candidate</p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-xs text-emerald-400 font-semibold">✓ VERIFIED</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {candidates.sort((a, b) => a.serialNumber - b.serialNumber).map((candidate) => {
          const isSelected = selected?.id === candidate.id;
          return (
            <motion.button
              key={candidate.id}
              onClick={() => setSelected(candidate)}
              whileTap={{ scale: 0.99 }}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                  : 'border-slate-600/50 bg-slate-800/50 hover:border-slate-500'
              }`}
            >
              {/* Serial */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                {candidate.serialNumber}
              </div>

              {/* Photo */}
              {candidate.photoUrl ? (
                <img src={candidate.photoUrl} alt={candidate.fullName} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <User size={24} className="text-slate-500" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-base">{candidate.fullName}</p>
                {candidate.party ? (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: candidate.party.color }} />
                    <p className="text-sm text-slate-300">{candidate.party.name}</p>
                    <span className="text-xs text-slate-500">({candidate.party.abbreviation})</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Independent</p>
                )}
              </div>

              {/* Party symbol */}
              {candidate.party?.symbolUrl ? (
                <img src={candidate.party.symbolUrl} alt={candidate.party.name} className="w-12 h-12 object-contain flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-400"
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
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-200 ${
            selected
              ? 'bg-gradient-to-r from-primary-600 to-blue-600 text-white shadow-lg shadow-primary-900/30 hover:opacity-95'
              : 'bg-slate-700/50 text-slate-600 cursor-not-allowed'
          }`}
        >
          {selected ? `VOTE FOR ${selected.fullName.toUpperCase()}` : 'SELECT A CANDIDATE'}
        </button>
      </div>
    </motion.div>
  );
};

const ConfirmScreen: React.FC<{
  candidate: Candidate;
  voter: VerifiedVoter;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ candidate, voter, onConfirm, onCancel, loading }) => (
  <motion.div className="flex flex-col items-center justify-center h-full gap-6 px-8 max-w-md mx-auto"
    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
    <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
      <CheckCircle size={32} className="text-amber-400" />
    </div>
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white">Confirm Your Vote</h2>
      <p className="text-slate-400 mt-1">Please review your selection carefully</p>
    </div>

    <div className="w-full p-5 rounded-2xl bg-slate-800/80 border border-slate-700/50 space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Voter</span>
        <span className="text-white font-medium">{voter.fullName}</span>
      </div>
      <div className="border-t border-slate-700/50" />
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Candidate</span>
        <span className="text-white font-bold">{candidate.fullName}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Party</span>
        <span className="text-white">{candidate.party?.name ?? 'Independent'}</span>
      </div>
      {candidate.party && (
        <div className="flex justify-between text-sm items-center">
          <span className="text-slate-400">Symbol</span>
          {candidate.party.symbolUrl
            ? <img src={candidate.party.symbolUrl} alt={candidate.party.name} className="w-8 h-8 object-contain" />
            : <span className="font-bold" style={{ color: candidate.party.color }}>{candidate.party.abbreviation}</span>}
        </div>
      )}
    </div>

    <p className="text-sm text-amber-400 text-center">⚠️ Once confirmed, your vote cannot be changed.</p>

    <div className="flex gap-4 w-full">
      <button onClick={onCancel} disabled={loading} className="btn-danger flex-1 justify-center">
        <X size={16} /> Cancel
      </button>
      <button onClick={onConfirm} disabled={loading}
        className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
        {loading ? 'Recording...' : <><CheckCircle size={16} /> Confirm Vote</>}
      </button>
    </div>
  </motion.div>
);

const VVPATScreen: React.FC<{ vvpat: VvpatRecord; onDone: () => void }> = ({ vvpat, onDone }) => {
  const { remaining, start } = useCountdown(7, onDone);

  useEffect(() => { start(); }, []);

  return (
    <motion.div className="flex h-full gap-6 p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* Left – thank you */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
          <CheckCircle size={48} className="text-emerald-400" />
        </motion.div>
        <h2 className="text-3xl font-black text-white">VOTE RECORDED!</h2>
        <p className="text-slate-400 mt-3">Your vote has been securely recorded.<br />Thank you for participating in democracy.</p>
        <div className="mt-6 flex items-center gap-2">
          <Clock size={16} className="text-slate-500" />
          <span className="text-slate-500 text-sm">Resetting in <span className="font-mono text-primary-400">{remaining}s</span></span>
        </div>
      </div>

      {/* Right – VVPAT slip */}
      <div className="w-72 flex-shrink-0">
        <motion.div
          className="bg-white text-gray-900 rounded-2xl p-5 shadow-2xl"
          initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}>
          <div className="text-center border-b border-gray-200 pb-3 mb-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">VVPAT – Voter Verified Paper Audit Trail</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Election Commission of India</p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Election</span>
              <span className="font-bold text-gray-900 text-right max-w-[60%]">{vvpat.electionName}</span>
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
              <div className="flex justify-center py-2">
                <img src={vvpat.partySymbolUrl} alt="symbol" className="w-12 h-12 object-contain" />
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 mt-3 pt-3 text-center">
            <p className="text-[10px] text-gray-500">Reference Number</p>
            <p className="font-mono text-xs font-bold text-gray-900">{vvpat.referenceNumber}</p>
            <p className="text-[9px] text-gray-400 mt-1">{new Date(vvpat.timestamp).toLocaleString('en-IN')}</p>
          </div>

          <div className="mt-3 p-2 bg-gray-50 rounded text-center">
            <p className="text-[8px] font-mono text-gray-400 break-all">{vvpat.voteHash.slice(0, 24)}...</p>
            <p className="text-[8px] text-gray-400">SHA-256 Verification Hash</p>
          </div>

          <div className="text-center mt-3 flex items-center justify-center gap-2 text-amber-600">
            <Clock size={12} />
            <p className="text-[10px]">Visible for {remaining}s</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Main VotingMachinePage
// ─────────────────────────────────────────────────────────────────

export const VotingMachinePage: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [method, setMethod] = useState<'AADHAAR' | 'VOTER_ID'>('VOTER_ID');
  const [initData, setInitData] = useState<{ voterId: number; voterName: string; simulatedOtp: string } | null>(null);
  const [voter, setVoter] = useState<VerifiedVoter | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [vvpatData, setVvpatData] = useState<VvpatRecord | null>(null);
  const [castingVote, setCastingVote] = useState(false);

  // Hard-coded demo station ID. In production this is set by the officer's session.
  const POLLING_STATION_ID = 1;

  const reset = useCallback(() => {
    setScreen('welcome');
    setInitData(null);
    setVoter(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setVvpatData(null);
  }, []);

  const loadCandidates = useCallback(async (constituencyId: number) => {
    const data = await candidateService.getAll(constituencyId);
    setCandidates(data);
  }, []);

  const handleVoterVerified = async (verifiedVoter: VerifiedVoter) => {
    setVoter(verifiedVoter);
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
        pollingStationId: POLLING_STATION_ID,
      });
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
        <EVMHeader />

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {screen === 'welcome' && (
              <div key="welcome" className="absolute inset-0">
                <WelcomeScreen onStart={() => setScreen('method')} />
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
                  pollingStationId={POLLING_STATION_ID}
                  onVerified={(data) => { setInitData(data); setScreen('otp'); }}
                  onBack={() => setScreen('method')}
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
                  onBack={() => setScreen('verify')}
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
          <p className="text-[10px] text-slate-600">SECURE · TRANSPARENT · VERIFIABLE</p>
          <p className="text-[10px] text-slate-600">© Election Commission of India</p>
          {screen !== 'welcome' && screen !== 'vvpat' && (
            <button onClick={reset} className="text-[10px] text-slate-600 hover:text-slate-400 flex items-center gap-1">
              <RefreshCw size={10} /> Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
