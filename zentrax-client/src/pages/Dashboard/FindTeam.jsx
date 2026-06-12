import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase';
import { API_BASE_URL } from '../../apiConfig';
import { Link } from 'react-router-dom';
import {
    Users, Search, Loader2, Send, FolderKanban, Filter, AlertTriangle, X,
    Rocket, User, Zap, Clock, CheckCircle, AlertCircle
} from 'lucide-react';

const STATUS_COLORS = {
    'Planning': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    'Development': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    'Testing': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    'Completed': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    'Searching': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
};

const FindTeam = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [domainFilter, setDomainFilter] = useState('');
    const [requestedIds, setRequestedIds] = useState(new Set());
    const [myRequests, setMyRequests] = useState([]);
    const [visibleCount, setVisibleCount] = useState(12);
    const [errorBanner, setErrorBanner] = useState(null);

    // Lazy load on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 200) {
                setVisibleCount(prev => prev + 12);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (!user) return;
        const fetchProjects = async () => {
            try {
                const token = await auth.currentUser?.getIdToken();
                const headers = { 'Authorization': `Bearer ${token}` };

                const [projectsRes, requestsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/projects`, { headers }),
                    fetch(`${API_BASE_URL}/api/join/my-requests`, { headers })
                ]);

                if (projectsRes.ok) {
                    const data = await projectsRes.json();
                    const all = data.data?.projects || data.projects || (Array.isArray(data) ? data : []);
                    // Filter out user's own projects AND projects user already joined
                    setProjects(all.filter(p => 
                        p.createdBy !== user.uid && 
                        !(p.members || []).includes(user.uid)
                    ));
                }

                if (requestsRes.ok) {
                    const data = await requestsRes.json();
                    if (data.requests) setMyRequests(data.requests);
                }
            } catch (err) { 
                console.error('[FindTeam] Error fetching data:', err); 
            }
            setLoading(false);
        };
        fetchProjects();
    }, [user]);

    const requestJoin = async (projectId) => {
        // Optimistic UI update
        setRequestedIds(prev => new Set(prev).add(projectId));
        setMyRequests(prev => [...prev, { project_id: projectId, status: 'pending' }]);
        
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/join/request`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ projectId })
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to send request');
            }
        } catch (err) { 
            console.error('[FindTeam] Join error:', err);
            // Revert state on failure
            setRequestedIds(prev => {
                const next = new Set(prev);
                next.delete(projectId);
                return next;
            });
            setMyRequests(prev => prev.filter(r => !(r.project_id === projectId && r.status === 'pending')));
            // Show persistent error banner
            setErrorBanner(err.message || 'Failed to send join request. Please check your connection and try again.');
        }
    };

    const domains = [...new Set(projects.map(p => p.domain).filter(Boolean))];

    const filtered = projects.filter(p => {
        const matchSearch = !searchQuery || 
            p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.techStack || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.requiredSkills || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchDomain = !domainFilter || p.domain === domainFilter;
        return matchSearch && matchDomain;
    });

    if (loading) {
        return (
            <div className="flex justify-center py-32">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#4F46E5' }} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Persistent Error Banner */}
            {errorBanner && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 animate-fade-in">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>{errorBanner}</span>
                    </div>
                    <button onClick={() => setErrorBanner(null)} className="p-0.5 hover:bg-red-100 rounded transition-colors">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-5 w-5" style={{ color: '#4F46E5' }} /> Explore Projects
                </h1>
                <p className="text-sm text-slate-500 mt-1">Discover open projects and request to join a team</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        className="zen-input pl-10" 
                        style={{ paddingLeft: '2.5rem' }} 
                        placeholder="Search projects..." 
                    />
                </div>
                <select 
                    value={domainFilter} 
                    onChange={e => setDomainFilter(e.target.value)} 
                    className="zen-select w-full sm:w-auto min-w-[160px]"
                >
                    <option value="">All Domains</option>
                    {domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>

            {/* Projects */}
            {filtered.length === 0 ? (
                <div className="zen-card zen-empty py-16">
                    <FolderKanban className="h-10 w-10 zen-empty-icon" />
                    <p className="zen-empty-title">No open projects found</p>
                    <p className="zen-empty-desc">Check back later or try different filters</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filtered.slice(0, visibleCount).map(project => {
                        const isPending = myRequests.some(r => r.project_id === project.id && r.status === 'pending');
                        const isAccepted = myRequests.some(r => r.project_id === project.id && r.status === 'accepted');
                        const justSent = requestedIds.has(project.id);

                        // Calculate slotsLeft client side
                        const currentMembers = (project.members || []).length;
                        const maxSize = project.teamSize || 5;
                        const slotsLeft = project.slots_available !== undefined
                            ? project.slots_available
                            : Math.max(0, maxSize - currentMembers);

                        return (
                            <div 
                                key={project.id} 
                                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all overflow-hidden group flex flex-col justify-between"
                            >
                                {/* Card Body */}
                                <div className="p-6 space-y-4 flex-1">
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                                <Rocket className="h-6 w-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-gray-900 dark:text-white text-base truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {project.title}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <User className="h-3 w-3 text-gray-400" />
                                                    <span className="text-xs text-gray-500">{project.ownerName || project.owner_name || 'Project Owner'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg shrink-0 ${STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {project.status || 'Planning'}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                        {project.description}
                                    </p>

                                    {/* Requirement Note */}
                                    {project.requirement_note && (
                                        <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30 text-xs text-amber-700 dark:text-amber-400 animate-fade-in">
                                            <AlertCircle className="h-3 w-3 inline mr-1" />
                                            {project.requirement_note}
                                        </div>
                                    )}

                                    {/* Tech Stack */}
                                    {project.techStack?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {project.techStack.slice(0, 5).map(tech => (
                                                <span key={tech} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-full">
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Required Skills */}
                                    {project.requiredSkills?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {project.requiredSkills.slice(0, 5).map(skill => (
                                                <span key={skill} className="px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold rounded-full flex items-center">
                                                    <Zap className="h-2.5 w-2.5 mr-0.5" />{skill}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            <strong className={`${slotsLeft > 0 ? 'text-green-600' : 'text-red-500'}`}>{slotsLeft}</strong> slots left
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5 animate-pulse-soft" />
                                            {currentMembers}/{project.teamSize || '?'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="px-6 py-4 border-t border-gray-50 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/20">
                                    {isAccepted ? (
                                        <Link 
                                            to={`/projects/${project.id}`} 
                                            className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center cursor-pointer"
                                        >
                                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Joined — View Project
                                        </Link>
                                    ) : isPending || justSent ? (
                                        <div className="w-full py-2.5 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-xl text-center flex items-center justify-center">
                                            <Clock className="h-3.5 w-3.5 mr-1.5" /> Request Pending...
                                        </div>
                                    ) : slotsLeft === 0 ? (
                                        <div className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-400 text-xs font-bold rounded-xl text-center">
                                            Team Full
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => requestJoin(project.id)}
                                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center cursor-pointer"
                                        >
                                            <Send className="h-3.5 w-3.5 mr-1.5" /> Request to Join
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FindTeam;