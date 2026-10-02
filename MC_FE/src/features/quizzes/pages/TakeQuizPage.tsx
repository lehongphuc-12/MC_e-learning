import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, ChevronLeft, ChevronRight, Clock3, Flag, GripVertical, ListChecks, MapPin, Play, Send } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSubmitQuiz, useTakeQuiz } from '../hooks/useQuiz';
import { SubmitAnnotationRequest, SubmitArrangeItemRequest, SubmitErrorRegionRequest, SubmitQuizAnswerRequest, SubmitScenarioPathRequest, TakeQuestionDto } from '../types/quizTypes';

type DraftAnswer = {
  selectedChoiceIds: number[];
  textAnswer: string;
  errorRegions: SubmitErrorRegionRequest[];
  annotations: SubmitAnnotationRequest[];
  arrangeItems: SubmitArrangeItemRequest[];
  scenarioPath: SubmitScenarioPathRequest[];
};

interface QuizNavigationState { returnTo?: string; }

const emptyDraft = (): DraftAnswer => ({ selectedChoiceIds: [], textAnswer: '', errorRegions: [], annotations: [], arrangeItems: [], scenarioPath: [] });

const typeLabels: Record<string, string> = {
  SINGLE_CHOICE: 'TRẮC NGHIỆM', MULTIPLE_CHOICE: 'CHỌN NHIỀU ĐÁP ÁN', TRUE_FALSE: 'ĐÚNG / SAI', FILL_BLANK: 'ĐIỀN TỪ',
  LISTEN_IDENTIFY_ERROR: 'NGHE & NHẬN DIỆN', LISTEN_LOCATE_ERROR: 'ĐÁNH DẤU LỖI', AUDIO_COMPARISON: 'SO SÁNH AUDIO',
  LISTEN_CLASSIFY: 'NGHE & PHÂN LOẠI', SCRIPT_ANNOTATION: 'ĐÁNH DẤU KỊCH BẢN', SCRIPT_WRITING: 'VIẾT ĐOẠN',
  ARRANGE_SCRIPT: 'SẮP XẾP', ERROR_CORRECTION_LAB: 'SỬA LỖI', SCENARIO_DECISION_TREE: 'TÌNH HUỐNG', ESSAY: 'TỰ LUẬN'
};

const MediaBlock: React.FC<{ question: TakeQuestionDto }> = ({ question }) => {
  if (!question.media?.length) return null;
  return <div className="mt-5 space-y-3">{question.media.map(media => <div key={media.mediaId} className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
    {media.label && <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-700">{media.label}</p>}
    {media.mediaType === 'AUDIO' && <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white"><Play className="h-4 w-4 fill-current"/></div><audio controls src={media.mediaUrl} className="h-10 min-w-0 flex-1"/></div>}
    {media.mediaType === 'VIDEO' && <video controls src={media.mediaUrl} className="max-h-[360px] w-full rounded-xl bg-black"/>}
    {media.mediaType === 'IMAGE' && <img src={media.mediaUrl} alt={media.label || 'Quiz media'} className="max-h-[360px] w-full rounded-xl object-contain"/>}
  </div>)}</div>;
};

const ChoiceBlock: React.FC<{ question: TakeQuestionDto; draft: DraftAnswer; update: (patch: Partial<DraftAnswer>) => void }> = ({ question, draft, update }) => {
  const multiple = question.questionType === 'MULTIPLE_CHOICE';
  const toggle = (id: number) => {
    if (multiple) update({ selectedChoiceIds: draft.selectedChoiceIds.includes(id) ? draft.selectedChoiceIds.filter(x => x !== id) : [...draft.selectedChoiceIds, id] });
    else update({ selectedChoiceIds: [id] });
  };

  return <div className="mt-5 grid gap-3">{[...question.choices].sort((a,b)=>a.orderIndex-b.orderIndex).map((choice,index)=>{
    const selected = draft.selectedChoiceIds.includes(choice.choiceId);
    return <button key={choice.choiceId} type="button" onClick={()=>toggle(choice.choiceId)} className={`group flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${selected?'border-blue-500 bg-blue-50 shadow-[0_0_0_2px_rgba(59,130,246,.08)]':'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center ${multiple?'rounded-md':'rounded-full'} border text-sm font-bold ${selected?'border-blue-600 bg-blue-600 text-white':'border-slate-300 bg-white text-slate-600'}`}>{selected?<Check className="h-4 w-4"/>:String.fromCharCode(65+index)}</span>
      <span className={`text-sm font-semibold ${selected?'text-blue-900':'text-slate-700'}`}>{choice.choiceText}</span>
    </button>;
  })}</div>;
};

const TextBlock: React.FC<{ question: TakeQuestionDto; draft: DraftAnswer; update: (patch: Partial<DraftAnswer>) => void }> = ({ question, draft, update }) => {
  const writing = question.questionType === 'SCRIPT_WRITING' || question.questionType === 'ESSAY';

  return <div className="mt-5">
    {question.writingConfig && <div className="mb-3 flex flex-wrap gap-2">{question.writingConfig.eventType&&<span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Sự kiện: {question.writingConfig.eventType}</span>}{question.writingConfig.audience&&<span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">Khán giả: {question.writingConfig.audience}</span>}{question.writingConfig.style&&<span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Phong cách: {question.writingConfig.style}</span>}</div>}
    {writing ? <div className="relative"><textarea value={draft.textAnswer} onChange={e=>update({textAnswer:e.target.value})} rows={9} placeholder="Nhập nội dung bài làm của bạn..." className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"/><span className="absolute bottom-3 right-4 text-xs text-slate-400">{draft.textAnswer.trim()?draft.textAnswer.trim().split(/\s+/).length:0}{question.writingConfig?.maxWords?`/${question.writingConfig.maxWords} từ`:' từ'}</span></div>
      : <input value={draft.textAnswer} onChange={e=>update({textAnswer:e.target.value})} placeholder="Nhập câu trả lời..." className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"/>}
  </div>;
};

const ArrangeBlock: React.FC<{ question: TakeQuestionDto; draft: DraftAnswer; update: (patch: Partial<DraftAnswer>) => void }> = ({ question, draft, update }) => {
  const source = question.arrangeItems || [];
  const currentIds = draft.arrangeItems.filter(x=>x.isIncluded).sort((a,b)=>(a.selectedOrder??0)-(b.selectedOrder??0)).map(x=>x.arrangeItemId);
  const ordered = currentIds.length ? currentIds.map(id=>source.find(x=>x.arrangeItemId===id)).filter(Boolean) as typeof source : source;
  const save = (items: typeof source) => update({ arrangeItems: items.map((x,i)=>({ arrangeItemId:x.arrangeItemId, selectedOrder:i+1, isIncluded:true })) });
  const move = (index:number,delta:number) => {
    const next=[...ordered];
    const target=index+delta;
    if(target<0||target>=next.length)return;
    [next[index],next[target]]=[next[target],next[index]];
    save(next);
  };

  useEffect(()=>{ if(source.length && !draft.arrangeItems.length) save(source); },[question.questionId]);

  return <div className="mt-5 space-y-2">{ordered.map((item,index)=><div key={item.arrangeItemId} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
    <GripVertical className="h-5 w-5 text-slate-300"/>
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">{index+1}</span>
    <p className="flex-1 text-sm font-semibold text-slate-700">{item.content}</p>
    <div className="flex gap-1"><button type="button" onClick={()=>move(index,-1)} className="rounded-lg border px-2 py-1 text-xs">↑</button><button type="button" onClick={()=>move(index,1)} className="rounded-lg border px-2 py-1 text-xs">↓</button></div>
  </div>)}</div>;
};

const ErrorRegionBlock: React.FC<{ draft: DraftAnswer; update: (patch: Partial<DraftAnswer>) => void }> = ({ draft, update }) => {
  const region=draft.errorRegions[0]||{selectedStartTimeMs:0,selectedEndTimeMs:null,selectedErrorCategory:'',selectedErrorCode:''};
  const set=(patch:Partial<SubmitErrorRegionRequest>)=>update({errorRegions:[{...region,...patch}]});

  return <div className="mt-5 rounded-2xl border border-red-100 bg-red-50/50 p-4">
    <div className="mb-4 flex items-center gap-2 text-sm font-bold text-red-700"><MapPin className="h-4 w-4"/>Đánh dấu vị trí lỗi trong audio</div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-semibold text-slate-600">Thời điểm bắt đầu (ms)<input type="number" min={0} value={region.selectedStartTimeMs} onChange={e=>set({selectedStartTimeMs:Number(e.target.value)})} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500"/></label>
      <label className="text-xs font-semibold text-slate-600">Thời điểm kết thúc (ms)<input type="number" min={0} value={region.selectedEndTimeMs??''} onChange={e=>set({selectedEndTimeMs:e.target.value?Number(e.target.value):null})} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500"/></label>
      <label className="text-xs font-semibold text-slate-600">Nhóm lỗi<input value={region.selectedErrorCategory??''} onChange={e=>set({selectedErrorCategory:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500"/></label>
      <label className="text-xs font-semibold text-slate-600">Mã lỗi<input value={region.selectedErrorCode??''} onChange={e=>set({selectedErrorCode:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500"/></label>
    </div>
  </div>;
};

const AnnotationBlock: React.FC<{ question: TakeQuestionDto; draft: DraftAnswer; update: (patch: Partial<DraftAnswer>) => void }> = ({ question,draft,update }) => {
  const [start,setStart]=useState(0);
  const [end,setEnd]=useState(0);
  const [type,setType]=useState<SubmitAnnotationRequest['annotationType']>('PAUSE');
  const add=()=>{
    if(end<start)return;
    update({annotations:[...draft.annotations,{annotationType:type,startIndex:start,endIndex:end,annotationValue:null}]});
  };

  return <div className="mt-5">
    <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-8 text-slate-700">{question.questionText}</div>
    <div className="mt-3 grid gap-2 sm:grid-cols-4">
      <select value={type} onChange={e=>setType(e.target.value as SubmitAnnotationRequest['annotationType'])} className="rounded-xl border px-3 py-2.5 text-sm">
        <option value="PAUSE">Ngắt nghỉ</option>
        <option value="BREATH">Lấy hơi</option>
        <option value="EMPHASIS">Nhấn mạnh</option>
        <option value="PITCH_RISE">Lên giọng</option>
        <option value="PITCH_FALL">Xuống giọng</option>
      </select>
      <input type="number" value={start} onChange={e=>setStart(Number(e.target.value))} className="rounded-xl border px-3 py-2.5 text-sm" placeholder="Vị trí đầu"/>
      <input type="number" value={end} onChange={e=>setEnd(Number(e.target.value))} className="rounded-xl border px-3 py-2.5 text-sm" placeholder="Vị trí cuối"/>
      <button type="button" onClick={add} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">Thêm đánh dấu</button>
    </div>
    {draft.annotations.length>0&&<div className="mt-3 flex flex-wrap gap-2">{draft.annotations.map((a,i)=><button type="button" key={i} onClick={()=>update({annotations:draft.annotations.filter((_,x)=>x!==i)})} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{a.annotationType}: {a.startIndex}-{a.endIndex} ×</button>)}</div>}
  </div>;
};

const ScenarioBlock: React.FC<{ question: TakeQuestionDto; draft: DraftAnswer; update: (patch: Partial<DraftAnswer>) => void }> = ({ question,draft,update }) => {
  const nodes=question.scenarioNodes||[];
  const start=nodes.find(x=>x.isStartNode);
  const currentNodeId=draft.scenarioPath.length ? (nodes.find(n=>n.nodeId===draft.scenarioPath[draft.scenarioPath.length-1].nodeId)?.choices.find(c=>c.scenarioChoiceId===draft.scenarioPath[draft.scenarioPath.length-1].scenarioChoiceId)?.nextNodeId ?? null) : start?.nodeId;
  const current=nodes.find(x=>x.nodeId===currentNodeId) || (draft.scenarioPath.length?nodes.find(x=>x.isEndNode):start);

  if(!current)return <p className="mt-5 text-sm text-slate-500">Không tìm thấy nút bắt đầu của tình huống.</p>;

  const choose=(choiceId:number)=>{
    const choice=current.choices.find(x=>x.scenarioChoiceId===choiceId);
    if(!choice)return;
    update({scenarioPath:[...draft.scenarioPath,{nodeId:current.nodeId,scenarioChoiceId:choiceId,stepOrder:draft.scenarioPath.length+1}]});
  };

  return <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">{current.nodeType}</span>
    {current.title&&<h3 className="mt-3 text-lg font-bold text-slate-900">{current.title}</h3>}
    <p className="mt-2 text-sm leading-7 text-slate-700">{current.content}</p>
    {current.mediaUrl&&<img src={current.mediaUrl} alt={current.title || 'Scenario'} className="mt-3 max-h-64 rounded-xl object-cover"/>}
    {current.isEndNode?<div className="mt-4 rounded-xl bg-emerald-100 p-3 text-sm font-bold text-emerald-700">Đã hoàn thành tình huống.</div>:<div className="mt-4 grid gap-2">{[...current.choices].sort((a,b)=>a.orderIndex-b.orderIndex).map(c=><button key={c.scenarioChoiceId} type="button" onClick={()=>choose(c.scenarioChoiceId)} className="rounded-xl border border-indigo-200 bg-white p-3 text-left text-sm font-semibold text-slate-700 transition hover:border-indigo-500 hover:bg-indigo-50">{c.choiceText}<ChevronRight className="float-right h-4 w-4"/></button>)}</div>}
    {draft.scenarioPath.length>0&&<button type="button" onClick={()=>update({scenarioPath:[]})} className="mt-4 text-xs font-bold text-indigo-600">Làm lại tình huống</button>}
  </div>;
};

const isAnswered=(q:TakeQuestionDto,d?:DraftAnswer)=>{
  if(!d)return false;
  if(['SINGLE_CHOICE','MULTIPLE_CHOICE','TRUE_FALSE','LISTEN_IDENTIFY_ERROR','AUDIO_COMPARISON','LISTEN_CLASSIFY'].includes(q.questionType))return d.selectedChoiceIds.length>0;
  if(['FILL_BLANK','SCRIPT_WRITING','ESSAY'].includes(q.questionType))return !!d.textAnswer.trim();
  if(q.questionType==='ARRANGE_SCRIPT')return d.arrangeItems.length>0;
  if(['LISTEN_LOCATE_ERROR','ERROR_CORRECTION_LAB'].includes(q.questionType))return d.errorRegions.length>0||d.selectedChoiceIds.length>0;
  if(q.questionType==='SCRIPT_ANNOTATION')return d.annotations.length>0;
  if(q.questionType==='SCENARIO_DECISION_TREE')return d.scenarioPath.length>0;
  return false;
};

export const TakeQuizPage: React.FC=()=>{
  const navigate=useNavigate();
  const location=useLocation();
  const {quizId}=useParams<{quizId:string}>();
  const id=quizId&&Number(quizId)>0?Number(quizId):null;

  const {data:quiz,isLoading,isError,error}=useTakeQuiz(id);
  const submitQuiz=useSubmitQuiz();

  const [current,setCurrent]=useState(0);
  const [drafts,setDrafts]=useState<Record<number,DraftAnswer>>({});
  const [flagged,setFlagged]=useState<Set<number>>(new Set());
  const [secondsLeft,setSecondsLeft]=useState<number|null>(null);
  const [confirm,setConfirm]=useState(false);
  const returnTo=(location.state as QuizNavigationState|null)?.returnTo;

  useEffect(()=>{
    if(quiz&&secondsLeft===null){
      const end=new Date(quiz.startedAt).getTime()+quiz.timeLimitMinutes*60000;
      setSecondsLeft(Math.max(0,Math.floor((end-Date.now())/1000)));
    }
  },[quiz]);

  useEffect(()=>{
    if(secondsLeft===null||secondsLeft<=0)return;
    const timer=window.setInterval(()=>setSecondsLeft(v=>v===null?null:Math.max(0,v-1)),1000);
    return()=>window.clearInterval(timer);
  },[secondsLeft===null]);

  const questions=useMemo(()=>quiz?[...quiz.questions].sort((a,b)=>a.orderIndex-b.orderIndex):[],[quiz]);
  const question=questions[current];
  const draft=question?(drafts[question.questionId]||emptyDraft()):emptyDraft();
  const update=(patch:Partial<DraftAnswer>)=>question&&setDrafts(prev=>({...prev,[question.questionId]:{...(prev[question.questionId]||emptyDraft()),...patch}}));
  const answered=questions.filter(q=>isAnswered(q,drafts[q.questionId])).length;
  const progress=questions.length?Math.round((answered/questions.length)*100):0;

  const doSubmit=async()=>{
    if(!quiz)return;

    const answers:SubmitQuizAnswerRequest[]=questions.map(q=>{
      const d=drafts[q.questionId]||emptyDraft();
      return{
        questionId:q.questionId,
        selectedChoiceId:d.selectedChoiceIds.length===1?d.selectedChoiceIds[0]:null,
        selectedChoiceIds:d.selectedChoiceIds,
        textAnswer:d.textAnswer||null,
        errorRegions:d.errorRegions,
        annotations:d.annotations,
        arrangeItems:d.arrangeItems,
        scenarioPath:d.scenarioPath
      };
    });

    try{
      const result=await submitQuiz.mutateAsync({
        quizId:quiz.quizId,
        data:{
          attemptId:quiz.attemptId,
          answers
        }
      });

      navigate(`/quizzes/${quiz.quizId}/result/${result.attemptId}`,{
        replace:true,
        state:{returnTo}
      });
    }catch(e){
      window.alert(e instanceof Error?e.message:'Không thể nộp bài Quiz.');
    }
  };

  useEffect(()=>{
    if(secondsLeft===0&&quiz&&!submitQuiz.isPending)void doSubmit();
  },[secondsLeft]);

  if(isLoading)return <div className="flex min-h-[70vh] items-center justify-center bg-slate-50"><div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"/></div>;

  if(isError||!quiz||!question)return <div className="mx-auto max-w-xl p-10 text-center">
    <AlertCircle className="mx-auto h-10 w-10 text-red-500"/>
    <p className="mt-3 font-semibold text-slate-700">{error instanceof Error?error.message:'Không thể tải bài Quiz.'}</p>
  </div>;

  const min=Math.floor((secondsLeft??0)/60);
  const sec=(secondsLeft??0)%60;

  return <div className="min-h-screen bg-[#f5f7fb] pb-10">
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-4">
        <button onClick={()=>returnTo?navigate(returnTo):navigate(-1)} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><ArrowLeft className="h-5 w-5"/></button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-extrabold text-slate-900">{quiz.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">Lần làm {quiz.attemptNumber} • {questions.length} câu hỏi</p>
        </div>
        <div className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${secondsLeft!==null&&secondsLeft<60?'bg-red-50 text-red-600':'bg-amber-50 text-amber-700'}`}><Clock3 className="h-4 w-4"/>{String(min).padStart(2,'0')}:{String(sec).padStart(2,'0')}</div>
        <button onClick={()=>setConfirm(true)} className="hidden rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-100 sm:block">Nộp bài</button>
      </div>
      <div className="h-1 bg-slate-100"><div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all" style={{width:`${progress}%`}}/></div>
    </header>

    <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-28">
        <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold text-slate-900">Danh sách câu hỏi</h2><span className="text-xs font-bold text-blue-600">{answered}/{questions.length}</span></div>
        <div className="mt-4 grid grid-cols-5 gap-2 lg:grid-cols-3">{questions.map((q,index)=>{
          const active=index===current;
          const done=isAnswered(q,drafts[q.questionId]);
          const mark=flagged.has(q.questionId);
          return <button key={q.questionId} onClick={()=>setCurrent(index)} className={`relative flex aspect-square items-center justify-center rounded-full border text-xs font-bold transition ${active?'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100':done?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-300'}`}>{index+1}{mark&&<span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400"/>}</button>;
        })}</div>
        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"/>Đã trả lời</p>
          <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full border border-slate-300 bg-white"/>Chưa trả lời</p>
          <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-400"/>Đánh dấu xem lại</p>
        </div>
      </aside>

      <section className="min-w-0">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">Câu {current+1}/{questions.length}</p>
            <div className="mt-2 h-2 w-56 max-w-[50vw] overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width:`${((current+1)/questions.length)*100}%`}}/></div>
          </div>
          <span className="text-sm font-bold text-slate-500">{Math.round(((current+1)/questions.length)*100)}%</span>
        </div>

        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-white via-white to-blue-50/70 p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">{typeLabels[question.questionType]||question.questionType}</span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{question.points??1} điểm</span>
              {question.isRequired&&<span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-500">Bắt buộc</span>}
            </div>

            {question.instruction&&<p className="mt-4 text-sm font-semibold text-slate-500">{question.instruction}</p>}
            <h1 className="mt-3 text-xl font-extrabold leading-8 text-slate-900">{question.questionText}</h1>
            <MediaBlock question={question}/>

            {['SINGLE_CHOICE','MULTIPLE_CHOICE','TRUE_FALSE','LISTEN_IDENTIFY_ERROR','AUDIO_COMPARISON','LISTEN_CLASSIFY'].includes(question.questionType)&&<ChoiceBlock question={question} draft={draft} update={update}/>}
            {['FILL_BLANK','SCRIPT_WRITING','ESSAY'].includes(question.questionType)&&<TextBlock question={question} draft={draft} update={update}/>}
            {question.questionType==='ARRANGE_SCRIPT'&&<ArrangeBlock question={question} draft={draft} update={update}/>}
            {['LISTEN_LOCATE_ERROR','ERROR_CORRECTION_LAB'].includes(question.questionType)&&<><ErrorRegionBlock draft={draft} update={update}/>{question.choices.length>0&&<ChoiceBlock question={question} draft={draft} update={update}/>}</>}
            {question.questionType==='SCRIPT_ANNOTATION'&&<AnnotationBlock question={question} draft={draft} update={update}/>}
            {question.questionType==='SCENARIO_DECISION_TREE'&&<ScenarioBlock question={question} draft={draft} update={update}/>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 px-6 py-4 sm:px-8">
            <button type="button" onClick={()=>setFlagged(prev=>{
              const n=new Set(prev);
              n.has(question.questionId)?n.delete(question.questionId):n.add(question.questionId);
              return n;
            })} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${flagged.has(question.questionId)?'bg-amber-100 text-amber-700':'text-slate-500 hover:bg-white'}`}><Flag className="h-4 w-4"/>Đánh dấu xem lại</button>

            <div className="flex gap-2">
              <button disabled={current===0} onClick={()=>setCurrent(x=>Math.max(0,x-1))} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/>Câu trước</button>
              {current<questions.length-1?<button onClick={()=>setCurrent(x=>Math.min(questions.length-1,x+1))} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">Câu tiếp theo<ChevronRight className="h-4 w-4"/></button>:<button onClick={()=>setConfirm(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white"><Send className="h-4 w-4"/>Nộp bài</button>}
            </div>
          </div>
        </article>
      </section>
    </main>

    {confirm&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><ListChecks className="h-6 w-6"/></div>
        <h3 className="mt-4 text-xl font-extrabold text-slate-900">Nộp bài kiểm tra?</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">Bạn đã trả lời <b className="text-slate-800">{answered}/{questions.length}</b> câu. {answered<questions.length&&'Vẫn còn câu chưa trả lời.'}</p>
        <div className="mt-5 flex gap-3">
          <button onClick={()=>setConfirm(false)} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700">Tiếp tục làm</button>
          <button disabled={submitQuiz.isPending} onClick={()=>void doSubmit()} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-50">{submitQuiz.isPending?'Đang nộp...':'Nộp bài'}</button>
        </div>
      </div>
    </div>}
  </div>;
};

export default TakeQuizPage;