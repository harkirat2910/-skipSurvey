'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Mic, MessageSquare, X, Send, User } from 'lucide-react';
import { tracker } from '@/lib/tracker';
import { getSessionId } from '@/lib/session';
import WaveformRecorder from './WaveformRecorder';
import styles from './Widget.module.css';

import DynamicAvatar from './DynamicAvatar';

interface AvatarWidgetProps {
    initiallyVisible?: boolean;
    triggerType?: string;
    surveyQuestion?: string; // Survey question text
    onSurveyResponse?: (answer: 'yes' | 'no') => void; // Callback for survey answers
}

type Mode = 'hidden' | 'bubble' | 'menu' | 'voice' | 'text' | 'success';

export default function AvatarWidget({ initiallyVisible = false, triggerType, surveyQuestion, onSurveyResponse }: AvatarWidgetProps) {
    const [mode, setMode] = useState<Mode>(initiallyVisible ? 'bubble' : 'hidden');

    useEffect(() => {
        if (initiallyVisible) setMode('bubble');

        // Skip analysis for survey triggers - only analyze friction events
        const isSurveyTrigger = triggerType?.startsWith('survey_');

        if (initiallyVisible && triggerType && !isSurveyTrigger) {
            tracker.track('feedback_opened', { trigger: triggerType });

            // Force flush so the backend creates the incident immediately
            tracker.forceFlush().then((response) => {
                const incidentId = response?.incident_id;
                console.log('Incident ID from flush:', incidentId);

                // Trigger backend analysis (Sentry + Repro)
                // Wait 4s to give Sentry time to ingest the event
                setTimeout(() => {
                    fetch('/api/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            session_id: getSessionId(),
                            incident_id: incidentId
                        })
                    }).then(res => res.json())
                        .then(data => console.log('Analysis result:', data))
                        .catch(err => console.error('Analysis trigger failed:', err));
                }, 4000);
            });
        }
    }, [initiallyVisible, triggerType]);

    const handleDismiss = () => {
        setMode('hidden');
        tracker.track('feedback_dismissed', {});
    };

    const handleQuickPick = (option: string) => {
        submitFeedback('quick_pick', { quick_pick: option });
    };

    const submitFeedback = async (feedbackMode: string, payload: any) => {
        const fullPayload = {
            session_id: getSessionId(),
            trigger_type: triggerType || 'manual',
            feedback_mode: feedbackMode,
            page: window.location.pathname,
            ts: Date.now(),
            ...payload
        };

        console.log('Unified Feedback Payload:', fullPayload);
        tracker.track('feedback_submitted', fullPayload);

        setMode('success');
        setTimeout(() => setMode('hidden'), 2500);
    };

    if (mode === 'hidden') return null;

    return (
        <div className={styles.container}>

            {/* Main Popover Card */}
            {mode !== 'bubble' && mode !== 'success' && (
                <div className={styles.popup}>
                    <div className={styles.popupHeader}>
                        <span className={styles.headerTitle}>How can we improve?</span>
                        <button onClick={handleDismiss} className={styles.closeBtn}><X size={16} /></button>
                    </div>

                    <div className={styles.popupContent}>
                        {mode === 'menu' && surveyQuestion ? (
                            // Survey Mode: Show Yes/No buttons
                            <div className={styles.menuContent}>
                                <div className={styles.promptText}>{surveyQuestion}</div>
                                <div className={styles.surveyButtons}>
                                    <button
                                        onClick={() => {
                                            onSurveyResponse?.('yes');
                                            setMode('success');
                                            setTimeout(() => setMode('hidden'), 2500);
                                        }}
                                        className={`${styles.surveyBtn} ${styles.yesBtn}`}
                                    >
                                        ✓ Yes
                                    </button>
                                    <button
                                        onClick={() => {
                                            onSurveyResponse?.('no');
                                            setMode('success');
                                            setTimeout(() => setMode('hidden'), 2500);
                                        }}
                                        className={`${styles.surveyBtn} ${styles.noBtn}`}
                                    >
                                        ✗ No
                                    </button>
                                </div>
                            </div>
                        ) : mode === 'menu' ? (
                            // Default friction mode
                            <div className={styles.menuContent}>
                                <div className={styles.promptText}>Looks like you hit a snag. Quick feedback?</div>
                                <div className={styles.optionGrid}>
                                    {['It keeps reloading', 'Button not working', 'Confusing layout', 'Something else'].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => handleQuickPick(opt)}
                                            className={styles.optionBtn}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {mode === 'success' && (
                <div className={styles.successCard}>
                    <p>Thanks! We're on it.</p>
                </div>
            )}

            {/* Speech Bubble Prompt */}
            {mode === 'bubble' && (
                <div className={styles.speechBubble}>
                    Something wrong? Tap me to fix it.
                </div>
            )}

            {/* Floating Avatar Button */}
            <button
                onClick={() => setMode(mode === 'bubble' ? 'menu' : 'bubble')}
                className={`${styles.avatarBtn} ${mode === 'bubble' ? styles.avatarBounce : ''}`}
            >
                {mode === 'bubble' && <div className={styles.notificationDot}></div>}
                <div className={styles.avatarWrapper}>
                    <DynamicAvatar />
                </div>
            </button>
        </div>
    );
}
