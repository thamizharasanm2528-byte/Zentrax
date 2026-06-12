import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../apiConfig';
import {
    Users,
    Rocket,
    ChevronRight,
    User,
    Loader2,
    ExternalLink
} from 'lucide-react';
import Skeleton from '../../components/Skeleton';

const STATUS_COLORS = {
    'Planning': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Development': 'bg-blue-100 text-blue-700 border-blue-200',
    'Testing': 'bg-purple-100 text-purple-700 border-purple-200',
    'Completed': 'bg-green-100 text-green-700 border-green-200',
};

const AssignedTeams = () => {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/mentorship/assigned`, {
                    headers: { 'Authorization': `Bearer ${await user.getIdToken()}` }
                });
                const data = await response.json();
                const teamsArr = data.data?.teams || data.teams || [];
                setTeams(teamsArr);
            } catch (err) {
                console.error('Error fetching assigned teams:', err);
            }
            setLoading(false);
        };

        if (user) fetchTeams();
    }, [user]);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Users className="h-8 w-8 mr-3 text-primary-600" />
                    Assigned Teams
                </h1>
                <p className="text-gray-500 mt-2">Teams you're mentoring across active projects.</p>
            </header>

            <div className="space-y-4">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-xl" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                    ))
                ) : teams.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl border border-gray-100 dark:border-gray-700 text-center space-y-3">
                        <Rocket className="h-16 w-16 mx-auto text-gray-200" />
                        <p className="text-gray-500 font-medium">No teams assigned yet.</p>
                        <p className="text-xs text-gray-400">Teams will appear here when students add you as a mentor or when you claim doubts.</p>
                    </div>
                ) : (
                    teams.map(team => (
                        <div key={team.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-all">
                            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-primary-100 dark:bg-primary-900/40 rounded-xl flex items-center justify-center text-primary-600 shadow-inner shrink-0">
                                        <Rocket className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">{team.title}</h3>
                                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{team.description}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${STATUS_COLORS[team.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                {team.status}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {team.members?.length || 1} member{(team.members?.length || 1) !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Member Avatars */}
                                    <div className="flex -space-x-2">
                                        {(team.members || []).slice(0, 4).map((memberId, i) => (
                                            <div key={memberId} className="inline-flex h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800 bg-gray-100 dark:bg-gray-700 items-center justify-center text-[10px] font-bold text-gray-500">
                                                M{i + 1}
                                            </div>
                                        ))}
                                        {(team.members?.length || 0) > 4 && (
                                            <div className="inline-flex h-8 w-8 rounded-full ring-2 ring-white dark:ring-gray-800 bg-primary-100 items-center justify-center text-[10px] font-bold text-primary-600">
                                                +{team.members.length - 4}
                                            </div>
                                        )}
                                    </div>
                                    <Link
                                        to={`/projects/${team.id}`}
                                        className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary-500/20 flex items-center"
                                    >
                                        <ExternalLink className="h-3 w-3 mr-1" /> View Project
                                    </Link>
                                </div>
                            </div>

                            {/* Tech Stack */}
                            {team.techStack?.length > 0 && (
                                <div className="px-6 pb-4 flex flex-wrap gap-1.5">
                                    {team.techStack.map(tech => (
                                        <span key={tech} className="px-2.5 py-1 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-[10px] rounded-lg border border-gray-100 dark:border-gray-600">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AssignedTeams;