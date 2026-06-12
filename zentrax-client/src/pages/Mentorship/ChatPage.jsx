import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mentorService } from '../../services/mentorService';
import { User, Send, ChevronLeft, MessageSquare, Clock } from 'lucide-react';

const ChatPage = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (selectedChat) {
            fetchMessages(selectedChat.id);
            // Poll for new messages every 5 seconds (Simple implementation for demo)
            const interval = setInterval(() => fetchMessages(selectedChat.id, true), 5000);
            return () => clearInterval(interval);
        }
    }, [selectedChat]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchConversations = async () => {
        try {
            const token = await user.getIdToken();
            const res = await mentorService.getConversations(token);
            setConversations(res.conversations || []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (chatId, silent = false) => {
        try {
            const token = await user.getIdToken();
            const res = await mentorService.getMessages(chatId, token);
            setMessages(res.messages || []);
        } catch (error) {
            if (!silent) console.error('Error fetching messages:', error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;

        try {
            const token = await user.getIdToken();
            const res = await mentorService.sendMessage(selectedChat.id, newMessage, token);
            setMessages([...messages, res]);
            setNewMessage('');
            // Update last message in local coversation list
            setConversations(conversations.map(c => 
                c.id === selectedChat.id ? { ...c, last_message: newMessage, updated_at: new Date().toISOString() } : c
            ));
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    if (loading) return <div className="flex items-center justify-center h-full text-gray-400">Loading chats...</div>;

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white dark:bg-gray-950/40 rounded-2xl border border-slate-200 dark:border-gray-800 overflow-hidden">
            {/* Sidebar */}
            <div className={`w-full md:w-80 border-r border-slate-200 dark:border-gray-800 flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/40">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto bg-white dark:bg-transparent">
                    {conversations.length === 0 ? (
                        <div className="p-4 text-slate-500 text-sm italic">No active connections yet.</div>
                    ) : (
                        conversations.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => setSelectedChat(chat)}
                                className={`p-4 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-gray-800/40 transition-colors border-b border-slate-200/50 dark:border-gray-800/30 ${selectedChat?.id === chat.id ? 'bg-indigo-600/10 border-r-2 border-r-indigo-500' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-600/20 rounded-full flex items-center justify-center border border-indigo-500/20">
                                        {chat.partner.profilePicture ? (
                                            <img src={chat.partner.profilePicture} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <User className="text-indigo-400" size={18} />
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-slate-900 dark:text-white text-sm font-medium truncate">{chat.partner.name}</h4>
                                            <span className="text-[10px] text-slate-500">
                                                {chat.updated_at ? new Date(chat.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs truncate mt-0.5">{chat.last_message || 'Start chatting...'}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col bg-slate-50/50 dark:bg-gray-950/20 ${!selectedChat ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b border-slate-200 dark:border-gray-800 flex items-center gap-3 bg-slate-50 dark:bg-gray-900/40">
                            <button onClick={() => setSelectedChat(null)} className="md:hidden text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white">
                                <ChevronLeft size={20} />
                            </button>
                            <div className="w-8 h-8 bg-indigo-600/20 rounded-full flex items-center justify-center">
                                <User className="text-indigo-400" size={16} />
                            </div>
                            <div>
                                <h3 className="text-slate-900 dark:text-white text-sm font-semibold">{selectedChat.partner.name}</h3>
                                <p className="text-[10px] text-green-600 dark:text-green-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-transparent">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full opacity-30">
                                    <MessageSquare size={48} className="text-slate-400 dark:text-gray-400 mb-2" />
                                    <p className="text-slate-500 dark:text-gray-400">No messages yet. Say hello!</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.sender_id === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                                            msg.sender_id === user?.uid 
                                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                                            : 'bg-slate-100 dark:bg-gray-800 text-slate-800 dark:text-gray-200 border border-slate-200 dark:border-gray-700/50 rounded-tl-none'
                                        }`}>
                                            <p>{msg.message}</p>
                                            <span className={`text-[9px] block mt-1 ${msg.sender_id === user?.uid ? 'text-indigo-200' : 'text-slate-500'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-gray-800 flex gap-2 bg-slate-50 dark:bg-transparent">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white px-4 py-2 rounded-full text-sm focus:border-indigo-500 outline-none"
                            />
                            <button 
                                type="submit" 
                                className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-col items-center opacity-40">
                        <MessageSquare size={80} className="text-slate-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-xl font-bold text-slate-600 dark:text-gray-400">ZENTRAX Messenger</h3>
                        <p className="text-slate-500">Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;
