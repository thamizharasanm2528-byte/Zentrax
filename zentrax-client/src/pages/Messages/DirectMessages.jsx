import React, { useState, useEffect, useRef } from 'react';
import {
    Search, Send, MessageCircle, ArrowLeft, User, Loader2,
    Plus, X, Users, Shield, MessageSquare
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../apiConfig';
import { db, auth } from '../../firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import PresenceDot from '../../components/PresenceDot';

const MessagesHub = () => {
    const { user, userData } = useAuth();
    const { tab, chatId } = useParams();
    const navigate = useNavigate();
    const isMentor = userData?.role === 'mentor';
    const activeTab = tab || (isMentor ? 'mentor' : 'peers');

    // Peers state
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [msgInput, setMsgInput] = useState('');
    const [msgLoading, setMsgLoading] = useState(false);
    const [convLoading, setConvLoading] = useState(true);
    const [showNewChat, setShowNewChat] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const chatEndRef = useRef(null);

    // Mentor state
    const [mentorConvos, setMentorConvos] = useState([]);
    const [mentorMessages, setMentorMessages] = useState([]);
    const [mentorInput, setMentorInput] = useState('');
    const [mentorLoading, setMentorLoading] = useState(false);
    const [mentorInfo, setMentorInfo] = useState(null);
    const [assignedStudents, setAssignedStudents] = useState([]);

    const getToken = async () => {
        try { return await auth.currentUser?.getIdToken(); } catch { return null; }
    };

    const activeConv = activeTab === 'peers' ? conversations.find(c => c.id === chatId) : null;
    const activeMentorPartner = (activeTab === 'mentor' && chatId) ?
        (mentorConvos.find(c => c.partnerId === chatId)
         || (mentorInfo?.id === chatId ? { partnerId: mentorInfo.id, partnerName: mentorInfo.name } : null)
         || (() => { const s = assignedStudents.find(s => s.id === chatId); return s ? { partnerId: s.id, partnerName: s.name } : null; })()
         || null)
        : null;

    const handleTabChange = (newTab) => navigate(`/messages/${newTab}`);
    const handleSelectPeer = (id) => navigate(`/messages/peers/${id}`);
    const handleSelectMentor = (id) => navigate(`/messages/mentor/${id}`);
    const handleClearSelection = () => navigate(`/messages/${activeTab}`);

    // Peers Logic
    const fetchConversations = async () => {
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE_URL}/api/dm/conversations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.conversations) setConversations(data.conversations);
        } catch (err) { console.error('[DM] Error:', err); }
        setConvLoading(false);
    };

    const sendPeerMessage = async () => {
        if (!msgInput.trim() || !activeConv) return;
        const text = msgInput.trim();
        setMsgInput('');
        setMsgLoading(true);
        try {
            const token = await getToken();
            await fetch(`${API_BASE_URL}/api/dm/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ recipientId: activeConv.otherUserId, text })
            });
            fetchConversations();
        } catch (err) { console.error('[DM] Error:', err); }
        setMsgLoading(false);
    };

    const searchUsers = async (q) => {
        if (q.length < 2) { setSearchResults([]); return; }
        setSearching(true);
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE_URL}/api/dm/search-users?q=${encodeURIComponent(q)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.users) setSearchResults(data.users);
        } catch (err) { console.error('[DM] Search Error:', err); }
        setSearching(false);
    };

    // Mentor Logic
    const fetchMentorData = async () => {
        if (!user) return;
        setMentorLoading(true);
        try {
            const token = await getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            const convoRes = await fetch(`${API_BASE_URL}/api/mentor-chat/conversations`, { headers });
            const convoData = await convoRes.json();
            if (convoData.conversations) setMentorConvos(convoData.conversations);

            if (isMentor) {
                const studentRes = await fetch(`${API_BASE_URL}/api/mentor-connection/requests?role=mentor`, { headers });
                const studentData = await studentRes.json();
                if (studentData.requests) {
                    const accepted = studentData.requests.filter(r => r.status === 'accepted');
                    const unique = [];
                    const seen = new Set();
                    for (const r of accepted) {
                        if (!seen.has(r.student_id)) {
                            seen.add(r.student_id);
                            unique.push({ id: r.student_id, name: r.otherUser?.name || 'Student' });
                        }
                    }
                    setAssignedStudents(unique);
                }
            } else {
                const mentorRes = await fetch(`${API_BASE_URL}/api/mentor-connection/requests?role=student`, { headers });
                const mentorData = await mentorRes.json();
                if (mentorData.requests) {
                    const accepted = mentorData.requests.find(r => r.status === 'accepted');
                    if (accepted) {
                        setMentorInfo({ id: accepted.mentor_id, name: accepted.otherUser?.name || 'Mentor' });
                    }
                }
            }
        } catch (err) { console.log('[Support] Data Fetch Error'); }
        setMentorLoading(false);
    };

    const fetchMentorMessages = async (partnerId) => {
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE_URL}/api/mentor-chat/messages/${partnerId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.messages) setMentorMessages(data.messages);
        } catch (err) { console.error('[Support] Msg Error:', err); }
    };

    const sendMentorMessage = async () => {
        if (!mentorInput.trim() || !activeMentorPartner) return;
        const text = mentorInput.trim();
        setMentorInput('');
        try {
            const token = await getToken();
            await fetch(`${API_BASE_URL}/api/mentor-chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ receiverId: activeMentorPartner.partnerId, text })
            });
            fetchMentorMessages(activeMentorPartner.partnerId);
        } catch (err) { console.error('[Support] Send Error:', err); }
    };

    // Effects
    useEffect(() => {
        if (user) {
            if (!isMentor) fetchConversations();
            fetchMentorData();
        }
    }, [user, isMentor]);

    useEffect(() => {
        if (isMentor || activeTab !== 'peers' || !chatId || !user) return;
        const q = query(collection(db, 'directMessages', chatId, 'messages'), orderBy('createdAt', 'asc'), limit(100));
        const unsub = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(d => ({
                id: d.id, ...d.data(),
                createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt
            }));
            setMessages(msgs);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }, (error) => {
            console.error('[DM] Snapshot error:', error);
        });
        return () => unsub();
    }, [chatId, activeTab, user, isMentor]);

    useEffect(() => {
        if (activeTab === 'mentor' && chatId) {
            fetchMentorMessages(chatId);
            const interval = setInterval(() => fetchMentorMessages(chatId), 5000);
            return () => clearInterval(interval);
        }
    }, [activeTab, chatId]);

    useEffect(() => {
        const timer = setTimeout(() => { if (searchQuery) searchUsers(searchQuery); }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const tabs = [
        { id: 'peers', label: 'Peers', icon: MessageSquare, hide: isMentor },
        { id: 'mentor', label: isMentor ? 'Students' : 'Mentor', icon: isMentor ? Users : Shield }
    ].filter(t => !t.hide);

    const renderAvatar = (name, color = '#00E08A') => (
        <div
            className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
        >
            {(name || 'U').substring(0, 2).toUpperCase()}
        </div>
    );

    const renderMessageBubble = (msg, isSelf, accentColor = '#00E08A') => (
        <div key={msg.id || Math.random()} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[75%] px-3.5 py-2 rounded-xl text-sm ${
                    isSelf 
                        ? 'text-[#030712]' 
                        : 'text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/50'
                }`}
                style={isSelf ? {
                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                } : {
                    background: 'var(--color-zen-surface-hover)',
                }}
            >
                {msg.text}
            </div>
        </div>
    );

    const renderChatInput = (value, onChange, onSend, placeholder, accentColor = '#00E08A') => (
        <div className="p-3 flex gap-2" style={{ borderTop: '1px solid var(--color-zen-border)' }}>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onSend()}
                className="zen-input flex-1"
                placeholder={placeholder}
            />
            <button
                onClick={onSend}
                disabled={!value.trim()}
                className="px-3 py-2 rounded-lg transition-all disabled:opacity-30"
                style={{ background: accentColor, color: '#030712' }}
            >
                <Send className="h-4 w-4" />
            </button>
        </div>
    );

    const renderConvList = (items, selectedId, onSelect, emptyMsg, accentColor = '#00E08A') => (
        <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <MessageCircle className="h-8 w-8 mb-2" style={{ color: 'var(--color-zen-border)' }} />
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8]">{emptyMsg}</p>
                </div>
            ) : items.map(item => (
                <button
                    key={item.id || item.partnerId}
                    onClick={() => onSelect(item.id || item.partnerId)}
                    className="w-full p-3 flex items-center gap-3 transition-all text-left"
                    style={{
                        background: selectedId === (item.id || item.partnerId) ? `${accentColor}10` : 'transparent',
                        borderBottom: '1px solid var(--color-zen-border)',
                    }}
                >
                    <div className="relative">
                        {renderAvatar(item.otherUser?.name || item.partnerName || item.name, accentColor)}
                        {(item.otherUserId || item.partnerId) && (
                            <PresenceDot userId={item.otherUserId || item.partnerId} size="xs" className="absolute -bottom-0.5 -right-0.5" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{item.otherUser?.name || item.partnerName || item.name}</p>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">{item.lastMessage?.text || item.lastMessage || item.label || 'No messages'}</p>
                    </div>
                </button>
            ))}
        </div>
    );

    return (
        <div
            className="h-[calc(100vh-110px)] flex flex-col rounded-xl overflow-hidden"
            style={{ background: 'var(--color-zen-surface)', border: '1px solid var(--color-zen-border)' }}
        >
            {/* Tabs */}
            {tabs.length > 1 && (
                <div className="flex gap-1 p-2" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                    {tabs.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                activeTab === item.id ? 'zen-tab-active' : 'zen-tab'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <item.icon className="h-3.5 w-3.5" />
                                {item.label}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* PEERS TAB */}
                {activeTab === 'peers' && !isMentor && (
                    <>
                        {/* Sidebar */}
                        <div
                            className={`w-72 flex flex-col ${chatId ? 'hidden md:flex' : 'flex'} flex-shrink-0`}
                            style={{ borderRight: '1px solid var(--color-zen-border)' }}
                        >
                            <div className="p-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                                <h2 className="text-sm font-semibold text-slate-900">Messages</h2>
                                <button
                                    onClick={() => setShowNewChat(true)}
                                    className="p-1.5 rounded-md transition-all"
                                    style={{ background: 'rgba(0,224,138,0.1)', color: '#00E08A' }}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            {convLoading ? (
                                <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin" style={{ color: '#00E08A' }} /></div>
                            ) : renderConvList(conversations, chatId, handleSelectPeer, 'No conversations yet')}
                        </div>

                        {/* Chat Area */}
                        <div className={`flex-1 flex flex-col ${!chatId ? 'hidden md:flex' : 'flex'}`}>
                            {activeConv ? (
                                <>
                                    <div className="p-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                                        <button onClick={handleClearSelection} className="md:hidden p-1 text-slate-500 dark:text-[#94A3B8]"><ArrowLeft className="h-4 w-4" /></button>
                                        <PresenceDot userId={activeConv.otherUserId} size="sm" />
                                        <p className="text-sm font-medium text-slate-900">{activeConv.otherUser?.name}</p>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--color-zen-bg)' }}>
                                        {messages.map(msg => renderMessageBubble(msg, msg.senderId === user?.uid))}
                                        <div ref={chatEndRef} />
                                    </div>
                                    {renderChatInput(msgInput, setMsgInput, sendPeerMessage, 'Type a message...')}
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center">
                                    <MessageSquare className="h-10 w-10 mb-3 text-slate-300 dark:text-slate-700" />
                                    <p className="text-sm text-slate-500 dark:text-[#94A3B8]">Select a conversation</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* MENTOR/STUDENT TAB */}
                {activeTab === 'mentor' && (
                    <>
                        <div
                            className={`w-72 flex flex-col ${chatId ? 'hidden md:flex' : 'flex'} flex-shrink-0`}
                            style={{ borderRight: '1px solid var(--color-zen-border)' }}
                        >
                            <div className="p-3" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                    {isMentor ? <Users className="h-3.5 w-3.5" style={{ color: '#00E08A' }} /> : <Shield className="h-3.5 w-3.5" style={{ color: '#00E08A' }} />}
                                    {isMentor ? 'Your Students' : 'Mentor'}
                                </h2>
                            </div>
                            {mentorLoading ? (
                                <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin" style={{ color: '#00E08A' }} /></div>
                            ) : (
                                <div className="flex-1 overflow-y-auto">
                                    {/* Unmatched assigned contacts */}
                                    {!isMentor && mentorInfo && !mentorConvos.find(c => c.partnerId === mentorInfo.id) && (
                                        <button
                                            onClick={() => handleSelectMentor(mentorInfo.id)}
                                            className="w-full p-3 flex items-center gap-3 transition-all text-left"
                                            style={{
                                                background: chatId === mentorInfo.id ? 'rgba(0,224,138,0.08)' : 'transparent',
                                                borderBottom: '1px solid var(--color-zen-border)',
                                            }}
                                        >
                                            {renderAvatar(mentorInfo.name)}
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{mentorInfo.name}</p>
                                                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#00E08A' }}>Assigned Mentor</p>
                                            </div>
                                        </button>
                                    )}
                                    {isMentor && assignedStudents.filter(s => !mentorConvos.find(c => c.partnerId === s.id)).map(student => (
                                        <button
                                            key={student.id}
                                            onClick={() => handleSelectMentor(student.id)}
                                            className="w-full p-3 flex items-center gap-3 transition-all text-left"
                                            style={{
                                                background: chatId === student.id ? 'rgba(0,224,138,0.08)' : 'transparent',
                                                borderBottom: '1px solid var(--color-zen-border)',
                                            }}
                                        >
                                            <div className="relative">
                                                {renderAvatar(student.name)}
                                                <PresenceDot userId={student.id} size="xs" className="absolute -bottom-0.5 -right-0.5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{student.name}</p>
                                                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#00E08A' }}>Assigned</p>
                                            </div>
                                        </button>
                                    ))}
                                    {/* Existing convos */}
                                    {mentorConvos.map(conv => (
                                        <button
                                            key={conv.partnerId}
                                            onClick={() => handleSelectMentor(conv.partnerId)}
                                            className="w-full p-3 flex items-center gap-3 transition-all text-left"
                                            style={{
                                                background: chatId === conv.partnerId ? 'rgba(0,224,138,0.08)' : 'transparent',
                                                borderBottom: '1px solid var(--color-zen-border)',
                                            }}
                                        >
                                            <div className="relative">
                                                {renderAvatar(conv.partnerName)}
                                                <PresenceDot userId={conv.partnerId} size="xs" className="absolute -bottom-0.5 -right-0.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">{conv.partnerName}</p>
                                                <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">{conv.lastMessage || 'Start conversation...'}</p>
                                            </div>
                                        </button>
                                    ))}
                                    {mentorConvos.length === 0 && !mentorInfo && assignedStudents.length === 0 && (
                                        <div className="py-12 px-4 text-center">
                                            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">No conversations yet.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Chat Area */}
                        <div className={`flex-1 flex flex-col ${!chatId ? 'hidden md:flex' : 'flex'}`}>
                            {activeMentorPartner ? (
                                <>
                                    <div className="p-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                                        <button onClick={handleClearSelection} className="md:hidden p-1 text-slate-500 dark:text-[#94A3B8]"><ArrowLeft className="h-4 w-4" /></button>
                                        <p className="text-sm font-medium text-slate-900">{activeMentorPartner.partnerName}</p>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--color-zen-bg)' }}>
                                        {mentorMessages.map((msg, i) => renderMessageBubble(
                                            { ...msg, id: msg.id || i },
                                            msg.senderId === user?.uid
                                        ))}
                                    </div>
                                    {renderChatInput(mentorInput, setMentorInput, sendMentorMessage, isMentor ? 'Message student...' : 'Ask your mentor...')}
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center">
                                    {isMentor ? <Users className="h-10 w-10 mb-3 text-slate-300 dark:text-slate-700" /> : <Shield className="h-10 w-10 mb-3 text-slate-300 dark:text-slate-700" />}
                                    <p className="text-sm text-slate-500 dark:text-[#94A3B8]">Select a {isMentor ? 'student' : 'mentor'} to chat</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* New Chat Modal */}
            {showNewChat && !isMentor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setShowNewChat(false)}>
                    <div
                        className="w-full max-w-md rounded-xl overflow-hidden animate-fade-in"
                        style={{ background: 'var(--color-zen-surface)', border: '1px solid var(--color-zen-border)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                            <h3 className="text-sm font-semibold text-slate-900">New Message</h3>
                            <button onClick={() => setShowNewChat(false)} className="p-1 text-slate-500 hover:text-slate-900"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="p-4">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name..."
                                className="zen-input"
                                autoFocus
                            />
                        </div>
                        <div className="max-h-64 overflow-y-auto px-4 pb-4">
                            {searching ? (
                                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" style={{ color: '#00E08A' }} /></div>
                            ) : searchResults.length === 0 ? (
                                <p className="text-center text-xs text-slate-500 dark:text-[#94A3B8] py-6">No users found</p>
                            ) : searchResults.map(u => (
                                <button
                                    key={u.uid}
                                    onClick={async () => {
                                        setShowNewChat(false);
                                        const token = await getToken();
                                        const res = await fetch(`${API_BASE_URL}/api/dm/send`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                            body: JSON.stringify({ recipientId: u.uid, text: '👋 Hey!' })
                                        });
                                        const data = await res.json();
                                        await fetchConversations();
                                        handleSelectPeer(data.conversationId);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left hover:bg-slate-100"
                                >
                                    {renderAvatar(u.name)}
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">{u.name}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] uppercase font-semibold tracking-wider">{u.role}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagesHub;
