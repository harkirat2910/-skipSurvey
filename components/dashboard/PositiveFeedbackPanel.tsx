
import React from 'react';

export default function PositiveFeedbackPanel({ signals }: { signals: any[] }) {
    const avgTime = signals.reduce((acc, s) => acc + s.timeToCompleteMs, 0) / (signals.length || 1);
    const total = signals.length;

    return (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h2 style={{ marginTop: 0 }}>Top Smooth Flows</h2>

            <div style={{ display: 'flex', gap: '30px', marginBottom: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'green' }}>{total}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Successful Completions</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>{(avgTime / 1000).toFixed(1)}s</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Avg Completion Time</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333' }}>0</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Errors</div>
                </div>
            </div>

            <h3>A/B Performance (Simulated)</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '100px', gap: '20px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '60%', background: '#ccc' }}></div>
                    <div style={{ marginTop: '5px', fontWeight: 'bold' }}>Var A</div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '85%', background: '#4caf50' }}></div>
                    <div style={{ marginTop: '5px', fontWeight: 'bold' }}>Var B</div>
                </div>
            </div>
        </div>
    );
}
