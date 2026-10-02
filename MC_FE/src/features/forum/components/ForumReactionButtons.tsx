import React, { useState } from 'react';
import { ThumbsUp, Heart, Award } from 'lucide-react';

interface ForumReactionButtonsProps {
  reactionsCount: number;
  userReaction?: 'LIKE' | 'LOVE' | 'HELPFUL';
  disabled?: boolean;
  onReact: (type: 'LIKE' | 'LOVE' | 'HELPFUL') => void;
  size?: 'sm' | 'md';
}

export const ForumReactionButtons: React.FC<ForumReactionButtonsProps> = ({
  reactionsCount,
  userReaction,
  disabled = false,
  onReact,
  size = 'md',
}) => {
  const [count, setCount] = useState(reactionsCount);
  const [currentReaction, setCurrentReaction] = useState(userReaction);

  const handleToggle = (type: 'LIKE' | 'LOVE' | 'HELPFUL') => {
    if (disabled) return;

    if (currentReaction === type) {
      // Toggle off
      setCurrentReaction(undefined);
      setCount((prev) => Math.max(0, prev - 1));
    } else {
      if (!currentReaction) {
        setCount((prev) => prev + 1);
      }
      setCurrentReaction(type);
    }

    onReact(type);
  };

  const btnSizeClass = size === 'sm' ? 'px-2 py-1 text-xs gap-1' : 'px-3 py-1.5 text-sm gap-1.5';
  const iconSizeClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => handleToggle('LIKE')}
        className={`inline-flex items-center rounded-xl font-medium transition-all duration-200 ${btnSizeClass} ${
          currentReaction === 'LIKE'
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
            : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 border border-slate-700/40'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
        title="Thích"
      >
        <ThumbsUp className={`${iconSizeClass} ${currentReaction === 'LIKE' ? 'fill-cyan-400' : ''}`} />
        <span>Thích</span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => handleToggle('LOVE')}
        className={`inline-flex items-center rounded-xl font-medium transition-all duration-200 ${btnSizeClass} ${
          currentReaction === 'LOVE'
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
            : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 border border-slate-700/40'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
        title="Yêu thích"
      >
        <Heart className={`${iconSizeClass} ${currentReaction === 'LOVE' ? 'fill-rose-400' : ''}`} />
        <span>Thả tim</span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => handleToggle('HELPFUL')}
        className={`inline-flex items-center rounded-xl font-medium transition-all duration-200 ${btnSizeClass} ${
          currentReaction === 'HELPFUL'
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
            : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 border border-slate-700/40'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
        title="Hữu ích"
      >
        <Award className={`${iconSizeClass} ${currentReaction === 'HELPFUL' ? 'fill-amber-400' : ''}`} />
        <span>Hữu ích</span>
      </button>

      <span className="ml-1 text-xs font-semibold text-slate-400">
        ({count})
      </span>
    </div>
  );
};
