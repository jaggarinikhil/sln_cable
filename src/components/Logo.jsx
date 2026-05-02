import React from 'react';

/**
 * SLN Cable & Networks brand logo.
 * - Rounded square with the accent gradient
 * - Stylized white "S" glyph
 * - Signal-arc waves on the upper-right hinting at cable + network
 */
const Logo = ({ size = 32, className = '', title = 'SLN Cable & Networks' }) => {
    const gradId = `sln-logo-grad-${size}`;
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            role="img"
            aria-label={title}
        >
            <title>{title}</title>
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#6366f1" />
                    <stop offset="1" stopColor="#a855f7" />
                </linearGradient>
            </defs>

            {/* Background tile */}
            <rect width="32" height="32" rx="8" fill={`url(#${gradId})`} />

            {/* Stylized "S" glyph */}
            <path
                d="M20.5 10.5c-1.1-1.2-2.7-1.9-4.6-1.9-2.9 0-5 1.6-5 4 0 2.2 1.7 3.3 4.6 3.9l1.3 0.3c1.6 0.3 2.4 0.7 2.4 1.5 0 0.9-1 1.5-2.6 1.5-1.7 0-3-0.6-4.1-1.7"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />

            {/* Signal waves (cable + network motif) */}
            <g
                stroke="#ffffff"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
                opacity="0.9"
            >
                <path d="M22.5 7.5 Q24.5 9 24 11.5" />
                <path d="M24.5 6 Q27.5 8.5 26.5 13" />
            </g>
            <circle cx="22" cy="6" r="1.1" fill="#ffffff" />
        </svg>
    );
};

export default Logo;
