import { useEffect } from 'react';

/**
 * useKeyboardShortcuts — Global keyboard shortcuts for ZENTRAX.
 * 
 * Shortcuts:
 *   - Ctrl+K / Cmd+K  → Focus search bar
 *   - Escape           → Close modals / dropdowns
 * 
 * @param {Object} handlers — Map of shortcut keys to callbacks
 *   Example: { 'search': () => document.getElementById('search-input')?.focus() }
 */
const useKeyboardShortcuts = (handlers = {}) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't intercept when typing in input/textarea
            const tag = document.activeElement?.tagName?.toLowerCase();
            const isEditing = tag === 'input' || tag === 'textarea' || tag === 'select';

            // Ctrl+K / Cmd+K — Search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (handlers.search) {
                    handlers.search();
                } else {
                    // Default: focus the search input in navbar
                    const searchInput = document.querySelector('input[type="search"]');
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.select();
                    }
                }
                return;
            }

            // Escape — Close
            if (e.key === 'Escape' && !isEditing) {
                if (handlers.escape) {
                    handlers.escape();
                }
                return;
            }

            // Ctrl+N / Cmd+N — New (project/task/etc)
            if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !isEditing) {
                if (handlers.new) {
                    e.preventDefault();
                    handlers.new();
                }
                return;
            }

            // ? — Show shortcuts help
            if (e.key === '?' && !isEditing) {
                if (handlers.help) {
                    handlers.help();
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlers]);
};

export default useKeyboardShortcuts;
