import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../apiConfig';
import {
    HelpCircle, Send, MessageSquare, AlertCircle, Loader2, Clock, CheckCircle2,
    ChevronDown, Upload, X, FileText, Image as ImageIcon, Paperclip, File
} from 'lucide-react';
import Toast from '../../components/Toast';

const STATUS_STYLES = {
    'Open': 'bg-orange-100 dark:bg-orange-900/30 text-orange-600',
    'In Progress': 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    'Resolved': 'bg-green-100 dark:bg-green-900/30 text-green-600',
    'Pending': 'bg-orange-100 dark:bg-orange-900/30 text-orange-600',
    'Answered': 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    'Closed': 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400',
};

const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf', 'text/plain',
    'application/zip', 'application/json',
    'text/javascript', 'application/javascript',
    'text/x-python',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ATTACHMENTS = 5;

const FILE_ICONS = {
    'image': ImageIcon,
    'application/pdf': FileText,
    'text': FileText,
    'application': File,
};

function getFileIcon(mime) {
    if (mime.startsWith('image/')) return ImageIcon;
    if (mime === 'application/pdf') return FileText;
    return File;
}

const SubmitDoubt = () => {
    const [problemDescription, setProblemDescription] = useState('');
    const [whatTried, setWhatTried] = useState('');
    const [projectId, setProjectId] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [projects, setProjects] = useState([]);
    const [myDoubts, setMyDoubts] = useState([]);
    const [doubtsLoading, setDoubtsLoading] = useState(true);
    const { user } = useAuth();
    const [toast, setToast] = useState(null);
    const [attachments, setAttachments] = useState([]); // { file, preview?, uploading?, uploaded?, url?, error? }
    const [dragOver, setDragOver] = useState(false);
    const dropRef = useRef(null);
    const fileInputRef = useRef(null);
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const pid = params.get('projectId');
        if (pid) setProjectId(pid);
    }, [location]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const token = await user.getIdToken();
                const headers = { 'Authorization': `Bearer ${token}` };

                const [projRes, doubtsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/projects/user`, { headers }),
                    fetch(`${API_BASE_URL}/api/mentorship/my-doubts`, { headers })
                ]);

                const projData = await projRes.json();
                const doubtsData = await doubtsRes.json();

                if (projData.success && projData.data?.projects) {
                    setProjects(projData.data.projects);
                } else if (projData.projects) {
                    setProjects(projData.projects.filter(p =>
                        p.createdBy === user.uid || p.members?.includes(user.uid)
                    ));
                }

                if (doubtsData.success && doubtsData.data?.doubts) {
                    setMyDoubts(doubtsData.data.doubts);
                } else if (doubtsData.doubts) {
                    setMyDoubts(doubtsData.doubts);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            }
            setDoubtsLoading(false);
        };
        fetchData();
    }, [user, success]);

    const addFiles = useCallback((files) => {
        const remaining = MAX_ATTACHMENTS - attachments.length;
        if (remaining <= 0) {
            setToast({ message: `Maximum ${MAX_ATTACHMENTS} attachments allowed`, type: 'warning' });
            return;
        }

        const newFiles = [];
        for (let i = 0; i < Math.min(files.length, remaining); i++) {
            const file = files[i];
            if (file.size > MAX_FILE_SIZE) {
                setToast({ message: `${file.name} is too large (max 5 MB)`, type: 'error' });
                continue;
            }
            const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
            newFiles.push({ file, preview, uploading: false, uploaded: false, url: null, error: null });
        }
        setAttachments(prev => [...prev, ...newFiles]);
    }, [attachments.length]);

    const removeAttachment = (index) => {
        setAttachments(prev => {
            const copy = [...prev];
            if (copy[index].preview) URL.revokeObjectURL(copy[index].preview);
            copy.splice(index, 1);
            return copy;
        });
    };

    const uploadAttachment = async (index) => {
        const att = attachments[index];
        if (att.uploaded || att.uploading) return att.url;

        setAttachments(prev => prev.map((a, i) => i === index ? { ...a, uploading: true } : a));

        try {
            const token = await user.getIdToken();
            const formData = new FormData();
            formData.append('file', att.file);
            if (projectId) formData.append('projectId', projectId);

            const res = await fetch(`${API_BASE_URL}/api/upload/attachment`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();

            if (data.success && data.file?.file_url) {
                const url = `${API_BASE_URL}${data.file.file_url}`;
                setAttachments(prev => prev.map((a, i) => i === index ? { ...a, uploading: false, uploaded: true, url } : a));
                return url;
            } else {
                setAttachments(prev => prev.map((a, i) => i === index ? { ...a, uploading: false, error: data.error || 'Upload failed' } : a));
                return null;
            }
        } catch {
            setAttachments(prev => prev.map((a, i) => i === index ? { ...a, uploading: false, error: 'Upload failed' } : a));
            return null;
        }
    };

    // Drag and drop handlers
    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = () => setDragOver(false);
    const handleDrop = (e) => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Upload all attachments first
        const uploadedAttachments = [];
        for (let i = 0; i < attachments.length; i++) {
            const url = await uploadAttachment(i);
            if (url) {
                uploadedAttachments.push({
                    file_name: attachments[i].file.name,
                    file_url: url,
                    file_type: attachments[i].file.type,
                    uploaded_at: new Date().toISOString()
                });
            }
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/mentorship`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.getIdToken()}`
                },
                body: JSON.stringify({
                    problemDescription,
                    whatTried,
                    projectId: projectId || undefined,
                    attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined
                })
            });

            if (response.ok) {
                const data = await response.json();
                setSuccess(true);
                setProblemDescription('');
                setWhatTried('');
                setProjectId('');
                setAttachments([]);
                setToast({
                    message: data.emailSent
                        ? 'Doubt submitted successfully. Email notification sent to the mentor.'
                        : data.emailMessage || 'Doubt submitted successfully.',
                    type: data.emailSent ? 'success' : 'warning'
                });
                setTimeout(() => { setSuccess(false); setToast(null); }, 5000);
            }
        } catch (err) {
            console.error('Submit Doubt Error:', err);
            setToast({ message: 'Failed to submit doubt. Please try again.', type: 'error' });
        }
        setLoading(false);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                    <HelpCircle className="h-8 w-8 mr-3 text-primary-600" />
                    Mentorship Support
                </h1>
                <p className="text-gray-500 mt-2">Stuck on a tricky bug? Get expert guidance from our Alumni mentors.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden p-8">
                        {success ? (
                            <div className="text-center py-12 space-y-4">
                                <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                    <Send className="h-8 w-8" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Doubt Submitted!</h2>
                                <p className="text-gray-500 max-w-xs mx-auto text-sm">A mentor will review your request and get back shortly. You'll receive a notification.</p>
                                <button onClick={() => setSuccess(false)}
                                    className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-500 transition-all">
                                    Ask Another Doubt
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Project Selection */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Related Project</label>
                                    <div className="relative">
                                        <select value={projectId} onChange={e => setProjectId(e.target.value)}
                                            className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 transition-all appearance-none">
                                            <option value="">Select a project (optional)</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Problem Description</label>
                                    <textarea required rows="4"
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 transition-all resize-none"
                                        placeholder="Describe the issue you're facing in detail..."
                                        value={problemDescription} onChange={(e) => setProblemDescription(e.target.value)} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">What have you tried?</label>
                                    <textarea required rows="4"
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 transition-all resize-none"
                                        placeholder="List the steps or solutions you've already attempted..."
                                        value={whatTried} onChange={(e) => setWhatTried(e.target.value)} />
                                </div>

                                {/* ═══ File Attachments ═══ */}
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                                        <Paperclip className="h-4 w-4 mr-1.5 text-gray-400" />
                                        Attachments
                                        <span className="text-xs text-gray-400 font-normal ml-2">({attachments.length}/{MAX_ATTACHMENTS})</span>
                                    </label>

                                    {/* Drop Zone */}
                                    <div ref={dropRef} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                                            dragOver
                                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                        }`}>
                                        <Upload className={`h-8 w-8 mx-auto mb-2 ${dragOver ? 'text-primary-500' : 'text-gray-300'}`} />
                                        <p className="text-sm text-gray-500">
                                            <span className="font-semibold text-primary-600">Click to upload</span> or drag files here
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">Images, PDFs, TXT, ZIP, JSON, JS, PY — Max 5 MB each</p>
                                        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => addFiles(Array.from(e.target.files))} />
                                    </div>

                                    {/* Attachment Previews */}
                                    {attachments.length > 0 && (
                                        <div className="space-y-2">
                                            {attachments.map((att, i) => {
                                                const Icon = getFileIcon(att.file.type);
                                                return (
                                                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                                                        {att.preview ? (
                                                            <img src={att.preview} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                                                                <Icon className="h-5 w-5 text-primary-600" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{att.file.name}</p>
                                                            <p className="text-xs text-gray-400">{(att.file.size / 1024).toFixed(1)} KB
                                                                {att.uploading && <span className="ml-2 text-primary-500">Uploading...</span>}
                                                                {att.uploaded && <span className="ml-2 text-green-500">✓ Uploaded</span>}
                                                                {att.error && <span className="ml-2 text-red-500">{att.error}</span>}
                                                            </p>
                                                        </div>
                                                        <button type="button" onClick={() => removeAttachment(i)}
                                                            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2">
                                    <button type="submit" disabled={loading || !problemDescription || !whatTried}
                                        className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center disabled:opacity-50">
                                        {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2" />}
                                        {loading && attachments.some(a => !a.uploaded) ? 'Uploading & Submitting...' : 'Submit to Mentors'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Info Sidebar */}
                <div className="space-y-6">
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-200 dark:border-amber-800/30">
                        <h3 className="font-bold text-slate-800 dark:text-amber-200 flex items-center mb-3">
                            <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                            Before you ask...
                        </h3>
                        <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-3 list-disc pl-4 leading-relaxed">
                            <li>Check if the <strong>ZENTRAX-AI assistant</strong> can solve it first.</li>
                            <li>Provide exact <strong>error messages</strong> or code snippets.</li>
                            <li>Attach <strong>screenshots</strong> or error files for clarity.</li>
                            <li>Mentors usually respond within <strong>24 hours</strong>.</li>
                            <li>Be clear and respectful in your request.</li>
                        </ul>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center mb-3">
                            <MessageSquare className="h-4 w-4 mr-2 text-primary-500" /> Recent Responses
                        </h3>
                        {myDoubts.filter(d => d.status === 'Resolved' || d.status === 'Answered').length === 0 ? (
                            <p className="text-sm text-gray-500">No resolved doubts yet.</p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {myDoubts.filter(d => d.status === 'Resolved' || d.status === 'Answered').slice(0, 3).map(d => (
                                    <div key={d.id} className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/30">
                                        <p className="text-xs text-gray-900 dark:text-white font-medium truncate">{d.problemDescription?.substring(0, 60)}...</p>
                                        {d.mentorResponse && <p className="text-xs text-green-600 dark:text-green-400 mt-1 truncate">→ {d.mentorResponse.substring(0, 50)}...</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* My Doubts Section */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                        <HelpCircle className="h-5 w-5 mr-2 text-primary-500" /> My Doubts
                        {myDoubts.length > 0 && <span className="ml-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{myDoubts.length}</span>}
                    </h3>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-96 overflow-y-auto">
                    {doubtsLoading ? (
                        <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-300" /></div>
                    ) : myDoubts.length === 0 ? (
                        <div className="p-8 text-center">
                            <CheckCircle2 className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                            <p className="text-sm text-gray-400">No doubts submitted yet.</p>
                        </div>
                    ) : myDoubts.map(doubt => (
                        <div key={doubt.id} className="p-5 flex items-start gap-4">
                            <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 ${STATUS_STYLES[doubt.status] || STATUS_STYLES['Open']}`}>
                                {doubt.status}
                            </div>
                            <div className="flex-1 min-w-0">
                                {doubt.projectTitle && <p className="text-[10px] text-primary-600 font-medium mb-0.5">{doubt.projectTitle}</p>}
                                <p className="text-sm text-gray-900 dark:text-white font-medium line-clamp-2">{doubt.problemDescription}</p>
                                {doubt.attachments?.length > 0 && (
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <Paperclip className="h-3 w-3 text-gray-400" />
                                        <span className="text-[10px] text-gray-400">{doubt.attachments.length} attachment{doubt.attachments.length > 1 ? 's' : ''}</span>
                                    </div>
                                )}
                                {doubt.mentorResponse && (
                                    <div className="mt-2 p-2.5 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/30">
                                        <p className="text-xs text-green-700 dark:text-green-400"><span className="font-bold">Mentor:</span> {doubt.mentorResponse}</p>
                                    </div>
                                )}
                                <p className="text-[10px] text-gray-400 mt-1.5 flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />{new Date(doubt.createdAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SubmitDoubt;