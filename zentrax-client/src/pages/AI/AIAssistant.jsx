import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AIChat from '../../components/AIChat';
import ChatSidebar from '../../components/ChatSidebar';
import { API_BASE_URL } from '../../apiConfig';

const API = `${API_BASE_URL}/api/ai`;

const AIAssistant = () => {
    const { user, userData } = useAuth();
    const navigate = useNavigate();

    const handleBack = () => {
        const dashboard = userData?.role === 'mentor' ? '/mentor-dashboard' : '/student-dashboard';
        navigate(dashboard);
    };
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const getToken = useCallback(async () => {
        return user ? await user.getIdToken() : null;
    }, [user]);

    const headers = useCallback(async () => {
        const token = await getToken();
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    }, [getToken]);

    useEffect(() => {
        const load = async () => {
            if (!user) return;
            try {
                const h = await headers();
                const res = await fetch(`${API}/conversations`, { headers: h });
                const data = await res.json();
                const convos = data.data?.conversations || data.conversations || [];
                setConversations(convos);
                if (convos.length > 0 && !activeConversation) {
                    setActiveConversation(convos[0].id);
                }
            } catch (err) {
                console.error('Failed to load conversations:', err);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleNewChat = async () => {
        if (isCreatingChat) return;
        setIsCreatingChat(true);
        try {
            const h = await headers();
            const res = await fetch(`${API}/new-chat`, { method: 'POST', headers: h });
            const data = await res.json();
            const convData = data.data || data;
            const newConv = { id: convData.conversationId, title: convData.title || 'New Chat', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            setConversations(prev => [newConv, ...prev]);
            setActiveConversation(convData.conversationId);
        } catch (err) {
            console.error('Failed to create chat:', err);
        } finally {
            setIsCreatingChat(false);
        }
    };

    const handleSelect = (id) => setActiveConversation(id);

    const handleRename = async (id, newTitle) => {
        try {
            const h = await headers();
            await fetch(`${API}/conversations/${id}`, { method: 'PUT', headers: h, body: JSON.stringify({ title: newTitle }) });
            setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
        } catch (err) { console.error('Rename failed:', err); }
    };

    const handleDelete = async (id) => {
        try {
            const h = await headers();
            await fetch(`${API}/conversations/${id}`, { method: 'DELETE', headers: h });
            setConversations(prev => prev.filter(c => c.id !== id));
            if (activeConversation === id) {
                const remaining = conversations.filter(c => c.id !== id);
                setActiveConversation(remaining.length > 0 ? remaining[0].id : null);
            }
        } catch (err) { console.error('Delete failed:', err); }
    };

    const handleExport = async (id) => {
        try {
            const h = await headers();
            const res = await fetch(`${API}/conversations/${id}/messages`, { headers: h });
            const data = await res.json();
            const conv = conversations.find(c => c.id === id);
            const title = conv?.title || 'chat';
            let md = `# ${title}\n\n`;
            for (const m of (data.messages || [])) {
                md += m.role === 'user' ? `**You:** ${m.content}\n\n` : `**ZENTRAX-AI:** ${m.content}\n\n`;
            }
            const blob = new Blob([md], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) { console.error('Export failed:', err); }
    };

    const handleConversationUpdate = (id, updates) => {
        setConversations(prev => {
            const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
            const target = updated.find(c => c.id === id);
            if (target) return [target, ...updated.filter(c => c.id !== id)];
            return updated;
        });
    };

    const handleFirstMessage = async () => {
        if (!activeConversation) {
            if (isCreatingChat) return null;
            setIsCreatingChat(true);
            try {
                const h = await headers();
                const res = await fetch(`${API}/new-chat`, { method: 'POST', headers: h });
                const data = await res.json();
                const convData = data.data || data;
                const newConv = { id: convData.conversationId, title: 'New Chat', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
                setConversations(prev => [newConv, ...prev]);
                setActiveConversation(convData.conversationId);
                return convData.conversationId;
            } catch (err) { return null; }
            finally { setIsCreatingChat(false); }
        }
        return activeConversation;
    };

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <header
                className="h-14 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 z-50"
                style={{ background: 'var(--color-zen-navbar-bg, rgba(255, 255, 255, 0.85))', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--color-zen-border)' }}
            >
                <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 transition-all">
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
                            <Sparkles className="h-3.5 w-3.5" style={{ color: '#ffffff' }} />
                        </div>
                        <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">ZENTRAX AI</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span className="text-[10px] font-medium text-slate-500 dark:text-[#94A3B8]">Online</span>
                </div>
            </header>

            {/* Main */}
            <div className="flex flex-1 overflow-hidden relative">
                <div className={`w-64 h-full flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 absolute'}`}
                    style={{ borderRight: '1px solid var(--color-zen-border)' }}
                >
                    <ChatSidebar
                        conversations={conversations}
                        activeId={activeConversation}
                        onSelect={handleSelect}
                        onNewChat={handleNewChat}
                        onRename={handleRename}
                        onDelete={handleDelete}
                        onExport={handleExport}
                        isCreating={isCreatingChat}
                    />
                </div>
                <main className="flex-1 min-w-0 h-full relative" style={{ background: 'var(--color-zen-bg)' }}>
                    <AIChat
                        fullPage={true}
                        conversationId={activeConversation}
                        onConversationUpdate={handleConversationUpdate}
                        onRequestConversation={handleFirstMessage}
                        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    />
                </main>
            </div>
        </div>
    );
};

export default AIAssistant;