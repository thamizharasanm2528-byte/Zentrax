import React from 'react';
import { HelpCircle, Sparkles, FolderKanban, Users, MessageSquare } from 'lucide-react';

const Help = () => {
    const faqs = [
        {
            q: "How does the AI Team Matching work?",
            a: "ZENTRAX uses a smart matching algorithm that compares the required skills and tech stack of a project with the profiles of registered students. It looks for exact and partial skill overlaps to recommend the best fit for your team."
        },
        {
            q: "How are Mentors assigned?",
            a: "When you create a project, the system scans our pool of industry professionals. Mentors are matched based on their 'Expertise Areas' (e.g., Cloud Computing, AI) aligning with your project's Domain. Mentors receive requests and can choose to accept or decline."
        },
        {
            q: "Can I withdraw a request?",
            a: "Yes! If you accidentally send a mentor request, you can withdraw it from your Student Dashboard under the 'Mentor Requests' section before it is accepted."
        },
        {
            q: "What is Optimistic UI?",
            a: "To make ZENTRAX feel incredibly fast, our buttons (like 'Join Team' or 'Accept Invite') update immediately when you click them. If there's an internet connection error in the background, a red banner will appear to notify you."
        }
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in py-6">
            <div className="text-center space-y-4">
                <div className="mx-auto h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <HelpCircle className="h-8 w-8 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">How can we help?</h1>
                <p className="text-slate-500 max-w-lg mx-auto">
                    Learn how to navigate ZENTRAX, form your dream team, and connect with industry mentors.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="zen-card p-6">
                    <Sparkles className="h-6 w-6 text-indigo-600 mb-3" />
                    <h3 className="font-semibold text-slate-900 mb-1">AI Matching</h3>
                    <p className="text-sm text-slate-500">Let our AI build your team based on required tech stacks.</p>
                </div>
                <div className="zen-card p-6">
                    <FolderKanban className="h-6 w-6 text-blue-600 mb-3" />
                    <h3 className="font-semibold text-slate-900 mb-1">Project Workspace</h3>
                    <p className="text-sm text-slate-500">Manage tasks, timelines, and collaborate in real-time.</p>
                </div>
                <div className="zen-card p-6">
                    <Users className="h-6 w-6 text-emerald-600 mb-3" />
                    <h3 className="font-semibold text-slate-900 mb-1">Team Finder</h3>
                    <p className="text-sm text-slate-500">Browse open projects and request to join existing teams.</p>
                </div>
                <div className="zen-card p-6">
                    <MessageSquare className="h-6 w-6 text-purple-600 mb-3" />
                    <h3 className="font-semibold text-slate-900 mb-1">Direct Mentorship</h3>
                    <p className="text-sm text-slate-500">Chat with assigned industry experts to resolve blockers.</p>
                </div>
            </div>

            <div className="zen-card p-6 mt-8">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
                <div className="space-y-4 divide-y divide-slate-100">
                    {faqs.map((faq, i) => (
                        <div key={i} className={i !== 0 ? 'pt-4' : ''}>
                            <h3 className="font-semibold text-slate-900 text-sm mb-2">{faq.q}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Help;
