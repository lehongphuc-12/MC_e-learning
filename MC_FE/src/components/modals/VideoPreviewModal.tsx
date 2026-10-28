import React, { useState, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, Star } from 'lucide-react';
import { Course } from '../../types';

interface VideoPreviewModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (course: Course) => void;
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  course,
  isOpen,
  onClose,
  onEnroll,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Hỗ trợ phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !course) return null;

  const formattedPrice =
    course.price === 0 ? 'Miễn phí' : `${course.price.toLocaleString('vi-VN')} đ`;

  const formattedOriginalPrice = course.originalPrice
    ? `${course.originalPrice.toLocaleString('vi-VN')} đ`
    : null;

  return (
    <div
      id="video-preview-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div 
        id="video-preview-modal-card"
        className="relative w-full max-w-4xl overflow-hidden bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
              Học thử bài giảng miễn phí
            </span>
            <h3 id="preview-modal-title" className="text-base sm:text-lg font-bold text-white line-clamp-1">
              {course.title}
            </h3>
          </div>
          <button
            id="close-preview-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Đóng xem trước video"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
          <img 
            src={course.videoPreviewThumb || course.thumbnail} 
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover opacity-60 filter brightness-90"
          />

          {/* Ambient Lighting */}
          <div className="absolute inset-0 bg-radial from-blue-600/10 via-transparent to-black/80 pointer-events-none" />

          {/* Live Speaker Badge */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 backdrop-blur-md rounded-full border border-slate-700/60 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Bài học mẫu: Khơi mở sự tự tin & Làm chủ giọng nói</span>
          </div>

          {/* Center Play Button Overlay */}
          <button
            id="modal-toggle-playback-btn"
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Tạm dừng video" : "Tiếp tục phát video"}
            className="z-10 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-blue-600/90 hover:bg-blue-600 text-white shadow-xl shadow-blue-900/50 hover:scale-105 transition-all duration-200"
          >
            {isPlaying ? <Pause className="w-7 h-7 sm:w-8 sm:h-8" /> : <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-1" />}
          </button>

          {/* Video Control Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/70 to-transparent flex flex-col gap-2 opacity-95">
            {/* Scrubber */}
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden cursor-pointer relative">
              <div className="bg-blue-500 h-full w-1/3 rounded-full" />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setIsPlaying(!isPlaying)} className="hover:text-white" aria-label="Phát / Dừng">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button type="button" onClick={() => setIsMuted(!isMuted)} className="hover:text-white" aria-label="Bật / Tắt âm thanh">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="font-mono text-[11px]">04:15 / 12:40</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-semibold text-blue-400 border border-slate-700">1080p HD</span>
                <button type="button" className="hover:text-white" aria-label="Toàn màn hình">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body & CTA */}
        <div className="p-5 sm:p-6 bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <span className="text-sm font-bold text-white">{course.rating}</span>
              <span className="text-xs text-slate-400">({course.reviewsCount.toLocaleString()} đánh giá)</span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-1">
              Giảng viên: <span className="text-slate-200 font-medium">{course.instructor?.name || 'MSEEK Mentor'}</span> • {course.durationHours} giờ học
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="text-right hidden sm:block">
              <div className="text-2xl font-black text-white">{formattedPrice}</div>
              {formattedOriginalPrice && (
                <div className="text-xs text-slate-400 line-through">{formattedOriginalPrice}</div>
              )}
            </div>
            <button
              id="modal-enroll-now-btn"
              type="button"
              onClick={() => {
                onClose();
                onEnroll(course);
              }}
              className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center justify-center gap-2"
            >
              <span>Đăng ký khóa học ngay</span>
              <span className="sm:hidden font-bold">({formattedPrice})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
