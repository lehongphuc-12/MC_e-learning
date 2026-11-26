
import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AudioLines,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  FileText,
  Layers3,
  Plus,
  Pencil,
  Save,
  X,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  Video,
  WandSparkles,
} from "lucide-react";

import { request } from "../../services/api";

type Skill = {
  id: number;
  skillCode: string;
  name: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
};

type Lesson = {
  id: number;
  skillId: number;
  title: string;
  description: string;
  difficulty: string;
  durationMinutes: number;
  videoUrl?: string | null;
  documentUrl?: string | null;
  documentTitle?: string | null;
  modelLabel?: string | null;
  modelSignalDirection: string;
  isPublished: boolean;
  displayOrder: number;
};

const difficultyLabels: Record<string, string> = {
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

const inputClass =
  "w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-all duration-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15 hover:border-slate-500";

const labelClass =
  "mb-2 block text-sm font-semibold text-slate-200";

const cardClass =
  "rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10 transition-all duration-300 hover:border-slate-700 sm:p-6";

export default function VoiceCoachAdminPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");

  const [activeSection, setActiveSection] = useState("overview");

  // Skill
  const [skillCode, setSkillCode] = useState("PRONUNCIATION");
  const [skillName, setSkillName] = useState("");
  const [skillDescription, setSkillDescription] = useState("");
  const [editingSkillId, setEditingSkillId] = useState<number | null>(null);

  // Lesson
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [skillId, setSkillId] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("BEGINNER");
  const [minutes, setMinutes] = useState(10);
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentName, setDocumentName] = useState("");

  // Exercise
  const [exerciseLessonId, setExerciseLessonId] = useState(0);
  const [exerciseTitle, setExerciseTitle] = useState("");
  const [exerciseInstructions, setExerciseInstructions] = useState("");
  const [practiceText, setPracticeText] = useState("");
  const [exerciseType, setExerciseType] = useState("READ_ALOUD");

  // Model Mapping
  const [mappingSkillId, setMappingSkillId] = useState(0);
  const [modelLabel, setModelLabel] = useState("");
  const [signalDirection, setSignalDirection] = useState("UNKNOWN");
  const [isCalibrated, setIsCalibrated] = useState(false);

  const showMessage = (
    text: string,
    type: "error" | "success" = "error"
  ) => {
    setMessage(text);
    setMessageType(type);
  };

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [skillData, lessonData] = await Promise.all([
        request<Skill[]>("/admin/voice-coach/skills"),
        request<Lesson[]>("/admin/voice-coach/lessons"),
      ]);

      setSkills(skillData || []);
      setLessons(lessonData || []);

      if (skillData?.length) {
        setSkillId((current) => current || skillData[0].id);
        setMappingSkillId((current) => current || skillData[0].id);
      }

      if (lessonData?.length) {
        setExerciseLessonId(
          (current) => current || lessonData[0].id
        );
      }
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải dữ liệu AI Voice Journey."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // =========================
  // CREATE / UPDATE SKILL
  // =========================

  function startEditSkill(skill: Skill) {
    setEditingSkillId(skill.id);
    setSkillCode(skill.skillCode);
    setSkillName(skill.name);
    setSkillDescription(skill.description || "");
    setMessage("");
    document.getElementById("section-skills")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function cancelEditSkill() {
    setEditingSkillId(null);
    setSkillCode("PRONUNCIATION");
    setSkillName("");
    setSkillDescription("");
  }

  async function saveSkill() {
    if (!skillCode.trim() || !skillName.trim()) {
      showMessage("Vui lòng nhập mã và tên kỹ năng.");
      return;
    }

    setSaving(true);
    const editingSkill = skills.find((item) => item.id === editingSkillId);

    try {
      const payload = {
        skillCode: skillCode.trim(),
        name: skillName.trim(),
        description: skillDescription.trim() || null,
        displayOrder:
          editingSkill?.displayOrder ??
          (editingSkillId === null ? skills.length : Math.max(0, skills.findIndex((item) => item.id === editingSkillId))),
        isActive: editingSkill?.isActive ?? true,
      };

      if (editingSkillId !== null) {
        await request(`/admin/voice-coach/skills/${editingSkillId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showMessage("Đã cập nhật kỹ năng thành công.", "success");
      } else {
        await request("/admin/voice-coach/skills", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showMessage("Đã tạo kỹ năng thành công.", "success");
      }

      cancelEditSkill();
      await load();
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : editingSkillId !== null
            ? "Không thể cập nhật kỹ năng."
            : "Không thể tạo kỹ năng."
      );
    } finally {
      setSaving(false);
    }
  }

  // Chỉ xóa cứng khi kỹ năng chưa được bài học hoặc Model Mapping sử dụng.
  // Backend sẽ trả HTTP 409 nếu kỹ năng đang được tham chiếu.
  async function deleteSkill(skill: Skill) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa kỹ năng "${skill.name}" (${skill.skillCode}) không?\n\n` +
        "Chỉ xóa được khi kỹ năng chưa được bài học hoặc Model Mapping sử dụng. Nếu đang được sử dụng, hãy chỉnh sửa hoặc ngừng kích hoạt thay vì xóa."
    );

    if (!confirmed) return;

    setSaving(true);
    try {
      await request(`/admin/voice-coach/skills/${skill.id}`, {
        method: "DELETE",
      });

      const remainingSkills = skills.filter((item) => item.id !== skill.id);
      if (skillId === skill.id) setSkillId(remainingSkills[0]?.id ?? 0);
      if (mappingSkillId === skill.id)
        setMappingSkillId(remainingSkills[0]?.id ?? 0);
      if (editingSkillId === skill.id) cancelEditSkill();

      showMessage("Đã xóa kỹ năng thành công.", "success");
      await load();
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể xóa kỹ năng. Nếu kỹ năng đang được sử dụng, hãy ngừng kích hoạt thay vì xóa."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // CREATE / UPDATE / DELETE LESSON
  // =========================

  async function uploadLessonAsset(
    file: File,
    endpoint: "/admin/voice-coach/videos" | "/admin/voice-coach/documents",
    expectedField: "videoUrl" | "documentUrl"
  ): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const result = await request<Record<string, any>>(endpoint, {
      method: "POST",
      body: formData,
    });

    const url = result?.[expectedField];
    if (typeof url !== "string" || !url.trim()) {
      throw new Error("Server upload thành công nhưng không trả về URL tệp.");
    }
    return url;
  }

  function resetLessonForm() {
    setEditingLessonId(null);
    setSkillId(skills[0]?.id ?? 0);
    setTitle("");
    setDescription("");
    setDifficulty("BEGINNER");
    setMinutes(10);
    setVideoUrl("");
    setSelectedVideoFile(null);
    setDocumentUrl("");
    setSelectedDocumentFile(null);
    setDocumentName("");
  }

  function startEditLesson(lesson: Lesson) {
    setActiveSection("lessons");
    setEditingLessonId(lesson.id);
    setSkillId(lesson.skillId);
    setTitle(lesson.title);
    setDescription(lesson.description || "");
    setDifficulty(lesson.difficulty || "BEGINNER");
    setMinutes(lesson.durationMinutes || 10);
    setVideoUrl(lesson.videoUrl || "");
    setSelectedVideoFile(null);
    setDocumentUrl(lesson.documentUrl || "");
    setSelectedDocumentFile(null);
    setDocumentName(lesson.documentTitle || "");
    setMessage("");
    document.getElementById("section-lessons")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function addLesson() {
    if (!skillId || !title.trim()) {
      showMessage("Vui lòng chọn kỹ năng và nhập tên bài học.");
      return;
    }

    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) {
      showMessage("Thời lượng bài học phải từ 1 đến 240 phút.");
      return;
    }

    if (selectedVideoFile) {
      const ext = selectedVideoFile.name.split(".").pop()?.toLowerCase();
      if (!ext || !["mp4", "webm"].includes(ext)) {
        showMessage("Video chỉ hỗ trợ định dạng MP4 hoặc WEBM.");
        return;
      }
      if (selectedVideoFile.size > 500 * 1024 * 1024) {
        showMessage("Video không được vượt quá 500 MB.");
        return;
      }
    }

    if (selectedDocumentFile) {
      const ext = selectedDocumentFile.name.split(".").pop()?.toLowerCase();
      if (!ext || !["pdf", "docx"].includes(ext)) {
        showMessage("Tài liệu chỉ hỗ trợ định dạng PDF hoặc DOCX.");
        return;
      }
      if (selectedDocumentFile.size > 50 * 1024 * 1024) {
        showMessage("Tài liệu không được vượt quá 50 MB.");
        return;
      }
    }

    const editingLesson = lessons.find((item) => item.id === editingLessonId);
    setSaving(true);
    setMessage("");

    try {
      // Khi sửa, chỉ upload lại file nếu Admin chọn file mới; nếu không giữ URL cũ.
      const finalVideoUrl = selectedVideoFile
        ? await uploadLessonAsset(selectedVideoFile, "/admin/voice-coach/videos", "videoUrl")
        : videoUrl.trim() || null;

      const finalDocumentUrl = selectedDocumentFile
        ? await uploadLessonAsset(selectedDocumentFile, "/admin/voice-coach/documents", "documentUrl")
        : documentUrl.trim() || null;

      const payload = {
        skillId,
        title: title.trim(),
        description: description.trim(),
        difficulty,
        durationMinutes: minutes,
        videoUrl: finalVideoUrl,
        documentUrl: finalDocumentUrl,
        documentTitle: selectedDocumentFile?.name || documentName.trim() || null,
        modelLabel: editingLesson?.modelLabel ?? null,
        modelSignalDirection: editingLesson?.modelSignalDirection ?? "UNKNOWN",
        isPublished: editingLesson?.isPublished ?? false,
        displayOrder: editingLesson?.displayOrder ?? lessons.length,
      };

      if (editingLessonId !== null) {
        await request(`/admin/voice-coach/lessons/${editingLessonId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showMessage("Đã cập nhật bài học thành công.", "success");
      } else {
        await request("/admin/voice-coach/lessons", {
          method: "POST",
          body: JSON.stringify({ ...payload, isPublished: false, displayOrder: lessons.length }),
        });
        showMessage("Đã tải tệp và tạo bài học nháp thành công.", "success");
      }

      resetLessonForm();
      await load();
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : editingLessonId !== null
            ? "Không thể cập nhật bài học."
            : "Không thể tải tệp hoặc tạo bài học."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteLesson(lesson: Lesson) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa bài học "${lesson.title}" không?\n\n` +
      "Nếu bài học đã có lịch sử luyện tập, hệ thống sẽ từ chối xóa để bảo toàn dữ liệu. Hãy gỡ xuất bản bài học thay thế."
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await request(`/admin/voice-coach/lessons/${lesson.id}`, { method: "DELETE" });
      if (editingLessonId === lesson.id) resetLessonForm();
      showMessage("Đã xóa bài học thành công.", "success");
      await load();
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể xóa bài học. Nếu đã có lịch sử luyện tập, hãy gỡ xuất bản thay vì xóa."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // CREATE EXERCISE
  // =========================

  async function addExercise() {
    if (
      !exerciseLessonId ||
      !exerciseTitle.trim() ||
      !exerciseInstructions.trim()
    ) {
      showMessage("Vui lòng nhập đầy đủ thông tin bài tập.");
      return;
    }

    setSaving(true);

    try {
      await request("/admin/voice-coach/exercises", {
        method: "POST",
        body: JSON.stringify({
          lessonId: exerciseLessonId,
          title: exerciseTitle.trim(),
          exerciseType,
          instructions: exerciseInstructions.trim(),
          practiceText: practiceText.trim() || null,
          displayOrder: 0,
          isActive: true,
        }),
      });

      setExerciseTitle("");
      setExerciseInstructions("");
      setPracticeText("");

      showMessage("Đã thêm bài tập thành công.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Không thể thêm bài tập."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // MODEL MAPPING
  // =========================

  async function addMapping() {
    if (!mappingSkillId || !modelLabel.trim()) {
      showMessage("Vui lòng chọn kỹ năng và nhập nhãn model.");
      return;
    }

    setSaving(true);

    try {
      await request("/admin/voice-coach/model-mappings", {
        method: "POST",
        body: JSON.stringify({
          skillId: mappingSkillId,
          modelLabel: modelLabel.trim(),
          signalDirection,
          isCalibrated,
          isActive: true,
        }),
      });

      setModelLabel("");
      setSignalDirection("UNKNOWN");
      setIsCalibrated(false);

      showMessage("Đã lưu Model Mapping.", "success");
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể lưu Model Mapping."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // PUBLISH / UNPUBLISH
  // =========================

  async function togglePublish(lesson: Lesson) {
    setSaving(true);

    try {
      await request(`/admin/voice-coach/lessons/${lesson.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...lesson,
          isPublished: !lesson.isPublished,
        }),
      });

      showMessage(
        lesson.isPublished
          ? "Đã gỡ xuất bản bài học."
          : "Đã xuất bản bài học.",
        "success"
      );

      await load();
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái bài học."
      );
    } finally {
      setSaving(false);
    }
  }

  const publishedCount = lessons.filter(
    (lesson) => lesson.isPublished
  ).length;

  const draftCount = lessons.length - publishedCount;

  const sections = [
    { id: "overview", label: "Tổng quan", icon: Activity },
    { id: "skills", label: "Kỹ năng", icon: Target },
    { id: "lessons", label: "Bài học", icon: BookOpen },
    { id: "exercises", label: "Bài tập", icon: AudioLines },
    { id: "mapping", label: "Model Mapping", icon: Layers3 },
  ];

  function goToSection(id: string) {
    setActiveSection(id);

    document.getElementById(`section-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="voice-admin min-h-screen space-y-8 pb-12 text-slate-100">

      <style>{`
        .voice-admin {
          color-scheme: dark;
          background: transparent;
        }

        .voice-admin * {
          box-sizing: border-box;
        }

        .voice-admin .animate-enter {
          animation: voiceEnter .65s cubic-bezier(.2,.7,.2,1) both;
        }

        .voice-admin .delay-1 { animation-delay: .08s; }
        .voice-admin .delay-2 { animation-delay: .16s; }
        .voice-admin .delay-3 { animation-delay: .24s; }
        .voice-admin .delay-4 { animation-delay: .32s; }

        @keyframes voiceEnter {
          from {
            opacity: 0;
            transform: translateY(22px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }


        .voice-admin .glass-card {
          background: linear-gradient(
            145deg,
            rgba(30,41,59,.95),
            rgba(15,23,42,.95)
          );
          border: 1px solid rgba(148,163,184,.13);
          transition: border-color .25s, transform .25s, box-shadow .25s;
        }

        .voice-admin .glass-card:hover {
          border-color: rgba(34,211,238,.3);
          box-shadow: 0 15px 40px rgba(0,0,0,.18);
        }

        .voice-admin .section-title {
          color: #f8fafc;
          font-size: 19px;
          font-weight: 750;
          letter-spacing: -.025em;
        }

        .voice-admin .primary-btn {
          background: linear-gradient(110deg,#2563eb,#4f46e5);
          color: white;
          transition: all .25s;
        }

        .voice-admin .primary-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(59,130,246,.28);
        }

        .voice-admin .primary-btn:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .voice-admin .nav-chip {
          transition: all .2s ease;
        }

        .voice-admin .nav-chip:hover {
          transform: translateY(-2px);
        }

        .voice-admin .stat-card {
          position: relative;
          overflow: hidden;
        }

        .voice-admin .stat-card::after {
          content: "";
          position: absolute;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: currentColor;
          opacity: .05;
          right: -30px;
          top: -35px;
          filter: blur(5px);
        }

        .voice-admin input,
        .voice-admin textarea,
        .voice-admin select {
          color: #f8fafc;
          color-scheme: dark;
        }

        .voice-admin input::placeholder,
        .voice-admin textarea::placeholder {
          color: #64748b;
          opacity: 1;
        }

        .voice-admin select option {
          background: #0f172a;
          color: white;
        }

        .voice-admin .scroll-offset {
          scroll-margin-top: 25px;
        }

        @media (prefers-reduced-motion: reduce) {
          .voice-admin *,
          .voice-admin *::before,
          .voice-admin *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      {/* NAVIGATION */}
      <nav className="sticky top-2 z-20 flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-950/90 p-2 shadow-xl backdrop-blur-xl">
        {sections.map((section) => {
          const Icon = section.icon;
          const active = activeSection === section.id;

          return (
            <button
              key={section.id}
              onClick={() => goToSection(section.id)}
              className={`nav-chip flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
                active
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={17} />
              <span>{section.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => void load()}
          disabled={loading}
          className="ml-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          <span className="hidden sm:inline">Làm mới</span>
        </button>
      </nav>

      {/* ERROR / SUCCESS */}
      {message && (
        <div
          role="alert"
          className={`animate-enter flex items-start gap-3 rounded-2xl border p-4 ${
            messageType === "error"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {messageType === "error" ? (
            <CircleAlert size={20} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
          )}

          <div className="flex-1 text-sm leading-6">{message}</div>

          <button
            onClick={() => setMessage("")}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Đóng
          </button>
        </div>
      )}

      {/* STATISTICS */}
      <section
        id="section-overview"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 scroll-offset"
      >
        {[
          {
            label: "Kỹ năng",
            value: skills.length,
            detail: "Tiêu chí luyện giọng",
            icon: Target,
            color: "text-cyan-400",
            bg: "bg-cyan-400/10",
          },
          {
            label: "Bài học",
            value: lessons.length,
            detail: `${publishedCount} đã xuất bản · ${draftCount} bản nháp`,
            icon: BookOpen,
            color: "text-blue-400",
            bg: "bg-blue-400/10",
          },
          {
            label: "Bài tập",
            value: "—",
            detail: "Được quản lý theo bài học",
            icon: AudioLines,
            color: "text-violet-400",
            bg: "bg-violet-400/10",
          },
          {
            label: "Model Mapping",
            value: "—",
            detail: "Ánh xạ và hiệu chuẩn model",
            icon: Layers3,
            color: "text-emerald-400",
            bg: "bg-emerald-400/10",
          },
        ].map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className={`stat-card glass-card animate-enter delay-${index + 1} rounded-2xl p-5 ${item.color}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">
                    {item.label}
                  </p>

                  <p className="mt-2 text-3xl font-black text-white">
                    {loading ? "..." : item.value}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {item.detail}
                  </p>
                </div>

                <div className={`rounded-xl p-3 ${item.bg}`}>
                  <Icon size={23} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* SKILL MANAGEMENT */}
      <section
        id="section-skills"
        className={`${cardClass} scroll-offset animate-enter`}
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
              <Target size={23} />
            </div>

            <div>
              <h2 className="section-title">01. Quản lý kỹ năng</h2>
              <p className="mt-1 text-sm text-slate-400">
                Thiết lập các tiêu chí cần cải thiện trong giọng nói.
              </p>
            </div>
          </div>

          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-300">
            {skills.length} kỹ năng
          </span>
        </div>

        {editingSkillId !== null && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
            <Pencil size={16} />
            Đang chỉnh sửa kỹ năng #{editingSkillId}. Thay đổi sẽ được lưu vào kỹ năng hiện tại.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Mã kỹ năng *</label>
            <input
              className={inputClass}
              value={skillCode}
              onChange={(e) => setSkillCode(e.target.value)}
              placeholder="VD: PRONUNCIATION"
            />
          </div>

          <div>
            <label className={labelClass}>Tên kỹ năng *</label>
            <input
              className={inputClass}
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="VD: Phát âm"
            />
          </div>

          <div>
            <label className={labelClass}>Mô tả</label>
            <input
              className={inputClass}
              value={skillDescription}
              onChange={(e) => setSkillDescription(e.target.value)}
              placeholder="Mô tả tiêu chí luyện giọng"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving || !skillCode.trim() || !skillName.trim()}
            onClick={() => void saveSkill()}
            className="primary-btn inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editingSkillId !== null ? <Save size={17} /> : <Plus size={17} />}
            {editingSkillId !== null ? "Lưu thay đổi" : "Thêm kỹ năng"}
          </button>
          {editingSkillId !== null && (
            <button
              type="button"
              disabled={saving}
              onClick={cancelEditSkill}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
            >
              <X size={17} />
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <div className="mt-7 border-t border-slate-800 pt-5">
          <h3 className="mb-4 text-sm font-bold text-slate-300">
            Danh sách kỹ năng hiện có
          </h3>

          {loading ? (
            <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
          ) : skills.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
              <Target className="mx-auto mb-3 text-slate-600" size={30} />
              <p className="text-sm text-slate-400">
                Chưa có kỹ năng nào. Hãy tạo kỹ năng đầu tiên.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {skills.map((skill) => (
                <article
                  key={skill.id}
                  className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4 transition hover:border-cyan-500/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-lg bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-300">
                      {skill.skillCode}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        #{skill.id}
                      </span>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => startEditSkill(skill)}
                        title={`Chỉnh sửa kỹ năng ${skill.name}`}
                        aria-label={`Chỉnh sửa kỹ năng ${skill.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-500/20 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void deleteSkill(skill)}
                        title={`Xóa kỹ năng ${skill.name}`}
                        aria-label={`Xóa kỹ năng ${skill.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 transition hover:border-rose-400/50 hover:bg-rose-500/20 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <h4 className="mt-3 font-bold text-white">
                    {skill.name}
                  </h4>

                  <p className="mt-1 text-sm text-slate-400">
                    {skill.description || "Chưa có mô tả"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* LESSON MANAGEMENT */}
      <section
        id="section-lessons"
        className={`${cardClass} scroll-offset animate-enter delay-1`}
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
            <BookOpen size={23} />
          </div>

          <div>
            <h2 className="section-title">02. Quản lý bài học chuẩn</h2>
            <p className="mt-1 text-sm text-slate-400">
              Xây dựng thư viện video và tài liệu luyện giọng chuẩn.
            </p>
          </div>
        </div>

        {!skills.length && (
          <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
            Hãy tạo ít nhất một kỹ năng trước khi tạo bài học.
          </div>
        )}

        {editingLessonId !== null && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-200">
            <span>Đang chỉnh sửa bài học #{editingLessonId}. File hiện tại được giữ nguyên nếu không chọn file thay thế.</span>
            <button type="button" onClick={resetLessonForm} className="ml-3 text-cyan-100 underline">Hủy</button>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label className={labelClass}>Kỹ năng áp dụng *</label>
            <select
              className={inputClass}
              value={skillId}
              onChange={(e) => setSkillId(Number(e.target.value))}
            >
              <option value={0}>Chọn kỹ năng</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Tên bài học *</label>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Kỹ thuật phát âm rõ chữ"
            />
          </div>

          <div>
            <label className={labelClass}>Mô tả bài học</label>
            <textarea
              className={inputClass}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mục tiêu và nội dung bài học..."
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelClass}>Độ khó</label>
              <select
                className={inputClass}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="BEGINNER">Cơ bản</option>
                <option value="INTERMEDIATE">Trung cấp</option>
                <option value="ADVANCED">Nâng cao</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Thời lượng (phút)</label>
              <input
                type="number"
                min={1}
                max={240}
                className={inputClass}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              <Video size={15} className="mr-2 inline text-blue-400" />
              Video bài học chuẩn (MP4 / WEBM, tối đa 500 MB)
            </label>
            <input
              type="file"
              accept=".mp4,.webm,video/mp4,video/webm"
              className={`${inputClass} file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white`}
              onChange={(e) => setSelectedVideoFile(e.target.files?.[0] ?? null)}
              disabled={saving}
            />
            {selectedVideoFile && (
              <p className="mt-2 text-xs text-slate-400">
                Đã chọn: {selectedVideoFile.name} · {(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            )}
            {videoUrl && !selectedVideoFile && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-slate-400">Video hiện tại (chọn file mới nếu muốn thay thế):</p>
                <video className="max-h-56 w-full rounded-lg bg-black" src={videoUrl} controls preload="metadata" />
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>
              <FileText size={15} className="mr-2 inline text-violet-400" />
              Tài liệu bài học (PDF / DOCX, tối đa 50 MB)
            </label>
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className={`${inputClass} file:mr-4 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white`}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setSelectedDocumentFile(file);
                setDocumentName(file?.name ?? "");
              }}
              disabled={saving}
            />
            {selectedDocumentFile && (
              <p className="mt-2 text-xs text-slate-400">
                Đã chọn: {selectedDocumentFile.name} · {(selectedDocumentFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            )}
            {documentUrl && !selectedDocumentFile && (
              <a className="mt-2 inline-block break-all text-xs text-violet-300 underline" href={documentUrl} target="_blank" rel="noreferrer">
                Mở tài liệu hiện tại (chọn file mới nếu muốn thay thế)
              </a>
            )}
          </div>

          <div>
            <label className={labelClass}>Tên tài liệu</label>
            <input
              className={inputClass}
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Tên tài liệu sẽ tự lấy theo tên file đã chọn"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={
              saving ||
              !skills.length ||
              !skillId ||
              !title.trim() ||
              !Number.isInteger(minutes) ||
              minutes < 1 ||
              minutes > 240
            }
            onClick={() => void addLesson()}
            className="primary-btn inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold"
          >
            {editingLessonId !== null ? <Save size={17} /> : <Plus size={17} />}
            {saving
              ? "Đang lưu bài học..."
              : editingLessonId !== null
                ? "Lưu thay đổi"
                : "Tải tệp và tạo bài học nháp"}
          </button>

          {editingLessonId !== null ? (
            <button
              type="button"
              disabled={saving}
              onClick={resetLessonForm}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-300 hover:border-slate-400 disabled:opacity-50"
            >
              <X size={16} /> Hủy chỉnh sửa
            </button>
          ) : (
            <span className="text-xs text-slate-500">
              Bài học mới sẽ chưa được xuất bản.
            </span>
          )}
        </div>

        {/* LESSON LIST */}
        <div className="mt-8 border-t border-slate-800 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-200">
              Thư viện bài học
            </h3>

            <span className="text-xs text-slate-500">
              {lessons.length} bài học
            </span>
          </div>

          {lessons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
              Chưa có bài học nào.
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson) => (
                <article
                  key={lesson.id}
                  className="group flex flex-col justify-between gap-4 rounded-xl border border-slate-700/70 bg-slate-950/50 p-4 transition-all hover:border-blue-500/40 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                      <BookOpen size={21} />
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-white">
                        {lesson.title}
                      </h4>

                      <p className="mt-1 text-xs text-slate-400">
                        {skills.find((s) => s.id === lesson.skillId)?.name || "Chưa xác định kỹ năng"}
                        {" · "}
                        {difficultyLabels[lesson.difficulty] || lesson.difficulty}
                        {" · "}
                        {lesson.durationMinutes} phút
                      </p>

                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                        {lesson.description || "Chưa có mô tả"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {lesson.videoUrl && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2 py-1 text-xs text-blue-300">
                            <Video size={12} />
                            Video
                          </span>
                        )}

                        {lesson.documentUrl && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-violet-500/10 px-2 py-1 text-xs text-violet-300">
                            <FileText size={12} />
                            Tài liệu
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        lesson.isPublished
                          ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : "border border-amber-500/20 bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {lesson.isPublished
                        ? "Đã xuất bản"
                        : "Bản nháp"}
                    </span>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => startEditLesson(lesson)}
                      className="inline-flex items-center gap-1 rounded-xl border border-blue-500/40 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/10 disabled:opacity-50"
                    >
                      <Pencil size={13} /> Sửa
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void deleteLesson(lesson)}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-500/40 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      <Trash2 size={13} /> Xóa
                    </button>

                    <button
                      disabled={saving}
                      onClick={() => void togglePublish(lesson)}
                      className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                    >
                      {lesson.isPublished
                        ? "Gỡ xuất bản"
                        : "Xuất bản"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* EXERCISE MANAGEMENT */}
      <section
        id="section-exercises"
        className={`${cardClass} scroll-offset animate-enter delay-2`}
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/10 p-3 text-violet-400">
            <AudioLines size={23} />
          </div>

          <div>
            <h2 className="section-title">03. Quản lý bài tập</h2>
            <p className="mt-1 text-sm text-slate-400">
              Thêm nhiều dạng bài luyện cho từng bài học chuẩn.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label className={labelClass}>Bài học áp dụng *</label>
            <select
              className={inputClass}
              value={exerciseLessonId}
              onChange={(e) =>
                setExerciseLessonId(Number(e.target.value))
              }
            >
              <option value={0}>Chọn bài học</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Tên bài tập *</label>
            <input
              className={inputClass}
              value={exerciseTitle}
              onChange={(e) => setExerciseTitle(e.target.value)}
              placeholder="VD: Đọc đoạn văn kiểm tra phát âm"
            />
          </div>

          <div>
            <label className={labelClass}>Dạng bài tập</label>
            <select
              className={inputClass}
              value={exerciseType}
              onChange={(e) => setExerciseType(e.target.value)}
            >
              <option value="READ_ALOUD">Đọc thành tiếng</option>
              <option value="PRONUNCIATION">Luyện phát âm</option>
              <option value="INTONATION">Luyện ngữ điệu</option>
              <option value="VOICE_CONTROL">Kiểm soát giọng</option>
              <option value="FREE_SPEAKING">Nói tự do</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Hướng dẫn thực hiện *</label>
            <textarea
              className={inputClass}
              rows={3}
              value={exerciseInstructions}
              onChange={(e) =>
                setExerciseInstructions(e.target.value)
              }
              placeholder="Mô tả cách thực hiện bài tập..."
            />
          </div>

          <div className="lg:col-span-2">
            <label className={labelClass}>
              Văn bản luyện đọc (nếu có)
            </label>
            <textarea
              className={inputClass}
              rows={4}
              value={practiceText}
              onChange={(e) => setPracticeText(e.target.value)}
              placeholder="Nhập nội dung cần đọc..."
            />
          </div>
        </div>

        <button
          disabled={
            saving ||
            !exerciseLessonId ||
            !exerciseTitle.trim() ||
            !exerciseInstructions.trim()
          }
          onClick={() => void addExercise()}
          className="primary-btn mt-5 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold"
        >
          <Plus size={17} />
          Thêm bài tập
        </button>
      </section>

      {/* MODEL MAPPING */}
      <section
        id="section-mapping"
        className={`${cardClass} scroll-offset animate-enter delay-3`}
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
            <WandSparkles size={23} />
          </div>

          <div>
            <h2 className="section-title">04. Model Mapping & Hiệu chuẩn</h2>
            <p className="mt-1 text-sm text-slate-400">
              Liên kết nhãn đánh giá của model với tiêu chí luyện giọng.
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <CircleAlert
              size={20}
              className="mt-0.5 shrink-0 text-amber-400"
            />

            <p className="text-sm leading-6 text-amber-200">
              Chỉ đánh dấu đã hiệu chuẩn sau khi nhóm phát triển
              xác minh nhãn model và chiều tín hiệu bằng dữ liệu
              đánh giá chuẩn. Giao diện không tự tính độ chính xác.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div>
            <label className={labelClass}>Kỹ năng liên kết *</label>
            <select
              className={inputClass}
              value={mappingSkillId}
              onChange={(e) =>
                setMappingSkillId(Number(e.target.value))
              }
            >
              <option value={0}>Chọn kỹ năng</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Nhãn chính xác từ model *
            </label>
            <input
              className={inputClass}
              value={modelLabel}
              onChange={(e) => setModelLabel(e.target.value)}
              placeholder="VD: pronunciation_error"
            />
          </div>

          <div>
            <label className={labelClass}>Chiều tín hiệu</label>
            <select
              className={inputClass}
              value={signalDirection}
              onChange={(e) =>
                setSignalDirection(e.target.value)
              }
            >
              <option value="UNKNOWN">Chưa xác định</option>
              <option value="HIGHER_IS_WORSE">
                Giá trị cao = lỗi nhiều
              </option>
              <option value="LOWER_IS_WORSE">
                Giá trị thấp = lỗi nhiều
              </option>
            </select>
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4 transition hover:border-emerald-500/30">
          <input
            type="checkbox"
            checked={isCalibrated}
            onChange={(e) => setIsCalibrated(e.target.checked)}
            className="h-4 w-4 accent-emerald-500"
          />

          <span>
            <span className="block text-sm font-semibold text-slate-200">
              Đã hiệu chuẩn
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              Đã xác minh thủ công với dữ liệu đánh giá chuẩn.
            </span>
          </span>
        </label>

        <button
          disabled={
            saving ||
            !mappingSkillId ||
            !modelLabel.trim() ||
            (isCalibrated && signalDirection === "UNKNOWN")
          }
          onClick={() => void addMapping()}
          className="primary-btn mt-5 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold"
        >
          <Plus size={17} />
          Lưu Model Mapping
        </button>
      </section>

      {/* FOOTER */}
      <footer className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-400">
              <Sparkles size={20} />
            </div>

            <div>
              <p className="text-sm font-bold text-white">
                MSEEK AI Voice Journey
              </p>
              <p className="text-xs text-slate-500">
                Hệ thống quản lý chương trình luyện giọng AI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 size={15} className="text-emerald-400" />
            Quản lý độc lập với khóa học MC
          </div>
        </div>
      </footer>
    </div>
  );
}
