'use client';

import React from 'react';
import styles from './dashboard.module.css';
import { Bug, Play, ExternalLink, Activity } from 'lucide-react';

export default function IncidentCard({ incident, sentryOrg }: { incident: any, sentryOrg: string }) {
    const gemini = incident.geminiReport ? JSON.parse(incident.geminiReport) : {};
    const rootCause = incident.rootCauseRanking ? JSON.parse(incident.rootCauseRanking) : [];

    return (
        <div className={styles.incidentCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'start' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ background: '#2d2d3a', padding: '10px', borderRadius: '8px' }}>
                        <Bug size={24} color="#e53935" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>{gemini.issue_title || incident.triggerType}</h3>
                        <div style={{ fontSize: '0.85rem', color: '#8898aa', marginTop: '4px' }}>
                            <span suppressHydrationWarning>{new Date(incident.createdAt).toLocaleString()}</span> • {incident.page}
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div className={styles.tag} style={{ background: 'rgba(255,100,100,0.1)', color: '#ff6b6b' }}>
                        Friction Score: {incident.frictionScore}
                    </div>
                </div>
            </div>

            <div className={styles.grid} style={{ gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
                <div>
                    <h4 style={{ color: '#8898aa', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginTop: 0 }}>AI Analysis</h4>
                    <p style={{ marginBottom: '5px' }}><strong style={{ color: '#a0aec0' }}>Intent:</strong> {gemini.intent}</p>
                    <p style={{ marginBottom: '5px' }}><strong style={{ color: '#a0aec0' }}>Proposed Fix:</strong> {gemini.suggested_fix}</p>

                    <div style={{ marginTop: '20px' }}>
                        <h4 style={{ color: '#8898aa', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>Root Cause Detection</h4>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            {rootCause.slice(0, 2).map((rc: any, i: number) => (
                                <div key={i} style={{ background: '#23232c', padding: '8px 12px', borderRadius: '6px', fontSize: '0.9rem', border: '1px solid #333' }}>
                                    <span style={{ color: '#6C5DD3', fontWeight: 'bold' }}>{(rc.score * 100).toFixed(0)}%</span> {rc.component}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ color: '#8898aa', textTransform: 'uppercase', fontSize: '0.75rem', margin: 0 }}>Reproduction</h4>
                        {incident.sentryIssueId ? (
                            <a href={`https://sentry.io/organizations/${sentryOrg}/issues/${incident.sentryIssueId}/?project=4508657640308736`} target="_blank" className={styles.tag} style={{ cursor: 'pointer', textDecoration: 'none', gap: '5px', color: 'white', background: '#333' }}>
                                <ExternalLink size={12} /> Sentry Issue
                            </a>
                        ) : incident.sentryEventId ? (
                            <a href={`https://sentry.io/events/${incident.sentryEventId}`} target="_blank" className={styles.tag} style={{ cursor: 'pointer', textDecoration: 'none', gap: '5px', color: 'white', background: '#333' }}>
                                <ExternalLink size={12} /> Sentry Event
                            </a>
                        ) : (
                            <span style={{ fontSize: '10px', color: '#555' }}>Linked via tags</span>
                        )}
                    </div>

                    <div className={styles.codeBlock}>
                        {/* Header removed as per user request */}
                        {incident.reproScript || '// No script generated'}
                    </div>
                </div>
            </div>
        </div>
    );
}
