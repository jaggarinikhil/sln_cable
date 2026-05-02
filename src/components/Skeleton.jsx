import React from 'react';

/**
 * Pulsing skeleton placeholder.
 * Props: width, height, radius (border-radius), className
 */
export const Skeleton = ({ width = '100%', height = 16, radius = 8, className = '' }) => (
    <span
        className={`skeleton-pulse ${className}`}
        style={{
            display: 'inline-block',
            width,
            height,
            borderRadius: radius,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
            backgroundSize: '200% 100%',
            animation: 'skeletonPulse 1.6s ease-in-out infinite',
        }}
    />
);

export const SkeletonRow = ({ count = 5, height = 60, gap = 12 }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} height={height} />
        ))}
        <style>{`
            @keyframes skeletonPulse {
                0% { background-position: 100% 0; }
                100% { background-position: -100% 0; }
            }
        `}</style>
    </div>
);

export default Skeleton;
