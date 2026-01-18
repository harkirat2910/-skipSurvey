'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader } from 'lucide-react';
import { getSessionId } from '@/lib/session';

interface WaveformRecorderProps {
    onRecordingComplete: (voiceId: string) => void;
    onCancel: () => void;
}

export default function WaveformRecorder({ onRecordingComplete, onCancel }: WaveformRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [timeLeft, setTimeLeft] = useState(5);
    const [isUploading, setIsUploading] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Auto-start
        startRecording();
        return () => stopRecording();
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                uploadAudio(blob);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);

            // Recursive timer for countdown
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        stopRecording();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

        } catch (err) {
            console.error('Mic access denied', err);
            // Fallback or error state
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const uploadAudio = async (blob: Blob) => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('session_id', getSessionId());

        try {
            // In a real implementation this would go to /api/voice
            // For demo, we simulate a successful upload
            // const res = await fetch('/api/voice', { method: 'POST', body: formData });
            // const data = await res.json();

            await new Promise(r => setTimeout(r, 800)); // Fake network lag
            const fakeVoiceId = 'voice_' + Date.now();
            onRecordingComplete(fakeVoiceId);

        } catch (e) {
            console.error('Upload failed', e);
            onCancel();
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center p-4 bg-slate-50 rounded-lg">
            {isUploading ? (
                <div className="flex flex-col items-center">
                    <Loader className="animate-spin text-blue-500 mb-2" />
                    <span className="text-xs text-slate-500">Sending audio...</span>
                </div>
            ) : (
                <>
                    <div className="mb-3 text-sm font-medium text-slate-700">
                        Recording... {timeLeft}s
                    </div>

                    <button
                        onClick={stopRecording}
                        className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg animate-pulse"
                    >
                        <Square className="w-5 h-5 text-white" fill="currentColor" />
                    </button>
                    <div className="text-xs text-slate-400 mt-3">Click to stop early</div>
                </>
            )}
        </div>
    );
}
