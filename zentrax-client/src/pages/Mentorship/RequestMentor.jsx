import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../apiConfig';
import { auth } from '../../firebase';
import {
    GraduationCap, Search, User, Send, Loader2, CheckCircle,
    Sparkles, Briefcase, Clock, ArrowRight
} from 'lucide-react';

const RequestMentor = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const urlProjectId = searchParams.get('projectId') || searchParams.get('id') || '';

    const [mentors, setMentors] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedMentor, setSelectedMentor] = useState(null);
    const [selectedProject, setSelectedProject] = useState(urlProjectId || '');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // AI matching
    const [aiMatches, setAiMatches] = useState([]);
    const [matchLoading, setMatchLoading] = useState(false);
    const [matchError, setMatchError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = await auth.currentUser?.getIdToken();
                const headers = { 'Authorization': `Bearer ${token}` };

                const [mentorsRes, projectsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/mentor/list`, { headers }),
                    fetch(`${API_BASE_URL}/api/projects/user`, { headers })
                ]);

                const mentorsData = await mentorsRes.json();
                const projectsData = await projectsRes.json();

                if (mentorsData.mentors) setMentors(mentorsData.mentors);
                const projectsList = projectsData.data?.projects || projectsData.projects || (Array.isArray(projectsData) ? projectsData : []);
                
                // Filter: Only show projects created/owned by the user AND where a mentor is not already assigned
                const filteredProjects = projectsList.filter(p => {
                    const isCreator = p.createdBy === user?.uid || p.authorId === user?.uid || p.owner_id === user?.uid;
                    const hasNoMentor = !p.mentorId;
                    return isCreator && hasNoMentor;
                });
                setProjects(filteredProjects);
            } catch (err) {
                console.error('Error fetching data:', err);
            }
            setLoading(false);
        };
        if (user) fetchData();
    }, [user]);

    const runAiMatch = async () => {
        setMatchLoading(true); setMatchError(''); setAiMatches([]);
        try {
            const token = await auth.currentUser?.getIdToken();
            const selectedProj = projects.find(p => p.id === selectedProject);
            const res = await fetch(`${API_BASE_URL}/api/matching/mentor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    projectTitle: selectedProj?.title || '',
                    projectDescription: selectedProj?.description || '',
                    techStack: selectedProj?.techStack || [],
                    domain: selectedProj?.domain || ''
                })
            });
            const data = await res.json();
            if (data.matches?.length > 0) setAiMatches(data.matches);
            else setMatchError(data.message || 'No mentor matches found.');
        } catch { setMatchError('AI matching service unavailable.'); }
        setMatchLoading(false);
    };

    useEffect(() => {
        // Clear previous AI matches if project changes
        setAiMatches([]);
        setMatchError('');
    }, [selectedProject]);

    // Auto-run matching if project is pre-selected on load, or reset if not eligible
    useEffect(() => {
        if (projects.length > 0 && selectedProject) {
            const proj = projects.find(p => p.id === selectedProject);
            if (proj) {
                if (aiMatches.length === 0 && !matchLoading) {
                    runAiMatch();
                }
            } else {
                setSelectedProject('');
            }
        }
    }, [projects, selectedProject]);

    const sendRequest = async () => {
        if (!selectedMentor || !selectedProject) {
            setError('Please select a mentor and a project');
            return;
        }
        setSending(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/mentor/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
                },
                body: JSON.stringify({
                    mentorId: selectedMentor.id,
                    projectId: selectedProject,
                    message
                })
            });
            const data = await response.json();
            if (response.ok) {
                setSent(true);
            } else {
                setError(data.error || 'Failed to send request');
            }
        } catch (err) {
            setError(`Connection error: ${err.message}. Please try again.`);
        }
        setSending(false);
    };

    const filteredMentors = mentors.filter(m =>
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
        m.expertise?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const sortedMentors = [...filteredMentors].sort((a, b) => {
        const aMatch = aiMatches.find(m => m.id === a.id);
        const bMatch = aiMatches.find(m => m.id === b.id);
        if (aMatch && bMatch) return bMatch.score - aMatch.score;
        if (aMatch) return -1;
        if (bMatch) return 1;
        return 0;
    });

    if (sent) {
        return (
            <div className="max-w-md mx-auto py-20 text-center space-y-6 animate-fade-in">
                <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'rgba(79,70,229,0.1)' }}>
                    <CheckCircle className="h-8 w-8" style={{ color: '#4F46E5' }} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Request Sent</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Your mentorship request has been sent to <strong className="text-slate-900 dark:text-white">{selectedMentor.name}</strong>. You'll be notified when they respond.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <Link to="/student-dashboard" className="zen-btn-primary">Back to Dashboard</Link>
                    <button
                        onClick={() => { setSent(false); setSelectedMentor(null); setSelectedProject(''); setMessage(''); }}
                        className="zen-btn-secondary"
                    >
                        Send Another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" style={{ color: '#4F46E5' }} />
                    Find a Mentor
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Browse mentors or use AI to find the best match for your project.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Mentor List */}
                <div className="lg:col-span-2 space-y-4">
                    {/* AI Matching */}
                    <div className="zen-card p-5 space-y-4">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 animate-pulse-soft" style={{ color: '#4F46E5' }} />
                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">AI Mentor Matching</span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                                        Select Project to Analyze
                                    </label>
                                    <select
                                        value={selectedProject}
                                        onChange={(e) => setSelectedProject(e.target.value)}
                                        className="zen-select text-xs h-10"
                                    >
                                        <option value="">Select project...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={runAiMatch}
                                    disabled={matchLoading || !selectedProject}
                                    className="zen-btn-primary text-xs h-10 px-4 flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {matchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                    {matchLoading ? 'Analyzing...' : 'Find Best Match'}
                                </button>
                            </div>
                        </div>

                        {selectedProject && (
                            <div className="p-3.5 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 text-xs space-y-2 animate-fade-in">
                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                        <Briefcase className="h-3.5 w-3.5" /> Technical Requirements
                                    </span>
                                    {projects.find(p => p.id === selectedProject)?.domain && (
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold scale-[0.85] origin-right">
                                            {projects.find(p => p.id === selectedProject)?.domain}
                                        </span>
                                    )}
                                </div>
                                {(() => {
                                    const p = projects.find(proj => proj.id === selectedProject);
                                    const skills = [...new Set([...(p?.techStack || []), ...(p?.requiredSkills || [])])];
                                    return skills.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {skills.map((skill, idx) => (
                                                <span key={idx} className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 dark:text-slate-500 italic">No specific technical requirements listed.</p>
                                    );
                                })()}
                            </div>
                        )}

                        {matchError && (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 p-2.5 rounded-lg border border-yellow-100 dark:border-yellow-900/30">{matchError}</p>
                        )}

                        {aiMatches.length > 0 && (
                            <div className="space-y-2.5 pt-1">
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    AI Recommendations for the selected project:
                                </p>
                                <div className="grid grid-cols-1 gap-2">
                                    {aiMatches.map(match => (
                                        <button
                                            key={match.id}
                                            onClick={() => setSelectedMentor(mentors.find(m => m.id === match.id) || { id: match.id, name: match.name, expertise: match.expertise || [] })}
                                            className="w-full text-left p-3.5 rounded-xl transition-all border group text-xs relative overflow-hidden"
                                            style={{
                                                background: selectedMentor?.id === match.id ? 'rgba(79,70,229,0.06)' : 'var(--color-zen-surface)',
                                                borderColor: selectedMentor?.id === match.id ? 'rgba(79,70,229,0.3)' : 'var(--color-zen-border)',
                                            }}
                                        >
                                            <div className="flex gap-3 items-start">
                                                <div className="zen-match-score text-xs w-9 h-9 font-bold shrink-0">{match.score || '—'}%</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 justify-between">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{match.name}</p>
                                                        {selectedMentor?.id === match.id && (
                                                            <CheckCircle className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                        {match.profession} {match.yearsOfExperience ? `· ${match.yearsOfExperience}y exp` : ''}
                                                    </p>
                                                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 italic">
                                                        "{match.reason}"
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            className="zen-input pl-10"
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder="Search mentors by name or skill..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Mentor List */}
                    <div className="space-y-2">
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="zen-card p-4 flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full zen-skeleton" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-32 zen-skeleton" />
                                        <div className="h-2 w-48 zen-skeleton" />
                                    </div>
                                </div>
                            ))
                        ) : sortedMentors.length === 0 ? (
                            <div className="zen-empty">
                                <GraduationCap className="h-10 w-10 zen-empty-icon" />
                                <p className="zen-empty-title">No mentors found</p>
                                <p className="zen-empty-desc">Try different search terms or ask admin to add mentors.</p>
                            </div>
                        ) : (
                            sortedMentors.map(mentor => {
                                const matchInfo = aiMatches.find(m => m.id === mentor.id);
                                return (
                                    <button
                                        key={mentor.id}
                                        onClick={() => setSelectedMentor(mentor)}
                                        className="w-full text-left p-4 rounded-lg transition-all border"
                                        style={{
                                            background: selectedMentor?.id === mentor.id ? 'rgba(79,70,229,0.06)' : 'var(--color-zen-surface)',
                                            borderColor: selectedMentor?.id === mentor.id ? 'rgba(79,70,229,0.3)' : 'var(--color-zen-border)',
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="zen-avatar h-10 w-10 text-sm">
                                                {mentor.name?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{mentor.name || 'Mentor'}</p>
                                                    {mentor.yearsOfExperience && (
                                                        <span className="zen-badge-neutral flex items-center gap-1">
                                                            <Clock className="h-2.5 w-2.5" />
                                                            {mentor.yearsOfExperience}y
                                                        </span>
                                                    )}
                                                    {matchInfo && (
                                                        <span className="zen-badge flex items-center gap-1 text-[10px] scale-[0.9] origin-left">
                                                            <Sparkles className="h-2.5 w-2.5 text-indigo-600 dark:text-indigo-400" />
                                                            {matchInfo.score}% Match
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                                    {mentor.profession || mentor.bio || mentor.email}
                                                </p>
                                                {(mentor.skills || mentor.expertise)?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {(mentor.expertise || mentor.skills).slice(0, 4).map(skill => (
                                                            <span key={skill} className="zen-badge text-[10px]">{skill}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {selectedMentor?.id === mentor.id && (
                                                <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#4F46E5' }} />
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right: Request Form */}
                <div className="space-y-4">
                    <div className="zen-card p-5 space-y-4 sticky top-6">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <Send className="h-4 w-4" style={{ color: '#4F46E5' }} />
                            Send Request
                        </h3>

                        {/* Selected Mentor */}
                        <div>
                            <label className="zen-label text-xs">Selected Mentor</label>
                            {selectedMentor ? (
                                <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.15)' }}>
                                    <div className="zen-avatar h-7 w-7 text-xs">{selectedMentor.name?.charAt(0)?.toUpperCase()}</div>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">{selectedMentor.name}</span>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 dark:text-[#94A3B8] p-2.5 rounded-lg" style={{ border: '1px dashed var(--color-zen-border)' }}>
                                    ← Select a mentor
                                </p>
                            )}
                        </div>

                        {/* Project */}
                        <div>
                            <label className="zen-label text-xs">Project</label>
                            {selectedProject ? (
                                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 animate-fade-in">
                                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                        {projects.find(p => p.id === selectedProject)?.title || 'Selected Project'}
                                    </span>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 dark:text-[#94A3B8] p-2.5 rounded-lg" style={{ border: '1px dashed var(--color-zen-border)' }}>
                                    ← Select a project on the left
                                </p>
                            )}
                        </div>

                        {/* Message */}
                        <div>
                            <label className="zen-label text-xs">Message (optional)</label>
                            <textarea
                                rows="3"
                                className="zen-input resize-none"
                                placeholder="What help do you need?"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-400 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)' }}>{error}</p>
                        )}

                        <button
                            onClick={sendRequest}
                            disabled={!selectedMentor || !selectedProject || sending}
                            className="zen-btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            {sending ? 'Sending...' : 'Send Request'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequestMentor;