import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Mic2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  BookOpen,
  FolderOpen,
  FileText,
  Clock,
  Sparkles,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { speakingApi } from '../../api/speakingApi';
import { courseApi } from '../../api/courseApi';
import {
  SpeakingScriptDto,
  SpeakingScope,
  getSpeakingScopeInfo,
} from '../../types/speakingTypes';
import { SpeakingScriptUploadModal } from './SpeakingScriptUploadModal';
import { ToastType } from '../../../../components/common/Toast';

interface InstructorSpeakingAssignmentsPageProps {
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
}

const PAGE_SIZE = 7;
const cardClass = 'rounded-[20px] border border-[#e2eaf5] bg-white shadow-[0_5px_22px_rgba(18,55,112,0.045)]';

export const InstructorSpeakingAssignmentsPage: React.FC<InstructorSpeakingAssignmentsPageProps> = ({
  onToast,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Scripts and Courses Data
  const [scripts, setScripts] = useState<SpeakingScriptDto[]>([]);
  const [courses, setCourses] = useState<{ courseId: number; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>(
    searchParams.get('courseId') || 'ALL'
  );
  const [scopeFilter, setScopeFilter] = useState<string>(
    searchParams.get('scope') || 'ALL'
  );
  const [page, setPage] = useState(1);

  // Selected Script for Master-Detail Panel
  const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null);
  const [previewLevel, setPreviewLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalScope, setModalScope] = useState<SpeakingScope>('FINAL');
  const [modalCourseId, setModalCourseId] = useState<number | undefined>(undefined);
  const [scriptToEdit, setScriptToEdit] = useState<SpeakingScriptDto | null>(null);

  // Quick Create Dropdown Menu
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState<SpeakingScriptDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-open modal if directed from CourseLessonsPage
  useEffect(() => {
    const locState = location.state as { courseId?: number; scope?: SpeakingScope; autoOpenCreate?: boolean } | null;
    const queryCourse = searchParams.get('courseId');
    const queryScope = searchParams.get('scope') as SpeakingScope | null;

    if (locState?.autoOpenCreate || queryCourse) {
      const cId = locState?.courseId || (queryCourse ? Number(queryCourse) : undefined);
      const sc = locState?.scope || queryScope || 'FINAL';
      setModalCourseId(cId);
      setModalScope(sc);
      setScriptToEdit(null);
      if (cId) setCourseFilter(cId.toString());
      if (sc) setScopeFilter(sc);
      setIsModalOpen(true);
    }
  }, [location.state, searchParams]);

  // Load Courses and Speaking Scripts
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        // Load instructor courses
        const coursesRes = await courseApi.getInstructorCourses({ page: 1, limit: 100 });
        const courseList = (coursesRes.data ?? []).map((c) => ({
          courseId: c.courseId,
          title: c.title,
        }));
        if (!cancelled) setCourses(courseList);

        // Load speaking scripts
        const scriptsRes = await speakingApi.getSpeakingScripts();
        if (!cancelled) {
          if (scriptsRes.success && scriptsRes.data) {
            setScripts(scriptsRes.data);
            if (scriptsRes.data.length > 0 && !selectedScriptId) {
              setSelectedScriptId(scriptsRes.data[0].scriptId);
            }
          } else {
            setError(scriptsRes.message || 'Không thể tải danh sách bài tập nói.');
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [reloadTrigger]);

  // Filtered Scripts
  const filteredScripts = useMemo(() => {
    return scripts.filter((s) => {
      if (courseFilter !== 'ALL' && s.courseId !== Number(courseFilter)) return false;
      if (scopeFilter !== 'ALL' && s.scope !== scopeFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchCourse = s.courseTitle?.toLowerCase().includes(q);
        const matchModule = s.moduleTitle?.toLowerCase().includes(q);
        const matchLesson = s.lessonTitle?.toLowerCase().includes(q);
        if (!matchTitle && !matchCourse && !matchModule && !matchLesson) return false;
      }
      return true;
    });
  }, [scripts, courseFilter, scopeFilter, search]);

  // Selected Script Detail Object
  const selectedScript = useMemo(() => {
    return scripts.find((s) => s.scriptId === selectedScriptId) || filteredScripts[0] || null;
  }, [scripts, selectedScriptId, filteredScripts]);

  // Stats Counters
  const stats = useMemo(() => {
    const total = scripts.length;
    const lessonCount = scripts.filter((s) => s.scope === 'LESSON').length;
    const chapterCount = scripts.filter((s) => s.scope === 'CHAPTER').length;
    const finalCount = scripts.filter((s) => s.scope === 'FINAL').length;
    return { total, lessonCount, chapterCount, finalCount };
  }, [scripts]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredScripts.length / PAGE_SIZE));
  const paginatedScripts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredScripts.slice(start, start + PAGE_SIZE);
  }, [filteredScripts, page]);

  // Action Handlers
  const handleOpenCreateModal = (scope: SpeakingScope) => {
    setModalScope(scope);
    setModalCourseId(courseFilter !== 'ALL' ? Number(courseFilter) : undefined);
    setScriptToEdit(null);
    setCreateMenuOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (script: SpeakingScriptDto) => {
    setScriptToEdit(script);
    setModalScope(script.scope || 'FINAL');
    setModalCourseId(script.courseId);
    setIsModalOpen(true);
  };

  const handleDeleteScript = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await speakingApi.deleteSpeakingScript(deleteTarget.scriptId);
      if (res.success) {
        onToast?.('Đã xóa bài tập nói', `Đã xóa bài "${deleteTarget.title}" thành công.`, 'success');
        setDeleteTarget(null);
        setReloadTrigger((prev) => prev + 1);
      } else {
        onToast?.('Xóa bài tập thất bại', res.message || 'Không thể xóa bài tập nói.', 'error');
      }
    } catch (err: any) {
      onToast?.('Lỗi xóa bài tập nói', err.message || 'Đã xảy ra lỗi.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderScriptPreviewWithTags = (text: string) => {
    if (!text) return <p className="text-slate-400 italic">Chưa có nội dung cho cấp độ này.</p>;

    const paragraphs = text.split('\n');
    return (
      <div className="space-y-3">
        {paragraphs.map((para, pIdx) => {
          if (!para.trim()) return <div key={pIdx} className="h-1.5" />;
          const tagRegex = /(\[[^\]]+\])/g;
          const parts = para.split(tagRegex);
          return (
            <p key={pIdx} className="text-xs leading-relaxed text-slate-800">
              {parts.map((part, idx) => {
                if (part.startsWith('[HƯỚNG DẪN:')) {
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 my-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-700 border border-blue-200 mr-1.5"
                    >
                      💡 {part.replace(/\[|\]/g, '')}
                    </span>
                  );
                }
                if (part.startsWith('[GIỌNG ĐỌC:')) {
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 my-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-100 text-purple-700 border border-purple-200 mr-1.5"
                    >
                      🎙️ {part.replace(/\[|\]/g, '')}
                    </span>
                  );
                }
                if (part.startsWith('[NGẮT NGHỈ:')) {
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 my-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200 mr-1.5"
                    >
                      ⏳ {part.replace(/\[|\]/g, '')}
                    </span>
                  );
                }
                return <span key={idx}>{part}</span>;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f8fc] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* TOP HEADER & STATS */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
              <Mic2 className="h-3.5 w-3.5" />
              <span>INSTRUCTOR STUDIO • QUẢN LÝ BÀI TẬP NÓI</span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
              Quản lý bài luyện nói (Speaking Assignments)
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Cấu hình đề bài thu âm 3 cấp độ (Dễ, Trung bình, Chuyên nghiệp) theo bài học, theo chương hoặc thi cuối khóa.
            </p>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateMenuOpen(!createMenuOpen)}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:brightness-105 active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Tạo bài tập nói mới</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${createMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Quick Dropdown Menu */}
            {createMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-30 animate-fadeIn">
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal('LESSON')}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-sky-50 text-slate-700 hover:text-sky-900 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-bold flex items-center gap-1.5 text-sky-800">
                    <FileText className="h-3.5 w-3.5 text-sky-600" /> Bài học hằng ngày
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Gắn trực tiếp vào bài học cụ thể</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal('CHAPTER')}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-amber-50 text-slate-700 hover:text-amber-900 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-bold flex items-center gap-1.5 text-amber-800">
                    <FolderOpen className="h-3.5 w-3.5 text-amber-600" /> Theo chương (Chapter)
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Đánh giá kỹ năng sau khi học xong chương</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal('FINAL')}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-purple-50 text-slate-700 hover:text-purple-900 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-bold flex items-center gap-1.5 text-purple-800">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" /> Tổng cuối khóa (Final)
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Bài thi nói tổng kết cấp chứng chỉ</p>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* STATS BANNER */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={`${cardClass} p-4`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng bài nói</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{stats.total}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Trên tất cả các khóa học</p>
          </div>
          <div className={`${cardClass} p-4`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-500">Bài học hằng ngày</p>
            <p className="mt-1 text-2xl font-black text-sky-700">{stats.lessonCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Gắn theo bài học</p>
          </div>
          <div className={`${cardClass} p-4`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Theo chương</p>
            <p className="mt-1 text-2xl font-black text-amber-700">{stats.chapterCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Đánh giá từng chương</p>
          </div>
          <div className={`${cardClass} p-4`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-500">Tổng cuối khóa</p>
            <p className="mt-1 text-2xl font-black text-purple-700">{stats.finalCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Bài thi tốt nghiệp</p>
          </div>
        </div>

        {/* FILTERS BAR */}
        <div className={`${cardClass} p-3.5 flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tên bài nói, khóa học..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Course Filter */}
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Tất cả khóa học</option>
              {courses.map((c) => (
                <option key={c.courseId} value={c.courseId}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Scope Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {(
              [
                { key: 'ALL', label: 'Tất cả' },
                { key: 'LESSON', label: 'Bài học' },
                { key: 'CHAPTER', label: 'Theo chương' },
                { key: 'FINAL', label: 'Cuối khóa' },
              ] as const
            ).map((s) => {
              const active = scopeFilter === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setScopeFilter(s.key);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    active ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setReloadTrigger((prev) => prev + 1)}
              title="Tải lại danh sách"
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ERROR NOTIFICATION */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* MASTER - DETAIL LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: MASTER LIST (5 COLS) */}
          <div className="lg:col-span-5 space-y-3">
            {loading ? (
              <div className={`${cardClass} p-8 text-center text-slate-400 space-y-3`}>
                <Loader2 className="h-7 w-7 animate-spin mx-auto text-blue-500" />
                <p className="text-xs font-medium">Đang tải danh sách bài tập nói...</p>
              </div>
            ) : filteredScripts.length === 0 ? (
              <div className={`${cardClass} p-8 text-center text-slate-400 space-y-3`}>
                <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                  <Mic2 className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-700">Chưa có bài tập nói nào phù hợp</p>
                <p className="text-[11px] text-slate-500">Hãy thử thay đổi bộ lọc hoặc tạo bài tập nói mới.</p>
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal('FINAL')}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20"
                >
                  <Plus className="h-3.5 w-3.5" /> Tạo bài tập nói ngay
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2.5">
                  {paginatedScripts.map((script, idx) => {
                    const isSelected = selectedScript?.scriptId === script.scriptId;
                    const scopeInfo = getSpeakingScopeInfo(script.scope);

                    return (
                      <div
                        key={script.scriptId}
                        onClick={() => setSelectedScriptId(script.scriptId)}
                        className={`rounded-2xl border p-4 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-white shadow-md shadow-blue-600/10 ring-2 ring-blue-500/10'
                            : 'border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${scopeInfo.badgeClass}`}>
                                {scopeInfo.shortLabel}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                #{script.scriptId}
                              </span>
                            </div>
                            <h3 className="text-xs font-black text-slate-900 leading-snug line-clamp-2">
                              {script.title}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-1">
                              {script.courseTitle}
                            </p>
                            {(script.moduleTitle || script.lessonTitle) && (
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {script.moduleTitle ? `Chương: ${script.moduleTitle}` : ''}
                                {script.moduleTitle && script.lessonTitle ? ' • ' : ''}
                                {script.lessonTitle ? `Bài: ${script.lessonTitle}` : ''}
                              </p>
                            )}
                          </div>
                          <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? 'text-blue-600 translate-x-0.5' : 'text-slate-300'}`} />
                        </div>

                        {/* Level Dots & Timestamp */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 font-bold">
                              Dễ
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-blue-50 text-blue-700 font-bold">
                              TB
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-purple-50 text-purple-700 font-bold">
                              Pro
                            </span>
                          </div>
                          <span>
                            {script.updatedAt ? new Date(script.updatedAt).toLocaleDateString('vi-VN') : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 px-1 text-xs text-slate-500">
                    <span>
                      Trang {page} / {totalPages} ({filteredScripts.length} bài)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT: DETAIL PREVIEW PANEL (7 COLS) */}
          <div className="lg:col-span-7">
            {selectedScript ? (
              <div className={`${cardClass} p-6 space-y-6 sticky top-6`}>
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-100 pb-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${getSpeakingScopeInfo(selectedScript.scope).badgeClass}`}>
                        {getSpeakingScopeInfo(selectedScript.scope).label}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">
                        ID: #{selectedScript.scriptId}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-slate-900 leading-snug">
                      {selectedScript.title}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Khóa học: <span className="font-bold text-slate-700">{selectedScript.courseTitle}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(selectedScript)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(selectedScript)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Xóa
                    </button>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Phạm vi</span>
                    <span className="font-bold text-slate-800">{getSpeakingScopeInfo(selectedScript.scope).shortLabel}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Điểm đạt</span>
                    <span className="font-bold text-emerald-700">≥ {selectedScript.passingScore || 80}/100</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Chương / Bài</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {selectedScript.moduleTitle || selectedScript.lessonTitle || 'Toàn khóa'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Cập nhật</span>
                    <span className="font-medium text-slate-600">
                      {selectedScript.updatedAt ? new Date(selectedScript.updatedAt).toLocaleDateString('vi-VN') : ''}
                    </span>
                  </div>
                </div>

                {/* 3 Level Content Viewer */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  <div className="flex items-center border-b border-slate-200 bg-slate-50/70 p-1.5">
                    {(
                      [
                        { key: 'BEGINNER', label: '1. Dễ (Beginner)' },
                        { key: 'INTERMEDIATE', label: '2. Trung bình (Intermediate)' },
                        { key: 'ADVANCED', label: '3. Chuyên nghiệp (Advanced)' },
                      ] as const
                    ).map((lvl) => {
                      const active = previewLevel === lvl.key;
                      return (
                        <button
                          key={lvl.key}
                          type="button"
                          onClick={() => setPreviewLevel(lvl.key)}
                          className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {lvl.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-4 max-h-[360px] overflow-y-auto">
                    {renderScriptPreviewWithTags(
                      selectedScript.levels?.find((l) => l.level === previewLevel)?.content || ''
                    )}
                  </div>
                </div>

                {/* Bottom Shortcut to Submissions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/instructor/speaking-submissions?courseId=${selectedScript.courseId}`)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span>Xem các bài nộp chấm điểm</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>

                  <span className="text-[11px] text-slate-400">
                    Học viên luyện tập với Studio Teleprompter & AI
                  </span>
                </div>
              </div>
            ) : (
              <div className={`${cardClass} p-12 text-center text-slate-400`}>
                <p className="text-xs font-semibold">Chọn một bài tập nói từ danh sách bên trái để xem chi tiết.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      <SpeakingScriptUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialScope={modalScope}
        courseId={modalCourseId}
        scriptToEdit={scriptToEdit}
        coursesList={courses}
        onSuccess={() => {
          setReloadTrigger((prev) => prev + 1);
        }}
        onToast={onToast}
      />

      {/* DELETE CONFIRM DIALOG */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Xóa bài tập nói?</h3>
                <p className="text-xs text-slate-500">Hành động này không thể hoàn tác.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              Bạn có chắc chắn muốn xóa bài <b>"{deleteTarget.title}"</b> thuộc khóa học <b>"{deleteTarget.courseTitle}"</b> không?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteScript}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
