import React from 'react';
import { Music, Volume2, VolumeX, Loader2 } from 'lucide-react';
import type { BackgroundMusicDto } from '../types/speakingTypes';

interface BackgroundMusicControlProps {
  musics: BackgroundMusicDto[];
  selectedMusicId: number | null;
  setSelectedMusicId: (id: number | null) => void;
  volume: number;
  changeVolume: (v: number) => void;
  isLoading: boolean;
}

export const BackgroundMusicControl: React.FC<BackgroundMusicControlProps> = ({
  musics,
  selectedMusicId,
  setSelectedMusicId,
  volume,
  changeVolume,
  isLoading,
}) => {
  const isMuted = volume === 0;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950/70 border border-slate-700/60 px-2 sm:px-2.5 py-1.5 rounded-xl shrink-0">
      {/* Icon nốt nhạc */}
      <Music className={`w-3.5 h-3.5 shrink-0 ${selectedMusicId ? 'text-indigo-400' : 'text-slate-500'}`} />

      {/* Dropdown chọn nhạc */}
      <select
        value={selectedMusicId ?? ''}
        onChange={(e) => {
          const val = e.target.value;
          setSelectedMusicId(val ? Number(val) : null);
        }}
        className="px-1.5 sm:px-2 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 max-w-[110px] sm:max-w-[140px] md:max-w-[160px] truncate focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shrink-0 transition-colors"
        title="Chọn nhạc nền khi luyện nói"
      >
        <option value="">Không dùng nhạc</option>
        {musics.map((music) => (
          <option key={music.musicId} value={music.musicId}>
            {music.title} {music.isSystemDefault ? '' : '✦ (Riêng)'}
          </option>
        ))}
      </select>

      {/* Slider điều chỉnh âm lượng (chỉ hiện khi đã chọn bài) */}
      {selectedMusicId && (
        <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-700/60 shrink-0">
          <button
            type="button"
            onClick={() => changeVolume(isMuted ? 0.3 : 0)}
            className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
            title={isMuted ? 'Bật âm thanh (30%)' : 'Tắt tiếng'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="w-12 sm:w-16 md:w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            title={`Âm lượng nhạc nền: ${Math.round(volume * 100)}%`}
          />

          <span className="tabular-nums font-mono text-[10px] text-slate-400 w-6 sm:w-7 text-right select-none">
            {Math.round(volume * 100)}%
          </span>

          {isLoading && (
            <Loader2 className="w-3 h-3 text-indigo-400 animate-spin shrink-0 ml-0.5" />
          )}
        </div>
      )}
    </div>
  );
};
