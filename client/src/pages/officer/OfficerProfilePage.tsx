import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Shield,
  Building2,
  Vote,
  Phone,
  Mail,
  BadgeCheck,
  Calendar,
  Clock,
  Lock,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  MapPin,
  Users,
  Award,
  Hash,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { pollingStationService, electionService } from '../../services/api.service';
import { Spinner, StatusBadge } from '../../components/ui';
import { toast } from 'react-hot-toast';

interface OfficerProfileData {
  id: number;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  officer?: {
    id: number;
    fullName: string;
    employeeId: string;
    phone: string;
    pollingStationId?: number | null;
    pollingStation?: {
      id: number;
      name: string;
      code: string;
      address: string;
      totalBooths?: number;
      machineStatus?: string;
      isPollingActive?: boolean;
      constituency?: {
        id: number;
        name: string;
        code: string;
      } | null;
    } | null;
  } | null;
}

export const OfficerProfilePage: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const stationId = currentUser?.profile?.pollingStationId ?? currentUser?.stationId;

  const [profile, setProfile] = useState<OfficerProfileData | null>(null);
  const [station, setStation] = useState<any>(null);
  const [elections, setElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, electionsRes] = await Promise.all([
        authService.getProfile(),
        electionService.getMyElections().catch(() => []),
      ]);
      setProfile(profileRes);
      setElections(electionsRes || []);

      const currentStationId =
        profileRes?.officer?.pollingStationId ?? stationId;
      if (currentStationId) {
        const stationRes = await pollingStationService.getById(currentStationId).catch(() => null);
        setStation(stationRes);
      }
    } catch {
      toast.error('Failed to load officer profile details.');
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !profile) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  const officer = profile?.officer ?? currentUser?.profile;
  const officerName = officer?.fullName ?? 'Election Officer';
  const officerEmail = profile?.email ?? currentUser?.email ?? 'officer@evm.gov.in';
  const employeeId = officer?.employeeId ?? 'N/A';
  const phone = officer?.phone ?? 'N/A';
  const stationData = station ?? profile?.officer?.pollingStation;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link to="/officer" className="hover:text-slate-200 transition-colors">
              Officer Portal
            </Link>
            <span>/</span>
            <span className="text-emerald-400 font-medium">My Profile</span>
          </div>
          <h1 className="page-title flex items-center gap-2">
            <Shield size={24} className="text-emerald-400" />
            <span>Election Officer Profile</span>
          </h1>
          <p className="page-subtitle">
            Official ECI Presiding Officer credentials, assignment details, and station authorization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"
            title="Refresh profile data"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <a
            href={`/voting-machine${stationId ? `?stationId=${stationId}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-xs flex items-center gap-2 py-2 px-3 shadow-md hover:shadow-primary-500/20 transition-all"
          >
            <Vote size={15} />
            <span>Launch EVM</span>
            <ExternalLink size={13} className="text-primary-200" />
          </a>
        </div>
      </div>

      {/* ── Hero Officer Badge ── */}
      <div className="card p-6 relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-emerald-900/40">
              {officerName[0]?.toUpperCase() ?? 'O'}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center shadow">
              <CheckCircle2 size={14} className="text-white" />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h2 className="text-2xl font-black text-white truncate">{officerName}</h2>
              <span className="badge badge-green text-xs font-semibold flex items-center gap-1">
                <BadgeCheck size={12} /> Verified Officer
              </span>
              <span className="badge badge-purple text-xs font-mono">
                Badge #{employeeId}
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-3 flex items-center justify-center sm:justify-start gap-2">
              <span>Election Commission of India · Presiding Polling Officer</span>
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                <Mail size={13} className="text-slate-400" />
                <span className="font-mono text-slate-200">{officerEmail}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                <Phone size={13} className="text-slate-400" />
                <span className="font-mono text-slate-200">{phone}</span>
              </div>
              {stationData && (
                <div className="flex items-center gap-1.5 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-700/40 text-emerald-300">
                  <Building2 size={13} className="text-emerald-400" />
                  <span>Booth #{stationData.id}: {stationData.code}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2-Column Detail Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Official Credentials */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-emerald-400" />
              <h3 className="text-base font-bold text-white">Officer Credentials</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">ECI-SEC-ID</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <p className="text-slate-500 mb-1">Full Legal Name</p>
              <p className="text-white font-semibold text-sm">{officerName}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <p className="text-slate-500 mb-1">Employee Badge ID</p>
              <p className="font-mono text-white font-semibold text-sm">{employeeId}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <p className="text-slate-500 mb-1">Official Email</p>
              <p className="text-slate-200 font-medium truncate">{officerEmail}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <p className="text-slate-500 mb-1">Contact Phone</p>
              <p className="font-mono text-slate-200 font-medium">{phone}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <p className="text-slate-500 mb-1">System Role</p>
              <p className="text-emerald-400 font-semibold">ELECTION OFFICER</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <p className="text-slate-500 mb-1">Account Authorization</p>
              <p className="text-white font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Active & Authorized
              </p>
            </div>
            {profile?.createdAt && (
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <p className="text-slate-500 mb-1">Commissioned Since</p>
                <p className="text-slate-300 font-mono text-[11px]">
                  {new Date(profile.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <p className="text-slate-500 mb-1">Last Active Session</p>
              <p className="text-slate-300 font-mono text-[11px]">
                {profile?.lastLoginAt
                  ? new Date(profile.lastLoginAt).toLocaleString('en-IN')
                  : 'Current Session'}
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Assigned Polling Booth */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-blue-400" />
              <h3 className="text-base font-bold text-white">Assigned Polling Booth</h3>
            </div>
            {stationData && (
              <span className="badge badge-purple text-xs font-mono">{stationData.code}</span>
            )}
          </div>

          {stationData ? (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{stationData.name}</h4>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">{stationData.address}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <p className="text-slate-500 mb-1">Assigned Constituency</p>
                  <p className="text-white font-semibold">
                    {stationData.constituency?.name ?? 'Central Delhi'}
                    {stationData.constituency?.code && (
                      <span className="text-slate-400 text-[11px] block font-mono">
                        ({stationData.constituency.code})
                      </span>
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                  <p className="text-slate-500 mb-1">EVM Console Status</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        stationData.machineStatus === 'ACTIVE'
                          ? 'bg-emerald-400 animate-pulse'
                          : stationData.machineStatus === 'PAUSED'
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                    />
                    <span className="font-semibold text-white">
                      {stationData.machineStatus ?? 'ONLINE'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <Link
                  to="/officer/voters"
                  className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5 py-2.5"
                >
                  <Users size={14} className="text-blue-400" />
                  <span>View Booth Voters</span>
                </Link>
                <Link
                  to="/officer/machine"
                  className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5 py-2.5"
                >
                  <Building2 size={14} className="text-purple-400" />
                  <span>Machine Control</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500">
              <Building2 size={32} className="mx-auto mb-2 text-slate-600" />
              <p>No specific polling booth assigned to your profile yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Assigned Elections Section ── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
          <div className="flex items-center gap-2">
            <Vote size={18} className="text-emerald-400" />
            <h3 className="text-base font-bold text-white">Supervised Elections</h3>
          </div>
          <span className="text-xs text-slate-400">
            {elections.length} assigned election{elections.length === 1 ? '' : 's'}
          </span>
        </div>

        {elections.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            You are not currently assigned to supervise any scheduled election.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {elections.map((ele) => (
              <div
                key={ele.id}
                className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-blue text-[10px]">{ele.electionType}</span>
                    <StatusBadge status={ele.status} />
                  </div>
                  <h4 className="text-sm font-bold text-white">{ele.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>
                      Scheduled:{' '}
                      {new Date(ele.scheduledDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </p>
                </div>
                <Link
                  to="/officer"
                  className="btn-secondary text-[11px] py-1.5 px-2.5 shrink-0"
                >
                  Open Dashboard
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Official Guidelines Banner ── */}
      <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-start gap-3 text-xs text-slate-400">
        <Shield size={18} className="text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-200">
            Election Commission of India — Presiding Officer Protocols
          </p>
          <p className="leading-relaxed">
            As an assigned Election Officer, your access is strictly bound to your designated polling booth.
            You are authorized to verify voters belonging to your booth roster, monitor turnout in real time,
            and pause or lock the EVM terminal in cases of emergency or polling close.
          </p>
        </div>
      </div>
    </div>
  );
};
