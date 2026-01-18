
import React from 'react';
import styles from './dashboard.module.css';

export default function AnalyticsCharts({ incidents, successSignals }: { incidents: any[], successSignals: any[] }) {
    // 1. Stats Calculation
    const totalIncidents = incidents.length;
    const totalSuccess = successSignals.length;
    const successRate = totalSuccess + totalIncidents > 0
        ? ((totalSuccess / (totalSuccess + totalIncidents)) * 100).toFixed(1)
        : '0';

    const avgTime = successSignals.length > 0
        ? (successSignals.reduce((acc, s) => acc + s.timeToCompleteMs, 0) / successSignals.length / 1000).toFixed(1)
        : '0';

    // 2. Hotspots (Grouping)
    const hotspots: Record<string, number> = {};
    incidents.forEach(inc => {
        // Simplified: Just use component or trigger, or parse from page URL
        const key = inc.triggerType;
        hotspots[key] = (hotspots[key] || 0) + 1;
    });
    const sortedHotspots = Object.entries(hotspots).sort((a, b) => b[1] - a[1]);
    const maxHotspot = Math.max(...Object.values(hotspots), 1);

    return (
        <div>
            {/* STATS ROW */}
            <div className={styles.statsRow}>
                <div className={styles.card}>
                    <div className={styles.statLabel}>User Happiness</div>
                    <div className={styles.statValue} style={{ color: Number(successRate) > 80 ? '#69f0ae' : '#ffb74d' }}>
                        {successRate}%
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Success Rate</div>
                </div>
                <div className={styles.card}>
                    <div className={styles.statLabel}>Avg Speed</div>
                    <div className={styles.statValue}>
                        {avgTime}s
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Time to Complete</div>
                </div>
                <div className={styles.card}>
                    <div className={styles.statLabel}>Total Friction</div>
                    <div className={styles.statValue} style={{ color: '#ff5252' }}>
                        {totalIncidents}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Incidents Detected</div>
                </div>
            </div>

            {/* CHARTS ROW */}
            <div className={styles.grid} style={{ gridTemplateColumns: '1fr 1fr' }}>

                {/* HOTSPOTS CHART */}
                <div className={styles.card}>
                    <h3 className={styles.subtitle}>Friction Sources</h3>
                    <div style={{ marginTop: '20px' }}>
                        {sortedHotspots.map(([label, value]) => (
                            <div key={label} style={{ marginBottom: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                                    <span>{label.toUpperCase()}</span>
                                    <span>{value}</span>
                                </div>
                                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${(value / maxHotspot) * 100}%`,
                                        background: '#ff5252'
                                    }} />
                                </div>
                            </div>
                        ))}
                        {sortedHotspots.length === 0 && <p style={{ color: '#666', fontSize: '13px' }}>No data yet.</p>}
                    </div>
                </div>

                {/* A/B CHART */}
                <div className={styles.card}>
                    <h3 className={styles.subtitle}>A/B Conversion (Simulated)</h3>
                    <div className={styles.barContainer} style={{ justifyContent: 'center', marginTop: '30px', height: '120px' }}>
                        <div className={styles.bar} style={{ height: '40%', background: '#ffb74d' }}>
                            <div className={styles.barLabel}>Variant A<br />(Slow)</div>
                        </div>
                        <div className={styles.bar} style={{ height: '85%', background: '#69f0ae' }}>
                            <div className={styles.barLabel}>Variant B<br />(Fast)</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
