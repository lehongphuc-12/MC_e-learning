import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Heart,
  Tv,
  Presentation,
  Volume2,
  Mic2,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { userPreferenceApi } from '../api/userPreferenceApi';
import { useOnboardingSurveyStore } from '../store/useOnboardingSurveyStore';
import { useAuthStore } from '../../../store/useAuthStore';
import type { UserPreferenceDto } from '../types/preferenceTypes';

interface OnboardingSurveyModalProps {
  onToast?: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const CATEGORY_OPTIONS = [
  { id: 'MC Sự Kiện - Hội Nghị', label: 'MC Sự Kiện - Hội Nghị', icon: Calendar, desc: 'Dẫn lễ khai mạc, hội nghị, gala dinner' },
  { id: 'MC Tiệc Cưới', label: 'MC Tiệc Cưới', icon: Heart, desc: 'Chủ trì hôn lễ, truyền cảm hứng lãng mạn' },
  { id: 'MC Truyền Hình', label: 'MC Truyền Hình', icon: Tv, desc: 'Dẫn bản tin, talkshow, trường quay' },
  { id: 'Kỹ Năng Thuyết Trình', label: 'Kỹ Năng Thuyết Trình', icon: Presentation, desc: 'Trình bày dự án, diễn thuyết tự tin' },
  { id: 'Luyện Giọng & Phát Âm', label: 'Luyện Giọng & Phát Âm', icon: Volume2, desc: 'Sửa ngọng, luyện hơi, giọng nói nội lực' },
];

const EXPERIENCE_OPTIONS = [
  {
    id: 'Beginner',
    label: 'Chưa từng dẫn bao giờ (Mới bắt đầu)',
    desc: 'Học từ nền tảng phát âm, giải phóng hình thể và phong thái cơ bản.',
    badge: 'Mới bắt đầu',
  },
  {
    id: 'Intermediate',
    label: 'Đã từng dẫn vài lần ở trường/sự kiện nhỏ',
    desc: 'Nâng cao kỹ năng làm chủ kịch bản, giao lưu khán giả và tự tin sân khấu.',
    badge: 'Có kinh nghiệm cơ bản',
  },
  {
    id: 'Advanced',
    label: 'Đã có kinh nghiệm dẫn chuyên nghiệp',
    desc: 'Tinh chỉnh phong cách cá nhân, làm chủ sự cố và ứng biến sân khấu đỉnh cao.',
    badge: 'Chuyên nghiệp',
  },
];

const SKILL_OPTIONS = [
  {
    id: 'Pronunciation',
    label: 'Phát âm & nhả chữ chuẩn',
    desc: 'Tròn vành rõ chữ, sửa lỗi phương ngữ hoặc nói lắp.',
  },
  {
    id: 'SpeechRate',
    label: 'Kiểm soát tốc độ & nhịp nói',
    desc: 'Lấy hơi sâu, phân bổ nhịp thở đều, không bị nói dồn dập.',
  },
  {
    id: 'Intonation',
    label: 'Ngữ điệu & truyền cảm xúc',
    desc: 'Nhấn nhá trọng âm, tạo điểm nhấn lay động người nghe.',
  },
  {
    id: 'Improvisation',
    label: 'Xử lý tình huống & ứng biến',
    desc: 'Làm chủ sân khấu khi phát sinh sự cố, cứu kịch bản linh hoạt.',
  },
];

const SESSION_STORAGE_KEY = 'mseek_skip_onboarding_survey';

export const OnboardingSurveyModal: React.FC<OnboardingSurveyModalProps> = ({ onToast }) => {
  const { isOpen, openSurvey, closeSurvey } = useOnboardingSurveyStore();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<number>(1);
  const [targetCategories, setTargetCategories] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<string>('Beginner');
  const [focusSkills, setFocusSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState<boolean>(false);

  // Auto-check survey status on mount when user is student
  useEffect(() => {
    const isStudent = user && (user.role?.toLowerCase() === 'student' || user.role === 'STUDENT');
    if (!isStudent) return;

    const isSkippedThisSession = sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true';

    userPreferenceApi.getMyPreferences().then((pref) => {
      setHasLoadedInitial(true);
      if (pref) {
        if (pref.targetCategories && pref.targetCategories.length > 0) {
          setTargetCategories(pref.targetCategories);
        }
        if (pref.experienceLevel) {
          setExperienceLevel(pref.experienceLevel);
        }
        if (pref.focusSkills && pref.focusSkills.length > 0) {
          setFocusSkills(pref.focusSkills);
        }

        // Auto open if survey has not been completed and user didn't skip in this session
        if (!pref.isCompleted && !isSkippedThisSession) {
          openSurvey();
        }
      } else if (!isSkippedThisSession) {
        openSurvey();
      }
    });
  }, [user, openSurvey]);

  // Listen to custom window event to open survey
  useEffect(() => {
    const handleOpenEvent = () => openSurvey();
    window.addEventListener('mseek:open-onboarding-survey', handleOpenEvent);
    return () => window.removeEventListener('mseek:open-onboarding-survey', handleOpenEvent);
  }, [openSurvey]);

  const handleToggleCategory = (catId: string) => {
    setTargetCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const handleToggleSkill = (skillId: string) => {
    setFocusSkills((prev) => {
      if (prev.includes(skillId)) {
        return prev.filter((s) => s !== skillId);
      }
      if (prev.length >= 2) {
        // Replace oldest choice to maintain max 2
        return [prev[1], skillId];
      }
      return [...prev, skillId];
    });
  };

  const handleSkip = () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    closeSurvey();
  };

  const handleSubmit = async () => {
    if (targetCategories.length === 0) {
      setStep(1);
      return;
    }
    if (!experienceLevel) {
      setStep(2);
      return;
    }
    if (focusSkills.length === 0) {
      setStep(3);
      return;
    }

    setIsSubmitting(true);
    try {
      await userPreferenceApi.savePreferences({
        targetCategories,
        experienceLevel,
        focusSkills,
      });

      // Mark as completed in session so it doesn't pop up again
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
      closeSurvey();

      // Invalidate queries so recommendations update instantly
      await queryClient.invalidateQueries({ queryKey: ['courses', 'recommended'] });
      await queryClient.invalidateQueries({ queryKey: ['user-preferences'] });

      window.dispatchEvent(new CustomEvent('mseek:preferences-updated'));

      if (onToast) {
        onToast(
          'Đã cập nhật mục tiêu học tập!',
          'Khóa học đề xuất đã được cá nhân hóa theo định hướng và trình độ của bạn.',
          'success'
        );
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      if (onToast) {
        onToast('Có lỗi xảy ra', 'Không thể lưu định hướng học tập. Vui lòng thử lại.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleSkip}
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden z-10 my-8"
        >
          {/* Header */}
          <div className="relative border-b border-slate-100 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 p-6 sm:p-7">
            <button
              onClick={handleSkip}
              className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="Đóng khảo sát"
              aria-label="Đóng khảo sát"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="pr-6">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  Cá nhân hóa lộ trình MC của bạn
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                  Trả lời nhanh 3 câu hỏi để hệ thống đề xuất khóa học phù hợp nhất với mục tiêu của bạn.
                </p>
              </div>
            </div>

            {/* Stepper Bar */}
            <div className="mt-5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span className="text-blue-600">
                  {step === 1 && 'Bước 1/3: Mục tiêu đào tạo'}
                  {step === 2 && 'Bước 2/3: Kinh nghiệm hiện tại'}
                  {step === 3 && 'Bước 3/3: Kỹ năng muốn rèn luyện'}
                </span>
                <span className="text-slate-400 font-medium">Bước {step}/3</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200/80 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-7 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* ── BƯỚC 1: MỤC TIÊU THEO ĐUỔI ──────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    1. Mục tiêu theo đuổi của bạn là gì?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bạn có thể chọn một hoặc nhiều lĩnh vực MC mà bạn định hướng phát triển.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const isSelected = targetCategories.includes(cat.id);
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleToggleCategory(cat.id)}
                        className={`group relative flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm shadow-blue-500/10 ring-1 ring-blue-600'
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/60 text-slate-700'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between mb-2">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>

                        <span className="font-bold text-xs leading-snug">{cat.label}</span>
                        <span className="text-[11px] text-slate-500 mt-1 line-clamp-1">{cat.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── BƯỚC 2: KINH NGHIỆM ĐỨNG SÂN KHẤU ────────────────────── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    2. Kinh nghiệm đứng sân khấu / dẫn chương trình của bạn?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hệ thống sẽ dựa vào cấp độ này để đề xuất lộ trình khóa học phù hợp nhất.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {EXPERIENCE_OPTIONS.map((exp) => {
                    const isSelected = experienceLevel === exp.id;
                    return (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => setExperienceLevel(exp.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-1 ring-blue-600'
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="space-y-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                              {exp.label}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {exp.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{exp.desc}</p>
                        </div>

                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── BƯỚC 3: KỸ NĂNG MUỐN CẢI THIỆN NHẤT ─────────────────── */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">
                      3. Kỹ năng nào bạn muốn cải thiện nhất?
                    </h3>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      Đã chọn {focusSkills.length}/2
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chọn tối đa 2 kỹ năng ưu tiên để nhận diện bài tập và khóa học khắc phục điểm yếu.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {SKILL_OPTIONS.map((sk) => {
                    const isSelected = focusSkills.includes(sk.id);
                    return (
                      <button
                        key={sk.id}
                        type="button"
                        onClick={() => handleToggleSkill(sk.id)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-1 ring-blue-600'
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="space-y-0.5 pr-3">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                            {sk.label}
                          </span>
                          <p className="text-xs text-slate-500">{sk.desc}</p>
                        </div>

                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-4 sm:px-7">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Để sau (Bỏ qua phiên này)
            </button>

            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Quay lại</span>
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  disabled={step === 1 && targetCategories.length === 0}
                  onClick={() => setStep((s) => Math.min(3, s + 1))}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                >
                  <span>Tiếp tục</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting || focusSkills.length === 0}
                  onClick={handleSubmit}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                >
                  {isSubmitting ? (
                    <span>Đang lưu...</span>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Hoàn tất & Xem gợi ý</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
