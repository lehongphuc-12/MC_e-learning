import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Eye, RefreshCw, ChevronDown, ChevronUp, Lock, Sparkles } from 'lucide-react';
import { speakingApi } from '../api/speakingApi';
import type { SpeakingSubmissionHistoryDto } from '../types/speakingTypes';

interface Props {
  scriptId?: number;
  lessonId?: number;
  courseId?: number;
  passingScore?: number;
  returnTo: string;
  onTake?: () => void;
  canTakeSpeaking?: boolean;
  hideActionButtons?: boolean;
}

export const LearnerSpeakingHistoryActions: React.FC<Props> = ({
  scriptId,
  lessonId,
  courseId,
  passingScore = 80,
  returnTo,
  onTake,
  canTakeSpeaking = true,
  hideActionButtons = false,
}) => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<SpeakingSubmissionHistoryDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const fetchHistory = useCallback(async () => {
    if (!scriptId && !lessonId) return;
    setIsFetching(true);
    try {
      let res;
      if (scriptId) {
        res = await speakingApi.getSubmissionHistoryByScript(scriptId);
      } else if (lessonId) {
        res = await speakingApi.getSubmissionHistoryByLesson(lessonId);
      }

      if (res && res.success && Array.isArray(res.data)) {
        setHistory(res.data);
        setIsError(false);
        return;
      }

      // Fallback: nếu API history chưa sẵn sàng hoặc rỗng, thử lấy submission mới nhất
      let latestRes;
      if (scriptId) {
        latestRes = await speakingApi.getLatestSubmissionByScript(scriptId);
      } else if (lessonId) {
        latestRes = await speakingApi.getLatestSubmissionByLesson(lessonId);
      }

      if (latestRes && latestRes.success && latestRes.data) {
        const sub = latestRes.data;
        setHistory([
          {
            submissionId: sub.submissionId,
            scriptId: sub.scriptId,
            lessonId: sub.lessonId,
            attemptNumber: sub.attemptNumber || 1,
            score: sub.score,
            status: sub.status,
            isPassed: sub.isPassed,
            gradeTier: sub.gradeTier,
            submittedAt: sub.submittedAt,
            gradedAt: sub.gradedAt,
            audioUrl: sub.audioUrl,
            selectedLevel: sub.selectedLevel,
          },
        ]);
        setIsError(false);
      } else {
        // Chưa có bài nộp nào: trạng thái bình thường (0 lượt làm)
        setHistory([]);
        setIsError(false);
      }
    } catch {
      // Thử fallback cuối cùng nếu request history bị 404
      try {
        let latestRes;
        if (scriptId) {
          latestRes = await speakingApi.getLatestSubmissionByScript(scriptId);
        } else if (lessonId) {
          latestRes = await speakingApi.getLatestSubmissionByLesson(lessonId);
        }
        if (latestRes && latestRes.success && latestRes.data) {
          const sub = latestRes.data;
          setHistory([
            {
              submissionId: sub.submissionId,
              scriptId: sub.scriptId,
              lessonId: sub.lessonId,
              attemptNumber: sub.attemptNumber || 1,
              score: sub.score,
              status: sub.status,
              isPassed: sub.isPassed,
              gradeTier: sub.gradeTier,
              submittedAt: sub.submittedAt,
              gradedAt: sub.gradedAt,
              audioUrl: sub.audioUrl,
              selectedLevel: sub.selectedLevel,
            },
          ]);
          setIsError(false);
          return;
        } else if (latestRes && latestRes.success) {
          setHistory([]);
          setIsError(false);
          return;
        }
      } catch {
        // Nếu cả fallback cũng lỗi thì mới báo lỗi
      }
      setIsError(true);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [scriptId, lessonId]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const passed = useMemo(
    () => history.some((a) => a.isPassed === true),
    [history]
  );

  const pending = useMemo(
    () => history.some((a) => a.status === 'SUBMITTED' || a.score == null),
    [history]
  );

  const canRecord = canTakeSpeaking && !isLoading && !passed && !pending;

  const openResult = (submissionId: number) => {
    const route = courseId
      ? `/courses/${courseId}/speaking/result/${submissionId}`
      : `/speaking/result/${submissionId}`;
    navigate(route, { state: { returnTo } });
  };

  const getStatusLabel = (item: SpeakingSubmissionHistoryDto) => {
    if (item.score == null || item.status === 'SUBMITTED') return 'Chờ chấm';
    if (item.isPassed === true) return 'Đạt';
    if (item.isPassed === false || item.status === 'NEEDS_RESUBMISSION') return 'Chưa đạt';
    return Number(item.score) >= passingScore ? 'Đạt' : 'Chưa đạt';
  };

  return (
    <div className="mt-2 w-full space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        {!hideActionButtons && onTake && (
          canRecord ? (
            <button
              type="button"
              onClick={onTake}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 font-bold text-white transition hover:bg-purple-700 active:scale-95 cursor-pointer shadow-2xs"
            >
              <Mic size={14} /> Làm bài nói
            </button>
          ) : !canTakeSpeaking && !passed && !pending ? (
            <button
              type="button"
              disabled
              title="Vui lòng hoàn thành video bài học để mở khóa bài luyện nói"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 font-semibold text-slate-400 cursor-not-allowed"
            >
              <Lock size={14} /> Làm bài nói
            </button>
          ) : null
        )}

        {!hideActionButtons && courseId && (lessonId || scriptId) && (
          <button
            type="button"
            onClick={() => {
              const targetLessonId = lessonId || 0;
              navigate(`/courses/${courseId}/lessons/${targetLessonId}/ai-practice`);
            }}
            disabled={!canTakeSpeaking}
            title={!canTakeSpeaking ? 'Vui lòng hoàn thành bài học để mở khóa' : 'Luyện tập phát âm với AI'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-2 font-bold text-purple-700 transition hover:bg-purple-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
          >
            <Sparkles size={14} /> Luyện với AI
          </button>
        )}

        {history.length > 0 && (
          <button
            type="button"
            onClick={() => openResult(history[0].submissionId)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3 py-2 font-bold text-purple-700 transition hover:bg-purple-50 active:scale-95 shadow-2xs"
          >
            <Eye size={14} /> Xem điểm & nhận xét
          </button>
        )}

        <button
          type="button"
          title="Cập nhật lịch sử điểm"
          onClick={() => void fetchHistory()}
          disabled={isFetching}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-purple-50 disabled:opacity-40"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {isLoading ? (
        <p className="text-[11px] text-slate-500">Đang tải lịch sử bài nói...</p>
      ) : isError ? (
        <p className="text-[11px] text-rose-600">Không tải được lịch sử. Hãy bấm làm mới.</p>
      ) : !canTakeSpeaking && !passed && !pending ? (
        <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
          <Lock size={12} className="shrink-0" /> Hoàn thành bài học để mở khóa
        </p>
      ) : (
        <p className="text-[11px] text-slate-600">
          {passed
            ? 'Đã đạt · Không cần nộp lại'
            : pending
            ? 'Đang chờ giảng viên chấm'
            : `${history.length} lượt đã sử dụng · Không giới hạn lượt · Điểm đạt ${passingScore}%`}
        </p>
      )}

      {history.length > 0 && (
        <details className="rounded-xl border border-purple-100 bg-white p-3 shadow-2xs">
          <summary className="cursor-pointer font-semibold text-purple-700 select-none flex items-center justify-between">
            <span>Lịch sử điểm ({history.length} lượt)</span>
          </summary>
          <div className="mt-2 space-y-1">
            {history.map((a) => {
              const label = getStatusLabel(a);
              const scoreText =
                a.score != null && Number.isFinite(Number(a.score))
                  ? `${Number(a.score).toFixed(1)}/100`
                  : 'Chờ chấm';
              return (
                <button
                  key={a.submissionId}
                  type="button"
                  onClick={() => openResult(a.submissionId)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-purple-50 text-xs"
                >
                  <span className="text-slate-700">
                    Lần {a.attemptNumber} · {label}
                  </span>
                  <span className="font-bold text-purple-700">
                    {scoreText} →
                  </span>
                </button>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
};
