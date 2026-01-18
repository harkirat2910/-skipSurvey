'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function HomePage() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isTyping, setIsTyping] = useState(true);
  const [displayedText, setDisplayedText] = useState('');
  const [showButton, setShowButton] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);

  const fullText = "Hey! I've picked some amazing gifts for you on Amazonia. Let's claim them! 🎁";

  // Animate avatar entrance
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (!isVisible) return;

    let index = 0;
    const typingInterval = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
        setTimeout(() => setShowButton(true), 500);
      }
    }, 40);

    return () => clearInterval(typingInterval);
  }, [isVisible]);

  // Sparkle effect on hover
  useEffect(() => {
    if (!isHovering) return;

    const sparkleInterval = setInterval(() => {
      const newSparkle = {
        id: Date.now(),
        x: Math.random() * 100,
        y: Math.random() * 100
      };
      setSparkles(prev => [...prev, newSparkle]);

      setTimeout(() => {
        setSparkles(prev => prev.filter(s => s.id !== newSparkle.id));
      }, 1000);
    }, 150);

    return () => clearInterval(sparkleInterval);
  }, [isHovering]);

  const handleClaim = () => {
    router.push('/demo-checkout');
  };

  return (
    <div className={styles.container}>
      {/* Animated background */}
      <div className={styles.backgroundOrbs}>
        <div className={styles.orb1}></div>
        <div className={styles.orb2}></div>
        <div className={styles.orb3}></div>
      </div>

      {/* Title */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.8s ease-in'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '10px'
        }}>
          #skipSurvey Demo
        </h1>
      </div>

      {/* Main content */}
      <div className={`${styles.card} ${isVisible ? styles.visible : ''}`}>
        {/* Avatar */}
        <div className={styles.avatarContainer}>
          <div className={styles.avatar}>
            <span className={styles.avatarEmoji}>🐵</span>
          </div>
          <div className={styles.avatarGlow}></div>
          <div className={styles.avatarRing}></div>
        </div>

        {/* Speech bubble */}
        <div className={styles.speechBubble}>
          <p className={styles.message}>
            {displayedText}
            {isTyping && <span className={styles.cursor}>|</span>}
          </p>
        </div>

        {/* Claim button */}
        <div className={`${styles.buttonContainer} ${showButton ? styles.showButton : ''}`}>
          <button
            className={styles.claimButton}
            onClick={handleClaim}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <span className={styles.buttonText}>🎁 Claim My Gifts</span>
            <span className={styles.buttonShine}></span>

            {/* Sparkles */}
            {sparkles.map(sparkle => (
              <span
                key={sparkle.id}
                className={styles.sparkle}
                style={{ left: `${sparkle.x}%`, top: `${sparkle.y}%` }}
              >
                ✨
              </span>
            ))}
          </button>
        </div>

        {/* Gift icons floating */}
        <div className={styles.floatingGifts}>
          <span className={styles.gift} style={{ animationDelay: '0s' }}>🎁</span>
          <span className={styles.gift} style={{ animationDelay: '0.5s' }}>🎀</span>
          <span className={styles.gift} style={{ animationDelay: '1s' }}>🎊</span>
          <span className={styles.gift} style={{ animationDelay: '1.5s' }}>🎁</span>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.footerText}>#skipSurvey • SurveyMonkey Integration</span>
      </div>
    </div>
  );
}
