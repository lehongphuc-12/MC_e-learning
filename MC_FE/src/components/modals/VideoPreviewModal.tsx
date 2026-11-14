import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, Star } from 'lucide-react';
import { Course } from '../../types';
import { lessonApi } from '../../features/courses/api/lessonApi';

interface VideoPreviewModalProps {
  course: Course | null;
  isOpen: boolean;
  lessonId?: number | null;
  lessonTitle?: string;
  onClose: () => void;
  onEnroll: (course: Course) => void;
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  course,
  isOpen,
  lessonId,
  lessonTitle,
  onClose,
  onEnroll,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLimitSeconds, setPreviewLimitSeconds] = useState<number | null>(null);
  const [previewLimitReached, setPreviewLimitReached] = useState(false);

  useEffect(() => {
    setPreviewLimitReached(false);
  }, [isOpen, lessonId]);

  const stopAtPreviewLimit = (video: HTMLVideoElement) => {
    if (previewLimitSeconds === null || video.currentTime < previewLimitSeconds) {
      if (previewLimitSeconds !== null) setPreviewLimitReached(false);
      return;
    }
    video.currentTime = previewLimitSeconds;
    video.pause();
    setPreviewLimitReached(true);
  };

  useEffect(() => {
    if (!isOpen || !lessonId) {
      setPreviewUrl(null);
      setPreviewError(null);
      setIsLoadingPreview(false);
      setPreviewLimitSeconds(null);
      return;
    }

    let active = true;
    setPreviewUrl(null);
    setPreviewError(null);
    setPreviewLimitSeconds(null);
    setIsLoadingPreview(true);
    lessonApi.getPreviewPlaybackUrl(lessonId)
      .then((playback) => {
        if (!active) return;
        setPreviewUrl(playback.url);
        setPreviewLimitSeconds(playback.isPreviewOnly ? playback.previewDurationSeconds : null);
      })
      .catch((error: unknown) => {
        if (active) setPreviewError(error instanceof Error ? error.message : 'Không thể tải video xem trước.');
      })
      .finally(() => { if (active) setIsLoadingPreview(false); });

    return () => { active = false; };
  }, [isOpen, lessonId]);

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

  const shouldReduceMotion = useReducedMotion();

  const formattedPrice = course
    ? course.price === 0
      ? 'Miễn phí'
      : `${course.price.toLocaleString('vi-VN')} đ`
    : '';

  const formattedOriginalPrice = course?.originalPrice
    ? `${course.originalPrice.toLocaleString('vi-VN')} đ`
    : null;

  return (
    <AnimatePresence>
      {isOpen && course && (
        <div
          id="video-preview-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          <motion.div 
            id="video-preview-modal-card"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative z-10 w-full max-w-4xl overflow-hidden bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 flex flex-col max-h-[92vh]"
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
            {lessonId && <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{lessonTitle}</p>}
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
          {lessonId ? (
            previewUrl ? (
              <video
                key={previewUrl}
                src={previewUrl}
                poster={course.videoPreviewThumb || course.thumbnail}
                controls
                autoPlay
                playsInline
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                onContextMenu={(event) => event.preventDefault()}
                onTimeUpdate={(event) => stopAtPreviewLimit(event.currentTarget)}
                onSeeking={(event) => stopAtPreviewLimit(event.currentTarget)}
                className="h-full w-full object-contain"
                aria-label={lessonTitle || 'Bài học xem trước'}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center">
                {isLoadingPreview ? (
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                ) : (
                  <Play className="h-8 w-8 text-blue-300" />
                )}
                <div>
                  <p className="text-sm font-bold text-white">{isLoadingPreview ? 'Đang tải bài học xem trước…' : 'Không thể phát bài học xem trước'}</p>
                  {previewError && <p className="mt-1 max-w-md text-xs text-slate-400">{previewError}</p>}
                </div>
              </div>
            )
          ) : (
            <>
          <img 
            src={course.videoPreviewThumb || course.thumbnail} 
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover opacity-60 filter brightness-90"
          />

          {/* Ambient Lighting */}
          <div className="absolute inset-0 bg-radial from-blue-600/10 via-transparent to-black/80 pointer-events-none" />

          {/* Live Speaker Badge */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 backdrop-blur-md rounded-full border border-slate-700/60 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20" />
            <span>{lessonTitle || 'Bài học mẫu'}</span>
          </div>

          {/* Center Play Button Overlay */}
          <button
            id="modal-toggle-playback-btn"
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Tạm dừng video" : "Tiếp tục phát video"}
            className="z-10 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-blue-600/90 hover:bg-blue-600 text-white shadow-xl shadow-blue-900/50 hover:scale-105 transition-[transform,background-color] duration-200"
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
            </>
          )}
          {lessonId && previewLimitReached && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 p-5 text-center backdrop-blur-sm">
              <div className="max-w-sm rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
                  <Play className="ml-0.5 h-5 w-5 fill-current" />
                </div>
                <h4 className="mt-4 text-base font-extrabold text-white">Bạn đã xem hết 30 giây dùng thử</h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">Đăng ký khóa học để xem đầy đủ bài học và toàn bộ chương trình đào tạo.</p>
                <button
                  type="button"
                  onClick={() => { onClose(); onEnroll(course); }}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500"
                >
                  Mua khóa học để xem đầy đủ
                </button>
              </div>
            </div>
          )}
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
              className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-colors flex items-center justify-center gap-2"
            >
              <span>Đăng ký khóa học ngay</span>
              <span className="sm:hidden font-bold">({formattedPrice})</span>
            </button>
          </div>
        </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
};
