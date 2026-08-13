import React, { useCallback } from 'react';
import { FileText, Table2, BarChart3, ClipboardList, Users, Vote } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { electionService, pollingStationService, reportService } from '../../services/api.service';

export const ReportsPage: React.FC = () => {
  const fetchElections = useCallback(() => electionService.getAll(), []);
  const { data: elections } = useAsync(fetchElections);

  const fetchStations = useCallback(() => pollingStationService.getAll(), []);
  const { data: stations } = useAsync(fetchStations);

  const [selectedElection, setSelectedElection] = React.useState<string>('');
  const [selectedStation, setSelectedStation] = React.useState<string>('');

  const reportCards = [
    {
      title: 'Election Summary',
      description: 'Complete election report including constituency-wise candidate list',
      icon: Vote,
      color: 'text-blue-400', bg: 'bg-blue-500/10',
      format: 'PDF',
      action: () => selectedElection ? reportService.downloadElectionSummaryPDF(Number(selectedElection)) : alert('Select an election'),
    },
    {
      title: 'Election Results',
      description: 'Final vote counts and winner declarations per constituency',
      icon: BarChart3,
      color: 'text-emerald-400', bg: 'bg-emerald-500/10',
      format: 'Excel',
      action: () => selectedElection ? reportService.downloadResultsExcel(Number(selectedElection)) : alert('Select an election'),
    },
    {
      title: 'Voters List',
      description: 'Complete voter register for a polling station with voting status',
      icon: Users,
      color: 'text-amber-400', bg: 'bg-amber-500/10',
      format: 'Excel',
      action: () => selectedStation ? reportService.downloadVotersExcel(Number(selectedStation)) : alert('Select a station'),
    },
    {
      title: 'Audit Log',
      description: 'Complete system audit trail – all actions and events',
      icon: ClipboardList,
      color: 'text-purple-400', bg: 'bg-purple-500/10',
      format: 'PDF',
      action: () => reportService.downloadAuditLogPDF(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate and export reports in PDF and Excel formats</p>
        </div>
      </div>

      {/* Selectors */}
      <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Select Election</label>
          <select className="input" value={selectedElection} onChange={(e) => setSelectedElection(e.target.value)}>
            <option value="">Choose election...</option>
            {(elections as { id: number; name: string }[] || []).map((e: { id: number; name: string }) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Select Polling Station</label>
          <select className="input" value={selectedStation} onChange={(e) => setSelectedStation(e.target.value)}>
            <option value="">Choose station...</option>
            {(stations as { id: number; name: string; code: string }[] || []).map((s: { id: number; name: string; code: string }) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {reportCards.map((card) => (
          <div key={card.title} className="card p-6 flex items-start gap-4 hover:border-slate-600/50 transition-all duration-200">
            <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
              <card.icon size={22} className={card.color} />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white">{card.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{card.description}</p>
                </div>
                <span className={`badge ${card.format === 'PDF' ? 'badge-red' : 'badge-green'} ml-2 flex-shrink-0`}>{card.format}</span>
              </div>
              <button onClick={card.action} className="btn-secondary mt-4 text-sm py-2">
                {card.format === 'PDF' ? <FileText size={14} /> : <Table2 size={14} />}
                Download {card.format}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
