import api from '../lib/axios';

export const electionService = {
  getAll: async () => (await api.get('/elections')).data.data,
  getById: async (id: number) => (await api.get(`/elections/${id}`)).data.data,
  getStats: async (id: number) => (await api.get(`/elections/${id}/stats`)).data.data,
  getDashboardStats: async () => (await api.get('/elections/stats/dashboard')).data.data,
  getResults: async (id: number) => (await api.get(`/elections/${id}/results`)).data.data,
  getReadiness: async (id: number) => (await api.get(`/elections/${id}/readiness`)).data.data,
  getConstituencies: async (id: number) => (await api.get(`/elections/${id}/constituencies`)).data.data,
  setConstituencies: async (id: number, constituencyIds: number[]) =>
    (await api.put(`/elections/${id}/constituencies`, { constituencyIds })).data.data,
  getOfficer: async (id: number) => (await api.get(`/elections/${id}/officer`)).data.data,
  setOfficer: async (id: number, officerId: number | null) =>
    (await api.put(`/elections/${id}/officer`, { officerId })).data.data,
  create: async (data: object) => (await api.post('/elections', data)).data.data,
  update: async (id: number, data: object) => (await api.put(`/elections/${id}`, data)).data.data,
  updateStatus: async (id: number, status: string) =>
    (await api.patch(`/elections/${id}/status`, { status })).data.data,
  publishResults: async (id: number) => (await api.post(`/elections/${id}/publish-results`)).data,
  delete: async (id: number) => (await api.delete(`/elections/${id}`)).data,
};

export const regionService = {
  getAll: async () => (await api.get('/regions')).data.data,
  getById: async (id: number) => (await api.get(`/regions/${id}`)).data.data,
  create: async (data: object) => (await api.post('/regions', data)).data.data,
  update: async (id: number, data: object) => (await api.put(`/regions/${id}`, data)).data.data,
  delete: async (id: number) => (await api.delete(`/regions/${id}`)).data,
};

export const constituencyService = {
  getAll: async (regionId?: number) =>
    (await api.get('/constituencies', { params: { regionId } })).data.data,
  getActive: async (regionId?: number) =>
    (await api.get('/constituencies/active', { params: { regionId } })).data.data,
  getById: async (id: number) => (await api.get(`/constituencies/${id}`)).data.data,
  create: async (data: object) => (await api.post('/constituencies', data)).data.data,
  update: async (id: number, data: object) => (await api.put(`/constituencies/${id}`, data)).data.data,
  delete: async (id: number) => (await api.delete(`/constituencies/${id}`)).data,
};

export const pollingStationService = {
  getAll: async (constituencyId?: number) =>
    (await api.get('/polling-stations', { params: { constituencyId } })).data.data,
  getById: async (id: number) => (await api.get(`/polling-stations/${id}`)).data.data,
  getTurnout: async (id: number) => (await api.get(`/polling-stations/${id}/turnout`)).data.data,
  create: async (data: object) => (await api.post('/polling-stations', data)).data.data,
  update: async (id: number, data: object) => (await api.put(`/polling-stations/${id}`, data)).data.data,
  updateMachineStatus: async (id: number, status: string, isPollingActive?: boolean) =>
    (await api.patch(`/polling-stations/${id}/machine-status`, { status, isPollingActive })).data.data,
  delete: async (id: number) => (await api.delete(`/polling-stations/${id}`)).data,
};

export const partyService = {
  getAll: async () => (await api.get('/parties')).data.data,
  getById: async (id: number) => (await api.get(`/parties/${id}`)).data.data,
  create: async (data: object) => (await api.post('/parties', data)).data.data,
  update: async (id: number, data: object) => (await api.put(`/parties/${id}`, data)).data.data,
  uploadSymbol: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('symbol', file);
    return (await api.post(`/parties/${id}/symbol`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
  },
  delete: async (id: number) => (await api.delete(`/parties/${id}`)).data,
};

export const candidateService = {
  getAll: async (electionId?: number, constituencyId?: number) =>
    (await api.get('/candidates', { params: { electionId, constituencyId } })).data.data,
  getById: async (id: number) => (await api.get(`/candidates/${id}`)).data.data,
  create: async (data: object) => (await api.post('/candidates', data)).data.data,
  update: async (id: number, data: object) => (await api.put(`/candidates/${id}`, data)).data.data,
  uploadPhoto: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return (await api.post(`/candidates/${id}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data.data;
  },
  delete: async (id: number) => (await api.delete(`/candidates/${id}`)).data,
};

export const officerService = {
  getAll: async () => (await api.get('/officers')).data.data,
  create: async (data: object) => (await api.post('/officers', data)).data.data,
  update: async (id: number, data: object) => (await api.put(`/officers/${id}`, data)).data.data,
  delete: async (id: number) => (await api.delete(`/officers/${id}`)).data,
};

export const voterService = {
  getAll: async (params?: object) => (await api.get('/voters', { params })).data,
  getById: async (id: number) => (await api.get(`/voters/${id}`)).data.data,
  create: async (data: object) => (await api.post('/voters', data)).data.data,
  bulkCreate: async (voters: object[]) => (await api.post('/voters/bulk', { voters })).data,
  update: async (id: number, data: object) => (await api.put(`/voters/${id}`, data)).data.data,
  delete: async (id: number) => (await api.delete(`/voters/${id}`)).data,
};

export const votingService = {
  getBallotCandidates: async (constituencyId?: number, electionId?: number) =>
    (await api.get('/voting/candidates', { params: { constituencyId, electionId } })).data.data,
  getPublicStations: async () =>
    (await api.get('/voting/polling-stations')).data.data,
  getPublicStationById: async (id: number) =>
    (await api.get(`/voting/polling-stations/${id}`)).data.data,
  initiateVerification: async (data: object) => (await api.post('/voting/verify/initiate', data)).data.data,
  verifyOTP: async (voterId: number, otp: string) =>
    (await api.post('/voting/verify/otp', { voterId, otp })).data.data,
  simulateBiometric: async (voterId: number, type: string) =>
    (await api.post('/voting/verify/biometric', { voterId, type })).data.data,
  castVote: async (data: object) => (await api.post('/voting/cast', data)).data.data,
  getVVPAT: async (referenceNumber: string) =>
    (await api.get(`/voting/vvpat/${referenceNumber}`)).data.data,
};

export const auditService = {
  getAll: async (params?: object) => (await api.get('/audit-logs', { params })).data,
};

// Helper to trigger authenticated file download from binary blob response
const downloadBlob = async (url: string, filename: string): Promise<void> => {
  const response = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || 'application/octet-stream',
  });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(link.href);
};

export const reportService = {
  downloadElectionSummaryPDF: async (electionId: number) =>
    downloadBlob(`/reports/election/${electionId}/summary/pdf`, `election-${electionId}-summary.pdf`),
  downloadResultsExcel: async (electionId: number) =>
    downloadBlob(`/reports/election/${electionId}/results/excel`, `election-${electionId}-results.xlsx`),
  downloadVotersExcel: async (stationId: number) =>
    downloadBlob(`/reports/station/${stationId}/voters/excel`, `station-${stationId}-voters.xlsx`),
  downloadAuditLogPDF: async () =>
    downloadBlob('/reports/audit-log/pdf', `audit-log-${new Date().toISOString().split('T')[0]}.pdf`),
};
