import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Send, 
    User, 
    Brain, 
    ThumbsUp, 
    ThumbsDown, 
    Loader2, 
    Copy, 
    Check, 
    Sparkles, 
    Minimize2, 
    RotateCcw, 
    ChevronDown, 
    PanelLeft, 
    Pencil, 
    X,
    Lock,
    Paperclip,
    Plus,
    MessageSquarePlus,
    Info,
    Settings,
    Languages
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';

import { API_BASE_URL } from '../apiConfig';
const API = `${API_BASE_URL}/api/ai`;

/* ── Format timestamp ── */
const formatTime = (ts) => {
    if (!ts) return '';
    const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/* ------------------------------------------------------------------ */
/*  Clean syntax theme — oneDark colors, NO span backgrounds           */
/* ------------------------------------------------------------------ */
const cleanDarkTheme = Object.fromEntries(
    Object.entries(oneDark).map(([key, val]) => {
        if (typeof val === 'object' && val !== null) {
            // eslint-disable-next-line no-unused-vars
            const { background, backgroundColor, ...rest } = val;
            if (key === 'pre[class*="language-"]' || key === 'code[class*="language-"]') {
                return [key, { ...rest, background: 'transparent', backgroundColor: 'transparent' }];
            }
            return [key, rest];
        }
        return [key, val];
    })
);

/* ------------------------------------------------------------------ */
/*  Copy-to-clipboard button (code blocks)                             */
/* ------------------------------------------------------------------ */
const CodeCopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
        catch { /* ignore */ }
    };
    return (
        <button onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all hover:bg-white/10 text-slate-500 hover:text-slate-800">
            {copied ? <><Check className="h-3.5 w-3.5 text-indigo-600" /> <span className="text-indigo-600">Copied!</span></> : <><Copy className="h-3.5 w-3.5" /> Copy code</>}
        </button>
    );
};

/* ------------------------------------------------------------------ */
/*  Standalone code block                                              */
/* ------------------------------------------------------------------ */
const CodeBlock = ({ language, code }) => (
    <div className="my-6 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-50 group/code transition-all hover:border-indigo-500/20">
        <div className="flex items-center justify-between px-5 py-3 bg-slate-100 border-b border-slate-200">
            <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-500/30"></div>
                    <div className="h-2 w-2 rounded-full bg-amber-500/30"></div>
                    <div className="h-2 w-2 rounded-full bg-indigo-500/30"></div>
                </div>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] font-mono">{language || 'text'}</span>
            </div>
            <CodeCopyButton text={code} />
        </div>
        <div className="overflow-x-auto custom-scrollbar-none">
            <SyntaxHighlighter style={cleanDarkTheme} language={language} PreTag="div"
                customStyle={{ margin: 0, borderRadius: 0, fontSize: '13px', lineHeight: '1.7', padding: '20px', background: 'transparent' }}
                codeTagProps={{ style: { background: 'transparent' } }} wrapLongLines={false}>
                {code}
            </SyntaxHighlighter>
        </div>
    </div>
);

/* ------------------------------------------------------------------ */
/*  Markdown renderer                                                  */
/* ------------------------------------------------------------------ */
const MarkdownMessage = ({ content }) => (
    <ReactMarkdown remarkPlugins={[remarkGfm]}
        components={{
            // eslint-disable-next-line no-unused-vars
            code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                if (!inline && (match || codeString.includes('\n'))) {
                    return <CodeBlock language={match?.[1] || 'text'} code={codeString} />;
                }
                return <code className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded-md text-[12.5px] font-mono font-bold" {...props}>{children}</code>;
            },
            p({ children }) { return <p className="mb-6 last:mb-0 leading-[1.8] text-slate-700 font-medium tracking-tight whitespace-pre-wrap">{children}</p>; },
            ul({ children }) { return <ul className="list-disc pl-6 mb-6 space-y-2 text-slate-700 font-medium tracking-tight">{children}</ul>; },
            ol({ children }) { return <ol className="list-decimal pl-6 mb-6 space-y-2 text-slate-700 font-medium tracking-tight">{children}</ol>; },
            li({ children }) { return <li className="leading-[1.8]">{children}</li>; },
            strong({ children }) { return <strong className="font-black text-slate-900">{children}</strong>; },
            h1({ children }) { return <h1 className="text-2xl font-black mb-6 mt-8 text-slate-900 tracking-tighter">{children}</h1>; },
            h2({ children }) { return <h2 className="text-xl font-black mb-4 mt-6 text-slate-900 tracking-tight">{children}</h2>; },
            h3({ children }) { return <h3 className="text-lg font-bold mb-3 mt-5 text-indigo-600/90 tracking-tight">{children}</h3>; },
            blockquote({ children }) { return <blockquote className="border-l-4 border-indigo-500/30 pl-5 my-6 text-slate-500 italic bg-white/2 pt-2 pb-2 rounded-r-xl">{children}</blockquote>; },
            a({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-emerald-300 font-bold underline underline-offset-4 decoration-2 transition-all">{children}</a>; },
            hr() { return <hr className="my-8 border-slate-200" />; },
            table({ children }) { return <div className="overflow-x-auto my-6 rounded-2xl border border-slate-200"><table className="min-w-full text-sm border-collapse">{children}</table></div>; },
            th({ children }) { return <th className="bg-slate-100 px-4 py-2.5 text-left font-black uppercase tracking-widest text-[10px] border-b border-slate-200 text-slate-500">{children}</th>; },
            td({ children }) { return <td className="px-4 py-2.5 border-b border-slate-200 text-slate-700 font-medium">{children}</td>; },
        }}>
        {content}
    </ReactMarkdown>
);

/* ------------------------------------------------------------------ */
/*  Typing animation                                                   */
/* ------------------------------------------------------------------ */
const TypingMessage = ({ content, onComplete }) => {
    const [displayedWords, setDisplayedWords] = useState(0);
    const [done, setDone] = useState(false);
    
    // Derived state, no need for useRef
    const words = (content || '').split(/( +)/);
    const total = words.length;

    useEffect(() => {
        if (done) return;
        const id = setInterval(() => {
            setDisplayedWords(prev => {
                const next = prev + 3;
                if (next >= total) { clearInterval(id); setDone(true); onComplete?.(); return total; }
                return next;
            });
        }, 30);
        return () => clearInterval(id);
    }, [done, total, onComplete]);

    if (done) return <MarkdownMessage content={content} />;
    return (
        <div className="whitespace-pre-wrap">
            {words.slice(0, displayedWords).join('')}
            <span className="inline-block w-2 h-4 bg-primary-400 ml-0.5 rounded-sm animate-pulse" />
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Typing indicator                                                   */
/* ------------------------------------------------------------------ */
const TypingIndicator = () => (
    <div className="flex justify-start">
        <div className="flex items-start space-x-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-500 text-slate-900 flex items-center justify-center flex-shrink-0 shadow-md shadow-primary-500/20">
                <Brain className="h-4 w-4" />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center space-x-1.5">
                    <span className="text-xs text-slate-500 mr-1">Thinking</span>
                    <div className="h-1.5 w-1.5 bg-primary-400 rounded-full animate-bounce"></div>
                    <div className="h-1.5 w-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:0.15s]"></div>
                    <div className="h-1.5 w-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:0.3s]"></div>
                </div>
            </div>
        </div>
    </div>
);

/* ------------------------------------------------------------------ */
/*  Suggestion chips                                                   */
/* ------------------------------------------------------------------ */
const SUGGESTIONS = [
    { label: '🚀 Suggest a tech stack', prompt: 'Suggest a tech stack for a student collaboration platform' },
    { label: '🐛 Help me debug', prompt: 'Help me debug this error in my code' },
    { label: '📁 Folder structure', prompt: 'Generate a folder structure for a full-stack web app' },
    { label: '🗺️ Project roadmap', prompt: 'Create a development roadmap for a web app project' },
    { label: '🔥 Learn Firebase', prompt: 'Explain Firebase Firestore for beginners with examples' },
    { label: '⚛️ React basics', prompt: 'Explain React hooks for beginners' },
];

/* ------------------------------------------------------------------ */
/*  Copy full message button                                           */
/* ------------------------------------------------------------------ */
const MessageCopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
        catch { /* ignore */ }
    };
    return (
        <button onClick={handleCopy}
            className="text-slate-500 hover:text-slate-700 transition-colors p-1 rounded hover:bg-gray-700" title="Copy message">
            {copied ? <Check className="h-3.5 w-3.5 text-indigo-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
};

/* ================================================================== */
/*  Main AIChat Component                                              */
/* ================================================================== */
const AIChat = ({
    fullPage = false,
    conversationId = null,
    onConversationUpdate,
    onRequestConversation,
    onToggleSidebar
}) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackMsgIndex, setFeedbackMsgIndex] = useState(null);
    const [feedbackType, setFeedbackType] = useState('not_helpful'); // 'helpful', 'not_helpful', 'improved'
    const [issueType, setIssueType] = useState('other');
    const [correctedText, setCorrectedText] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editValue, setEditValue] = useState('');
    const { user, userData } = useAuth();
    const [showSettings, setShowSettings] = useState(false);
    const [isSavingPrefs, setIsSavingPrefs] = useState(false);
    const [userPrefs, setUserPrefs] = useState({
        prefers_step_by_step: false,
        prefers_short_answers: false,
        prefers_code_only: false,
        preferred_language: 'English',
        preferred_stack: 'MERN'
    });
    const [mode, setMode] = useState('default'); // 'default', 'debug', 'explain', 'build'
    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const currentConvRef = useRef(conversationId);

    const getToken = useCallback(async () => user ? await user.getIdToken() : null, [user]);

    const fetchPreferences = useCallback(async () => {
        try {
            const token = await getToken();
            const res = await fetch(`${API}/preferences`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setUserPrefs(data.data);
        } catch (err) { console.error('Prefs load error:', err); }
    }, [getToken]);

    const updatePreference = async (key, value) => {
        const newPrefs = { ...userPrefs, [key]: value };
        setUserPrefs(newPrefs);
        setIsSavingPrefs(true);
        try {
            const token = await getToken();
            await fetch(`${API}/preferences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newPrefs)
            });
        } catch (err) { console.error('Prefs save error:', err); }
        finally { setIsSavingPrefs(false); }
    };

    useEffect(() => { if (user) fetchPreferences(); }, [user, fetchPreferences]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        // Basic validation: 10MB limit
        if (file.size > 10 * 1024 * 1024) {
            alert("File is too large. 10MB limit.");
            return;
        }
        setSelectedFile(file);
    };

    const removeFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    /* ── Scroll detection for "scroll to bottom" button ── */
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 150);
        };
        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    /* ── Auto-resize textarea ── */
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [input]);

    /* ── Load messages when conversationId changes ── */
    useEffect(() => {
        currentConvRef.current = conversationId;
        if (!conversationId || !user) {
            setMessages([]);
            setHistoryLoading(false);
            return;
        }

        const loadMessages = async () => {
            setHistoryLoading(true);
            try {
                const token = await getToken();
                const res = await fetch(`${API}/conversations/${conversationId}/messages`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (currentConvRef.current === conversationId) {
                    const messages = data.messages || data.data?.messages || [];
                    setMessages(messages.map(m => ({ role: m.role, content: m.content, timestamp: m.created_at })));
                }
            } catch (err) {
                console.error('[AI Chat] History load failed:', err);
            } finally {
                if (currentConvRef.current === conversationId) setHistoryLoading(false);
            }
        };
        loadMessages();
    }, [conversationId, user, getToken]);

    /* ── Send message ── */
    const sendMessage = async (msg) => {
        if (!msg.trim() && !selectedFile) return;
        if (loading) return;

        const currentFile = selectedFile;
        const currentMode = mode;
        // Reset inputs immediately for responsive UI
        setInput('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        setMessages(prev => [...prev, { 
            role: 'user', 
            content: msg, 
            timestamp: Date.now(), 
            attachment: currentFile?.name,
            mode: currentMode !== 'default' ? currentMode : null
        }]);
        setLoading(true);

        try {
            // Ensure we have a conversation
            let chatId = conversationId;
            if (!chatId && onRequestConversation) {
                chatId = await onRequestConversation();
            }
            if (!chatId) throw new Error("Could not initialize conversation.");

            const token = await getToken();
            
            // Prepare payload
            const payload = { 
                message: msg, 
                conversationId: chatId,
                mode: currentMode,
                attachmentName: currentFile?.name,
                attachmentType: currentFile?.type
            };

            const res = await fetch(`${API}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (res.status === 401) {
                throw new Error('Authentication failed. Please log in again.');
            }
            if (!res.ok) {
                throw new Error('AI server is not responding right now.');
            }

            const data = await res.json();
            const reply = data.data?.reply || data.response;

            if (reply) {
                setMessages(prev => [...prev, { role: 'assistant', content: reply, isTyping: !data.data?.fallback, timestamp: Date.now() }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "Hmm, I didn't get a response. Could you try again?", timestamp: Date.now() }]);
            }

            // Update sidebar title if new chat
            const newTitle = data.data?.title || data.title;
            const newId = data.data?.conversationId || data.conversationId;
            if (newTitle && onConversationUpdate) {
                onConversationUpdate(newId, { title: newTitle, updated_at: new Date().toISOString() });
            }
        } catch (err) {
            console.error('[AI Chat] Error:', err.message);
            const errMsg = err.message.includes('fetch') 
                ? "Network error while contacting AI service. Check your connection or server status."
                : err.message;
            setMessages(prev => [...prev, { role: 'assistant', content: errMsg, timestamp: Date.now() }]);
        }
        setLoading(false);
    };

    const handleSend = (e) => { e?.preventDefault(); sendMessage(input); };
    const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };
    const handleSuggestion = (prompt) => { sendMessage(prompt); };

    /* ── Edit user message ── */
    const handleEditMessage = async (index) => {
        if (loading) return;
        const newMsg = editValue.trim();
        if (!newMsg) return;
        setEditingIndex(null);
        // Truncate conversation from this point, replace user msg, resend
        setMessages(prev => prev.slice(0, index));
        sendMessage(newMsg);
    };

    /* ── Regenerate last response ── */
    const handleRegenerate = async () => {
        if (loading || !conversationId) return;
        setLoading(true);

        // Remove last assistant message visually
        setMessages(prev => {
            const copy = [...prev];
            if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') copy.pop();
            return copy;
        });

        try {
            const token = await getToken();
            const res = await fetch(`${API}/regenerate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ conversationId })
            });
            const data = await res.json();
            const reply = data.data?.reply || data.response;
            setMessages(prev => [...prev, { role: 'assistant', content: reply, isTyping: !data.data?.fallback, timestamp: Date.now() }]);
        } catch (err) {
            console.error('[AI Chat] Regenerate error:', err);
            setMessages(prev => [...prev, { role: 'assistant', content: "Failed to regenerate. Please try again.", timestamp: Date.now() }]);
        }
        setLoading(false);
    };

    /* ── Feedback ── */
    const submitFeedback = async (msgIndex, rating, extra = {}) => {
        setIsSubmittingFeedback(true);
        try {
            const prompt = messages[msgIndex - 1]?.content;
            const response = messages[msgIndex]?.content;
            const token = await getToken();
            
            const payload = {
                chatId: conversationId,
                prompt,
                response,
                rating,
                correctedResponse: extra.correctedText || null,
                issueType: extra.issueType || null
            };

            const res = await fetch(`${API}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, feedbackGiven: true } : m));
                setShowFeedbackModal(false);
                // Clear feedback state
                setCorrectedText('');
                setIssueType('other');
            }
        } catch (err) { 
            console.error('Feedback error:', err); 
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    const handleOpenImprove = (index) => {
        setFeedbackMsgIndex(index);
        setFeedbackType('improved');
        setCorrectedText(messages[index]?.content || '');
        setShowFeedbackModal(true);
    };

    /* ── Greeting ── */
    const getGreeting = () => {
        const name = userData?.name?.split(' ')[0] || '';
        const hour = new Date().getHours();
        const g = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        return `${g}${name ? `, ${name}` : ''} 👋`;
    };

    /* ── Minimized widget ── */
    if (isMinimized && !fullPage) {
        return (
            <button onClick={() => setIsMinimized(false)}
                className="fixed bottom-6 right-6 h-14 w-14 bg-gradient-to-br from-primary-600 to-indigo-500 text-slate-900 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-50">
                <Brain className="h-6 w-6" />
            </button>
        );
    }

    const isEmptyChat = !historyLoading && messages.length === 0;
     const containerClasses = fullPage
        ? "flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden"
        : "fixed bottom-6 right-6 w-80 md:w-96 h-[550px] bg-slate-50 dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col z-50 overflow-hidden";

    return (
        <div className={containerClasses + " relative font-sans"}>
            {/* ─── 1. Persistent Minimalist Header ─── */}
            <div className="sticky top-0 z-30 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/20 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {fullPage && onToggleSidebar && (
                        <button onClick={onToggleSidebar} className="hover:bg-slate-100/50 p-2 rounded-xl transition-all text-slate-500 hover:text-slate-900 group/btn">
                            <PanelLeft className="h-4 w-4" />
                        </button>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-slate-900">
                            <Brain className="h-5 w-5" />
                        </div>
                        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">ZENTRAX AI</h2>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setShowSettings(!showSettings)} 
                        className={`hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl transition-all ${showSettings ? 'text-indigo-600 bg-slate-100 dark:bg-slate-800' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                        title="AI Preferences"
                    >
                        <Settings className={`h-4 w-4 ${isSavingPrefs ? 'animate-spin' : ''}`} />
                    </button>
                    {!fullPage && (
                        <button onClick={() => setIsMinimized(true)} className="hover:bg-slate-100/50 p-2 rounded-xl transition-all text-slate-500 hover:text-slate-900">
                            <Minimize2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* ─── 2. Message Flow ─── */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
                {historyLoading ? (
                    <div className="py-20 space-y-8 max-w-2xl mx-auto px-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                                <div className={`h-16 rounded-2xl animate-pulsate ${i % 2 === 0 ? 'w-1/3 bg-slate-100/20' : 'w-1/2 bg-slate-100/30'}`} />
                            </div>
                        ))}
                    </div>
                ) : isEmptyChat ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-3xl mx-auto px-8 animate-in fade-in duration-1000">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full group-hover:bg-indigo-500/30 transition-all duration-700" />
                            <div className="relative h-20 w-20 rounded-3xl bg-white border border-slate-200 flex items-center justify-center mb-8 shadow-2xl">
                                <Sparkles className="h-10 w-10 text-indigo-600 animate-pulse" />
                            </div>
                        </div>
                        <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">How can I help today?</h3>
                        <p className="text-slate-500 text-sm mb-12 max-w-md leading-relaxed font-medium">ZENTRAX-AI is ready to assist with your tech stack, roadmap, or debugging challenges.</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                            {SUGGESTIONS.map((s, i) => (
                                <button key={i} onClick={() => handleSuggestion(s.prompt)}
                                    className="p-4 rounded-xl text-left bg-transparent border border-slate-200 hover:bg-slate-100/50 transition-all group/opt active:scale-[0.98]">
                                    <p className="text-[13px] font-medium text-slate-700 group-hover/opt:text-slate-900 leading-snug">{s.label}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto py-12 px-6 space-y-12">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-500`}>
                                <div className={`flex items-start gap-4 ${m.role === 'user' ? 'flex-row-reverse max-w-[85%]' : 'max-w-full'}`}>
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all mt-1 ${
                                        m.role === 'user' ? 'bg-slate-100 border-slate-200 text-indigo-600' : 'bg-indigo-600 border-indigo-500 text-slate-900'
                                    }`}>
                                        {m.role === 'user' ? <User className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
                                    </div>

                                    <div className={`flex-1 min-w-0 flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        {m.role === 'user' ? (
                                            editingIndex === i ? (
                                                <div className="w-full bg-white rounded-2xl p-2 border border-slate-200 shadow-xl">
                                                    <textarea
                                                        autoFocus
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        className="w-full bg-transparent text-slate-900 text-[14px] px-6 py-4 outline-none resize-none min-h-[100px] leading-relaxed font-medium"
                                                    />
                                                    <div className="flex gap-2 justify-end p-3 pt-0">
                                                        <button onClick={() => setEditingIndex(null)} className="px-4 py-2 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors">Cancel</button>
                                                        <button onClick={() => handleEditMessage(i)} className="px-5 py-2 rounded-xl text-[11px] font-semibold bg-indigo-600 text-slate-900 hover:bg-indigo-500 shadow-lg shadow-indigo-200/20">Update</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="group relative">
                                                    <div className="bg-slate-100 text-slate-900 px-6 py-4 rounded-2xl rounded-tr-none text-[15px] leading-relaxed font-medium tracking-tight border border-slate-200 max-w-2xl shadow-sm">
                                                        <div className="whitespace-pre-wrap">{m.content}</div>
                                                    </div>
                                                    <button onClick={() => { setEditingIndex(i); setEditValue(m.content); }}
                                                        className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600 transition-all">
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            )
                                        ) : (
                                            <div className="w-full px-2 py-1 group/ai-msg">
                                                <div className="text-[15px] leading-[1.75] text-slate-700 font-medium">
                                                    {m.isTyping ? (
                                                        <TypingMessage 
                                                            content={m.content || ''} 
                                                            onComplete={() => setMessages(prev => prev.map((msg, idx) => idx === i ? { ...msg, isTyping: false } : msg))} 
                                                        />
                                                    ) : (
                                                        <MarkdownMessage content={m.content || ''} />
                                                    )}
                                                </div>

                                                {!m.isTyping && (
                                                    <div className="mt-6 flex items-center justify-between opacity-0 group-hover/ai-msg:opacity-100 transition-opacity">
                                                        <div className="flex items-center gap-2">
                                                            <MessageCopyButton text={m.content} />
                                                            {!m.feedbackGiven && i > 0 && (
                                                                <div className="flex items-center gap-1 border-l border-slate-200 ml-2 pl-2">
                                                                    <button 
                                                                        onClick={() => submitFeedback(i, 'helpful')} 
                                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 transition-all rounded-md hover:bg-slate-100"
                                                                        title="Helpful"
                                                                    >
                                                                        <ThumbsUp className="h-3.5 w-3.5" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => submitFeedback(i, 'not_helpful')} 
                                                                        className="p-1.5 text-slate-400 hover:text-red-500 transition-all rounded-md hover:bg-slate-100"
                                                                        title="Not Helpful"
                                                                    >
                                                                        <ThumbsDown className="h-3.5 w-3.5" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleOpenImprove(i)} 
                                                                        className="p-1.5 text-slate-400 hover:text-blue-400 transition-all rounded-md hover:bg-slate-100"
                                                                        title="Improve Answer"
                                                                    >
                                                                        <MessageSquarePlus className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {i === messages.length - 1 && (
                                                            <button onClick={handleRegenerate} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-semibold uppercase tracking-wider hover:bg-gray-700 hover:text-slate-900 transition-all">
                                                                <RotateCcw className="h-3.5 w-3.5" /> Regenerate
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && <TypingIndicator />}
                    </div>
                )}
                <div ref={messagesEndRef} className="h-40 flex-shrink-0" />
            </div>

            {/* ─── 3. Minimalist Command Bar ─── */}
            <div className={`absolute bottom-0 left-0 right-0 z-40 px-6 pb-8 pt-2 bg-gradient-to-t from-slate-50 dark:from-slate-900 to-transparent`}>
                <div className="max-w-3xl mx-auto">
                    <div className="relative group/composer">
                        
                        <div className="flex items-center gap-2 mb-3">
                            {/* Mode Selector */}
                            <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-lg">
                                {['default', 'debug', 'explain', 'build'].map(m => (
                                    <button 
                                        key={m}
                                        onClick={() => setMode(m)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                            mode === m 
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/20' 
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>

                            {/* File Attachment Chip */}
                            {selectedFile && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/30 rounded-xl animate-in fade-in slide-in-from-left-2 duration-300 max-w-[150px]">
                                    <Paperclip className="h-3 w-3 text-indigo-600 shrink-0" />
                                    <span className="text-[10px] text-indigo-600 font-bold truncate">{selectedFile.name}</span>
                                    <button onClick={removeFile} className="p-0.5 hover:bg-indigo-500/20 rounded-full text-indigo-600 transition-all">
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className={`relative flex items-end bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 transition-all duration-500 shadow-2xl focus-within:border-indigo-500/40 focus-within:ring-4 focus-within:ring-emerald-500/5 ${loading ? 'opacity-70' : ''}`}>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                                className="h-10 w-10 mb-1 ml-1 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-all flex-shrink-0"
                                title="Attach file or image"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                            
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileSelect} 
                                className="hidden" 
                                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,text/plain,.js,.json"
                            />

                            <textarea ref={textareaRef}
                                placeholder={loading ? "Synthesizing..." : "Message ZENTRAX-AI..."}
                                className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-slate-900 dark:text-slate-100 text-[15px] px-3 py-2.5 scroll-hidden resize-none max-h-[200px] min-h-[44px] leading-relaxed placeholder-gray-600 dark:placeholder-slate-500 font-medium"
                                value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} rows={1} disabled={loading} />
                            
                            <div className="flex items-center pr-2 pb-2 pl-2">
                                <button onClick={handleSend} disabled={loading || (!input.trim() && !selectedFile)}
                                    className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                        loading 
                                            ? 'text-slate-400' 
                                            : (input.trim() || selectedFile) 
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200/10 hover:bg-indigo-500' 
                                                : 'text-gray-700 dark:text-slate-500'
                                    }`}>
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                        <p className="text-center text-[11px] text-slate-400 mt-4 font-medium opacity-50 italic">ZENTRAX-AI can make mistakes. Check important info.</p>
                    </div>
                </div>
            </div>

            {/* Subtle Scroll Target */}
            {showScrollBtn && (
                <button onClick={scrollToBottom}
                    className="absolute bottom-32 left-1/2 -translate-x-1/2 h-10 w-10 bg-slate-100 border border-slate-200 text-slate-900 rounded-full shadow-2xl flex items-center justify-center hover:bg-gray-700 transition-all z-50">
                    <ChevronDown className="h-5 w-5" />
                </button>
            )}

            {/* ─── 4. AI Settings Panel ─── */}
            {showSettings && (
                <div className="absolute inset-0 z-50 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
                    <div className="relative ml-auto h-full w-full max-w-[320px] bg-white border-l border-slate-200 shadow-2xl flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
                            <div className="flex items-center gap-2">
                                <Settings className="h-4 w-4 text-indigo-600" />
                                <h3 className="text-sm font-bold text-slate-900 tracking-tight">AI Preferences</h3>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-slate-900">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Response Style */}
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Response Style</label>
                                <div className="space-y-3">
                                    {[
                                        { id: 'prefers_step_by_step', label: 'Step-by-step instructions' },
                                        { id: 'prefers_short_answers', label: 'Concise answers only' },
                                        { id: 'prefers_code_only', label: 'Prioritize code blocks' }
                                    ].map(pref => (
                                        <button 
                                            key={pref.id}
                                            onClick={() => updatePreference(pref.id, !userPrefs[pref.id])}
                                            className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                                userPrefs[pref.id] 
                                                    ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-600' 
                                                    : 'bg-slate-100/20 border-slate-200 text-slate-500 hover:border-slate-200'
                                            }`}
                                        >
                                            <span className="text-xs font-semibold">{pref.label}</span>
                                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${userPrefs[pref.id] ? 'bg-indigo-500 border-indigo-500' : 'border-slate-200'}`}>
                                                {userPrefs[pref.id] && <Check className="h-2.5 w-2.5 text-slate-900 stroke-[4]" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Technical Context */}
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Technical Context</label>
                                
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 mb-1">
                                            <Languages className="h-3.5 w-3.5 text-slate-500" />
                                            Preferred Language
                                        </div>
                                        <select 
                                            value={userPrefs.preferred_language}
                                            onChange={(e) => updatePreference('preferred_language', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-700 outline-none focus:border-indigo-500/30 transition-all appearance-none cursor-pointer"
                                        >
                                            {['English', 'Spanish', 'French', 'German', 'Hindi', 'Bengali'].map(lang => (
                                                <option key={lang} value={lang}>{lang}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 mb-1">
                                            <Sparkles className="h-3.5 w-3.5 text-slate-500" />
                                            Target Tech Stack
                                        </div>
                                        <input 
                                            type="text"
                                            value={userPrefs.preferred_stack}
                                            onChange={(e) => setUserPrefs(prev => ({ ...prev, preferred_stack: e.target.value }))}
                                            onBlur={(e) => updatePreference('preferred_stack', e.target.value)}
                                            placeholder="e.g. React, Node.js, Python"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-700 outline-none focus:border-indigo-500/30 transition-all placeholder-gray-700"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200">
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic text-center">
                                Preferences are saved automatically and applied to future responses.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── 5. Feedback / Improve Modal ─── */}
            {showFeedbackModal && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFeedbackModal(false)} />
                    
                    <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90%] scale-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-blue-600/10 flex items-center justify-center">
                                    <MessageSquarePlus className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Improve AI Response</h3>
                                    <p className="text-[11px] text-slate-500 font-medium">Your correction helps us train ZENTRAX-AI</p>
                                </div>
                            </div>
                            <button onClick={() => setShowFeedbackModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-slate-900">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {/* Issue Type */}
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">What was the issue?</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'factually_wrong', label: 'Factually wrong' },
                                        { id: 'poor_format', label: 'Poor formatting' },
                                        { id: 'too_long_short', label: 'Too long/short' },
                                        { id: 'other', label: 'Other/Ambiguous' }
                                    ].map(type => (
                                        <button 
                                            key={type.id}
                                            onClick={() => setIssueType(type.id)}
                                            className={`px-4 py-3 rounded-xl border text-xs font-semibold transition-all ${
                                                issueType === type.id 
                                                    ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-lg shadow-blue-900/10' 
                                                    : 'bg-transparent border-slate-200 text-slate-500 hover:border-slate-200 hover:text-slate-800'
                                            }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Corrected Text */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between pl-1">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Corrected Response</label>
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                        <Info className="h-3 w-3 text-blue-400" />
                                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-tight">Optional</span>
                                    </div>
                                </div>
                                <div className="relative group">
                                    <textarea 
                                        value={correctedText}
                                        onChange={(e) => setCorrectedText(e.target.value)}
                                        placeholder="How would you have answered this prompt?"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm text-slate-800 min-h-[160px] outline-none focus:border-blue-500/30 transition-all placeholder-gray-700 leading-relaxed font-medium"
                                    />
                                    <div className="absolute right-4 bottom-4 text-[10px] text-gray-700 font-mono">
                                        {correctedText.length} chars
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 flex gap-3">
                            <button 
                                onClick={() => setShowFeedbackModal(false)}
                                className="flex-1 py-3.5 rounded-2xl text-[12px] font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                disabled={isSubmittingFeedback}
                                onClick={() => submitFeedback(feedbackMsgIndex, feedbackType, { correctedText, issueType })}
                                className="flex-[2] py-3.5 rounded-2xl bg-blue-600 text-[12px] font-bold text-slate-900 hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/10 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmittingFeedback ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
                                Submit Improvement
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIChat;