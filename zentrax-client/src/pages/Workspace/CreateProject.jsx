import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase';
import { API_BASE_URL } from '../../apiConfig';
import {
    Loader2, ArrowRight, FolderKanban, Users, Sparkles,
    GraduationCap, Send, X, Check, Info
} from 'lucide-react';

const DOMAINS = ['Web Development', 'Mobile App', 'AI/ML', 'Data Science', 'IoT', 'Cybersecurity', 'Cloud Computing', 'Game Development', 'Other'];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
const TIMELINES = ['1 month', '2 months', '3 months', '6 months', '1 year'];

const CreateProject = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [phase, setPhase] = useState('form'); // form | matching
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        title: '', description: '', domain: '', teamSize: 3, difficulty: 'Intermediate', timeline: '3 months'
    });
    const [skills, setSkills] = useState([]);
    const [skillInput, setSkillInput] = useState('');
    const [projectId, setProjectId] = useState(null);

    // AI Matching
    const [teamMatches, setTeamMatches] = useState([]);
    const [mentorMatches, setMentorMatches] = useState([]);
    const [matchLoading, setMatchLoading] = useState(false);
    const [invitedIds, setInvitedIds] = useState(new Set());
    const [requestedIds, setRequestedIds] = useState(new Set());

    const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const addSkill = () => {
        const val = skillInput.trim();
        if (val && !skills.includes(val)) { setSkills([...skills, val]); setSkillInput(''); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.description) { setError('Title and description are required'); return; }
        
        const parsedTeamSize = parseInt(form.teamSize);
        if (isNaN(parsedTeamSize) || parsedTeamSize < 2 || parsedTeamSize > 8) { 
            setError('Team size must be between 2 and 8'); 
            return; 
        }

        setLoading(true);
        setError('');
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    ...form,
                    requiredSkills: skills,
                    techStack: skills,
                    teamSize: parseInt(form.teamSize) || 3,
                    createdBy: user.uid
                })
            });

            if (!res.ok) throw new Error('Failed to create project');
            const data = await res.json();
            const newId = data.id || data.projectId || data.project?.id;
            setProjectId(newId);
            setPhase('matching');

            // Run AI matching
            setMatchLoading(true);
            const matchBody = {
                title: form.title,
                description: form.description,
                techStack: skills,
                requiredSkills: skills,
                teamSize: parseInt(form.teamSize) || 3,
                domain: form.domain,
                difficulty: form.difficulty
            };

            const [teamRes, mentorRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/matching/team`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(matchBody)
                }).catch(() => null),
                fetch(`${API_BASE_URL}/api/matching/mentor`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ projectTitle: form.title, projectDescription: form.description, techStack: skills, domain: form.domain })
                }).catch(() => null)
            ]);

            if (teamRes?.ok) {
                const d = await teamRes.json();
                setTeamMatches(d.matches || []);
            }
            if (mentorRes?.ok) {
                const d = await mentorRes.json();
                setMentorMatches(d.matches || []);
            }
            setMatchLoading(false);
        } catch (err) {
            setError(err.message || 'Failed to create project');
        }
        setLoading(false);
    };

    const inviteMember = async (memberId) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            await fetch(`${API_BASE_URL}/api/team-invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ projectId, inviteeId: memberId })
            });
            setInvitedIds(prev => new Set(prev).add(memberId));
        } catch (err) {
            console.error('Invite failed:', err);
        }
    };

    const requestMentor = async (mentorId) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            await fetch(`${API_BASE_URL}/api/mentor/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ projectId, mentorId })
            });
            setRequestedIds(prev => new Set(prev).add(mentorId));
        } catch (err) {
            console.error('Mentor request failed:', err);
        }
    };

    // Matching Phase
    if (phase === 'matching') {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Check className="h-5 w-5" style={{ color: '#4F46E5' }} /> Project Created
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">AI is finding the best teammates and mentors for "{form.title}"</p>
                    </div>
                    <button onClick={() => navigate(`/projects/${projectId}`)} className="zen-btn-secondary text-sm">
                        Go to Project <ArrowRight className="h-3.5 w-3.5 ml-1 inline" />
                    </button>
                </div>

                {matchLoading ? (
                    <div className="space-y-6">
                        <div className="text-center py-6">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: '#4F46E5' }} />
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">Analyzing Project Scope</h3>
                            <p className="text-sm text-slate-500">Our AI is matching your requirements with the best available students and mentors...</p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="zen-card p-4 space-y-4">
                                <div className="h-5 w-40 bg-slate-100 rounded animate-pulse"></div>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-3 items-start">
                                        <div className="h-9 w-9 bg-slate-100 rounded-lg animate-pulse flex-shrink-0"></div>
                                        <div className="flex-1 space-y-2 mt-1">
                                            <div className="h-4 w-24 bg-slate-100 rounded animate-pulse"></div>
                                            <div className="h-3 w-full bg-slate-50 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="zen-card p-4 space-y-4">
                                <div className="h-5 w-40 bg-slate-100 rounded animate-pulse"></div>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-3 items-start">
                                        <div className="h-9 w-9 bg-slate-100 rounded-lg animate-pulse flex-shrink-0"></div>
                                        <div className="flex-1 space-y-2 mt-1">
                                            <div className="h-4 w-24 bg-slate-100 rounded animate-pulse"></div>
                                            <div className="h-3 w-full bg-slate-50 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Team Matches */}
                        <div className="zen-card">
                            <div className="p-4" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                    <Users className="h-4 w-4" style={{ color: '#3b82f6' }} /> Recommended Teammates
                                </h2>
                            </div>
                            {teamMatches.length === 0 ? (
                                <div className="zen-empty py-10">
                                    <p className="zen-empty-title">No direct matches</p>
                                    <p className="zen-empty-desc">Consider broadening your Required Skills to find more teammates.</p>
                                    <button onClick={() => navigate('/find-team')} className="mt-4 text-xs font-medium px-3 py-1.5 rounded-md" style={{ background: 'rgba(79,70,229,0.1)', color: '#4F46E5' }}>Browse Team Finder</button>
                                </div>
                            ) : teamMatches.map(match => (
                                <div key={match.id} className="p-3 flex items-start gap-3" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                                    <div className="zen-avatar h-9 w-9 text-xs" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.2)' }}>
                                        {(match.name || 'S').charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900">{match.name}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{match.reason}</p>
                                        {match.skills?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {match.skills.slice(0, 3).map(s => <span key={s} className="zen-badge-neutral text-[10px]">{s}</span>)}
                                                {match.skills.length > 3 && (
                                                    <span className="zen-badge-neutral text-[10px]">+{(match.skills.length - 3)} more</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => inviteMember(match.id)}
                                        disabled={invitedIds.has(match.id)}
                                        className={`text-xs px-2.5 py-1 rounded-md font-medium flex-shrink-0 ${
                                            invitedIds.has(match.id) ? 'opacity-50 cursor-default' : ''
                                        }`}
                                        style={{
                                            background: invitedIds.has(match.id) ? 'rgba(15,23,42,0.05)' : 'rgba(59,130,246,0.1)',
                                            color: invitedIds.has(match.id) ? '#64748B' : '#3b82f6',
                                            border: `1px solid ${invitedIds.has(match.id) ? 'var(--color-zen-border)' : 'rgba(59,130,246,0.2)'}`
                                        }}
                                    >
                                        {invitedIds.has(match.id) ? '✓ Invited' : 'Invite'}
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Mentor Matches */}
                        <div className="zen-card">
                            <div className="p-4" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4" style={{ color: '#4F46E5' }} /> Recommended Mentors
                                </h2>
                            </div>
                            {mentorMatches.length === 0 ? (
                                <div className="zen-empty py-10">
                                    <p className="zen-empty-title">No mentor matches yet</p>
                                    <p className="zen-empty-desc">Mentors will be notified of your new project based on its domain.</p>
                                </div>
                            ) : mentorMatches.map(match => (
                                <div key={match.id} className="p-3 flex items-start gap-3" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                                    <div className="zen-match-score text-xs w-9 h-9">{match.score || '—'}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900">{match.name}</p>
                                        <p className="text-xs text-slate-500">{match.profession} · {match.yearsOfExperience || 0}y exp</p>
                                        <p className="text-xs mt-0.5" style={{ color: '#4F46E5' }}>{match.reason}</p>
                                    </div>
                                    <button
                                        onClick={() => requestMentor(match.id)}
                                        disabled={requestedIds.has(match.id)}
                                        className={`text-xs px-2.5 py-1 rounded-md font-medium flex-shrink-0 ${requestedIds.has(match.id) ? 'opacity-50 cursor-default' : ''}`}
                                        style={{
                                            background: requestedIds.has(match.id) ? 'rgba(15,23,42,0.05)' : 'rgba(79,70,229,0.1)',
                                            color: requestedIds.has(match.id) ? '#64748B' : '#4F46E5',
                                            border: `1px solid ${requestedIds.has(match.id) ? 'var(--color-zen-border)' : 'rgba(79,70,229,0.2)'}`
                                        }}
                                    >
                                        {requestedIds.has(match.id) ? '✓ Requested' : 'Request'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="text-center">
                    <button onClick={() => navigate('/projects/my')} className="zen-btn-secondary">
                        Skip to My Projects
                    </button>
                </div>
            </div>
        );
    }

    // Form Phase
    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <FolderKanban className="h-5 w-5" style={{ color: '#4F46E5' }} /> Create Project
                </h1>
                <p className="text-sm text-slate-500 mt-1">Define your project and let AI find the best team</p>
            </div>

            <form onSubmit={handleSubmit} className="zen-card p-6 space-y-5">
                <div>
                    <label className="zen-label">Title *</label>
                    <input type="text" value={form.title} onChange={e => updateField('title', e.target.value)} className="zen-input" placeholder="e.g. Smart Campus App" required />
                </div>
                <div>
                    <label className="zen-label">Description *</label>
                    <textarea value={form.description} onChange={e => updateField('description', e.target.value)} className="zen-input resize-none" rows={4} placeholder="Describe what your project does..." required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="zen-label flex items-center gap-1 group relative w-max">
                            Domain
                            <Info className="h-3 w-3 text-slate-400 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-lg z-10 before:content-[''] before:absolute before:top-full before:left-4 before:border-4 before:border-transparent before:border-t-slate-800">
                                The technical field of your project (e.g., AI/ML, Web Development).
                            </div>
                        </label>
                        <select value={form.domain} onChange={e => updateField('domain', e.target.value)} className="zen-select mt-1">
                            <option value="">Select domain</option>
                            {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="zen-label">Team Size</label>
                        <input type="number" value={form.teamSize} onChange={e => updateField('teamSize', e.target.value)} className="zen-input" min="2" max="8" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="zen-label">Difficulty</label>
                        <select value={form.difficulty} onChange={e => updateField('difficulty', e.target.value)} className="zen-select">
                            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="zen-label">Timeline</label>
                        <select value={form.timeline} onChange={e => updateField('timeline', e.target.value)} className="zen-select">
                            {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="zen-label">Required Skills <span className="text-slate-500 font-normal">(type & press Enter)</span></label>
                    <div className="flex gap-2">
                        <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} className="zen-input flex-1" placeholder="e.g. React, Python" />
                        <button type="button" onClick={addSkill} className="zen-btn-secondary px-3">Add</button>
                    </div>
                    {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {skills.map((s, i) => (
                                <span key={i} className="zen-badge flex items-center gap-1">
                                    {s} <button type="button" onClick={() => setSkills(skills.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {error && <p className="text-xs text-red-400 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)' }}>{error}</p>}

                <button type="submit" disabled={loading} className="zen-btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" /> Create & Find Team</>}
                </button>
            </form>
        </div>
    );
};

export default CreateProject;