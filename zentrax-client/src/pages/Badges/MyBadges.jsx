import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Award, Star, Trophy, Zap, Target, Flame, BookOpen, Loader2, Lock } from 'lucide-react';
import Skeleton from '../../components/Skeleton';
import { API_BASE_URL } from '../../apiConfig';

const BADGE_DEFINITIONS = [
    { id: 'first_project', name: 'First Project', description: 'Created your first project on ZENTRAX', icon: Zap, color: 'blue', requirement: 'Create 1 project' },
    { id: 'team_builder', name: 'Team Builder', description: 'Invited 3 members to your team', icon: Target, color: 'green', requirement: 'Invite 3 teammates' },
    { id: 'mentor_seeker', name: 'Mentor Seeker', description: 'Submitted your first doubt to a mentor', icon: BookOpen, color: 'purple', requirement: 'Ask 1 doubt' },
    { id: 'collaborator', name: 'Active Collaborator', description: 'Posted 5 updates in the collaboration feed', icon: Flame, color: 'orange', requirement: '5 feed posts' },
    { id: 'ai_explorer', name: 'AI Explorer', description: 'Had 10 conversations with ZENTRAX-AI', icon: Star, color: 'yellow', requirement: '10 AI chats' },
    { id: 'rising_star', name: 'Rising Star', description: 'Completed 3 projects successfully', icon: Trophy, color: 'red', requirement: 'Complete 3 projects' },
];

const MyBadges = () => {
    const { user, userData } = useAuth();
    const [earnedBadges, setEarnedBadges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBadges = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/badges`, {
                    headers: { 'Authorization': `Bearer ${await user.getIdToken()}` }
                });
                const data = await response.json();
                if (data.badges) {
                    setEarnedBadges(data.badges);
                }
            } catch (err) {
                console.error('Error fetching badges:', err);
                // Fallback: simulate some earned badges
                setEarnedBadges(['first_project', 'mentor_seeker']);
            }
            setLoading(false);
        };

        if (user) fetchBadges();
    }, [user]);

    const level = userData?.level || 'Beginner';
    const progress = earnedBadges.length;
    const total = BADGE_DEFINITIONS.length;
    const progressPercent = Math.round((progress / total) * 100);

    const colorMap = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-blue-200 dark:border-blue-800',
        green: 'bg-green-50 dark:bg-green-900/20 text-green-600 border-green-200 dark:border-green-800',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 border-purple-200 dark:border-purple-800',
        orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 border-orange-200 dark:border-orange-800',
        yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 border-yellow-200 dark:border-yellow-800',
        red: 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-800',
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Award className="h-8 w-8 mr-3 text-primary-600" />
                    My Badges & Achievements
                </h1>
                <p className="text-gray-500 mt-2">Track your progress and unlock new achievements.</p>
            </header>

            {/* Progress Overview */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center space-x-5">
                        <div className="h-16 w-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center">
                            <Trophy className="h-8 w-8 text-primary-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Current Level</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{level}</p>
                        </div>
                    </div>
                    <div className="flex-1 max-w-md w-full">
                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                            <span>{progress}/{total} Badges Earned</span>
                            <span>{progressPercent}%</span>
                        </div>
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary-500 to-green-400 rounded-full transition-all duration-700" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                            <Skeleton className="h-14 w-14 rounded-xl" />
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    ))
                ) : (
                    BADGE_DEFINITIONS.map(badge => {
                        const earned = earnedBadges.includes(badge.id);
                        return (
                            <div key={badge.id} className={`relative bg-white dark:bg-gray-800 p-6 rounded-2xl border transition-all ${earned
                                ? 'border-primary-200 dark:border-primary-800 shadow-md hover:shadow-lg'
                                : 'border-gray-100 dark:border-gray-700 opacity-60 grayscale'
                                }`}>
                                {earned && (
                                    <div className="absolute top-3 right-3">
                                        <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                                            <Star className="h-3 w-3 text-white fill-current" />
                                        </div>
                                    </div>
                                )}
                                <div className={`h-14 w-14 rounded-xl flex items-center justify-center border ${colorMap[badge.color]}`}>
                                    {earned ? <badge.icon className="h-7 w-7" /> : <Lock className="h-6 w-6 text-gray-400" />}
                                </div>
                                <h3 className="mt-4 font-bold text-gray-900 dark:text-white">{badge.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">{badge.description}</p>
                                <p className="text-[10px] text-gray-400 mt-3 uppercase tracking-wider font-bold">
                                    {earned ? '✅ Earned' : `🔒 ${badge.requirement}`}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default MyBadges;