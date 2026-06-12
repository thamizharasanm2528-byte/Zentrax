import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Loader2, AlertCircle, CheckCircle, XCircle, Eye, Clock } from 'lucide-react';
import { API_BASE_URL } from '../../apiConfig';
import { auth } from '../../firebase';

const API = `${API_BASE_URL}/api/admin`;
const STATUS_TABS = ['all', 'open', 'reviewed', 'resolved', 'ignored'];

const STATUS_CLASSES = {
    open: 'bg-red-50 text-red-700 border border-red-100',
    reviewed: 'bg-blue-50 text-blue-700 border border-blue-100',
    resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    ignored: 'bg-slate-100 text-slate-500 border border-slate-200',
};

const AdminReports = () => {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [toast, setToast] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);

    const getHeaders = useCallback(async () => {
        const token = await auth.currentUser?.getIdToken();
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    }, []);

    const fetchReports = useCallback(async () => {
        try {
            const headers = await getHeaders();
            const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
            const res = await fetch(`${API}/reports${params}`, { headers });
            const json = await res.json();
            if (json.success) setReports(json.data.reports);
            else if (json.reports) setReports(json.reports);
        } catch (err) {
            console.error('Fetch reports error:', err);
        } finally {
            setLoading(false);
        }
    }, [getHeaders, statusFilter]);

    useEffect(() => { setLoading(true); fetchReports(); }, [fetchReports]);

    const updateStatus = async (id, status) => {
        try {
            const headers = await getHeaders();
            await fetch(`${API}/reports/${id}`, {
                method: 'PUT', headers, body: JSON.stringify({ status })
            });
            setToast({ message: `Report marked as ${status}`, type: 'success' });
            setSelectedReport(null);
            fetchReports();
        } catch {
            setToast({ message: 'Failed to update report', type: 'error' });
        }
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {toast && (
                <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg animate-fade-in" style={{
                    background: toast.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: toast.type === 'success' ? '#10B981' : '#EF4444',
                    border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    backdropFilter: 'blur(8px)'
                }}>{toast.message}</div>
            )}

            {/* Detail Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedReport(null)}>
                    <div className="zen-card p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-semibold text-slate-900">Report Details</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: 'var(--color-zen-border)' }}>
                                <span className="text-slate-500 font-medium">Type:</span>
                                <span className="text-slate-900 font-semibold capitalize">{selectedReport.target_type}</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: 'var(--color-zen-border)' }}>
                                <span className="text-slate-500 font-medium">Target ID:</span>
                                <span className="text-slate-900 font-mono text-xs">{selectedReport.target_id || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: 'var(--color-zen-border)' }}>
                                <span className="text-slate-500 font-medium">Reason:</span>
                                <span className="text-slate-900 font-semibold">{selectedReport.reason}</span>
                            </div>
                            <div className="py-1">
                                <span className="text-slate-500 font-medium">Description:</span>
                                <p className="text-xs text-slate-500 mt-1 p-3 rounded-lg bg-slate-50 border border-slate-100 leading-relaxed max-h-32 overflow-y-auto" style={{ background: 'var(--color-zen-bg-secondary)', border: '1px solid var(--color-zen-border)' }}>
                                    {selectedReport.description || 'No description provided'}
                                </p>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: 'var(--color-zen-border)' }}>
                                <span className="text-slate-500 font-medium">Reported by:</span>
                                <span className="text-slate-900 font-semibold text-xs">{selectedReport.reporter_email || selectedReport.reported_by}</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: 'var(--color-zen-border)' }}>
                                <span className="text-slate-500 font-medium">Status:</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_CLASSES[selectedReport.status] || ''}`}>
                                    {selectedReport.status}
                                </span>
                            </div>
                        </div>
                        <div className="flex justify-between gap-3 pt-3">
                            <button onClick={() => setSelectedReport(null)} className="zen-btn-secondary text-sm">Close</button>
                            <div className="flex gap-2">
                                {selectedReport.status === 'open' && (
                                    <>
                                        <button onClick={() => updateStatus(selectedReport.id, 'reviewed')}
                                            className="zen-btn-primary text-xs px-3 py-1.5">Mark Reviewed</button>
                                        <button onClick={() => updateStatus(selectedReport.id, 'ignored')}
                                            className="zen-btn-secondary text-xs px-3 py-1.5">Ignore</button>
                                    </>
                                )}
                                {(selectedReport.status === 'open' || selectedReport.status === 'reviewed') && (
                                    <button onClick={() => updateStatus(selectedReport.id, 'resolved')}
                                        className="zen-btn-primary text-xs px-3 py-1.5">Resolve</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5" style={{ color: '#4F46E5' }} /> Reports & Moderation
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">{reports.length} reports found</p>
            </div>

            <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all capitalize ${
                            statusFilter === s
                                ? 'border-[#4F46E5] text-[#4F46E5]'
                                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-[#D1D5DB]'
                        }`}
                        style={{ background: statusFilter === s ? 'rgba(79, 70, 229, 0.06)' : 'transparent' }}
                    >{s}</button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin" style={{ color: '#4F46E5' }} /></div>
            ) : reports.length === 0 ? (
                <div className="zen-card zen-empty py-16">
                    <CheckCircle className="h-8 w-8 zen-empty-icon" />
                    <p className="zen-empty-title">No reports found</p>
                </div>
            ) : (
                <div className="zen-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm block md:table">
                            <thead className="hidden md:table-header-group">
                                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Target</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                                </tr>
                            </thead>
                            <tbody className="block md:table-row-group p-4 md:p-0">
                                {reports.map(r => (
                                    <tr key={r.id} className="block md:table-row hover:bg-slate-50/50 transition-colors mb-4 md:mb-0 border border-slate-100 md:border-0 rounded-xl md:rounded-none" style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                        <td className="block md:table-cell px-4 py-3 border-b border-slate-50 md:border-0">
                                            <p className="text-sm font-medium text-slate-900 capitalize">{r.target_type}</p>
                                            <p className="text-xs text-slate-500 font-mono truncate max-w-xs">{r.target_id}</p>
                                        </td>
                                        <td className="block md:table-cell px-4 py-2 md:py-3 border-b border-slate-50 md:border-0">
                                            <div className="flex md:block items-center justify-between">
                                                <span className="md:hidden text-xs text-slate-500 font-medium">Reason:</span>
                                                <span className="text-xs text-slate-500 truncate max-w-xs">{r.reason}</span>
                                            </div>
                                        </td>
                                        <td className="block md:table-cell px-4 py-2 md:py-3 border-b border-slate-50 md:border-0">
                                            <div className="flex md:block items-center justify-between">
                                                <span className="md:hidden text-xs text-slate-500 font-medium">Status:</span>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_CLASSES[r.status] || ''}`}>
                                                    {r.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="block md:table-cell px-4 py-2 md:py-3 border-b border-slate-50 md:border-0">
                                            <div className="flex md:block items-center justify-between">
                                                <span className="md:hidden text-xs text-slate-500 font-medium">Created:</span>
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="block md:table-cell px-4 py-3">
                                            <div className="flex justify-end">
                                                <button onClick={() => setSelectedReport(r)} className="p-1.5 text-slate-500 hover:text-[#4F46E5] rounded-md transition-colors">
                                                    <Eye className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReports;