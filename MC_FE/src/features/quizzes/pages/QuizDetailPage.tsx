import React, { useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Headphones, Play, RotateCcw, Trash2 } from 'lucide-react';
import type { QuestionDto, AnnotationType, ScenarioNodeDto } from '../types/quizTypes';
import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { useQuiz } from '../hooks/useQuiz';

const names: Record<string, string> = { SINGLE_CHOICE:'Trắc nghiệm một đáp án', MULTIPLE_CHOICE:'Trắc nghiệm nhiều đáp án', TRUE_FALSE:'Đúng / Sai', FILL_BLANK:'Điền từ', LISTEN_IDENTIFY_ERROR:'Nghe và nhận diện lỗi', LISTEN_LOCATE_ERROR:'Nghe và xác định vùng lỗi', AUDIO_COMPARISON:'So sánh giọng đọc', LISTEN_CLASSIFY:'Nghe và phân loại', SCRIPT_ANNOTATION:'Đánh dấu lời dẫn', SCRIPT_WRITING:'Viết lời dẫn MC', ARRANGE_SCRIPT:'Sắp xếp lời dẫn', ERROR_CORRECTION_LAB:'Phân tích và sửa lỗi', SCENARIO_DECISION_TREE:'Xử lý tình huống MC', ESSAY:'Tự luận' };
const hints: Record<string, string> = { LISTEN_LOCATE_ERROR:'Nghe đoạn ghi âm rồi kéo trên timeline để đánh dấu vị trí mắc lỗi.', ERROR_CORRECTION_LAB:'Chọn vùng lỗi và mô tả nguyên nhân hoặc cách khắc phục.', SCRIPT_ANNOTATION:'Bôi đen từ hoặc cụm từ trong lời dẫn rồi chọn cách thể hiện.', ARRANGE_SCRIPT:'Sắp xếp các đoạn thành lời dẫn hợp lý.', SCENARIO_DECISION_TREE:'Chọn cách xử lý để đi tiếp qua từng tình huống.' };
const formatMs = (value: number) => { const s = Math.floor(Math.max(0, value) / 1000); return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`; };

interface QuizNavigationState {
  returnTo?: string;
}

const QuizDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { id } = useParams<{
    id: string;
  }>();

  const navigationState =
    location.state as QuizNavigationState | null;

  const returnTo =
    navigationState?.returnTo;

  const quizId = id
    ? Number(id)
    : null;

  const validQuizId =
    quizId !== null &&
    Number.isInteger(quizId) &&
    quizId > 0
      ? quizId
      : null;

  const {
    data: quiz,
    isLoading,
    isError,
    error,
  } = useQuiz(validQuizId);

  
  const handleBack = () => {
    if (returnTo) {
      navigate(returnTo, {
        replace: true,
      });

      return;
    }

    if (
      quiz?.courseId !== null &&
      quiz?.courseId !== undefined &&
      Number.isInteger(quiz.courseId) &&
      quiz.courseId > 0
    ) {
      navigate(
        `/instructor/courses/${quiz.courseId}/lessons#quiz-management`,
        {
          replace: true,
        }
      );

      return;
    }

    navigate('/instructor/courses', {
      replace: true,
    });
  };

  
  const handleEditQuiz = () => {
    if (!quiz) {
      return;
    }

    const fallbackReturnTo =
      quiz.courseId !== null &&
      quiz.courseId !== undefined &&
      Number.isInteger(quiz.courseId) &&
      quiz.courseId > 0
        ? `/instructor/courses/${quiz.courseId}/lessons#quiz-management`
        : undefined;

    navigate(
      `/instructor/quizzes/${quiz.quizId}/edit`,
      {
        state: {
          returnTo:
            returnTo ??
            fallbackReturnTo,
        },
      }
    );
  };

  if (validQuizId === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">
            Quiz ID không hợp lệ
          </h2>

          <button
            type="button"
            onClick={handleBack}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-600">
          Đang tải thông tin Quiz...
        </div>
      </div>
    );
  }

  if (isError || !quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">
            Không thể tải Quiz
          </h2>

          <p className="mt-2 text-slate-500">
            {error instanceof Error
              ? error.message
              : 'Quiz không tồn tại hoặc đã xảy ra lỗi.'}
          </p>

          <button
            type="button"
            onClick={handleBack}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {}

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={handleBack}
                className="mb-2 text-sm text-slate-500 transition hover:text-slate-700"
              >
                ← Quay lại
              </button>

              <h1 className="text-2xl font-bold text-slate-900">
                Chi tiết Quiz
              </h1>
            </div>

            <button
              type="button"
              onClick={handleEditQuiz}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700"
            >
              Chỉnh sửa Quiz
            </button>
          </div>
        </div>
      </div>

      {}

      <main className="mx-auto max-w-6xl px-6 py-8">

        {}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {quiz.title}
              </h2>

              {quiz.description && (
                <p className="mt-2 text-slate-600">
                  {quiz.description}
                </p>
              )}
            </div>

            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                quiz.status === 'ACTIVE'
                  ? 'bg-green-50 text-green-700'
                  : quiz.status === 'ARCHIVED'
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-yellow-50 text-yellow-700'
              }`}
            >
              {quiz.status}
            </span>
          </div>

          {}

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <InfoItem
              label="Quiz ID"
              value={String(
                quiz.quizId
              )}
            />

            <InfoItem
              label="Thời gian"
              value={
                quiz.timeLimitMinutes >
                0
                  ? `${quiz.timeLimitMinutes} phút`
                  : 'Không giới hạn'
              }
            />

            <InfoItem
              label="Điểm đạt"
              value={`${quiz.passingScore}%`}
            />

            <InfoItem
              label="Số lần làm tối đa"
              value={String(
                quiz.maxAttempts
              )}
            />
          </div>

          {}

          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 md:grid-cols-2">
            <InfoItem
              label="Course ID"
              value={
                quiz.courseId !== null &&
                quiz.courseId !==
                  undefined
                  ? String(
                      quiz.courseId
                    )
                  : 'Không có'
              }
            />

            <InfoItem
              label="Lesson ID"
              value={
                quiz.lessonId !== null &&
                quiz.lessonId !==
                  undefined
                  ? String(
                      quiz.lessonId
                    )
                  : 'Không có'
              }
            />
          </div>
        </section>

        {}

        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              Câu hỏi
            </h2>

            <span className="text-sm text-slate-500">
              {quiz.questions.length}{' '}
              câu hỏi
            </span>
          </div>

          {quiz.questions.length ===
          0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-500">
                Quiz chưa có câu hỏi.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {[...quiz.questions]
                .sort(
                  (a, b) =>
                    a.orderIndex -
                    b.orderIndex
                )
                .map(
                  (
                    question,
                    index
                  ) => (
                    <QuestionCard
                      key={
                        question.questionId
                      }
                      index={index}
                      question={
                        question
                      }
                    />
                  )
                )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

interface InfoItemProps {
  label: string;
  value: string;
}

const InfoItem: React.FC<
  InfoItemProps
> = ({
  label,
  value,
}) => {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="mb-1 text-xs text-slate-500">
        {label}
      </div>

      <div className="font-semibold text-slate-900">
        {value}
      </div>
    </div>
  );
};

const TimelinePreview: React.FC<{ question: QuestionDto }> = ({ question }) => {
  const audio = question.media?.find(m => m.mediaType === 'AUDIO');
  const ref = useRef<HTMLDivElement>(null); const audioRef = useRef<HTMLAudioElement>(null); const drag = useRef<number | null>(null);
  const [duration,setDuration] = useState(Math.max(1,audio?.durationSeconds || 30)); const [selected,setSelected] = useState<[number,number] | null>(null); const [regions,setRegions] = useState<[number,number][]>([]);
  const point = (x:number) => { const r=ref.current?.getBoundingClientRect(); return r ? Math.round(Math.max(0,Math.min(1,(x-r.left)/r.width))*duration*1000) : 0; };
  const start = selected?.[0] ?? 0; const end = selected?.[1] ?? 0;
  return <div className="mt-5 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5"><p className="mb-3 flex items-center gap-2 text-sm font-bold text-violet-800"><Headphones size={17}/> Phòng nghe • Chọn vùng lỗi</p>{audio ? <audio ref={audioRef} controls preload="metadata" src={audio.mediaUrl} className="w-full" onLoadedMetadata={e => { const d=e.currentTarget.duration; if(Number.isFinite(d) && d>0) setDuration(d); }}/> : <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">Chưa có file audio. Không thể xác định thời gian lỗi.</p>}
    <p className="mt-4 text-xs text-slate-500">Kéo chuột hoặc vuốt trên thanh bên dưới để chọn đoạn âm thanh mắc lỗi.</p><div ref={ref} onPointerDown={e => { if(!audio) return; e.currentTarget.setPointerCapture(e.pointerId); const p=point(e.clientX); drag.current=p; setSelected([p,p]); }} onPointerMove={e => { if(drag.current===null) return; const p=point(e.clientX); setSelected([Math.min(drag.current,p),Math.max(drag.current,p)]); }} onPointerUp={e => { if(drag.current===null) return; const p=point(e.clientX); const a=Math.min(drag.current,p); setSelected([a,Math.min(duration*1000,Math.max(a+100,Math.max(drag.current,p)))]); drag.current=null; }} onPointerCancel={() => {drag.current=null;}} className="relative mt-3 h-24 touch-none select-none overflow-hidden rounded-2xl border border-violet-200 bg-white"><div className="absolute inset-x-2 top-1/2 flex h-12 -translate-y-1/2 items-center gap-[2px]">{Array.from({length:64},(_,i)=><span key={i} className="w-full rounded-full bg-violet-200" style={{height:`${18+Math.abs(Math.sin(i*1.83)*Math.cos(i*.37))*75}%`}}/>)}</div>{regions.map(([a,b],i)=><div key={i} className="pointer-events-none absolute inset-y-0 bg-amber-300/40" style={{left:`${a/(duration*10)}%`,width:`${(b-a)/(duration*10)}%`}}/>)}{selected && <div className="pointer-events-none absolute inset-y-0 border-x-2 border-violet-600 bg-violet-500/30" style={{left:`${start/(duration*10)}%`,width:`${Math.max(0,end-start)/(duration*10)}%`}}/>}</div><div className="mt-2 flex justify-between text-xs text-slate-500"><span>00:00</span><span>{selected ? `${formatMs(start)} → ${formatMs(end)}` : 'Chưa chọn vùng'}</span><span>{formatMs(duration*1000)}</span></div>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!selected || !audio} onClick={() => { if(!audioRef.current || !selected) return; audioRef.current.currentTime=start/1000; void audioRef.current.play(); }} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 disabled:opacity-40"><Play size={15}/> Nghe vùng chọn</button><button type="button" disabled={!selected || end-start<100} onClick={() => {setRegions(v=>[...v,[start,Math.min(duration*1000,end)]]);setSelected(null);}} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">+ Thêm vùng lỗi</button><button type="button" onClick={() => {setRegions([]);setSelected(null);}} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">Làm lại</button></div>{regions.map(([a,b],i)=><div key={i} className="mt-2 flex items-center justify-between rounded-xl border border-violet-100 bg-white px-4 py-2 text-sm"><span>Vùng {i+1}: <b>{formatMs(a)} – {formatMs(b)}</b></span><button type="button" onClick={() => setRegions(v=>v.filter((_,j)=>j!==i))} className="text-red-500" aria-label="Xóa vùng"><Trash2 size={16}/></button></div>)}<p className="mt-3 text-xs text-violet-600">Chế độ xem trước: các vùng được chọn chỉ lưu tạm trên trình duyệt.</p></div>;
};

const AnnotationPreview: React.FC<{question:QuestionDto}> = ({question}) => { const ref=useRef<HTMLDivElement>(null); const [range,setRange]=useState<[number,number] | null>(null); const [type,setType]=useState<AnnotationType>('PAUSE'); const [items,setItems]=useState<{a:number;b:number;type:AnnotationType}[]>([]); const types:Record<AnnotationType,string>={PAUSE:'Ngắt nghỉ',BREATH:'Lấy hơi',EMPHASIS:'Nhấn giọng',PITCH_RISE:'Lên giọng',PITCH_FALL:'Xuống giọng'}; const capture=()=>{const s=window.getSelection();if(!s||s.isCollapsed||!ref.current||!ref.current.contains(s.anchorNode)||!ref.current.contains(s.focusNode))return;const r=s.getRangeAt(0);const b=r.cloneRange();b.selectNodeContents(ref.current);b.setEnd(r.startContainer,r.startOffset);const a=b.toString().length;setRange([a,a+r.toString().length]);};return <div className="mt-5 space-y-3"><div ref={ref} onMouseUp={capture} onKeyUp={capture} className="select-text rounded-2xl border border-violet-100 bg-violet-50/50 p-5 text-base leading-9">{question.questionText}</div><div className="flex flex-wrap gap-2"><select value={type} onChange={e=>setType(e.target.value as AnnotationType)} className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm">{Object.entries(types).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><button type="button" disabled={!range} onClick={()=>{if(!range)return;setItems(v=>[...v,{a:range[0],b:range[1],type}]);setRange(null);window.getSelection()?.removeAllRanges();}} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">+ Thêm đánh dấu</button></div>{items.map((v,i)=><div key={i} className="flex justify-between rounded-xl border border-violet-100 p-3 text-sm"><span><b className="text-violet-700">{types[v.type]}</b>: “{question.questionText.slice(v.a,v.b)}”</span><button type="button" onClick={()=>setItems(x=>x.filter((_,j)=>j!==i))} className="text-red-500"><Trash2 size={15}/></button></div>)}</div>; };

const ScenarioPreview: React.FC<{question:QuestionDto}> = ({question}) => { const nodes=question.scenarioNodes||[];const [path,setPath]=useState<number[]>([]);const start=nodes.find(n=>n.isStartNode);const node:ScenarioNodeDto|undefined=path.length?nodes.find(n=>n.nodeId===path[path.length-1]):start;return <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/40 p-5">{node ? <><div className="flex justify-between"><span className="text-xs font-bold text-violet-700">Bước {path.length+1}</span><button type="button" onClick={()=>setPath([])} className="flex items-center gap-1 text-xs text-violet-600"><RotateCcw size={14}/> Bắt đầu lại</button></div><h4 className="mt-3 font-bold">{node.title||'Tình huống'}</h4><p className="mt-2 whitespace-pre-line text-sm leading-7">{node.content}</p>{node.isEndNode ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">Đã hoàn thành nhánh tình huống.</p> : <div className="mt-4 grid gap-2">{[...node.choices].sort((a,b)=>a.orderIndex-b.orderIndex).map(c=><button key={c.scenarioChoiceId} type="button" onClick={()=>{if(c.nextNodeId!=null)setPath(p=>[...p,c.nextNodeId!]);else setPath(p=>[...p,-1]);}} className="rounded-xl border border-violet-100 bg-white p-4 text-left text-sm hover:border-violet-400">{c.choiceText}</button>)}</div>}</> : <div className="text-sm text-amber-700">{path.length?'Nhánh tình huống đã kết thúc.':'Chưa có nút bắt đầu.'}<button type="button" onClick={()=>setPath([])} className="ml-3 font-bold underline">Làm lại</button></div>}</div>; };

const QuestionPreview: React.FC<{question:QuestionDto}> = ({question}) => { const [chosen,setChosen]=useState<number[]>([]);const [text,setText]=useState('');const [order,setOrder]=useState<number[]>([]);const multi=question.questionType==='MULTIPLE_CHOICE';const choiceTypes=['SINGLE_CHOICE','MULTIPLE_CHOICE','TRUE_FALSE','LISTEN_IDENTIFY_ERROR','AUDIO_COMPARISON','LISTEN_CLASSIFY'];const locate=['LISTEN_LOCATE_ERROR','ERROR_CORRECTION_LAB'].includes(question.questionType);const items=question.arrangeItems||[];const ids=order.length===items.length?order:items.map(i=>i.arrangeItemId);return <div className="mt-5 border-t border-violet-100 pt-5"><div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-violet-700"><Eye size={17}/> Học viên sẽ tương tác như sau</div>{locate ? <><TimelinePreview key={question.questionId} question={question}/><QuestionMedia media={question.media?.filter(m=>m.mediaType!=='AUDIO') ?? []} /></> : <QuestionMedia media={question.media ?? []} />}{(choiceTypes.includes(question.questionType)||(locate&&question.choices.length>0))&&<div className="mt-5 grid gap-2">{[...question.choices].sort((a,b)=>a.orderIndex-b.orderIndex).map((c,i)=>{const active=chosen.includes(c.choiceId);return <button key={c.choiceId} type="button" onClick={()=>setChosen(v=>multi?(v.includes(c.choiceId)?v.filter(x=>x!==c.choiceId):[...v,c.choiceId]):[c.choiceId])} className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm transition ${active?'border-violet-500 bg-violet-50':'border-slate-200 bg-white hover:border-violet-300'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${active?'bg-violet-600 text-white':'bg-slate-100 text-slate-500'}`}>{active?<Check size={16}/>:String.fromCharCode(65+i)}</span>{c.choiceText}</button>;})}</div>}{['FILL_BLANK','SCRIPT_WRITING','ESSAY'].includes(question.questionType)&&<div className="mt-5">{question.writingConfig&&<p className="mb-2 text-xs text-violet-700">{[question.writingConfig.eventType,question.writingConfig.audience,question.writingConfig.style].filter(Boolean).join(' • ')}</p>}{question.questionType==='FILL_BLANK'?<input value={text} onChange={e=>setText(e.target.value)} placeholder="Nhập câu trả lời..." className="w-full rounded-xl border border-violet-200 p-4 outline-none focus:border-violet-500"/>:<textarea value={text} onChange={e=>setText(e.target.value)} rows={7} placeholder="Viết câu trả lời của bạn..." className="w-full rounded-xl border border-violet-200 p-4 outline-none focus:border-violet-500"/>}<p className="mt-2 text-right text-xs text-slate-500">{text.trim()?text.trim().split(/\s+/).length:0} từ</p></div>}{question.questionType==='ARRANGE_SCRIPT'&&<div className="mt-5 grid gap-2">{ids.map((id,i)=>{const item=items.find(x=>x.arrangeItemId===id);return <div key={id} className="flex items-center gap-3 rounded-xl border border-violet-100 bg-white p-3"><GripVertical size={17} className="text-violet-300"/><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-sm font-bold text-violet-700">{i+1}</span><p className="flex-1 text-sm">{item?.content}</p><button type="button" disabled={i===0} onClick={()=>{const next=[...ids];[next[i-1],next[i]]=[next[i],next[i-1]];setOrder(next);}} className="rounded-lg border px-2 py-1 disabled:opacity-30">↑</button><button type="button" disabled={i===ids.length-1} onClick={()=>{const next=[...ids];[next[i+1],next[i]]=[next[i],next[i+1]];setOrder(next);}} className="rounded-lg border px-2 py-1 disabled:opacity-30">↓</button></div>;})}</div>}{question.questionType==='SCRIPT_ANNOTATION'&&<AnnotationPreview question={question}/>}{question.questionType==='SCENARIO_DECISION_TREE'&&<ScenarioPreview question={question}/>}<div className="mt-5 flex items-center justify-between rounded-xl bg-violet-50 px-4 py-3 text-xs text-violet-700"><span>Đây là bản xem trước, không lưu hoặc nộp bài.</span><button type="button" onClick={()=>{setChosen([]);setText('');setOrder([]);}} className="font-bold underline">Xóa lựa chọn</button></div></div>; };

const QuestionCard: React.FC<{question:QuestionDto;index:number}> = ({question,index}) => {const [preview,setPreview]=useState(false);const [showAnswers,setShowAnswers]=useState(false);return <article className="overflow-hidden rounded-[24px] border border-violet-100 bg-white shadow-[0_8px_30px_rgba(76,29,149,.04)]"><div className="p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 font-extrabold text-violet-700">{index+1}</span><div className="min-w-0"><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{names[question.questionType]||question.questionType}</span><h3 className="mt-3 text-lg font-extrabold leading-7 text-slate-900">{question.questionText}</h3><p className="mt-1 text-xs text-slate-500">{question.points??1} điểm {question.isRequired?' • Bắt buộc':''}</p></div></div><button type="button" onClick={()=>setPreview(v=>!v)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${preview?'bg-violet-600 text-white':'border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'}`}>{preview?<EyeOff size={16}/>:<Eye size={16}/>}{preview?'Thoát xem trước':'Xem như học viên'}</button></div>{question.instruction&&<div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><b>Hướng dẫn:</b> {question.instruction}</div>}{!question.instruction&&hints[question.questionType]&&<div className="mt-5 rounded-xl bg-violet-50 p-4 text-sm text-violet-700">{hints[question.questionType]}</div>}{preview?<QuestionPreview key={question.questionId} question={question}/>:<><QuestionMedia media={question.media ?? []} />{question.questionType==='LISTEN_LOCATE_ERROR'&&<div className="mt-4 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-4 text-sm text-violet-700">Bài tập xác định vùng lỗi: nhấn “Xem như học viên” để thử kéo chọn trên timeline.</div>}{(question.errorRegions?.length ?? 0)>0&&<p className="mt-4 text-xs font-semibold text-slate-500">Đã cấu hình {(question.errorRegions?.length ?? 0)} vùng lỗi để chấm điểm.</p>}{(question.arrangeItems?.length ?? 0)>0&&<p className="mt-4 text-xs font-semibold text-slate-500">Đã cấu hình {question.arrangeItems?.length ?? 0} đoạn lời dẫn.</p>}{(question.scenarioNodes?.length ?? 0)>0&&<p className="mt-4 text-xs font-semibold text-slate-500">Đã cấu hình {(question.scenarioNodes?.length ?? 0)} nút tình huống.</p>}<button type="button" onClick={()=>setShowAnswers(v=>!v)} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-violet-700">{showAnswers?<ChevronUp size={17}/>:<ChevronDown size={17}/>}{showAnswers?'Ẩn đáp án / cấu hình':'Xem đáp án / cấu hình'}</button>{showAnswers&&<div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">{question.choices.length>0&&[...question.choices].sort((a,b)=>a.orderIndex-b.orderIndex).map((c,i)=><div key={c.choiceId} className={`rounded-xl border px-4 py-3 text-sm ${c.isCorrect?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-slate-200 bg-white text-slate-700'}`}>{String.fromCharCode(65+i)}. {c.choiceText} {c.isCorrect&&<b className="ml-2 text-xs">✓ Đúng</b>}</div>)}{question.errorRegions?.map((r,i)=><p key={r.errorRegionId||i} className="rounded-lg bg-white p-3 text-xs">Vùng lỗi {i+1}: {formatMs(r.startTimeMs)} – {formatMs(r.endTimeMs)} • {r.errorCategory} / {r.errorCode}</p>)}{question.explanation&&<p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900"><b>Giải thích:</b> {question.explanation}</p>}{!question.choices.length&&!question.errorRegions?.length&&!question.explanation&&<p className="text-xs text-slate-500">Dạng câu hỏi này không có đáp án trắc nghiệm để hiển thị.</p>}</div>}</>}</div></article>;};


type QuestionMediaItem = NonNullable<QuestionDto['media']>[number];

const getYouTubeEmbedUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);
    let id: string | null = null;
    if (['youtu.be', 'www.youtu.be'].includes(host)) id = segments[0] ?? null;
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
      if (segments[0] === 'watch') id = url.searchParams.get('v');
      else if (['embed', 'shorts', 'live'].includes(segments[0])) id = segments[1] ?? null;
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
};

const QuestionMedia: React.FC<{ media: QuestionMediaItem[] }> = ({ media }) => {
  const validMedia = media.filter(item => item.mediaUrl?.trim()).sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  if (!validMedia.length) return null;
  return (
    <div className="mt-4 space-y-3">
      {validMedia.map((item, index) => {
        const type = String(item.mediaType).toUpperCase();
        const url = item.mediaUrl.trim();
        const youtube = type === 'VIDEO' ? getYouTubeEmbedUrl(url) : null;
        return (
          <div key={item.mediaId ?? `${type}-${index}`} className="rounded-xl border border-violet-100 bg-violet-50/40 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-violet-800">{item.label || (type === 'AUDIO' ? 'Âm thanh câu hỏi' : type === 'VIDEO' ? 'Video câu hỏi' : 'Hình ảnh câu hỏi')}</span>
              {item.durationSeconds != null && item.durationSeconds > 0 && <span className="text-xs text-slate-500">{item.durationSeconds} giây</span>}
            </div>
            {type === 'AUDIO' ? (
              <audio controls preload="metadata" src={url} className="w-full" />
            ) : type === 'VIDEO' && youtube ? (
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                <iframe src={youtube} title={item.label || `Video câu hỏi ${index + 1}`} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
              </div>
            ) : type === 'VIDEO' ? (
              <video controls preload="metadata" src={url} className="max-h-[420px] w-full rounded-lg bg-black" />
            ) : type === 'IMAGE' ? (
              <img src={url} alt={item.label || 'Hình ảnh câu hỏi'} className="max-h-[420px] w-full rounded-lg object-contain" loading="lazy" />
            ) : (
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-700 underline">Mở media</a>
            )}
          </div>
        );
      })}
    </div>
  );
};

export { QuizDetailPage };