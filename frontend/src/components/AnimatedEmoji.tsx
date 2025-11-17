import React, { useRef, useState, useEffect } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import type { EmotionType } from '@/api/chatbot';


const emotionToLottie: Record<EmotionType, string> = {
  smile: '/lotties/smile.json',
  sad: '/lotties/sad.json',
  angry: '/lotties/angry.json',
  love: '/lotties/love.json',
  no: '/lotties/no.json',
  wink: '/lotties/wink.json',
};

interface AnimatedEmojiProps {
  emotion: EmotionType;
  size?: number;
}

const bounceKeyframes = `
  @keyframes emoji-appear {
    0% { transform: scale(1.5) translate(-12%, -12%) rotate(0deg); }
    50% { transform: scale(1.12) translate(-3%, -3%) rotate(-2deg); }
    70% { transform: scale(1.04) translate(-1%, -1%) rotate(1deg); }
    85% { transform: scale(1.01) translate(0, 0) rotate(0deg); }
    100% { transform: scale(1) translate(0, 0) rotate(0deg); }
  }
  @keyframes emoji-interactive {
    0% { transform: scale(1) translate(0, 0) rotate(0deg); }
    25% { transform: scale(1.13) translate(-3%, -3%) rotate(-2deg); }
    50% { transform: scale(1.22) translate(-6%, -6%) rotate(2deg); }
    75% { transform: scale(1.08) translate(-2%, -2%) rotate(-1deg); }
    100% { transform: scale(1) translate(0, 0) rotate(0deg); }
  }
`;

if (typeof window !== 'undefined' && !document.getElementById('emoji-bounce-style')) {
  const style = document.createElement('style');
  style.id = 'emoji-bounce-style';
  style.innerHTML = bounceKeyframes;
  document.head.appendChild(style);
}

const AnimatedEmoji: React.FC<AnimatedEmojiProps> = ({ emotion, size = 48 }) => {
  const lottieSrc = emotionToLottie[emotion] || emotionToLottie['wink'];
  const [isInteractive, setIsInteractive] = useState(true);
  const [isAppeared, setIsAppeared] = useState(true);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setIsAppeared(true);
    const t = setTimeout(() => {
        setIsAppeared(false)
        setIsInteractive(false);
    }, 700);
    return () => clearTimeout(t);
  }, [emotion]);

  const handleInteractive = () => {
    setIsInteractive(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsInteractive(false), 700);
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        cursor: 'pointer',
        transformOrigin: 'bottom left',
        animation:
          isInteractive
            ? 'emoji-interactive 0.9s cubic-bezier(.42,0,.58,1)'
            : isAppeared
            ? 'emoji-appear 0.9s cubic-bezier(.42,0,.58,1)'
            : undefined,
      }}
      onClick={handleInteractive}
    >
      <Player
        autoplay
        loop
        src={lottieSrc}
        style={{ width: size, height: size }}
      />
    </div>
  );
};

export default AnimatedEmoji;
