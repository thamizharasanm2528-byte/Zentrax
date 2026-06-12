import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase';
import { API_BASE_URL } from '../../apiConfig';
import { FolderKanban, Plus, Users, Loader2, ArrowRight } from 'lucide-react';

const MyProjects = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchProjects = async () => {
            try {
                const token = await auth.currentUser?.getIdToken();
                const res = await fetch(`${API_BASE_URL}/api/projects/user`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProjects(data.data?.projects || data.projects || []);
                }
            } catch (err) { console.error('[MyProjects] Error:', err); }
            setLoading(false);
        };
        fetchProjects();
    }, [user]);

    if (loading) {
        return <div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin" style={{ color: '#4F46E5' }} /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">My Projects</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
                </div>
                <Link to="/projects/create" className="zen-btn-primary flex items-center gap-1.5 text-sm">
                    <Plus className="h-3.5 w-3.5" /> New Project
                </Link>
            </div>

            {projects.length === 0 ? (
                <div className="zen-card zen-empty py-20">
                    <FolderKanban className="h-10 w-10 zen-empty-icon" />
                    <p className="zen-empty-title">No projects yet</p>
                    <p className="zen-empty-desc">Create your first project to get started</p>
                    <Link to="/projects/create" className="zen-btn-primary mt-4 text-sm">Create Project</Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {projects.map(project => (
                        <Link
                            key={project.id}
                            to={`/projects/${project.id}`}
                            className="zen-card-interactive p-4 space-y-3"
                        >
                            <div className="flex items-start justify-between">
                                <h3 className="text-sm font-semibold text-slate-900 leading-tight">{project.title}</h3>
                                {project.domain && <span className="zen-badge-neutral text-[10px] flex-shrink-0 ml-2">{project.domain}</span>}
                            </div>

                            {project.description && (
                                <p className="text-xs text-slate-500 line-clamp-2">{project.description}</p>
                            )}

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <Users className="h-3 w-3" /> {project.members?.length || 1}
                                    </span>
                                    {project.difficulty && (
                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                            project.difficulty === 'Advanced' ? 'bg-red-50 text-red-700 border-red-100' :
                                            project.difficulty === 'Intermediate' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                            'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        }`}>
                                            {project.difficulty}
                                        </span>
                                    )}
                                </div>
                                {project.progress !== undefined && (
                                    <span className="text-xs font-medium" style={{ color: '#4F46E5' }}>{project.progress}%</span>
                                )}
                            </div>

                            {project.progress !== undefined && (
                                <div className="zen-progress">
                                    <div className="zen-progress-bar" style={{ width: `${project.progress || 0}%` }} />
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyProjects;