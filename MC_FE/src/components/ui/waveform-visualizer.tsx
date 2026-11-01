import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

interface WaveformVisualizerProps {
  isPlaying?: boolean;
  barCount?: number;
  barColor?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isPlaying = false,
  barCount = 18,
  barColor = 'bg-blue-600',
  size = 'md',
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const heightClasses = {
    sm: 'h-6 gap-1',
    md: 'h-10 gap-1.5',
    lg: 'h-16 gap-2',
  };

  const barWidths = {
    sm: 'w-1 rounded-full',
    md: 'w-1.5 rounded-full',
    lg: 'w-2 rounded-full',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        heightClasses[size],
        className
      )}
      aria-label={isPlaying ? 'Đang phát âm thanh' : 'Tạm dừng âm thanh'}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        // Natural variation based on position
        const centerOffset = Math.abs(i - barCount / 2) / (barCount / 2);
        const baseHeight = Math.max(0.2, 1 - centerOffset * 0.7);
        const duration = 0.4 + (i % 5) * 0.12;

        return (
          <motion.div
            key={i}
            className={cn(barColor, barWidths[size], 'origin-center opacity-90')}
            animate={
              isPlaying && !shouldReduceMotion
                ? {
                    scaleY: [
                      baseHeight * 0.35,
                      Math.min(1, baseHeight * 1.3),
                      baseHeight * 0.25,
                      baseHeight * 0.85,
                      baseHeight * 0.35,
                    ],
                  }
                : {
                    scaleY: baseHeight * 0.3,
                  }
            }
            transition={
              isPlaying && !shouldReduceMotion
                ? {
                    duration: duration,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'easeInOut',
                    delay: (i * 0.05) % 0.4,
                  }
                : {
                    duration: 0.2,
                  }
            }
            style={{ minHeight: '4px', height: '100%' }}
          />
        );
      })}
    </div>
  );
};
