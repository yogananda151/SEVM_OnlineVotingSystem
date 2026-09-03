import React, { useState } from 'react';
import { Shield, Search, CheckCircle2, Clock, Vote, ArrowLeft } from 'lucide-react';
import { votingService } from '../../services/api.service';
import { Spinner } from '../../components/ui';
import { Link } from 'react-router-dom';

interface VvpatRecord {
  id: number;
  candidateName: string;
  partyName: string;
  partySymbolUrl?: string;
  electionName: string;
  referenceNumber: string;
  voteHash: string;
  timestamp: string;
  candidate?: {
    fullName: string;
    party?: { name: string; abbreviation: string; color: string; symbolUrl?: string };
  };
}

export const VvpatPage: React.FC = () => {
  const [refNum, setRefNum] = useState('');
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<VvpatRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = refNum.trim();
    if (!cleanRef) return;
    setLoading(true);
    setError(null);
    setRecord(null);

    try {
      const data = await votingService.getVVPAT(cleanRef);
      setRecord(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'No verified vote record found with this reference number.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4 transition-colors">
            <ArrowLeft size={14} /> Back to Portal
          </Link>
          <div className="w-14 h-14 rounded-2xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Shield size={28} className="text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Digital VVPAT Verification</h1>
          <p className="text-slate-400 text-sm mt-1">Verify your vote cast record on the official ECI audit trail</p>
        </div>

        {/* Lookup Form */}
        <div className="card p-6">
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label htmlFor="ref-input" className="label">
                Vote Reference Number
              </label>
              <div className="relative">
                <input
                  id="ref-input"
                  value={refNum}
                  onChange={(e) => setRefNum(e.target.value)}
                  placeholder="e.g. VOTE-M7AB12-XY89"
                  className="input font-mono uppercase tracking-wider"
                  required
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Found on your digital VVPAT confirmation slip after voting.</p>
            </div>

            <button type="submit" disabled={loading || !refNum.trim()} className="btn-primary w-full justify-center">
              {loading ? <Spinner size={16} /> : <Search size={16} />} Verify Vote Record
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Verified VVPAT Slip Display */}
        {record && (
          <div className="bg-white text-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-200 animate-in">
            <div className="text-center border-b border-gray-200 pb-3 mb-4">
              <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-bold text-xs uppercase tracking-widest">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Verified Electronic Ballot Record
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">Election Commission of India – Official Audit Trail</p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Election</span>
                <span className="font-bold text-gray-900">{record.electionName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Candidate Choice</span>
                <span className="font-bold text-gray-900 text-sm">{record.candidateName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Party Affiliation</span>
                <span className="font-semibold text-gray-800">{record.partyName}</span>
              </div>
              {record.partySymbolUrl && (
                <div className="flex justify-center py-2">
                  <img src={record.partySymbolUrl} alt="Symbol" className="w-12 h-12 object-contain" />
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Timestamp</span>
                <span className="font-mono text-gray-700">{new Date(record.timestamp).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Reference Number</span>
                <span className="font-mono font-bold text-primary-700">{record.referenceNumber}</span>
              </div>
            </div>

            <div className="mt-4 p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <p className="text-[9px] text-gray-500 font-semibold mb-1">CRYPTOGRAPHIC AUDIT HASH (SHA-256)</p>
              <p className="text-[9px] font-mono text-gray-700 break-all">{record.voteHash}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
