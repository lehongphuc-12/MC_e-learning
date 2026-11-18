import { useEffect, useState } from "react";
import { request } from "../../services/api";
import { AIPracticeRecorder } from "../voiceAI/components/AIPracticeRecorder";

type Exercise = { id:number; title:string; exerciseType:string; instructions:string; practiceText?:string|null };
type Lesson = { id:number; skillId:number; skillName?:string; title:string; description:string; difficulty:string; durationMinutes:number; videoUrl?:string|null; documentUrl?:string|null; documentTitle?:string|null; exercises:Exercise[] };
type Recommendation = Lesson & { score:number; isPersonalized:boolean; reason:string; completedAttempts:number };
type Profile = { profile?: { goal:string; experience:string; region?:string; minutesPerDay:number }; hasDiagnostic:boolean };
type AccessInfo = { hasAccess:boolean; activeCount:number; entitlements:Array<{id:number;sourceType:string;sourceCourseId?:number|null;grantedAt:string;expiresAt?:string|null;status:string}>; message:string };

export function VoiceJourneyPage() {
  const [lessons,setLessons]=useState<Lesson[]>([]);
  const [recommendations,setRecommendations]=useState<Recommendation[]>([]);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [access,setAccess]=useState<AccessInfo|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [goal,setGoal]=useState("GENERAL");
  const [experience,setExperience]=useState("BEGINNER");
  const [minutes,setMinutes]=useState(20);
  const [active,setActive]=useState<Lesson|null>(null);
  const [selectedExercise,setSelectedExercise]=useState<Exercise|null>(null);
  const [audioFile,setAudioFile]=useState<File|null>(null);
  const [diagnosticMode,setDiagnosticMode]=useState(false);
  const [result,setResult]=useState<any>(null);

  async function load(){
    setBusy(true); setError("");
    try {
      const [a,p,l,r]=await Promise.all([
        request<AccessInfo>("/voice-coach/access"),
        request<Profile>("/voice-coach/profile"),
        request<Lesson[]>("/voice-coach/lessons"),
        request<Recommendation[]>("/voice-coach/recommendations")
      ]);
      setAccess(a); setProfile(p); setLessons(l); setRecommendations(r);
      if(p.profile){setGoal(p.profile.goal);setExperience(p.profile.experience);setMinutes(p.profile.minutesPerDay);}
    } catch(e){setError(e instanceof Error?e.message:"Không tải được dữ liệu AI Voice Coach.");}
    finally{setBusy(false);}
  }
  useEffect(()=>{void load();},[]);

  async function saveProfile(){
    setBusy(true);setError("");
    try{
      await request("/voice-coach/profile",{method:"PUT",body:JSON.stringify({goal,experience,minutesPerDay:minutes})});
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Không lưu được hồ sơ.");}
    finally{setBusy(false);}
  }
  async function skipDiagnostic(){
    setBusy(true);setError("");
    try{await request("/voice-coach/diagnostics/skip",{method:"POST"});await load();}
    catch(e){setError(e instanceof Error?e.message:"Không thực hiện được.");}
    finally{setBusy(false);}
  }

  async function submitPractice(){
    if(!audioFile){setError("Hãy ghi âm trước khi gửi.");return;}
    setBusy(true);setError("");setResult(null);
    try{
      const form=new FormData();form.append("AudioFile",audioFile);
      if(selectedExercise?.practiceText)form.append("ExpectedText",selectedExercise.practiceText);
      const assessment=await request<any>("/voice-assessment/practices/free",{method:"POST",body:form});
      if(!assessment?.practiceSessionId)throw new Error("Model chưa trả về PracticeSessionId.");
      setResult(assessment);
      if(diagnosticMode){
        await request("/voice-coach/diagnostics",{method:"POST",body:JSON.stringify({practiceSessionId:assessment.practiceSessionId})});
      }else if(selectedExercise){
        await request(`/voice-coach/exercises/${selectedExercise.id}/attempts`,{method:"POST",body:JSON.stringify({practiceSessionId:assessment.practiceSessionId})});
      }
      setAudioFile(null);await load();
    }catch(e){setError(e instanceof Error?e.message:"Không thể gửi bản ghi âm.");}
    finally{setBusy(false);}
  }

  return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
    <header className="rounded-2xl bg-slate-950 p-6 text-white">
      <p className="text-sm font-semibold text-cyan-300">MSEEK · LUYỆN TẬP BỔ TRỢ</p>
      <h1 className="mt-2 text-3xl font-bold">AI Voice Coach</h1>
      <p className="mt-2 max-w-2xl text-slate-300">Thư viện bài luyện do Admin thiết lập. AI phân tích kết quả giọng nói và gợi ý bài phù hợp; bạn luôn được tự chọn, luyện lại hoặc bỏ qua.</p>
    </header>
    {error&&<div role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}
    {access && <section className={`rounded-xl border p-4 ${access.hasAccess ? "border-emerald-200 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">{access.hasAccess ? "Quyền AI Voice Journey đang hoạt động" : "Chưa có quyền luyện giọng AI"}</h2><p className="mt-1 text-sm">{access.message}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${access.hasAccess ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{access.activeCount} quyền còn hiệu lực</span></div>
      {access.entitlements.length>0 && <div className="mt-3 grid gap-2 md:grid-cols-2">{access.entitlements.map(x=><div key={x.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs"><div className="flex justify-between gap-2"><b>{x.sourceType === "MC_GIFT" ? "Tặng kèm khóa MC" : x.sourceType === "AI_PURCHASE" ? "Mua AI riêng" : x.sourceType}</b><span>{x.status === "ACTIVE" ? "Còn hiệu lực" : x.status === "EXPIRED" ? "Hết hạn" : "Đã thu hồi"}</span></div><p className="mt-1 text-slate-500">Hết hạn: {x.expiresAt ? new Date(x.expiresAt).toLocaleDateString("vi-VN") : "Không giới hạn"}</p></div>)}</div>}
    </section>}
    <section className="rounded-xl border bg-white p-5">
      <h2 className="text-xl font-semibold">Hồ sơ luyện giọng</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm">Mục tiêu<select className="mt-1 w-full rounded border p-2" value={goal} onChange={e=>setGoal(e.target.value)}><option value="GENERAL">Luyện giọng tổng quát</option><option value="WEDDING_MC">MC đám cưới</option><option value="EVENT_MC">MC sự kiện</option><option value="NEWS_MC">MC bản tin</option></select></label>
        <label className="text-sm">Kinh nghiệm<select className="mt-1 w-full rounded border p-2" value={experience} onChange={e=>setExperience(e.target.value)}><option value="BEGINNER">Mới bắt đầu</option><option value="INTERMEDIATE">Trung cấp</option><option value="ADVANCED">Nâng cao</option></select></label>
        <label className="text-sm">Thời gian luyện mỗi ngày (phút)<input className="mt-1 w-full rounded border p-2" type="number" min={5} max={180} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} onClick={()=>void saveProfile()} className="rounded-lg bg-blue-700 px-4 py-2 text-white">Lưu hồ sơ</button><button disabled={busy||!access?.hasAccess} onClick={()=>{setDiagnosticMode(true);setActive(null);setSelectedExercise(null);setAudioFile(null);}} className="rounded-lg border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40">Đánh giá đầu vào HYBRID</button><button disabled={busy} onClick={()=>void skipDiagnostic()} className="rounded-lg border px-4 py-2">Bỏ qua đánh giá đầu vào</button></div>
      <p className="mt-2 text-xs text-slate-500">{profile?.hasDiagnostic?"Đã có dữ liệu đánh giá đầu vào. Gợi ý sẽ cập nhật khi có kết quả luyện tập mới.":"Chưa có đánh giá đầu vào. Bạn vẫn có thể xem và tự chọn bài luyện."}</p>
    </section>
    <section>
      <div className="mb-3 flex items-end justify-between"><div><h2 className="text-xl font-semibold">AI đề xuất cho bạn</h2><p className="text-sm text-slate-500">Đề xuất chỉ mang tính tham khảo, không khóa bài.</p></div><button onClick={()=>void load()} disabled={busy} className="rounded-lg border px-3 py-2 text-sm">Làm mới</button></div>
      <div className="grid gap-3 md:grid-cols-2">
        {recommendations.slice(0,3).map(x=><article key={x.id} className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase text-blue-700">{x.skillName??"Kỹ năng luyện giọng"}</span><span className="text-xs text-slate-500">{x.durationMinutes} phút</span></div>
          <h3 className="mt-2 font-semibold">{x.title}</h3><p className="mt-1 text-sm text-slate-600">{x.description}</p>
          <p className="mt-2 text-xs text-slate-500">{x.reason}</p>
          <button disabled={!access?.hasAccess} onClick={()=>setActive(x)} className="mt-3 rounded-lg bg-blue-700 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40">Xem bài luyện</button>
        </article>)}
      </div>
    </section>
    <section>
      <h2 className="mb-3 text-xl font-semibold">Toàn bộ thư viện bài luyện</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {lessons.map(x=><article key={x.id} className="rounded-xl border bg-white p-4"><div className="flex justify-between text-xs text-slate-500"><span>{x.skillName??"Bài luyện"}</span><span>{x.difficulty} · {x.durationMinutes} phút</span></div><h3 className="mt-2 font-semibold">{x.title}</h3><p className="mt-1 text-sm text-slate-600">{x.description}</p><button disabled={!access?.hasAccess} onClick={()=>setActive(x)} className="mt-3 rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">Chọn bài này</button></article>)}
      </div>
      {!lessons.length&&!busy&&<p className="rounded-xl border border-dashed p-6 text-center text-slate-500">Admin chưa xuất bản bài luyện nào.</p>}
    </section>
    {diagnosticMode&&<section className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5"><div className="flex justify-between"><h2 className="font-semibold">Đánh giá đầu vào HYBRID</h2><button onClick={()=>{setDiagnosticMode(false);setAudioFile(null);}}>Đóng</button></div><p className="my-2 text-sm text-slate-600">Ghi âm WAV/FLAC để model giọng nói phân tích; kết quả được lưu và dùng để cá nhân hóa lộ trình.</p><AIPracticeRecorder disabled={busy} onAudio={setAudioFile}/>{audioFile&&<p className="mt-2 text-xs">{audioFile.name}</p>}<button disabled={busy||!audioFile} onClick={()=>void submitPractice()} className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">Gửi đánh giá đầu vào</button></section>}
    {result&&<section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Kết quả đánh giá giọng</h2><p className="mt-2 text-sm">{result.summary||result.overallAssessment}</p><p className="mt-1 text-xs text-slate-500">Phiên #{result.practiceSessionId}</p></section>}
    {active&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6">
      <div className="flex justify-between"><h2 className="text-xl font-bold">{active.title}</h2><button onClick={()=>setActive(null)} aria-label="Đóng">✕</button></div>
      <p className="mt-2 text-sm text-slate-600">{active.description}</p>
      {active.videoUrl&&<video className="mt-4 w-full rounded-lg" controls src={active.videoUrl}/>}
      {active.documentUrl&&<a className="mt-3 inline-block text-sm text-blue-700 underline" href={active.documentUrl} target="_blank" rel="noreferrer">{active.documentTitle||"Mở tài liệu bài học"}</a>}
      <h3 className="mt-5 font-semibold">Bài tập có sẵn</h3>
      <div className="mt-2 space-y-3">{active.exercises?.map(ex=><article key={ex.id} className="rounded-lg border p-3"><h4 className="font-medium">{ex.title}</h4><p className="mt-1 text-sm">{ex.instructions}</p>{ex.practiceText&&<blockquote className="mt-2 rounded bg-slate-50 p-3 text-sm">{ex.practiceText}</blockquote>}<p className="mt-2 text-xs text-slate-500">Loại bài: {ex.exerciseType}</p><button onClick={()=>{setSelectedExercise(ex);setDiagnosticMode(false);setAudioFile(null);}} className="mt-3 rounded-lg bg-blue-700 px-3 py-2 text-sm text-white">Ghi âm bài tập này</button>{selectedExercise?.id===ex.id&&<div className="mt-3 rounded-lg bg-blue-50 p-3"><AIPracticeRecorder disabled={busy} onAudio={setAudioFile}/>{audioFile&&<p className="mt-2 text-xs">{audioFile.name}</p>}<button disabled={busy||!audioFile} onClick={()=>void submitPractice()} className="mt-2 rounded-lg bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50">{busy?"Đang phân tích...":"Gửi model chấm điểm"}</button></div>}</article>)}</div>
      <button onClick={()=>setActive(null)} className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-white">Đóng</button>
    </div></div>}
  </main>;
}
