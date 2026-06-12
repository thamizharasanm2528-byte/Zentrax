import React from 'react';
import { Link } from 'react-router-dom';

/**
 * A reusable empty state component for the ZENTRAX platform.
 * 
 * @param {Object} props
 * @param {LucideIcon} props.icon - The Lucide icon component to display.
 * @param {string} props.title - The main heading for the empty state.
 * @param {string} props.message - Descriptive text for the empty state.
 * @param {string} [props.actionLabel] - Label for the primary action button.
 * @param {string} [props.actionPath] - Link destination for the primary action button.
 * @param {string} [props.className] - Additional CSS classes.
 */
const EmptyState = ({ 
    icon: Icon, 
    title, 
    message, 
    actionLabel, 
    actionPath,
    className = ""
}) => {
    return (
        <div className={`py-16 px-6 text-center max-w-md mx-auto space-y-5 animate-in fade-in zoom-in-95 duration-500 ${className}`}>
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center rounded-3xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden group">
                <div className="absolute inset-0 bg-primary-500/5 rotate-12 translate-x-4 -translate-y-4 rounded-3xl group-hover:scale-110 transition-transform" />
                <Icon className="h-10 w-10 text-gray-400 group-hover:text-primary-500 transition-colors relative z-10" />
            </div>
            
            <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
            </div>
            
            {actionLabel && actionPath && (
                <Link 
                    to={actionPath}
                    className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary-500/20 active:scale-95"
                >
                    {actionLabel}
                </Link>
            )}
        </div>
    );
};

export default EmptyState;
