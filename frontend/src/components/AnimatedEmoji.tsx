import React from 'react';
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

const AnimatedEmoji: React.FC<AnimatedEmojiProps> = ({ emotion, size = 48 }) => {
  const lottieSrc = emotionToLottie[emotion] || emotionToLottie['wink'];
  return (
    <div style={{ width: size, height: size, display: 'inline-block' }}>
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
