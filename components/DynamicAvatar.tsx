'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function DynamicAvatar() {
    const [pupilPos, setPupilPos] = useState({ x: 0, y: 0 });
    const faceRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!faceRef.current) return;

            const rect = faceRef.current.getBoundingClientRect();
            const faceCenterX = rect.left + rect.width / 2;
            const faceCenterY = rect.top + rect.height / 2;

            // Calculate vector from eye center to mouse
            const dx = e.clientX - faceCenterX;
            const dy = e.clientY - faceCenterY;

            // Normalize and limit radius
            const maxRadius = 6;
            const angle = Math.atan2(dy, dx);
            const distance = Math.min(Math.sqrt(dx * dx + dy * dy) / 15, maxRadius);

            setPupilPos({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div ref={faceRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg
                viewBox="0 0 100 100"
                style={{ width: '100%', height: '100%', overflow: 'visible', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
            >
                <defs>
                    <linearGradient id="faceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2db757" /> {/* SurveyMonkey Green Light */}
                        <stop offset="100%" stopColor="#00bf6f" /> {/* SurveyMonkey Green Dark */}
                    </linearGradient>
                    <linearGradient id="earGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4cd964" />
                        <stop offset="100%" stopColor="#00a05a" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Ears */}
                <circle cx="15" cy="50" r="12" fill="url(#earGrad)" />
                <circle cx="85" cy="50" r="12" fill="url(#earGrad)" />
                <circle cx="15" cy="50" r="6" fill="#e0e7ff" opacity="0.5" />
                <circle cx="85" cy="50" r="6" fill="#e0e7ff" opacity="0.5" />

                {/* Head Base */}
                <circle cx="50" cy="50" r="38" fill="url(#faceGrad)" />

                {/* Face Mask (Lighter area) */}
                <path d="M 30 35 Q 50 25 70 35 Q 85 55 70 75 Q 50 85 30 75 Q 15 55 30 35" fill="#eef2ff" />

                {/* Eyes Container */}
                <g transform="translate(0, -2)">
                    {/* Left Eye */}
                    <circle cx="36" cy="48" r="8" fill="white" />
                    <circle
                        cx={36 + pupilPos.x}
                        cy={48 + pupilPos.y}
                        r="3.5"
                        fill="#1e293b"
                    />
                    <circle cx={37 + pupilPos.x} cy={47 + pupilPos.y} r="1.5" fill="white" opacity="0.8" />

                    {/* Right Eye */}
                    <circle cx="64" cy="48" r="8" fill="white" />
                    <circle
                        cx={64 + pupilPos.x}
                        cy={48 + pupilPos.y}
                        r="3.5"
                        fill="#1e293b"
                    />
                    <circle cx={65 + pupilPos.x} cy={47 + pupilPos.y} r="1.5" fill="white" opacity="0.8" />
                </g>

                {/* Nose & Mouth */}
                <path d="M 48 62 Q 50 64 52 62" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M 40 72 Q 50 78 60 72" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" fill="none" />

                {/* Hair Tuft */}
                <path d="M 45 15 Q 50 5 55 15" stroke="url(#faceGrad)" strokeWidth="3" fill="none" />
            </svg>
        </div>
    );
}
