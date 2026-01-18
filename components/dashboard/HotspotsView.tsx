
import React from 'react';

export default function HotspotsView({ incidents }: { incidents: any[] }) {
    // Simple aggregation
    const hotspots: Record<string, number> = {};

    incidents.forEach(inc => {
        const key = `${inc.page}::${inc.triggerType}`;
        hotspots[key] = (hotspots[key] || 0) + 1;
    });

    return (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h2 style={{ marginTop: 0 }}>Friction Hotspots</h2>
            {Object.entries(hotspots).length === 0 ? <p>No hotspots detected yet.</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {Object.entries(hotspots).map(([key, count]) => {
                        const [page, trigger] = key.split('::');
                        return (
                            <li key={key} style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                                <span>
                                    <strong>{page}</strong> <br />
                                    <span style={{ fontSize: '12px', color: '#666' }}>{trigger}</span>
                                </span>
                                <span style={{ background: '#ffebee', color: '#c62828', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                    {count}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
