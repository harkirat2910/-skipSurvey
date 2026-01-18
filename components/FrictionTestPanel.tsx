/**
 * Friction Testing Panel
 * Developer tool for testing all friction detection patterns
 */

'use client';

import React from 'react';

export default function FrictionTestPanel() {
    const [isVisible, setIsVisible] = React.useState(false);

    const testDeadClick = () => {
        alert('This is a Dead Click test button.\n\nClick it and wait 3 seconds without doing anything else.\n\nExpected: Dead click detected after 3 seconds.');
    };

    const testErrorLoop = () => {
        alert('This will trigger 4 errors in 2 seconds.\n\nExpected: Error loop detected after 3 errors.');
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                throw new Error(`Test error ${i + 1}`);
            }, i * 500);
        }
    };

    const testBacktrackLoop = () => {
        alert('Backtrack loop testing:\n\n1. Navigate to /dashboard\n2. Press browser back\n3. Navigate to /dashboard again\n4. Press back again\n\nExpected: Backtrack loop detected after 2 cycles');
        window.location.href = '/dashboard';
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            zIndex: 10000,
            background: isVisible ? 'white' : '#007185',
            border: '2px solid #007185',
            borderRadius: '8px',
            padding: isVisible ? '15px' : '10px 15px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: isVisible ? '300px' : 'auto'
        }}>
            {!isVisible ? (
                <button
                    onClick={() => setIsVisible(true)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                    }}
                >
                    🧪 Test Friction Patterns
                </button>
            ) : (
                <>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '15px'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#0F1111' }}>
                            🧪 Friction Tests
                        </h3>
                        <button
                            onClick={() => setIsVisible(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '18px',
                                padding: 0,
                                lineHeight: 1
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Rage Click Test */}
                        <div style={{
                            padding: '10px',
                            background: '#F3F3F3',
                            borderRadius: '4px',
                            border: '1px solid #D5D9D9'
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
                                1. Rage Click (Already Active)
                            </div>
                            <div style={{ fontSize: '11px', color: '#565959' }}>
                                Click "Apply" coupon button 5+ times rapidly
                            </div>
                        </div>

                        {/* Dead Click Test */}
                        <div style={{
                            padding: '10px',
                            background: '#F3F3F3',
                            borderRadius: '4px',
                            border: '1px solid #D5D9D9'
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
                                2. Dead Click Test
                            </div>
                            <button
                                onClick={testDeadClick}
                                onClickCapture={(e) => e.preventDefault()}
                                style={{
                                    width: '100%',
                                    padding: '6px 12px',
                                    background: '#FFF',
                                    border: '1px solid #D5D9D9',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                Click Me (No Response)
                            </button>
                        </div>

                        {/* Error Loop Test */}
                        <div style={{
                            padding: '10px',
                            background: '#F3F3F3',
                            borderRadius: '4px',
                            border: '1px solid #D5D9D9'
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
                                3. Error Loop Test
                            </div>
                            <button
                                onClick={testErrorLoop}
                                style={{
                                    width: '100%',
                                    padding: '6px 12px',
                                    background: '#FFD814',
                                    border: '1px solid #FCD200',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                            >
                                Trigger Errors
                            </button>
                        </div>

                        {/* Backtrack Loop Test */}
                        <div style={{
                            padding: '10px',
                            background: '#F3F3F3',
                            borderRadius: '4px',
                            border: '1px solid #D5D9D9'
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
                                4. Backtrack Loop Test
                            </div>
                            <button
                                onClick={testBacktrackLoop}
                                style={{
                                    width: '100%',
                                    padding: '6px 12px',
                                    background: '#007185',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}
                            >
                                Test Navigation Loop
                            </button>
                        </div>

                        <div style={{
                            fontSize: '10px',
                            color: '#565959',
                            marginTop: '5px',
                            padding: '5px',
                            background: '#FFF9E6',
                            borderRadius: '4px'
                        }}>
                            💡 Check browser console and Sentry for detected events
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
