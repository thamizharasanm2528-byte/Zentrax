import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

const TagInput = ({ value = [], onChange, placeholder = 'Type and press Enter...', maxTags = 15, className = '' }) => {
    const [input, setInput] = useState('');

    const addTag = (tag) => {
        const trimmed = tag.trim();
        if (!trimmed || value.includes(trimmed) || value.length >= maxTags) return;
        onChange([...value, trimmed]);
    };

    const removeTag = (index) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
            setInput('');
        } else if (e.key === 'Backspace' && !input && value.length > 0) {
            removeTag(value.length - 1);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        const tags = text.split(',').map(t => t.trim()).filter(Boolean);
        const newTags = [...value];
        tags.forEach(t => {
            if (!newTags.includes(t) && newTags.length < maxTags) newTags.push(t);
        });
        onChange(newTags);
    };

    return (
        <div className={`w-full ${className}`}>
            <div className="flex flex-wrap gap-2 p-3 min-h-[48px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus-within:ring-2 focus-within:ring-primary-500 transition-all">
                {value.map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold rounded-full animate-fade-in">
                        {tag}
                        <button type="button" onClick={() => removeTag(i)} className="hover:text-red-500 transition-colors">
                            <X className="h-3 w-3" />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={value.length === 0 ? placeholder : value.length >= maxTags ? 'Max reached' : ''}
                    disabled={value.length >= maxTags}
                    className="flex-1 min-w-[120px] bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 disabled:cursor-not-allowed"
                />
            </div>
            {value.length > 0 && (
                <p className="text-[10px] text-gray-400 mt-1">{value.length}/{maxTags} tags</p>
            )}
        </div>
    );
};

export default TagInput;
