'use client';

import React from 'react';
import Image from 'next/image';
import styles from './SurveyPopup.module.css';

interface SurveyPopupProps {
    question: string;
    onYes: () => void;
    onNo: () => void;
    onClose: () => void;
    isVisible: boolean;
}

export default function SurveyPopup({ question, onYes, onNo, onClose, isVisible }: SurveyPopupProps) {
    if (!isVisible) return null;

    const handleYes = () => {
        onYes();
        onClose();
    };

    const handleNo = () => {
        onNo();
        onClose();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.popup}>
                {/* Green Monkey Avatar */}
                <div className={styles.avatar}>
                    <div className={styles.monkeyEmoji}>🐵</div>
                    <div className={styles.speechBubble}>
                        {question}
                    </div>
                </div>

                {/* Yes/No Buttons */}
                <div className={styles.buttons}>
                    <button
                        className={`${styles.button} ${styles.yesButton}`}
                        onClick={handleYes}
                    >
                        ✓ Yes
                    </button>
                    <button
                        className={`${styles.button} ${styles.noButton}`}
                        onClick={handleNo}
                    >
                        ✗ No
                    </button>
                </div>
            </div>
        </div>
    );
}
