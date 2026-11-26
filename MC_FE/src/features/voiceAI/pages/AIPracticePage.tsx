
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AudioLines,
  BarChart3,
  Search,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileAudio,
  FileDown,
  Download,
  Headphones,
  History,
  Info,
  Loader2,
  Mic2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';

import { aiPracticeApi } from '../api/aiPracticeApi';
import { printAIPracticePDF } from '../api/AIPracticePDF';
import { AIPracticeRecorder } from '../components/AIPracticeRecorder';
import { AIPracticeFeedback } from '../components/AIPracticeFeedback';
import { useAIPractice } from '../hooks/useAIPractice';

import type {
  AIPracticeHistoryItem,
  AIPracticeResult,
} from '../types/aiPracticeTypes';

const MAX_AUDIO_SIZE = 20 * 1024 * 1024;
const HISTORY_PAGE_SIZE = 10;

type PageTab = 'practice' | 'feedback' | 'history';

function formatPracticeDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Không xác định';
  }

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPracticeStatus(status: string): string {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'Đã hoàn thành';
    case 'PROCESSING':
      return 'Đang phân tích';
    case 'PENDING':
      return 'Đang chờ';
    case 'FAILED':
      return 'Thất bại';
    default:
      return status;
  }
}

function getPracticeStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-700';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-700';
    case 'PENDING':
      return 'bg-amber-100 text-amber-700';
    case 'FAILED':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function AIPracticePage() {
  const { courseId: courseParam, lessonId: lessonParam } = useParams();

  const courseId = Number(courseParam);
  const lessonId = Number(lessonParam);

  const navigate = useNavigate();
  const location = useLocation();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasPrefilledRef = useRef(false);

  const historyRequestRef = useRef(0);
  const detailRequestRef = useRef(0);

  // =========================
  // PRACTICE STATE
  // =========================

  const [audio, setAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [expectedText, setExpectedText] = useState('');
  const [scriptExpanded, setScriptExpanded] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'record' | 'upload'
  >('record');

  const [fileError, setFileError] = useState('');

  const {
    result,
    loading,
    error,
    submit,
    reset,
  } = useAIPractice();

  // =========================
  // PAGE TABS
  // =========================

  const [activePageTab, setActivePageTab] =
    useState<PageTab>('practice');

  // =========================
  // HISTORY STATE
  // =========================

  const [historyItems, setHistoryItems] = useState<
    AIPracticeHistoryItem[]
  >([]);

  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState('');

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [historyError, setHistoryError] = useState('');

  const [historyRefreshKey, setHistoryRefreshKey] =
    useState(0);

  // =========================
  // HISTORY DETAIL STATE
  // =========================

  const [
    selectedHistoryResult,
    setSelectedHistoryResult,
  ] = useState<AIPracticeResult | null>(null);

  const [
    historyDetailLoading,
    setHistoryDetailLoading,
  ] = useState(false);

  const [
    historyDetailError,
    setHistoryDetailError,
  ] = useState('');

  const validCourse =
    Number.isInteger(courseId) && courseId > 0;

  const validLesson =
    Number.isInteger(lessonId) && lessonId > 0;

  // =========================
  // TELEPROMPTER PREFILL
  // =========================

  useEffect(() => {
    if (hasPrefilledRef.current) {
      return;
    }

    const state = location.state as {
      fromTeleprompter?: boolean;
      prefillScriptText?: string;
      prefillAudioFile?: File;
    } | null;

    if (!state?.fromTeleprompter) {
      return;
    }

    hasPrefilledRef.current = true;

    if (state.prefillScriptText) {
      setExpectedText(state.prefillScriptText);
    }

    if (state.prefillAudioFile) {
      setFile(state.prefillAudioFile);
      setActiveTab('upload');
    }
  }, [location.state]);

  // =========================
  // AUDIO PREVIEW
  // =========================

  useEffect(() => {
    if (!audio) {
      setAudioUrl(null);
      return;
    }

    const url = URL.createObjectURL(audio);

    setAudioUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audio]);

  // =========================
  // LOAD HISTORY
  // =========================

  useEffect(() => {
    if (activePageTab !== 'history') {
      return;
    }

    const requestId = ++historyRequestRef.current;
    let cancelled = false;

    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryError('');

      try {
        const response = await aiPracticeApi.history(
          historyPage,
          HISTORY_PAGE_SIZE
        );

        if (
          !cancelled &&
          requestId === historyRequestRef.current
        ) {
          setHistoryItems(response);
        }
      } catch (err) {
        console.error(
          'Không thể tải lịch sử luyện tập AI:',
          err
        );

        if (
          !cancelled &&
          requestId === historyRequestRef.current
        ) {
          setHistoryItems([]);

          setHistoryError(
            'Không thể tải lịch sử luyện tập. Vui lòng thử lại.'
          );
        }
      } finally {
        if (
          !cancelled &&
          requestId === historyRequestRef.current
        ) {
          setHistoryLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [
    activePageTab,
    historyPage,
    historyRefreshKey,
  ]);

  // =========================
  // AUDIO HANDLERS
  // =========================

  const setFile = (file: File | null) => {
    setFileError('');

    if (!file) {
      setAudio(null);
      reset();
      return;
    }

    const extension = file.name
      .split('.')
      .pop()
      ?.toLowerCase();

    if (
      extension !== 'wav' &&
      extension !== 'flac'
    ) {
      setFileError(
        'Chỉ hỗ trợ file WAV hoặc FLAC.'
      );
      return;
    }

    if (file.size === 0) {
      setFileError(
        'File âm thanh không được để trống.'
      );
      return;
    }

    if (file.size > MAX_AUDIO_SIZE) {
      setFileError(
        'File âm thanh vượt quá giới hạn 20 MB.'
      );
      return;
    }

    setAudio(file);
    reset();
  };

  // Download the original File, not a transcoded preview or a remote API URL.
  // The object URL is created on click and revoked after the browser starts the download.
  const handleDownloadAudio = () => {
    if (!audio || audio.size === 0) return;

    const extension = audio.name.split('.').pop()?.toLowerCase();
    const fallbackExtension = audio.type.toLowerCase().includes('flac') ? 'flac' : 'wav';
    const safeExtension = extension === 'wav' || extension === 'flac'
      ? extension
      : fallbackExtension;
    const baseName = audio.name.replace(/\.[^.]+$/, '').trim() || 'mseek-ai-practice';
    const safeName = baseName.replace(/[\\/:*?"<>|\x00-\x1F]/g, '_');
    const downloadUrl = URL.createObjectURL(audio);
    const anchor = document.createElement('a');

    anchor.href = downloadUrl;
    anchor.download = `${safeName}.${safeExtension}`;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);

    try {
      anchor.click();
    } finally {
      anchor.remove();
      // Delaying revocation prevents downloads from being cancelled in some browsers.
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
    }
  };

  const clearAudio = () => {
    setAudio(null);
    setFileError('');
    reset();

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (
      !audio ||
      loading ||
      !validCourse ||
      !validLesson
    ) {
      return;
    }

    await submit(
      courseId,
      lessonId,
      audio,
      expectedText
    );
  };

  // =========================
  // HISTORY HANDLERS
  // =========================

  const refreshHistory = () => {
    setHistoryRefreshKey(
      (current) => current + 1
    );
  };

  const closeHistoryDetail = () => {
    ++detailRequestRef.current;

    setSelectedHistoryResult(null);
    setHistoryDetailLoading(false);
    setHistoryDetailError('');
  };

  const switchPageTab = (tab: PageTab) => {
    closeHistoryDetail();

    if (tab === 'history') {
      setHistoryPage(1);

      if (activePageTab === 'history') {
        refreshHistory();
      }
    }

    setActivePageTab(tab);
  };

  const openHistoryDetail = async (
    practiceSessionId: number
  ) => {
    const requestId = ++detailRequestRef.current;

    setHistoryDetailLoading(true);
    setHistoryDetailError('');
    setSelectedHistoryResult(null);

    try {
      const response = await aiPracticeApi.detail(
        practiceSessionId
      );

      if (requestId === detailRequestRef.current) {
        setSelectedHistoryResult(response);
      }
    } catch (err) {
      console.error(
        'Không thể tải feedback AI:',
        err
      );

      if (requestId === detailRequestRef.current) {
        setHistoryDetailError(
          'Không thể tải feedback. Phiên luyện tập có thể chưa hoàn thành.'
        );
      }
    } finally {
      if (requestId === detailRequestRef.current) {
        setHistoryDetailLoading(false);
      }
    }
  };

  // =========================
  // PDF HANDLER
  // =========================

  const handlePrintFeedback = (
    feedback: AIPracticeResult
  ) => {
    const opened = printAIPracticePDF(feedback);

    if (!opened) {
      window.alert(
        'Trình duyệt đang chặn cửa sổ mới. Hãy cho phép popup để in hoặc lưu PDF.'
      );
    }
  };

  // =========================
  // INVALID ROUTE
  // =========================

  if (!validCourse || !validLesson) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <Info className="mx-auto mb-3 h-10 w-10 text-red-500" />

          <h2 className="text-xl font-bold text-slate-900">
            Đường dẫn không hợp lệ
          </h2>

          <p className="mt-2 text-slate-500">
            Không tìm thấy thông tin bài luyện tập.
          </p>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-5 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  // =========================
  // =========================
  // NEW COMPACT STUDIO UI
  // =========================
  const visibleHistory = historyItems.filter((item) =>
    `${item.practiceSessionId} ${item.lessonId ?? ''} ${item.practiceMode}`
      .toLowerCase().includes(historySearch.toLowerCase().trim())
  );

  return (
    <main className="mseek-motion min-h-screen bg-[#f1f6ff] pb-8 text-[#101f42]">
      <style>{`
        @keyframes mseekEnter { from {opacity:0;transform:translateY(9px)} to {opacity:1;transform:translateY(0)} }
        @keyframes mseekShimmer { 0% {background-position:200% 0} 100% {background-position:-200% 0} }
        .mseek-enter {animation:mseekEnter .42s cubic-bezier(.2,.8,.2,1) both}
        @media (prefers-reduced-motion:reduce) {
          .mseek-enter {animation:none}
          .mseek-motion * {transition-duration:0ms!important;animation:none!important}
        }
      `}</style>

      <div className="mx-auto max-w-[1160px] space-y-3 px-3 py-4 sm:px-5">
        <section className="mseek-enter overflow-hidden rounded-2xl border border-[#dce7fa] bg-white shadow-[0_8px_30px_-22px_rgba(25,70,150,.3)]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eaf1ff] text-[#1559ff] transition-transform duration-300 hover:rotate-[-8deg] hover:scale-110"><Mic2 size={21}/></div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#1559ff]">MSEEK / AI Voice Studio</p>
                <h1 className="truncate text-lg font-black tracking-tight sm:text-[22px]">Luyện tập cùng AI</h1>
                <p className="text-xs text-[#7c8eaa]">Luyện giọng · Phân tích · Tiến bộ</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#d9e5fa] px-3 py-2 text-xs font-bold text-[#48618b] hover:bg-[#f2f7ff]"><ArrowLeft size={15}/> Quay lại bài học</button>
          </div>
          <nav aria-label="Điều hướng AI Practice" className="grid grid-cols-3 gap-1 border-t border-[#e9eff9] bg-[#f8fbff] p-1.5 sm:gap-2 sm:px-5">
            {([
              {id:'practice' as PageTab, text:'Luyện tập AI (Studio)', short:'Studio', Icon:Mic2},
              {id:'feedback' as PageTab, text:'Kết quả & nhận xét', short:'Kết quả', Icon:BarChart3},
              {id:'history' as PageTab, text:'Lịch sử luyện tập', short:'Lịch sử', Icon:History},
            ]).map(({id,text,short,Icon})=>(
              <button key={id} type="button" onClick={()=>switchPageTab(id)}
                aria-current={activePageTab===id?'page':undefined}
                className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-extrabold transition sm:text-sm ${activePageTab===id?'bg-[#1559ff] text-white shadow-[0_5px_14px_rgba(21,89,255,.24)]':'border border-[#dce6f7] bg-white text-[#415a82] hover:border-[#9cbbff] hover:bg-[#eef5ff] hover:-translate-y-px'}`}>
                <Icon size={16}/><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{text}</span>
              </button>
            ))}
          </nav>
        </section>

        {activePageTab === 'practice' && (
          <>
            <div className="mseek-enter grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,.8fr)]">
              <div className="space-y-3">

                <section className="overflow-hidden rounded-2xl border border-[#cddfff] bg-white shadow-[0_5px_22px_-18px_rgba(20,65,125,.3)]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7effb] px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf2ff] text-[#1559ff]"><FileAudio size={18}/></div>
                      <div><h3 className="text-sm font-black text-[#142b50]">Kịch bản tham chiếu <span className="ml-1 text-[11px] font-normal text-[#8496b1]">(không bắt buộc)</span></h3>
                        <p className="mt-0.5 text-[11px] text-[#7a8ca8]">Đọc kịch bản trong lúc luyện nói để AI đối chiếu nội dung.</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setScriptExpanded(true)} className="rounded-lg border border-[#d5e3fa] bg-[#f4f8ff] px-3 py-2 text-xs font-bold text-[#1559ff] transition hover:bg-[#e5efff]">Mở chế độ đọc rộng ↗</button>
                  </div>
                  <div className="p-4">
                    <textarea aria-label="Nội dung kịch bản tham chiếu" value={expectedText} maxLength={5000} onChange={e=>setExpectedText(e.target.value)}
                      placeholder="Dán hoặc nhập kịch bản để vừa nhìn vừa luyện nói..."
                      className="min-h-[220px] w-full resize-y rounded-xl border border-[#d5e2f7] bg-[#f9fbff] px-5 py-4 text-[16px] font-medium leading-[1.9] text-[#172e52] outline-none transition focus:border-[#1559ff] focus:bg-white focus:ring-4 focus:ring-[#1559ff]/10 sm:min-h-[260px]"/>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8396b4]"><span>Có thể kéo góc dưới để mở rộng vùng đọc.</span><span>{expectedText.length}/5000 ký tự</span></div>
                  </div>
                </section>
                <section className="overflow-hidden rounded-2xl border border-[#dbe6f7] bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#e8eef8] px-5 py-3.5"><h3 className="text-sm font-black">02 <span className="ml-1 text-[#273e63]">Phòng luyện giọng</span></h3><span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/> Sẵn sàng</span></div>
                  <div className="relative overflow-hidden bg-[#101e3c] p-3 sm:p-4">
                    {activeTab==='record' ? (
                      <div className="rounded-xl border border-white/10 bg-[#192d55]/90 p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)] [&_button]:max-w-full">
                        <AIPracticeRecorder disabled={loading} onAudio={setFile}/>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#5b83ce] bg-[#1b3159] px-4 py-8 text-center text-white">
                        <UploadCloud size={33} className="mx-auto mb-3 text-[#8eb6ff]"/>
                        <p className="text-sm font-bold">Tải bản ghi âm của bạn</p><p className="mt-1 text-xs text-[#b3c7e8]">Chọn tệp WAV hoặc FLAC, tối đa 20MB</p>
                        <input ref={fileInputRef} type="file" accept=".wav,.flac,audio/wav,audio/flac" className="hidden" onChange={e=>setFile(e.target.files?.[0]??null)}/>
                        <button type="button" onClick={()=>fileInputRef.current?.click()} className="mt-4 rounded-xl bg-[#1559ff] px-5 py-2.5 text-xs font-bold text-white">Chọn tệp âm thanh</button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2.5 px-4 py-3">
                    {fileError && <p role="alert" className="text-xs font-semibold text-red-600">{fileError}</p>}
                    {audio && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce9ff] bg-[#f0f6ff] p-3">
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#1d427e]">{audio.name}</p><p className="text-[11px] text-[#7d90ac]">{(audio.size/1024/1024).toFixed(2)} MB · Có thể nghe lại hoặc lưu về máy</p></div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button type="button" onClick={handleDownloadAudio} aria-label="Tải bản ghi âm về máy" className="inline-flex items-center gap-1.5 rounded-lg border border-[#bcd4ff] bg-white px-3 py-2 text-xs font-extrabold text-[#1559ff] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1559ff] hover:bg-[#e7f0ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1559ff]"><Download size={15}/> Tải ghi âm</button>
                        <button type="button" onClick={clearAudio} aria-label="Xóa ghi âm" className="rounded-lg p-2 text-[#637fa9] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1559ff]"><X size={17}/></button>
                      </div>
                    </div>}
                    {audioUrl && <audio className="h-9 w-full" controls src={audioUrl}/>}
                    <button type="button" disabled={!audio||loading} onClick={()=>void handleSubmit()} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#1559ff] px-5 py-3 text-sm font-black text-white shadow-[0_6px_14px_rgba(21,89,255,.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0647e0] hover:shadow-[0_9px_22px_rgba(21,89,255,.3)] active:scale-[.99] disabled:cursor-not-allowed disabled:bg-[#b7c9e7] disabled:shadow-none">{loading?<Loader2 size={18} className="animate-spin"/>:<Sparkles size={18}/>} {loading?'AI đang phân tích...':'Phân tích giọng nói với AI'}</button>
                    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
                    {result && <button type="button" onClick={()=>switchPageTab('feedback')} className="w-full rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-bold text-emerald-700">Đã có kết quả — Xem nhận xét AI →</button>}
                  </div>
                </section>
              </div>
              <aside className="space-y-3">
                <section className="rounded-2xl border border-[#dbe6f7] bg-white p-4 shadow-[0_5px_22px_-18px_rgba(20,65,125,.3)]">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-black">01 <span className="ml-1 text-[#273e63]">Chọn hình thức luyện tập</span></h3><span className="text-[11px] text-[#8092ae]">WAV / FLAC · tối đa 20MB</span></div>
                  <div className="grid grid-cols-1 gap-2">
                    {([{id:'record' as const,title:'Ghi âm trực tiếp',desc:'Thu giọng ngay',Icon:Mic2},{id:'upload' as const,title:'Tải file ghi âm',desc:'WAV hoặc FLAC',Icon:UploadCloud}]).map(({id,title,desc,Icon})=>(
                      <button key={id} type="button" onClick={()=>setActiveTab(id)} className={`group flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${activeTab===id?'border-[#1559ff] bg-[#eff5ff] ring-1 ring-[#1559ff]/20':'border-[#dce6f5] bg-white hover:border-[#adc7ff]'}`}>
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${activeTab===id?'bg-[#1559ff] text-white':'bg-[#eef4ff] text-[#1559ff]'}`}><Icon size={18}/></span>
                        <span className="min-w-0"><span className="block text-xs font-extrabold sm:text-sm">{title}</span><span className="block text-[11px] text-[#8091ab]">{desc}</span></span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-[#dbe6f7] bg-white p-4 shadow-[0_5px_22px_-18px_rgba(20,65,125,.3)]">
                  <h3 className="flex items-center gap-2 text-sm font-black"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#eaf2ff] text-[#1559ff]"><CheckCircle2 size={17}/></span> Tiêu chí đánh giá</h3>
                  <p className="mt-2 text-xs leading-5 text-[#8091ab]">AI phân tích giọng nói dựa trên các yếu tố:</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">{['Phát âm & thanh điệu','Độ rõ ràng và lưu loát','Nội dung trình bày','Nhịp độ & ngắt nghỉ'].map((v,i)=><div key={v} className="group flex items-center gap-2 rounded-lg border border-transparent bg-[#f3f7fe] px-3 py-2.5 text-xs font-semibold text-[#344f78] transition-all duration-200 hover:translate-x-1 hover:border-[#cbdfff] hover:bg-[#eaf2ff]"><CheckCircle2 size={15} className="text-[#1559ff]"/>{v}<span className="ml-auto text-[10px] font-bold text-[#a2b2ca]">0{i+1}</span></div>)}</div>
                </section>

                <section className="rounded-2xl border border-[#d1e1fc] bg-gradient-to-br from-[#eff6ff] to-[#e2edff] p-4">
                  <h3 className="flex items-center gap-2 text-sm font-black text-[#193e82]"><Info size={18} className="text-[#1559ff]"/> Mẹo luyện tập hiệu quả</h3>
                  <div className="mt-3 space-y-2 text-xs leading-5 text-[#46628f]"><p>✦ Giữ tốc độ nói tự nhiên, ổn định.</p><p>✦ Hạn chế từ đệm và ngắt nghỉ quá lâu.</p><p>✦ Thu âm ở nơi yên tĩnh, nói rõ ràng.</p></div>
                </section>
              </aside>
            </div>
          </>
        )}

        {scriptExpanded && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07152e]/75 p-3 backdrop-blur-sm sm:p-8" role="dialog" aria-modal="true" aria-label="Chế độ đọc kịch bản rộng" onKeyDown={e=>{if(e.key==='Escape')setScriptExpanded(false);}}>
            <div className="flex h-[min(88vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#e4ebf8] px-5 py-4"><div><h2 className="text-lg font-black text-[#132c55]">Kịch bản luyện nói</h2><p className="text-xs text-[#7e91ad]">Chế độ đọc tập trung · nội dung tự đồng bộ với Studio</p></div><button type="button" onClick={()=>setScriptExpanded(false)} aria-label="Đóng chế độ đọc rộng" className="rounded-xl bg-[#edf4ff] p-2.5 text-[#1559ff] hover:bg-[#dfeaff]"><X size={20}/></button></div>
              <textarea autoFocus value={expectedText} maxLength={5000} onChange={e=>setExpectedText(e.target.value)} placeholder="Nhập kịch bản tại đây..." className="min-h-0 flex-1 resize-none px-6 py-6 text-[19px] leading-[2] text-[#132c55] outline-none sm:px-10 sm:text-[23px]"/>
              <div className="flex items-center justify-between border-t border-[#e4ebf8] px-5 py-3 text-xs text-[#8092ac]"><span>{expectedText.length}/5000 ký tự</span><button type="button" onClick={()=>setScriptExpanded(false)} className="rounded-xl bg-[#1559ff] px-5 py-2.5 font-bold text-white hover:bg-[#0749e5]">Quay lại phòng thu</button></div>
            </div>
          </div>
        )}

        {activePageTab === 'feedback' && (
          <section className="rounded-[22px] border border-[#dbe6f7] bg-white p-4 shadow-[0_5px_22px_-18px_rgba(20,65,125,.3)] sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-lg font-black">Kết quả & nhận xét AI</h2><p className="mt-1 text-xs text-[#8091ab]">Phân tích chuyên sâu sau mỗi lần luyện tập</p></div><span className="rounded-xl bg-[#eaf2ff] p-3 text-[#1559ff] transition-transform duration-300 hover:rotate-6"><BarChart3 size={23}/></span></div>
            {result ? <><AIPracticeFeedback result={result}/><button type="button" onClick={()=>handlePrintFeedback(result)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1559ff] px-4 py-2.5 text-xs font-bold text-white"><FileDown size={16}/> In / Lưu PDF</button></> :
              <div className="rounded-2xl border border-dashed border-[#bfd3f4] bg-[#f5f9ff] px-5 py-12 text-center"><AudioLines size={40} className="mx-auto text-[#1559ff]"/><h3 className="mt-3 text-base font-black">Chưa có kết quả luyện tập</h3><p className="mt-1 text-xs text-[#8192ad]">Hãy ghi âm và gửi bài để nhận phân tích từ AI.</p><button type="button" onClick={()=>switchPageTab('practice')} className="mt-4 rounded-xl bg-[#1559ff] px-4 py-2.5 text-xs font-bold text-white">Đến phòng luyện tập</button></div>}
          </section>
        )}

        {activePageTab === 'history' && (
          <section className="mseek-enter overflow-hidden rounded-2xl border border-[#dbe6f7] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9eff8] px-5 py-4 sm:px-6"><div><h2 className="text-lg font-black">Lịch sử luyện tập</h2><p className="mt-1 text-xs text-[#8091ab]">Xem lại từng phiên và nhận xét của AI</p></div><button type="button" disabled={historyLoading} onClick={refreshHistory} className="inline-flex items-center gap-2 rounded-xl border border-[#dbe6f7] px-3 py-2 text-xs font-bold text-[#1559ff]"><RefreshCw size={15} className={historyLoading?'animate-spin':''}/> Làm mới</button></div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6"><div className="relative w-full sm:max-w-xs"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#90a1bc]"/><input value={historySearch} onChange={e=>setHistorySearch(e.target.value)} placeholder="Tìm mã phiên, bài học..." className="w-full rounded-xl border border-[#dbe6f7] bg-[#f7faff] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#1559ff]"/></div><span className="text-xs text-[#8091ab]">{visibleHistory.length} phiên trên trang {historyPage}</span></div>
            {historyLoading?<div className="flex min-h-40 items-center justify-center gap-2 text-sm text-[#1559ff]"><Loader2 size={19} className="animate-spin"/> Đang tải lịch sử...</div>:
            historyError?<div className="p-10 text-center text-xs text-red-600">{historyError}</div>:
            visibleHistory.length===0?<div className="p-12 text-center text-sm text-[#8293ae]">Không có phiên luyện tập phù hợp.</div>:
            <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-xs"><thead className="bg-[#f3f7ff] text-[11px] font-bold text-[#7186a8]"><tr><th className="px-5 py-3">Phiên</th><th className="px-5 py-3">Hình thức</th><th className="px-5 py-3">Thời gian</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Chi tiết</th></tr></thead><tbody className="divide-y divide-[#edf1f8]">{visibleHistory.map(item=><tr key={item.practiceSessionId} className="hover:bg-[#f8fbff]"><td className="px-5 py-3 font-black text-[#1e3d73]">#{item.practiceSessionId}<span className="block pt-1 text-[10px] font-normal text-[#93a4bd]">{item.lessonId?`Bài #${item.lessonId}`:'Luyện tập tự do'}</span></td><td className="px-5 py-3 text-[#647b9e]">{item.practiceMode==='COURSE'?'Trong khóa học':'Tự do'}</td><td className="px-5 py-3 text-[#647b9e]">{formatPracticeDate(item.createdAt)}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${getPracticeStatusColor(item.status)}`}>{getPracticeStatus(item.status)}</span></td><td className="px-5 py-3 text-right"><button type="button" disabled={item.status.toUpperCase()!=='COMPLETED'} onClick={()=>void openHistoryDetail(item.practiceSessionId)} className="inline-flex items-center gap-1 rounded-lg bg-[#eaf2ff] px-3 py-2 font-bold text-[#1559ff] disabled:opacity-40"><Eye size={14}/> Xem</button></td></tr>)}</tbody></table></div>}
            <div className="flex items-center justify-between border-t border-[#e9eff8] px-5 py-3 text-xs text-[#8091ab]"><span>Trang {historyPage}</span><div className="flex gap-2"><button type="button" disabled={historyLoading||historyPage===1} onClick={()=>{closeHistoryDetail();setHistoryPage(p=>p-1)}} className="rounded-lg border border-[#dbe6f7] p-2 disabled:opacity-40"><ChevronLeft size={16}/></button><button type="button" disabled={historyLoading||historyItems.length<HISTORY_PAGE_SIZE} onClick={()=>{closeHistoryDetail();setHistoryPage(p=>p+1)}} className="rounded-lg border border-[#dbe6f7] p-2 disabled:opacity-40"><ChevronRight size={16}/></button></div></div>
            {(historyDetailLoading||historyDetailError||selectedHistoryResult)&&<div className="border-t border-[#e9eff8] p-5 sm:p-7"><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-black">Chi tiết phản hồi AI</h3><button type="button" onClick={closeHistoryDetail} aria-label="Đóng" className="rounded-lg bg-[#f2f6fd] p-2"><X size={16}/></button></div>{historyDetailLoading&&<p className="text-xs text-[#1559ff]">Đang tải kết quả...</p>}{historyDetailError&&<p className="text-xs text-red-600">{historyDetailError}</p>}{selectedHistoryResult&&<><AIPracticeFeedback result={selectedHistoryResult}/><button type="button" onClick={()=>handlePrintFeedback(selectedHistoryResult)} className="mt-4 rounded-xl bg-[#1559ff] px-4 py-2.5 text-xs font-bold text-white">Xuất PDF</button></>}</div>}
          </section>
        )}
      </div>
    </main>
  );
}
