import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
  Sparkles,
  Layers,
  Edit3,
  Eye,
  Save,
  Trash2,
  Music,
  Play,
  Pause,
  Plus,
  Loader2,
} from 'lucide-react';
import { speakingApi } from '../../api/speakingApi';
import {
  SpeakingLevel,
  ParsePreviewDto,
  SpeakingScriptDto,
  BackgroundMusicDto,
} from '../../types/speakingTypes';
import { ToastType } from '../../../../components/common/Toast';

interface SpeakingScriptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: number;
  lessonTitle: string;
  courseTitle?: string;
  onSuccess?: () => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

const TEMPLATE_MARKDOWN = `# KỊCH BẢN LUYỆN NÓI MẪU (3 CẤP ĐỘ)

## [LEVEL: BEGINNER]
[HƯỚNG DẪN: Đứng thẳng, hai tay thả lỏng tự nhiên, ánh mắt hướng về khán giả, mỉm cười nhẹ nhàng]
Kính thưa quý vị quan khách!
[GIỌNG ĐỌC: Tone trầm ấm, trang trọng, tốc độ vừa phải]
Lời đầu tiên, cho phép MC được gửi đến toàn thể quý vị lời chào trân trọng và lời chúc mừng nồng nhiệt nhất.
[NGẮT NGHỈ: 2 giây]
Ngày hôm nay, chúng ta có mặt tại đây để cùng nhau chứng kiến khoảnh khắc thiêng liêng nhất của hai bạn trẻ.
[HƯỚNG DẪN: Nghiêng đầu nhẹ, nở nụ cười ấm áp]
Tình yêu là một hành trình kỳ diệu, và ngày hôm nay chính là khởi đầu cho một chương mới tươi sáng.

## [LEVEL: INTERMEDIATE]
Kính thưa quý vị quan khách!
[GIỌNG ĐỌC: Tone trầm ấm, trang trọng, tốc độ vừa phải]
Lời đầu tiên, cho phép MC được gửi đến toàn thể quý vị lời chào trân trọng và lời chúc mừng nồng nhiệt nhất.
Ngày hôm nay, chúng ta có mặt tại đây để cùng nhau chứng kiến khoảnh khắc thiêng liêng nhất của hai bạn trẻ.
[GIỌNG ĐỌC: Nâng cao tông giọng ở câu cuối, tạo sự hào hứng]
Tình yêu là một hành trình kỳ diệu, và ngày hôm nay chính là khởi đầu cho một chương mới tươi sáng.

## [LEVEL: ADVANCED]
Kính thưa quý vị quan khách! Lời đầu tiên, cho phép MC được gửi đến toàn thể quý vị lời chào trân trọng và lời chúc mừng nồng nhiệt nhất.
Ngày hôm nay, chúng ta có mặt tại đây để cùng nhau chứng kiến khoảnh khắc thiêng liêng nhất của hai bạn trẻ.
Tình yêu là một hành trình kỳ diệu, và ngày hôm nay chính là khởi đầu cho một chương mới tươi sáng.
`;

export const SpeakingScriptUploadModal: React.FC<SpeakingScriptUploadModalProps> = ({
  isOpen,
  onClose,
  lessonId,
  lessonTitle,
  courseTitle,
  onSuccess,
  onToast,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [existingScript, setExistingScript] = useState<SpeakingScriptDto | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  // Parsed / Editable Content State
  const [scriptTitle, setScriptTitle] = useState(lessonTitle || '');
  const [originalContent, setOriginalContent] = useState('');
  const [activeTab, setActiveTab] = useState<SpeakingLevel>('BEGINNER');
  const [editableContents, setEditableContents] = useState<Record<SpeakingLevel, string>>({
    BEGINNER: '',
    INTERMEDIATE: '',
    ADVANCED: '',
  });
  const [viewMode, setViewMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Background Music States
  const [musics, setMusics] = useState<BackgroundMusicDto[]>([]);
  const [isLoadingMusics, setIsLoadingMusics] = useState<boolean>(false);
  const [previewPlayingId, setPreviewPlayingId] = useState<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [uploadMusicTitle, setUploadMusicTitle] = useState<string>('');
  const [uploadMusicFile, setUploadMusicFile] = useState<File | null>(null);
  const [isUploadingMusic, setIsUploadingMusic] = useState<boolean>(false);
  const musicFileInputRef = useRef<HTMLInputElement | null>(null);

  const loadMusics = async () => {
    if (!lessonId) return;
    setIsLoadingMusics(true);
    try {
      const res = await speakingApi.getMusicsForLesson(lessonId);
      if (res.success && res.data) {
        setMusics(res.data);
      }
    } catch (err) {
      console.error('Error fetching musics:', err);
    } finally {
      setIsLoadingMusics(false);
    }
  };

  const handleTogglePreview = (music: BackgroundMusicDto) => {
    if (previewPlayingId === music.musicId) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewPlayingId(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      const audio = new Audio(music.audioUrl);
      audio.volume = 0.5;
      previewAudioRef.current = audio;
      setPreviewPlayingId(music.musicId);
      audio.onended = () => {
        setPreviewPlayingId(null);
      };
      audio.play().catch((err) => {
        console.warn('Audio preview error:', err);
        setPreviewPlayingId(null);
      });
    }
  };

  const handleUploadMusic = async () => {
    if (!uploadMusicFile) {
      onToast?.('Thiếu tập tin', 'Vui lòng chọn file âm thanh (.mp3, .wav, .ogg)', 'warning');
      return;
    }
    if (uploadMusicFile.size > 5 * 1024 * 1024) {
      onToast?.('File quá lớn', 'Dung lượng tập tin nhạc không được vượt quá 5MB', 'error');
      return;
    }
    setIsUploadingMusic(true);
    try {
      const title = uploadMusicTitle.trim() || uploadMusicFile.name.replace(/\.[^/.]+$/, '');
      const res = await speakingApi.uploadMusicForLesson(lessonId, uploadMusicFile, title);
      if (res.success) {
        onToast?.('Thành công', 'Đã tải lên nhạc nền cho bài học', 'success');
        setUploadMusicFile(null);
        setUploadMusicTitle('');
        if (musicFileInputRef.current) musicFileInputRef.current.value = '';
        await loadMusics();
      } else {
        onToast?.('Thất bại', res.message || 'Không thể tải lên nhạc nền', 'error');
      }
    } catch (err: any) {
      onToast?.('Lỗi', err.message || 'Lỗi khi tải lên file nhạc', 'error');
    } finally {
      setIsUploadingMusic(false);
    }
  };

  const handleDeleteMusic = async (musicId: number, title: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài nhạc "${title}"?`)) return;
    try {
      const res = await speakingApi.deleteMusic(musicId);
      if (res.success) {
        onToast?.('Đã xóa', `Đã xóa bài nhạc "${title}"`, 'success');
        if (previewPlayingId === musicId && previewAudioRef.current) {
          previewAudioRef.current.pause();
          setPreviewPlayingId(null);
        }
        await loadMusics();
      } else {
        onToast?.('Thất bại', res.message || 'Không thể xóa bài nhạc', 'error');
      }
    } catch (err: any) {
      onToast?.('Lỗi', err.message || 'Lỗi khi xóa bài nhạc', 'error');
    }
  };

  // Stop preview audio when modal closes
  useEffect(() => {
    if (!isOpen && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
      setPreviewPlayingId(null);
    }
  }, [isOpen]);

  // Load existing script if any
  useEffect(() => {
    if (!isOpen || !lessonId) return;

    const loadScript = async () => {
      setIsLoadingExisting(true);
      setErrorMsg(null);
      try {
        const res = await speakingApi.getScriptByLesson(lessonId);
        if (res.success && res.data) {
          setExistingScript(res.data);
          setScriptTitle(res.data.title || lessonTitle);
          setOriginalContent(res.data.originalContent || '');
          const contents: Record<SpeakingLevel, string> = {
            BEGINNER: '',
            INTERMEDIATE: '',
            ADVANCED: '',
          };
          res.data.levels.forEach((lvl) => {
            if (lvl.level === 'BEGINNER' || lvl.level === 'INTERMEDIATE' || lvl.level === 'ADVANCED') {
              contents[lvl.level] = lvl.content;
            }
          });
          setEditableContents(contents);
        } else {
          setExistingScript(null);
        }
      } catch (e) {
        setExistingScript(null);
      } finally {
        setIsLoadingExisting(false);
      }
    };

    loadScript();
  }, [isOpen, lessonId, lessonTitle]);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_MARKDOWN], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kich_ban_mau_3_level.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (onToast) onToast('Đã tải kịch bản mẫu!', 'Bạn có thể mở chỉnh sửa và tải lên lại.', 'success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['.docx', '.txt', '.md'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      setErrorMsg('Vui lòng chọn tập tin có định dạng .docx, .txt hoặc .md');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Dung lượng tập tin vượt quá 10MB.');
      return;
    }

    setErrorMsg(null);
    setValidationErrors([]);
    setSelectedFile(file);
  };

  const handleParseFile = async () => {
    if (!selectedFile) {
      setErrorMsg('Vui lòng chọn tập tin trước khi phân tích.');
      return;
    }

    setIsParsing(true);
    setErrorMsg(null);
    setValidationErrors([]);

    try {
      const res = await speakingApi.parseScriptFile(lessonId, selectedFile);
      if (res.success && res.data) {
        const preview: ParsePreviewDto = res.data;
        setOriginalContent(preview.originalContent);

        const newContents: Record<SpeakingLevel, string> = {
          BEGINNER: '',
          INTERMEDIATE: '',
          ADVANCED: '',
        };

        preview.levels.forEach((lvl) => {
          newContents[lvl.level] = lvl.content;
        });

        setEditableContents(newContents);
        if (onToast) onToast('Phân tích thành công!', 'Kịch bản đã được tách thành 3 cấp độ.', 'success');
      } else {
        setErrorMsg(res.message || 'Không thể phân tích tập tin.');
        setValidationErrors(res.errors || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã xảy ra lỗi khi phân tích tập tin.');
    } finally {
      setIsParsing(false);
    }
  };

  const handlePublish = async () => {
    if (!scriptTitle.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề kịch bản.');
      return;
    }

    // Verify all 3 levels have content
    const required: SpeakingLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    for (const lvl of required) {
      if (!editableContents[lvl]?.trim()) {
        setErrorMsg(`Cấp độ ${lvl} chưa có nội dung. Vui lòng nhập nội dung cho đủ 3 cấp độ.`);
        return;
      }
    }

    setIsPublishing(true);
    setErrorMsg(null);

    try {
      const res = await speakingApi.publishScript(lessonId, {
        title: scriptTitle.trim(),
        originalContent: originalContent,
        levels: [
          { level: 'BEGINNER', content: editableContents.BEGINNER },
          { level: 'INTERMEDIATE', content: editableContents.INTERMEDIATE },
          { level: 'ADVANCED', content: editableContents.ADVANCED },
        ],
      });

      if (res.success) {
        if (onToast) onToast('Xuất bản thành công!', 'Kịch bản luyện nói 3 cấp độ đã sẵn sàng cho học viên.', 'success');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg(res.message || 'Không thể xuất bản kịch bản.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã xảy ra lỗi khi xuất bản kịch bản.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Helper to format tags into pretty badges in preview mode
  const renderFormattedPreview = (text: string) => {
    if (!text) return <p className="text-slate-400 italic">Chưa có nội dung cho cấp độ này.</p>;

    // Split text into paragraphs
    const paragraphs = text.split('\n');

    return (
      <div className="space-y-4">
        {paragraphs.map((para, pIdx) => {
          if (!para.trim()) return <div key={pIdx} className="h-2" />;

          // Highlight tags: [HƯỚNG DẪN: ...], [GIỌNG ĐỌC: ...], [NGẮT NGHỈ: ...]
          const tagRegex = /(\[[^\]]+\])/g;
          const parts = para.split(tagRegex);

          return (
            <div key={pIdx} className="leading-relaxed text-slate-800 text-sm">
              {parts.map((part, idx) => {
                if (part.startsWith('[HƯỚNG DẪN:')) {
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 my-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 mr-2"
                    >
                      💡 {part.replace(/\[|\]/g, '')}
                    </span>
                  );
                }
                if (part.startsWith('[GIỌNG ĐỌC:')) {
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 my-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 mr-2"
                    >
                      🎙️ {part.replace(/\[|\]/g, '')}
                    </span>
                  );
                }
                if (part.startsWith('[NGẮT NGHỈ:')) {
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 my-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 mr-2"
                    >
                      ⏳ {part.replace(/\[|\]/g, '')}
                    </span>
                  );
                }
                return <span key={idx}>{part}</span>;
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const hasAnyContent = Boolean(
    editableContents.BEGINNER || editableContents.INTERMEDIATE || editableContents.ADVANCED
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 md:px-7 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/50">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 text-blue-700 text-xs font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>QUẢN LÝ KỊCH BẢN NÓI (3 CẤP ĐỘ)</span>
            </div>
            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
              {lessonTitle}
            </h2>
            {courseTitle && (
              <p className="text-xs text-slate-500 font-medium">Khóa học: {courseTitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-6">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{errorMsg}</p>
                {validationErrors.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 space-y-0.5">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Section 1: Upload & Parser */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-blue-600" />
                  <span>Tải lên kịch bản (.docx, .txt, .md)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hệ thống C# thuần sẽ tự động chuẩn hóa và bóc tách thành 3 cấp độ: Beginner, Intermediate, Advanced.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Tải template mẫu (.md)</span>
              </button>
            </div>

            {/* Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-white hover:bg-blue-50/20 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-3 shadow-inner">
                  <FileText className="w-6 h-6" />
                </div>
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Nhấn để đổi file khác
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-700">
                      Kéo thả hoặc <span className="text-blue-600 font-bold">chọn tập tin</span> kịch bản
                    </p>
                    <p className="text-xs text-slate-400">Hỗ trợ định dạng .docx, .txt, .md (tối đa 10MB)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Parse Action Button */}
            {selectedFile && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseFile}
                  disabled={isParsing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isParsing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang phân tích kịch bản...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Phân tích & Tách 3 Cấp Độ</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Section 2: 3-Level Tabs & Inline Editor */}
          {hasAnyContent && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Xem trước & Hiệu chỉnh 3 Cấp độ</h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setViewMode('EDIT')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        viewMode === 'EDIT'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Chỉnh sửa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('PREVIEW')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        viewMode === 'PREVIEW'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem định dạng</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tiêu đề kịch bản bài tập nói:
                </label>
                <input
                  type="text"
                  value={scriptTitle}
                  onChange={(e) => setScriptTitle(e.target.value)}
                  placeholder="Nhập tiêu đề kịch bản..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Level Tabs */}
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      key: 'BEGINNER',
                      label: '🌱 Dễ (Beginner)',
                      desc: 'Đầy đủ Hướng dẫn + Giọng đọc + Ngắt nghỉ',
                    },
                    {
                      key: 'INTERMEDIATE',
                      label: '⚡ Trung bình (Intermediate)',
                      desc: 'Chỉ giữ Giọng đọc',
                    },
                    {
                      key: 'ADVANCED',
                      label: '🔥 Nâng cao (Advanced)',
                      desc: '100% Lời thoại sạch',
                    },
                  ] as const
                ).map((lvl) => (
                  <button
                    key={lvl.key}
                    type="button"
                    onClick={() => setActiveTab(lvl.key)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      activeTab === lvl.key
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <p className="text-xs font-bold">{lvl.label}</p>
                    <p
                      className={`text-[10px] mt-0.5 line-clamp-1 ${
                        activeTab === lvl.key ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {lvl.desc}
                    </p>
                  </button>
                ))}
              </div>

              {/* Active Tab Content (Editor / Preview) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 min-h-[220px]">
                {viewMode === 'EDIT' ? (
                  <textarea
                    rows={10}
                    value={editableContents[activeTab]}
                    onChange={(e) =>
                      setEditableContents((prev) => ({
                        ...prev,
                        [activeTab]: e.target.value,
                      }))
                    }
                    placeholder={`Nhập hoặc chỉnh sửa nội dung cấp độ ${activeTab}...`}
                    className="w-full h-full p-2 bg-transparent text-xs text-slate-800 leading-relaxed font-mono focus:outline-none resize-y"
                  />
                ) : (
                  <div className="p-2 overflow-y-auto max-h-[350px]">
                    {renderFormattedPreview(editableContents[activeTab])}
                  </div>
                )}
              </div>
            </div>
          )}
        
          {/* Section 3: Background Music Configuration */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Music className="w-4 h-4 text-indigo-600" />
                  <span>Cấu hình Nhạc nền Luyện nói (Background Music)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhạc nền giúp học viên cảm thụ nhịp điệu MC khi luyện tập. Nhạc phát độc lập qua loa/tai nghe và hoàn toàn KHÔNG lẫn vào bản ghi âm nộp bài.
                </p>
              </div>

              {isLoadingMusics && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tải danh sách...</span>
                </div>
              )}
            </div>

            {/* Music List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Danh sách nhạc khả dụng ({musics.length} bài):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {musics.map((m) => {
                  const isPlaying = previewPlayingId === m.musicId;
                  return (
                    <div
                      key={m.musicId}
                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 transition-all shadow-2xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <Music className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-800 truncate" title={m.title}>
                            {m.title}
                          </span>
                        </div>
                        <span
                          className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            m.isSystemDefault
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {m.isSystemDefault ? 'Mặc định hệ thống' : 'Tải lên riêng'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTogglePreview(m)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isPlaying
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title={isPlaying ? 'Dừng nghe thử' : 'Nghe thử'}
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-3 h-3 fill-current" />
                              <span>Dừng</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>Nghe</span>
                            </>
                          )}
                        </button>

                        {!m.isSystemDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMusic(m.musicId, m.title)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Xóa bài nhạc này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upload Custom Music Box */}
            <div className="mt-4 p-3.5 rounded-xl bg-white border border-dashed border-indigo-200 space-y-3">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Thêm nhạc nền riêng cho bài học này (.mp3, ≤ 5MB)</span>
              </span>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="Tên bài nhạc (VD: Nhạc khai tiệc hoành tráng...)"
                  value={uploadMusicTitle}
                  onChange={(e) => setUploadMusicTitle(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />

                <input
                  ref={musicFileInputRef}
                  type="file"
                  accept=".mp3,.wav,.ogg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadMusicFile(f);
                      if (!uploadMusicTitle) {
                        setUploadMusicTitle(f.name.replace(/\.[^/.]+$/, ''));
                      }
                    }
                  }}
                  className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 text-slate-500 cursor-pointer"
                />

                <button
                  type="button"
                  onClick={handleUploadMusic}
                  disabled={isUploadingMusic || !uploadMusicFile}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isUploadingMusic ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang tải lên...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Tải lên</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 md:px-7 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {existingScript ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Đã có kịch bản ({existingScript.status})
              </span>
            ) : (
              <span>Chưa xuất bản kịch bản cho bài học này</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPublishing}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing || !hasAnyContent}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isPublishing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xuất bản...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu & Xuất Bản 3 Level</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
