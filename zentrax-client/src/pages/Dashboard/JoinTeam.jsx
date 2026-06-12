import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../apiConfig';
import {
    Search,
    Rocket,
    Users,
    Zap,
    Send,
    Loader2,
    CheckCircle,
    ArrowLeft,
    User,
    Code2,
    Clock,
    ChevronDown,
    Filter,
    Sparkles,
    AlertCircle
} from 'lucide-react';
import Skeleton from '../../components/Skeleton';

const STATUS_COLORS = {
    'Planning': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    'Development': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    'Testing': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    'Completed': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    'Searching': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
};

const JoinTeam = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Join request modal state
    const [selectedProject, setSelectedProject] = useState(null);
    const [joinMessage, setJoinMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sentProjectId, setSentProjectId] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = await user.getIdToken();
                const headers = { 'Authorization': `Bearer ${token}` };

                const [projectsRes, requestsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/join/open-projects`, { headers }),
                    fetch(`${API_BASE_URL}/api/join/my-requests`, { headers })
                ]);

                const projectsData = await projectsRes.json();
                const requestsData = await requestsRes.json();

                if (projectsData.projects) setProjects(projectsData.projects);
                if (requestsData.requests) setMyRequests(requestsData.requests);
            } catch (err) {
                console.error('Error fetching open projects:', err);
            }
            setLoading(false);
        };

        if (user) fetchData();
    }, [user]);

    const sendJoinRequest = async () => {
        if (!selectedProject) return;
        setSending(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/join/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.getIdToken()}`
                },
                body: JSON.stringify({
                    projectId: selectedProject.id,
                    message: joinMessage
                })
            });

            const data = await response.json();
            if (response.ok) {
                setSentProjectId(selectedProject.id);
                setMyRequests(prev => [...prev, { ...data, project_id: selectedProject.id, status: 'pending' }]);
                setTimeout(() => {
                    setSelectedProject(null);
                    setJoinMessage('');
                    setSentProjectId(null);
                }, 2000);
            } else {
                alert(data.error || 'Failed to send request');
            }
        } catch (err) {
            console.error('Error sending join request:', err);
            alert('Connection failed. Please try again.');
        }
        setSending(false);
    };

    // Check if user already has a pending request for a project
    const hasPendingRequest = (projectId) => {
        return myRequests.some(r => r.project_id === projectId && r.status === 'pending');
    };

    const hasAcceptedRequest = (projectId) => {
        return myRequests.some(r => r.project_id === projectId && r.status === 'accepted');
    };

    // Filtered projects
    const filtered = projects.filter(p => {
        const matchesSearch = searchQuery === '' ||
            p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.techStack || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.requiredSkills || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Sparkles className="h-8 w-8 mr-3 text-primary-600" />
                        Join a Team
                    </h1>
                    <p className="text-gray-500 mt-2">Browse open projects and request to join a team that matches your skills.</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <div className="bg-primary-50 dark:bg-primary-900/20 px-4 py-2 rounded-xl border border-primary-100 dark:border-primary-800">
                        <span className="text-primary-600 font-bold">{filtered.length}</span>
                        <span className="text-gray-500 ml-1">open projects</span>
                    </div>
                </div>
            </header>

            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="Search by name, skill, or tech stack..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'Planning', 'Development', 'Testing'].map(f => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all capitalize ${statusFilter === f
                                ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                                : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            {f === 'all' ? 'All' : f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Project Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <div className="flex gap-2"><Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-6 w-16 rounded-full" /></div>
                            <Skeleton className="h-10 w-full rounded-xl" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-16 rounded-3xl border border-gray-100 dark:border-gray-700 text-center space-y-4">
                    <Rocket className="h-16 w-16 mx-auto text-gray-200" />
                    <h3 className="text-lg font-bold text-gray-500">No open projects found</h3>
                    <p className="text-sm text-gray-400">Try adjusting your search or check back later for new opportunities.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filtered.map(project => {
                        const isPending = hasPendingRequest(project.id);
                        const isAccepted = hasAcceptedRequest(project.id);
                        const justSent = sentProjectId === project.id;

                        return (
                            <div key={project.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all overflow-hidden group">
                                {/* Card Header */}
                                <div className="p-6 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className="h-12 w-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 shrink-0">
                                                <Rocket className="h-6 w-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-gray-900 dark:text-white text-base truncate group-hover:text-primary-600 transition-colors">
                                                    {project.title}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <User className="h-3 w-3 text-gray-400" />
                                                    <span className="text-xs text-gray-500">{project.ownerName || 'Project Owner'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg shrink-0 ${STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {project.status}
                                        </span>
                                    </div>

                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                        {project.description}
                                    </p>

                                    {/* Requirement Note */}
                                    {project.requirement_note && (
                                        <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30 text-xs text-amber-700 dark:text-amber-400">
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
                                                <span key={skill} className="px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold rounded-full">
                                                    <Zap className="h-2.5 w-2.5 inline mr-0.5" />{skill}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 text-xs text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            <strong className={`${project.slotsLeft > 0 ? 'text-green-600' : 'text-red-500'}`}>{project.slotsLeft}</strong> slots left
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            {project.members?.length || 1}/{project.teamSize || '?'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            {new Date(project.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="px-6 py-4 border-t border-gray-50 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/20">
                                    {isAccepted ? (
                                        <Link to={`/projects/${project.id}`} className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center">
                                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Joined — View Project
                                        </Link>
                                    ) : isPending || justSent ? (
                                        <div className="w-full py-2.5 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-xl text-center flex items-center justify-center">
                                            <Clock className="h-3.5 w-3.5 mr-1.5" /> Request Pending...
                                        </div>
                                    ) : project.slotsLeft === 0 ? (
                                        <div className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-400 text-xs font-bold rounded-xl text-center">
                                            Team Full
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setSelectedProject(project)}
                                            className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary-500/20 flex items-center justify-center"
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

            {/* Join Request Modal */}
            {selectedProject && !sentProjectId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedProject(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-2xl w-full max-w-md p-8 space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="text-center space-y-2">
                            <div className="h-14 w-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 mx-auto">
                                <Send className="h-7 w-7" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Request to Join</h3>
                            <p className="text-sm text-gray-500">
                                You're requesting to join <strong className="text-primary-600">{selectedProject.title}</strong>
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Message to Owner (optional)</label>
                            <textarea
                                rows="3"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                placeholder="Introduce yourself and explain why you'd be a great fit..."
                                value={joinMessage}
                                onChange={(e) => setJoinMessage(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setSelectedProject(null); setJoinMessage(''); }}
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold text-sm rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={sendJoinRequest}
                                disabled={sending}
                                className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center disabled:opacity-50"
                            >
                                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                {sending ? 'Sending...' : 'Send Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JoinTeam;