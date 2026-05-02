import React from 'react';

/**
 * Compact donut chart of category breakdown.
 * data: [{ key, label, color, value }]
 */
const CategoryDonut = ({ data, total, label = 'Total', size = 180 }) => {
    const filtered = (data || []).filter(d => d.value > 0);
    const sum = total ?? filtered.reduce((s, d) => s + d.value, 0);

    if (sum <= 0 || filtered.length === 0) {
        return (
            <div className="donut-empty" style={{ height: size + 40 }}>
                <span>No data to chart yet</span>
            </div>
        );
    }

    const fmt = (n) => {
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
        return `₹${Math.round(n).toLocaleString('en-IN')}`;
    };

    // Build SVG arc segments
    const radius = size / 2 - 8;
    const cx = size / 2, cy = size / 2;
    const stroke = 22;
    const inner = radius - stroke / 2;
    let cumulative = 0;
    const circ = 2 * Math.PI * inner;

    const segments = filtered.map(d => {
        const fraction = d.value / sum;
        const dasharray = `${circ * fraction} ${circ}`;
        const dashoffset = -circ * cumulative;
        cumulative += fraction;
        return { ...d, fraction, dasharray, dashoffset };
    });

    return (
        <div className="donut-wrap">
            <div className="donut-svg-wrap" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Background ring */}
                    <circle
                        cx={cx} cy={cy} r={inner}
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth={stroke}
                    />
                    {segments.map((s, i) => (
                        <circle
                            key={s.key || i}
                            cx={cx} cy={cy} r={inner}
                            fill="none"
                            stroke={s.color}
                            strokeWidth={stroke}
                            strokeDasharray={s.dasharray}
                            strokeDashoffset={s.dashoffset}
                            strokeLinecap="butt"
                            transform={`rotate(-90 ${cx} ${cy})`}
                            style={{ transition: 'stroke-dasharray 0.6s ease' }}
                        />
                    ))}
                </svg>
                <div className="donut-center">
                    <span className="donut-center-label">{label}</span>
                    <span className="donut-center-value">{fmt(sum)}</span>
                </div>
            </div>
            <div className="donut-legend">
                {segments.slice(0, 6).map((s, i) => (
                    <div className="donut-leg-row" key={s.key || i}>
                        <span className="donut-leg-dot" style={{ background: s.color }} />
                        <span className="donut-leg-label">{s.label}</span>
                        <span className="donut-leg-pct">{(s.fraction * 100).toFixed(0)}%</span>
                        <span className="donut-leg-val">{fmt(s.value)}</span>
                    </div>
                ))}
                {segments.length > 6 && (
                    <div className="donut-leg-more">+{segments.length - 6} more</div>
                )}
            </div>
            <style>{`
                .donut-wrap {
                    display: flex;
                    align-items: center;
                    gap: 24px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 18px;
                    margin-bottom: 18px;
                }
                .donut-empty {
                    display: flex; align-items: center; justify-content: center;
                    background: var(--bg-card);
                    border: 1px dashed var(--border);
                    border-radius: 16px;
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                    margin-bottom: 18px;
                }
                .donut-svg-wrap { position: relative; flex-shrink: 0; }
                .donut-center {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    pointer-events: none;
                }
                .donut-center-label {
                    font-size: 0.65rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    font-weight: 700;
                    color: var(--text-secondary);
                }
                .donut-center-value {
                    font-size: 1.2rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin-top: 2px;
                }
                .donut-legend {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    min-width: 0;
                }
                .donut-leg-row {
                    display: grid;
                    grid-template-columns: 12px 1fr auto auto;
                    gap: 8px;
                    align-items: center;
                    font-size: 0.82rem;
                }
                .donut-leg-dot { width: 10px; height: 10px; border-radius: 3px; }
                .donut-leg-label { color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .donut-leg-pct { color: var(--text-secondary); font-size: 0.75rem; min-width: 32px; text-align: right; }
                .donut-leg-val { color: var(--text-primary); font-weight: 700; min-width: 64px; text-align: right; }
                .donut-leg-more { font-size: 0.75rem; color: var(--text-secondary); padding-left: 18px; }

                @media (max-width: 600px) {
                    .donut-wrap { flex-direction: column; gap: 16px; padding: 14px; }
                    .donut-svg-wrap { align-self: center; }
                    .donut-legend { width: 100%; }
                }
            `}</style>
        </div>
    );
};

export default CategoryDonut;
