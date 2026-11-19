
import { useEffect } from "react";

interface VoiceJourneyIntroModalProps {
  open: boolean;
  onClose: () => void;
  onStart: () => void;
}

const criteria = [
  {
    code: "C01",
    title: "Phát âm & thanh điệu",
    weight: "18%",
    description:
      "Luyện phát âm chính xác, phân biệt các âm và sử dụng thanh điệu phù hợp.",
    icon: "🎙️",
  },
  {
    code: "C02",
    title: "Độ rõ lời",
    weight: "10%",
    description:
      "Luyện cách nói rõ ràng, dễ nghe, hạn chế nuốt chữ và nói lí nhí.",
    icon: "🔊",
  },
  {
    code: "C03",
    title: "Độ chính xác nội dung",
    weight: "7%",
    description:
      "Luyện khả năng truyền đạt thông tin chính xác, đầy đủ và đúng trọng tâm.",
    icon: "📝",
  },
  {
    code: "C04",
    title: "Hơi thở & cột hơi",
    weight: "10%",
    description:
      "Luyện lấy hơi, giữ hơi và duy trì giọng nói ổn định khi trình bày.",
    icon: "🌬️",
  },
];

export default function VoiceJourneyIntroModal({
  open,
  onClose,
  onStart,
}: VoiceJourneyIntroModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <style>{`
        @keyframes voiceBackdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes voiceModal {
          from {
            opacity: 0;
            transform: translateY(25px) scale(.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .voice-backdrop {
          animation: voiceBackdrop .2s ease-out;
        }

        .voice-modal {
          animation: voiceModal .3s cubic-bezier(.2,.8,.2,1);
        }

        .voice-card {
          transition: transform .2s ease, box-shadow .2s ease;
        }

        .voice-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(37,99,235,.10);
        }
      `}</style>

      <div
        className="voice-backdrop fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="voice-journey-title"
          className="voice-modal relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 px-7 py-8 text-white">
            <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-cyan-300/20 blur-2xl" />

            <button
              onClick={onClose}
              aria-label="Đóng giới thiệu"
              className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xl transition hover:bg-white/30"
            >
              ×
            </button>

            <div className="relative z-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                ✨ QUÀ TẶNG DÀNH CHO HỌC VIÊN MSEEK
              </div>

              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-3xl shadow-lg">
                🎤
              </div>

              <h2
                id="voice-journey-title"
                className="text-2xl font-extrabold sm:text-3xl"
              >
                AI Voice Journey
              </h2>

              <p className="mt-2 max-w-lg text-sm leading-6 text-blue-100">
                Chương trình luyện giọng cá nhân hóa được tặng kèm,
                giúp bạn nhận diện điểm yếu và cải thiện khả năng nói
                thông qua AI.
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-5 p-6 sm:p-7">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Bạn sẽ được luyện tập 4 tiêu chí
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                AI hỗ trợ đánh giá và đề xuất bài luyện phù hợp với kết quả
                của từng học viên.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {criteria.map((item) => (
                <div
                  key={item.code}
                  className="voice-card rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-xl">
                      {item.icon}
                    </div>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                      {item.weight}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs font-bold tracking-wider text-blue-600">
                      {item.code}
                    </p>

                    <h4 className="mt-1 font-bold text-slate-900">
                      {item.title}
                    </h4>

                    <p className="mt-2 text-sm leading-5 text-slate-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Benefits */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
              <h4 className="font-bold text-indigo-900">
                🚀 Trải nghiệm luyện giọng cùng AI
              </h4>

              <ul className="mt-3 space-y-2 text-sm text-indigo-900">
                <li>✓ Đánh giá đầu vào để nhận diện điểm mạnh, điểm yếu.</li>
                <li>✓ AI đề xuất bài học phù hợp với năng lực.</li>
                <li>✓ Luyện tập và nhận kết quả đánh giá từ mô hình giọng nói.</li>
                <li>✓ Theo dõi tiến độ và cập nhật lộ trình luyện tập.</li>
              </ul>
            </div>

            <p className="text-xs leading-5 text-slate-400">
              Các trọng số hiển thị là thông tin của 4 tiêu chí hiện được
              hỗ trợ. Kết quả và khả năng đánh giá phụ thuộc vào phạm vi
              mô hình đã được huấn luyện và hiệu chuẩn.
            </p>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50 sm:flex-1"
              >
                Để sau
              </button>

              <button
                onClick={onStart}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3 font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:shadow-xl sm:flex-[2]"
              >
                Bắt đầu luyện giọng →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
