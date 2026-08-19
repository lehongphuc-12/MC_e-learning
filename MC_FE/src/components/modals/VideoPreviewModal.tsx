import React, { useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, CheckCircle2, Star, ShieldCheck } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'sample' | 'overview'>('sample');

  if (!isOpen || !course) return null;

  return (
    <div id="video-preview-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        id="video-preview-modal-card"
        className="relative w-full max-w-4xl overflow-hidden bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Free Sample Preview</span>
            <h3 className="text-base sm:text-lg font-bold text-white line-clamp-1">{course.title}</h3>
          </div>
          <button
            id="close-preview-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
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
            <span>Masterclass Lecture 1.1: Welcome & Mindset</span>
          </div>

          {/* Center Play Button Overlay */}
          <button
            id="modal-toggle-playback-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            className="z-10 w-20 h-20 flex items-center justify-center rounded-full bg-blue-600/90 hover:bg-blue-600 text-white shadow-xl shadow-blue-900/50 hover:scale-105 transition-all duration-200"
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </button>

          {/* Video Control Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/70 to-transparent flex flex-col gap-2 opacity-95">
            {/* Scrubber */}
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden cursor-pointer relative">
              <div className="bg-blue-500 h-full w-1/3 rounded-full" />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-white">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button onClick={() => setIsMuted(!isMuted)} className="hover:text-white">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="font-mono text-[11px]">04:15 / 12:40</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-semibold text-blue-400 border border-slate-700">1080p HD</span>
                <button className="hover:text-white">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body & CTA */}
        <div className="p-6 bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <span className="text-sm font-bold text-white">{course.rating}</span>
              <span className="text-xs text-slate-400">({course.reviewsCount.toLocaleString()} reviews)</span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-1">
              Instructor: <span className="text-slate-200 font-medium">{course.instructor.name}</span> • {course.durationHours} hrs total
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="text-right hidden sm:block">
              <div className="text-2xl font-black text-white">${course.price}</div>
              {course.originalPrice && (
                <div className="text-xs text-slate-400 line-through">${course.originalPrice}</div>
              )}
            </div>
            <button
              id="modal-enroll-now-btn"
              onClick={() => {
                onClose();
                onEnroll(course);
              }}
              className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center justify-center gap-2"
            >
              <span>Enroll Full Course</span>
              <span className="sm:hidden font-bold">(${course.price})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
