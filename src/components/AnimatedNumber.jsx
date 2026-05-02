import React, { useEffect, useRef, useState } from 'react';

/**
 * Smoothly animates a numeric value to a target.
 * Props:
 *   value: target number
 *   duration: ms (default 800)
 *   format: function(n) => string (default rounds to integer with en-IN locale)
 *   prefix: string (e.g. '₹')
 *   className: pass-through
 */
const AnimatedNumber = ({ value, duration = 800, format, prefix = '', className }) => {
    const [display, setDisplay] = useState(value || 0);
    const fromRef = useRef(value || 0);
    const startRef = useRef(0);
    const rafRef = useRef(null);

    useEffect(() => {
        const target = Number(value) || 0;
        const from = fromRef.current;
        if (from === target) return;
        startRef.current = performance.now();
        const animate = (now) => {
            const elapsed = now - startRef.current;
            const t = Math.min(1, elapsed / duration);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - t, 3);
            const current = from + (target - from) * eased;
            setDisplay(current);
            if (t < 1) {
                rafRef.current = requestAnimationFrame(animate);
            } else {
                fromRef.current = target;
                setDisplay(target);
            }
        };
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, [value, duration]);

    const formatted = format
        ? format(display)
        : Math.round(display).toLocaleString('en-IN');

    return <span className={className}>{prefix}{formatted}</span>;
};

export default AnimatedNumber;
