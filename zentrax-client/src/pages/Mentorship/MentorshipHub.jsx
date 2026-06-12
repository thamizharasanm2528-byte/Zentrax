import React, { useState } from 'react';
import ProgressSection from '../../components/Mentorship/ProgressSection';
import FeedbackSection from '../../components/Mentorship/FeedbackSection';
import MentorList from '../../components/Mentorship/MentorList';
import { Activity, MessageSquare, ListTodo, Users } from 'lucide-react';

const MentorshipHub = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            <header>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Find a Mentor</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Connect with experts to guide your project development.</p>
            </header>

            {/* Content Area */}
            <div className="bg-white dark:bg-gray-900/20 border border-slate-200 dark:border-gray-800/50 rounded-3xl p-6 min-h-[400px]">
                <MentorList />
            </div>
        </div>
    );
};

export default MentorshipHub;
