import React, { useCallback } from 'react';
import { TrendingUp, Trophy, Users, Vote } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { electionService, reportService } from '../../services/api.service';
import { TableSkeleton, StatusBadge, EmptyState, Spinner } from '../../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileText, Table2 } from 'lucide-react';

interface ElectionResult {
  id: number; name: string; status: string; isResultPublished: boolean;
  results: Array<{
    id: number; name: string; code: string;
    candidates: Array<{ id: number; fullName: string; serialNumber: number; party?: { name: string; color: string }; _count: { votes: number } }>;
  }>;
}

export const ResultsPage: React.FC = () => {
  const fetchElections = useCallback(() => electionService.getAll(), []);
  const { data: elections, loading: electionsLoading } = useAsync(fetchElections);

  const publishedElections = (elections as { id: number; name: string; status: string; isResultPublished: boolean }[] | null)?.filter((e) => e.isResultPublished) ?? [];
  const [selectedElection, setSelectedElection] = React.useState<number | null>(null);

  const fetchResults = useCallback(
    () => selectedElection ? electionService.getResults(selectedElection) : Promise.resolve(null),
    [selectedElection],
  );
  const { data: resultsData, loading: resultsLoading } = useAsync(fetchResults);

  const election = resultsData?.election;
  const constituencies = resultsData?.results ?? [];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Election Results</h1>
          <p className="page-subtitle">View published election results and winner declarations</p>
        </div>
        {selectedElection && (
          <div className="flex gap-2">
            <button onClick={() => reportService.downloadElectionSummaryPDF(selectedElection)} className="btn-secondary">
              <FileText size={14} /> PDF
            </button>
            <button onClick={() => reportService.downloadResultsExcel(selectedElection)} className="btn-secondary">
              <Table2 size={14} /> Excel
            </button>
          </div>
        )}
      </div>

      {/* Election Selector */}
      <div className="card p-5">
        <label className="label">Select Published Election</label>
        <select className="input max-w-md"
          value={selectedElection ?? ''}
          onChange={(e) => setSelectedElection(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Choose an election...</option>
          {publishedElections.map((e: { id: number; name: string }) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        {publishedElections.length === 0 && !electionsLoading && (
          <p className="text-sm text-slate-500 mt-2">No published results yet. Close an election and publish its results.</p>
        )}
      </div>

      {/* Results */}
      {resultsLoading && <TableSkeleton rows={5} cols={5} />}

      {!resultsLoading && selectedElection && constituencies.length === 0 && (
        <EmptyState icon={<TrendingUp size={28} />} title="No results data" description="This election may not have any votes cast yet." />
      )}

      {constituencies.map((con: { id: number; name: string; code: string; candidates: Array<{ id: number; fullName: string; serialNumber: number; party?: { name: string; color: string }; _count: { votes: number } }> }) => {
        const sorted = [...con.candidates].sort((a, b) => b._count.votes - a._count.votes);
        const winner = sorted[0];
        const totalVotes = sorted.reduce((sum, c) => sum + c._count.votes, 0);

        const chartData = sorted.map((c) => ({
          name: c.fullName.split(' ')[0],
          votes: c._count.votes,
          color: c.party?.color ?? '#64748b',
        }));

        return (
          <div key={con.id} className="card p-6 space-y-4">
            {/* Constituency header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{con.name}</h3>
                <p className="text-sm text-slate-400">Code: {con.code} · Total Votes: {totalVotes.toLocaleString()}</p>
              </div>
              {winner && winner._count.votes > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Trophy size={18} className="text-amber-400" />
                  <div>
                    <p className="text-xs text-amber-400 font-semibold">Winner</p>
                    <p className="text-sm font-bold text-white">{winner.fullName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bar Chart */}
            {totalVotes > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                  <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Results Table */}
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Rank</th><th>Candidate</th><th>Party</th><th>Votes</th><th>Vote %</th></tr></thead>
                <tbody>
                  {sorted.map((c, idx) => (
                    <tr key={c.id} className={idx === 0 && c._count.votes > 0 ? 'bg-amber-500/5' : ''}>
                      <td>
                        {idx === 0 && c._count.votes > 0
                          ? <Trophy size={16} className="text-amber-400" />
                          : <span className="text-slate-500">#{idx + 1}</span>}
                      </td>
                      <td className="font-medium text-white">{c.fullName}</td>
                      <td>
                        {c.party ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.party.color }} />
                            <span className="text-xs">{c.party.name}</span>
                          </div>
                        ) : <span className="text-slate-500 text-xs">Independent</span>}
                      </td>
                      <td className="font-bold text-white">{c._count.votes.toLocaleString()}</td>
                      <td className="text-slate-300">{totalVotes > 0 ? ((c._count.votes / totalVotes) * 100).toFixed(2) : '0.00'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};
