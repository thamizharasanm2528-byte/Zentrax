import React, { useState } from 'react';
import { Plus, MessageSquare, MoreVertical, Pencil, Trash2, Download, X, Check, Search, Brain, Loader2 } from 'lucide-react';

/**
 * Groups conversations by date: Today, Yesterday, Previous 7 Days, Older
 */
function groupByDate(conversations = []) {
    const data = conversations || [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

    const groups = { Today: [], Yesterday: [], 'Previous 7 Days': [], Older: [] };
    for (const c of data) {
        const d = new Date(c.updated_at || c.created_at);
        if (d >= today) groups.Today.push(c);
        else if (d >= yesterday) groups.Yesterday.push(c);
        else if (d >= weekAgo) groups['Previous 7 Days'].push(c);
        else groups.Older.push(c);
    }
    return groups;
}

const ChatSidebar = ({ conversations = [], activeId, onSelect, onNewChat, onRename, onDelete, onExport, isCreating }) => {
    const [menuOpen, setMenuOpen] = useState(null);
    const [renaming, setRenaming] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const safeConversations = conversations || [];
    const filtered = searchQuery.trim()
        ? safeConversations.filter(c => c.title?.toLowerCase().includes(searchQuery.toLowerCase()))
        : safeConversations;
    const grouped = groupByDate(filtered);

    const handleRenameStart = (c) => {
        setRenaming(c.id);
        setRenameValue(c.title);
        setMenuOpen(null);
    };

    const handleRenameSubmit = (id) => {
        if (renameValue.trim()) onRename(id, renameValue.trim());
        setRenaming(null);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200/40 w-full relative overflow-hidden transition-all group">
            {/* ── Action Header ── */}
            <div className="p-4">
                <button
                    onClick={onNewChat}
                    disabled={isCreating}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-900 transition-all active:scale-[0.98] shadow-lg shadow-indigo-200/10 ${
                        isCreating ? 'bg-emerald-800/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'
                    }`}
                >
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 
                    <span>{isCreating ? 'Creating...' : 'New Chat'}</span>
                </button>

                {/* Modern search input */}
                <div className="relative mt-3">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                        placeholder="Search threads..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-1000 text-slate-700 text-[13px] pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500/40 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all placeholder-gray-700 font-medium"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Intel History Stream ── */}
            <div className="flex-1 overflow-y-auto px-3 pb-10 mt-2 custom-scrollbar space-y-6">
                {Object.entries(grouped).map(([label, items]) => {
                    if (items.length === 0) return null;
                    return (
                        <div key={label} className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 px-3 py-1 uppercase tracking-[0.2em]">
                                {label === 'Today' ? 'Recent' : label}
                            </p>
                            <div className="space-y-0.5">
                                {items.map(c => (
                                    <div key={c.id} className="relative group/item">
                                        {renaming === c.id ? (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/30 rounded-xl border border-indigo-500/30 shadow-inner scale-100 animate-in zoom-in-95 duration-200">
                                                <input
                                                    autoFocus
                                                    value={renameValue}
                                                    onChange={e => setRenameValue(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(c.id); if (e.key === 'Escape') setRenaming(null); }}
                                                    className="flex-1 bg-transparent text-slate-900 text-xs outline-none font-medium placeholder-gray-700"
                                                />
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleRenameSubmit(c.id)} className="text-indigo-600 hover:text-emerald-300 p-1 rounded hover:bg-indigo-500/10 transition-all"><Check className="h-3.5 w-3.5" /></button>
                                                    <button onClick={() => setRenaming(null)} className="text-slate-500 hover:text-slate-900 p-1 rounded hover:bg-gray-700 transition-all"><X className="h-3.5 w-3.5" /></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => onSelect(c.id)}
                                                className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all relative active:scale-[0.99] ${
                                                    activeId === c.id
                                                        ? 'bg-slate-100 text-slate-900'
                                                        : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
                                                }`}
                                            >
                                                <MessageSquare className={`h-4 w-4 flex-shrink-0 ${activeId === c.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                                                <div className="flex-1 min-w-0 pr-6">
                                                    <p className="text-[13px] truncate font-medium tracking-tight">
                                                        {c.title || 'Untitled Chat'}
                                                    </p>
                                                </div>

                                                <span
                                                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === c.id ? null : c.id); }}
                                                    className={`absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 p-1 hover:bg-gray-700 rounded-lg transition-all z-10 ${menuOpen === c.id ? 'opacity-100 bg-gray-700' : ''}`}
                                                >
                                                    <MoreVertical className="h-3.5 w-3.5" />
                                                </span>
                                            </button>
                                        )}

                                        {menuOpen === c.id && (
                                            <div className="absolute left-2 right-2 top-10 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-200">
                                                <button onClick={() => handleRenameStart(c)} className="w-full flex items-center gap-2.5 px-4 py-2 text-[11px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium">
                                                    <Pencil className="h-3.5 w-3.5" /> Rename
                                                </button>
                                                <button onClick={() => { setMenuOpen(null); onExport(c.id); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-[11px] text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium">
                                                    <Download className="h-3.5 w-3.5" /> Export
                                                </button>
                                                <div className="mx-2 my-1 h-px bg-slate-100"></div>
                                                <button onClick={() => { setMenuOpen(null); onDelete(c.id); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-[11px] text-red-500/80 hover:bg-red-500/10 transition-colors font-medium">
                                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {conversations.length === 0 && (
                    <div className="flex flex-col items-center justify-center pt-20 text-center px-8 opacity-40">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100/50 flex items-center justify-center mb-4">
                            <MessageSquare className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-[11px] text-slate-500 font-bold tracking-widest uppercase">No history</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatSidebar;