import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  BookOpen,
  Video,
  FileText,
  RotateCcw,
  MessageSquare,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { mentorChatApi, MentorSourceCitation } from '../api/mentorChatApi';

export interface CourseChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  courseId?: number | string;
  courseTitle?: string;
  activeLesson?: {
    lessonId: number;
    title: string;
    lessonType?: string;
  } | null;
  onSelectLesson?: (lessonId: number) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: MentorSourceCitation[];
}

function deduplicateSources(sources: MentorSourceCitation[]): MentorSourceCitation[] {
  const seen = new Set<string>();
  const unique: MentorSourceCitation[] = [];
  for (const s of sources) {
    const key = `${s.source_type}:${s.lesson_id || s.title}:${s.page_number || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }
  return unique;
}

const SUGGESTIONS = [
  'Tóm tắt các ý chính của bài này',
  'Kỹ thuật lấy hơi và kiểm soát cột hơi',
  'Cách xử lý khi quên kịch bản dẫn'
];

/**
 * Text renderer: clean typography matching course page tone
 */
const CleanMessageBody: React.FC<{ text: string }> = ({ text }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (snippet: string, idx: number) => {
    navigator.clipboard.writeText(snippet);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const codeRegex = /```([\s\S]*?)```/g;
  const blocks: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let counter = 0;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push(
        <RenderParagraphs key={`p-${lastIndex}`} rawText={text.substring(lastIndex, match.index)} />
      );
    }
    const snippet = match[1].trim();
    const curr = counter;
    blocks.push(
      <div key={`code-${curr}`} className="my-2 rounded-lg border border-violet-100 bg-violet-50/40 text-slate-800 text-xs">
        <div className="flex items-center justify-between px-2.5 py-1 border-b border-violet-100 bg-white text-[11px] text-slate-500 font-mono">
          <span>Kịch bản mẫu</span>
          <button
            type="button"
            onClick={() => handleCopyCode(snippet, curr)}
            className="hover:text-violet-700 cursor-pointer font-sans"
          >
            {copiedIndex === curr ? 'Đã sao chép' : 'Sao chép'}
          </button>
        </div>
        <pre className="p-2.5 overflow-x-auto whitespace-pre font-mono leading-relaxed text-[11px] text-slate-800">
          {snippet}
        </pre>
      </div>
    );
    counter++;
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    blocks.push(
      <RenderParagraphs key={`p-${lastIndex}`} rawText={text.substring(lastIndex)} />
    );
  }

  return <div className="space-y-1.5">{blocks}</div>;
};

const RenderParagraphs: React.FC<{ rawText: string }> = ({ rawText }) => {
  const lines = rawText.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-800">
              <span className="text-violet-600 font-semibold shrink-0 font-mono">{numMatch[1]}.</span>
              <span className="flex-1">{parseInline(numMatch[2])}</span>
            </div>
          );
        }

        // Bullet list
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-800 pl-1">
              <span className="text-violet-400 shrink-0 select-none">•</span>
              <span className="flex-1">{parseInline(trimmed.substring(2))}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-xs leading-relaxed text-slate-800">
            {parseInline(line)}
          </p>
        );
      })}
    </div>
  );
};

function parseInline(content: string): React.ReactNode {
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = content.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded bg-violet-50 px-1 py-0.5 text-[11px] font-mono text-violet-700 border border-violet-100"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export const CourseChatDrawer: React.FC<CourseChatDrawerProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  activeLesson,
  onSelectLesson
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Xin chào, mình có thể giải đáp các thắc mắc về nội dung giáo trình và video bài giảng của khóa **${courseTitle || 'này'}**. Bạn cần tra cứu nội dung nào?`,
      timestamp: 'Vừa xong'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchInCurrentLessonOnly, setSearchInCurrentLessonOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const toggleExpandSource = (key: string) => {
    setExpandedSources((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, messages]);

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSendMessage = async (overrideText?: string) => {
    const text = (overrideText || inputValue).trim();
    if (!text || isTyping) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    const assistantId = `a-${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      sources: []
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInputValue('');
    setIsTyping(true);

    const cId = Number(courseId);
    const targetLessonId = searchInCurrentLessonOnly && activeLesson?.lessonId ? activeLesson.lessonId : undefined;

    try {
      // 1. Thử gọi SSE Streaming để học viên thấy chữ chạy mượt mà ngay lập tức
      await mentorChatApi.askMentorStream(cId, text, targetLessonId, 4, {
        onSources: (incomingSources) => {
          const unique = deduplicateSources(incomingSources);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, sources: unique } : m))
          );
        },
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
          );
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      m.content ||
                      (err.message.includes('503')
                        ? 'Hệ thống AI Mentor hiện đang chuẩn bị dữ liệu bài giảng. Bạn vui lòng thử lại sau ít phút nhé.'
                        : err.message || 'Đã có lỗi xảy ra khi trao đổi với AI Mentor.'),
                  }
                : m
            )
          );
        }
      });
    } catch (streamErr: any) {
      console.warn('Lỗi khi streaming, tự động chuyển về REST thông thường:', streamErr);
      try {
        const res = await mentorChatApi.askMentor(cId, text, targetLessonId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: res.answer,
                  sources: deduplicateSources(res.sources || [])
                }
              : m
          )
        );
      } catch (fallbackErr: any) {
        console.error('Lỗi khi kết nối AI Mentor:', fallbackErr);
        const fallbackText = fallbackErr?.message?.includes('503')
          ? 'Hệ thống AI Mentor hiện đang chuẩn bị dữ liệu bài giảng. Bạn vui lòng thử lại sau ít phút nhé.'
          : (fallbackErr?.message || 'Đã có lỗi xảy ra khi trao đổi với AI Mentor. Vui lòng thử lại.');
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: fallbackText } : m))
        );
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: `Đã làm mới cuộc trò chuyện. Bạn cần tra cứu nội dung gì trong bài **"${activeLesson?.title || 'này'}"**?`,
        timestamp: 'Vừa xong'
      }
    ]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Universal Backdrop: Clicking anywhere outside closes the drawer (both desktop and mobile) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-xs cursor-pointer"
            aria-label="Đóng cửa sổ hỏi đáp bài học"
          />

          {/* Slide-over Panel matching CourseLearningPage violet tone */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-[80] w-full sm:w-[410px] bg-white border-l border-violet-100 shadow-2xl flex flex-col h-full font-sans text-slate-800"
          >
            {/* 1. Header (violet tone harmonious with page header) */}
            <header className="shrink-0 px-4 py-3.5 border-b border-violet-100 bg-white flex items-center justify-between">
              <div className="min-w-0 flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-50 border border-violet-200 text-violet-700">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-900 truncate">Hỏi đáp bài học</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200/60">
                      Khóa #{courseId || '1'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    Tra cứu tài liệu & video bài giảng
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Làm mới trò chuyện"
                  className="p-1.5 text-slate-400 hover:text-violet-700 rounded-lg hover:bg-violet-50 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  title="Đóng cửa sổ"
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {/* 2. Scope Filter (Harmonious with violet-50 accents) */}
            <div className="shrink-0 px-4 py-2 border-b border-violet-100 bg-violet-50/50 flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-violet-900 font-semibold flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                <span className="truncate">{activeLesson ? activeLesson.title : courseTitle || 'Toàn bộ khóa học'}</span>
              </span>
              <button
                type="button"
                onClick={() => setSearchInCurrentLessonOnly(!searchInCurrentLessonOnly)}
                className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                  searchInCurrentLessonOnly
                    ? 'bg-violet-600 border-violet-600 text-white shadow-xs'
                    : 'bg-white border-violet-200 text-violet-700 hover:bg-violet-100'
                }`}
              >
                {searchInCurrentLessonOnly ? 'Chỉ bài này' : 'Toàn khóa'}
              </button>
            </div>

            {/* 3. Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scrollbar-thin scrollbar-thumb-slate-200">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white rounded-tr-xs shadow-xs'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <CleanMessageBody text={msg.content} />
                    )}

                    {/* Sources (Footnotes) & Deep Citations */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-violet-900 flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-violet-600" /> Dẫn chứng trích xuất ({msg.sources.length}):
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {msg.sources.map((src, i) => {
                            const sourceKey = `${msg.id}-${i}`;
                            const isExpanded = !!expandedSources[sourceKey];
                            const isVideo = src.source_type === 'video_transcript';

                            return (
                              <div
                                key={i}
                                className="rounded-xl border border-violet-100/90 bg-violet-50/40 p-2 text-slate-700 transition-all hover:bg-violet-50/70"
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="flex items-center gap-1.5 min-w-0 flex-1 font-medium">
                                    {isVideo ? (
                                      <Video className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                    ) : (
                                      <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                    )}
                                    <span className="truncate text-slate-800" title={src.title}>
                                      {src.title}
                                    </span>
                                    {src.page_number ? (
                                      <span className="shrink-0 rounded bg-blue-100/90 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">
                                        Trang {src.page_number}
                                      </span>
                                    ) : null}
                                  </span>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {isVideo && src.lesson_id && onSelectLesson && (
                                      <button
                                        type="button"
                                        onClick={() => onSelectLesson(src.lesson_id!)}
                                        className="text-violet-700 hover:text-violet-900 font-bold text-[11px] px-2 py-0.5 rounded-lg bg-white border border-violet-200 hover:bg-violet-100 transition shadow-2xs cursor-pointer"
                                      >
                                        Mở bài
                                      </button>
                                    )}
                                    {src.snippet && (
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandSource(sourceKey)}
                                        className="text-slate-500 hover:text-violet-700 font-semibold text-[10px] px-1.5 py-0.5 rounded-md hover:bg-violet-100/60 transition cursor-pointer flex items-center gap-0.5"
                                      >
                                        <span>{isExpanded ? 'Thu gọn' : 'Xem trích dẫn'}</span>
                                        <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Expandable snippet accordion */}
                                {isExpanded && src.snippet && (
                                  <div className="mt-2 pt-1.5 border-t border-violet-100 text-[10.5px] text-slate-600 bg-white/80 p-2 rounded-lg leading-relaxed border border-violet-50 select-text">
                                    <p className="font-semibold text-[10px] text-violet-800 mb-0.5">Đoạn trích dẫn:</p>
                                    <p className="italic">"{src.snippet}"</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timestamp & Copy action */}
                  <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-400">
                    <span>{msg.timestamp}</span>
                    {msg.role === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="hover:text-violet-700 cursor-pointer"
                      >
                        {copiedId === msg.id ? 'Đã chép' : 'Chép'}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="inline-block h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                  <span>Đang tra cứu bài giảng...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 4. Suggestions */}
            <div className="shrink-0 px-3 py-2 border-t border-slate-100 bg-white flex gap-1.5 overflow-x-auto scrollbar-none">
              {SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(item)}
                  disabled={isTyping}
                  className="shrink-0 text-[11px] font-medium text-slate-600 hover:text-violet-700 bg-slate-50 hover:bg-violet-50 border border-slate-200/80 hover:border-violet-200 px-2.5 py-1 rounded-full transition-all whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  {item}
                </button>
              ))}
            </div>

            {/* 5. Input Bar */}
            <footer className="shrink-0 p-3 border-t border-slate-200 bg-white">
              <div className="flex items-end gap-2 rounded-xl border border-slate-300 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 bg-slate-50/60 focus-within:bg-white p-1.5 transition-all">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Đặt câu hỏi về bài giảng..."
                  rows={1}
                  disabled={isTyping}
                  className="flex-1 resize-none bg-transparent px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none max-h-24 leading-relaxed"
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isTyping}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                  title="Gửi"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>Enter gửi · Shift+Enter xuống dòng</span>
                <span>Nội dung chuẩn khóa học</span>
              </div>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
