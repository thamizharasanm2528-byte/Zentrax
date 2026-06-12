import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../apiConfig';
import { mentorService } from '../../services/mentorService';
import { useAuth } from '../../context/AuthContext';
import { User, MessageSquare, Send, Loader2 } from 'lucide-react';

const MentorList = () => {
    const { user } = useAuth();
    const [mentors, setMentors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(null);
    const [message, setMessage] = useState('');
    const [userProjects, setUserProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [fetchingProjects, setFetchingProjects] = useState(false);

    const fetchMentors = async () => {
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/users?role=mentor`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = await res.json();
            // According to userController.js, the data is in res.data.data
            setMentors(result.data || []);
        } catch (error) {
            console.error('Error fetching mentors:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserProjects = async () => {
        if (!user) return;
        setFetchingProjects(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/projects/user`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = await res.json();
            const projects = result.data?.projects || result.projects || [];
            setUserProjects(projects);
            if (projects.length > 0) {
                setSelectedProjectId(projects[0].id);
            }
        } catch (error) {
            console.error('Error fetching user projects:', error);
        } finally {
            setFetchingProjects(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchMentors();
            fetchUserProjects();
        }
    }, [user]);

    const handleRequest = async (mentorId) => {
        if (!selectedProjectId) return alert('Please select a project for mentorship');
        if (!message.trim()) return alert('Please enter a message for the mentor');
        
        try {
            const token = await user.getIdToken();
            await mentorService.sendRequest(mentorId, message, token, selectedProjectId);
            alert('Mentorship request sent successfully!');
            setRequesting(null);
            setMessage('');
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to send request');
        }
    };

    if (loading) return <div className="text-slate-500 dark:text-slate-400 p-4 font-medium">Loading mentors...</div>;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Find a Mentor</h2>
            {mentors.length === 0 ? (
                <div className="text-slate-500 dark:text-slate-400 italic">No mentors available yet.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mentors.map((mentor) => (
                        <div key={mentor.id} className="zen-card p-4 flex flex-col justify-between">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 rounded-full flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
                                    {mentor.profilePicture ? (
                                        <img src={mentor.profilePicture} alt={mentor.name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <User className="text-indigo-600 dark:text-indigo-400" size={24} />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-slate-900 dark:text-white font-semibold">{mentor.name}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">{mentor.college || 'ZENTRAX Mentor'}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {mentor.skills?.map((skill, index) => (
                                            <span key={index} className="text-[10px] zen-badge-neutral py-0.5 px-2">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-3 line-clamp-2">{mentor.bio || 'Experienced mentor ready to guide you.'}</p>
                                </div>
                            </div>

                            <div className="mt-4">
                                {requesting === mentor.id ? (
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 ml-1">Assign to Project</label>
                                            {userProjects.length > 0 ? (
                                                <select
                                                    className="zen-select p-2 text-sm"
                                                    value={selectedProjectId}
                                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                                >
                                                    {userProjects.map(proj => (
                                                        <option key={proj.id} value={proj.id}>{proj.title}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className="text-[10px] text-amber-500 px-2 italic">You need to create a project first!</p>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 ml-1">Message</label>
                                            <textarea
                                                className="zen-input p-2 text-sm resize-none"
                                                placeholder="Briefly explain what help you need..."
                                                rows="3"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleRequest(mentor.id)}
                                                disabled={!selectedProjectId || fetchingProjects}
                                                className="flex-1 zen-btn-primary text-xs py-2 rounded-lg flex items-center justify-center gap-2"
                                            >
                                                <Send size={14} /> Send Request
                                            </button>
                                            <button
                                                onClick={() => setRequesting(null)}
                                                className="zen-btn-secondary px-4 py-2 text-xs rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setRequesting(mentor.id)}
                                        className="w-full bg-indigo-50 hover:bg-indigo-100/80 text-indigo-600 border border-indigo-100 text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-2 font-medium"
                                    >
                                        <MessageSquare size={14} /> Request Mentorship
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MentorList;
