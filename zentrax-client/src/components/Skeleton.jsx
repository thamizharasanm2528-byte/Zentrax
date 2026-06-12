import React from 'react';

/**
 * A premium skeleton loader with a shimmer effect.
 * 
 * @param {Object} props
 * @param {string} [props.className] - Additional CSS classes.
 * @param {string} [props.width] - Fixed width.
 * @param {string} [props.height] - Fixed height.
 * @param {string} [props.variant='rect'] - 'text', 'circular', 'rect'.
 */
const Skeleton = ({ className = "", width, height, variant = 'rect' }) => {
    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        rect: 'rounded-xl',
    };

    return (
        <div 
            className={`relative overflow-hidden bg-gray-200 dark:bg-gray-800 animate-pulse ${variantClasses[variant]} ${className}`}
            style={{ width, height }}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-gray-700/50 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        </div>
    );
};

export default Skeleton;