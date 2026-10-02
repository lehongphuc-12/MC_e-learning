import {
  Camera,
  Check,
  FilePlus2,
  Image,
  Laugh,
  Plus,
  Reply,
  RotateCcw,
  Send,
  SmilePlus,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChatMessage, StickerPack } from "../types/chatTypes";
import { EmojiPicker } from "./EmojiPicker";
import { StickerPicker } from "./StickerPicker";
import { VoiceRecorder } from "./VoiceRecorder";

interface Props {
  reply: ChatMessage | null;
  stickers: StickerPack[];
  onCancelReply: () => void;
  onSendText: (value: string, replyId?: number | null) => Promise<void>;
  onSendFile: (file: File, replyId?: number | null) => Promise<void>;
  onSendVoice: (
    blob: Blob,
    duration: number,
    replyId?: number | null
  ) => Promise<void>;
  onSendSticker: (
    stickerId: number,
    replyId?: number | null
  ) => Promise<void>;
  onTyping: (value: boolean) => void;
}

export function MessageComposer({
  reply,
  stickers,
  onCancelReply,
  onSendText,
  onSendFile,
  onSendVoice,
  onSendSticker,
  onTyping,
}: Props) {
  const [text, setText] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const typingTimeout = useRef<number | null>(null);

  const actionAreaRef = useRef<HTMLDivElement>(null);
  const closeMoreTimeout = useRef<number | null>(null);

  const clearCloseMoreTimeout = () => {
    if (closeMoreTimeout.current !== null) {
      window.clearTimeout(closeMoreTimeout.current);
      closeMoreTimeout.current = null;
    }
  };

  const keepMoreOpen = () => {
    clearCloseMoreTimeout();
  };

  const scheduleCloseMore = () => {
    clearCloseMoreTimeout();

    closeMoreTimeout.current = window.setTimeout(() => {
      setMoreOpen(false);
    }, 180);
  };

  const closeFloatingPanels = () => {
    setMoreOpen(false);
    setEmojiOpen(false);
    setStickerOpen(false);
  };

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const closeCamera = () => {
    stopCamera();

    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }

    setCameraOpen(false);
    setCameraLoading(false);
    setCameraError("");
    setCapturedImage(null);
    setCapturedBlob(null);
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        moreOpen &&
        actionAreaRef.current &&
        !actionAreaRef.current.contains(target)
      ) {
        setMoreOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [moreOpen]);

  useEffect(() => {
    return () => {
      stopCamera();

      if (typingTimeout.current !== null) {
        window.clearTimeout(typingTimeout.current);
      }

      clearCloseMoreTimeout();

      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
  }, [capturedImage]);

  const send = async () => {
    const value = text.trim();

    if (!value || sending) return;

    setSending(true);

    try {
      await onSendText(value, reply?.messageId);
      setText("");
      onCancelReply();
      onTyping(false);
      closeFloatingPanels();
    } finally {
      setSending(false);
    }
  };

  const changeText = (value: string) => {
    setText(value.slice(0, 5000));
    onTyping(true);

    if (typingTimeout.current !== null) {
      window.clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = window.setTimeout(() => {
      onTyping(false);
    }, 1200);
  };

  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || sending) return;

    setSending(true);
    closeFloatingPanels();

    try {
      await onSendFile(file, reply?.messageId);
      onCancelReply();
    } finally {
      setSending(false);
    }
  };

  const openCamera = async () => {
    if (cameraLoading) return;

    closeFloatingPanels();

    setCameraError("");
    setCapturedImage(null);
    setCapturedBlob(null);
    setCameraOpen(true);
    setCameraLoading(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Trình duyệt không hỗ trợ truy cập camera.");
      }

      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      if (!videoRef.current) {
        stopCamera();
        throw new Error("Không thể khởi tạo camera.");
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    } catch (error) {
      stopCamera();

      if (error instanceof DOMException) {
        if (
          error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError"
        ) {
          setCameraError(
            "Camera đang bị chặn. Hãy cho phép quyền Camera cho localhost rồi thử lại."
          );
        } else if (
          error.name === "NotFoundError" ||
          error.name === "DevicesNotFoundError"
        ) {
          setCameraError("Không tìm thấy camera trên thiết bị.");
        } else if (
          error.name === "NotReadableError" ||
          error.name === "TrackStartError"
        ) {
          setCameraError(
            "Camera đang được ứng dụng khác sử dụng hoặc không thể truy cập."
          );
        } else {
          setCameraError(error.message || "Không thể mở camera.");
        }
      } else {
        setCameraError(
          error instanceof Error ? error.message : "Không thể mở camera."
        );
      }
    } finally {
      setCameraLoading(false);
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      !video ||
      !canvas ||
      video.videoWidth <= 0 ||
      video.videoHeight <= 0
    ) {
      setCameraError("Camera chưa sẵn sàng để chụp.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("Không thể xử lý ảnh từ camera.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError("Không thể tạo ảnh từ camera.");
      return;
    }

    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }

    const previewUrl = URL.createObjectURL(blob);

    setCapturedBlob(blob);
    setCapturedImage(previewUrl);
    setCameraError("");
    stopCamera();
  };

  const retakePhoto = async () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }

    setCapturedImage(null);
    setCapturedBlob(null);
    setCameraError("");

    await openCamera();
  };

  const sendCapturedPhoto = async () => {
    if (!capturedBlob || sending) return;

    const file = new File(
      [capturedBlob],
      `camera-${Date.now()}.jpg`,
      {
        type: "image/jpeg",
        lastModified: Date.now(),
      }
    );

    setSending(true);

    try {
      await onSendFile(file, reply?.messageId);
      onCancelReply();
      closeCamera();
    } finally {
      setSending(false);
    }
  };

  const openImagePicker = () => {
    closeFloatingPanels();
    imageRef.current?.click();
  };

  const openFilePicker = () => {
    closeFloatingPanels();
    fileRef.current?.click();
  };

  const toggleEmoji = () => {
    setMoreOpen(false);
    setStickerOpen(false);
    setEmojiOpen((value) => !value);
  };

  const toggleSticker = () => {
    setMoreOpen(false);
    setEmojiOpen(false);
    setStickerOpen((value) => !value);
  };

  const actions = [
    {
      label: "Ảnh",
      icon: <Image size={19} />,
      iconClass: "text-blue-600",
      iconBg: "bg-blue-50",
      action: openImagePicker,
    },
    {
      label: "Camera",
      icon: <Camera size={19} />,
      iconClass: "text-violet-600",
      iconBg: "bg-violet-50",
      action: () => void openCamera(),
    },
    {
      label: "File",
      icon: <FilePlus2 size={19} />,
      iconClass: "text-indigo-600",
      iconBg: "bg-indigo-50",
      action: openFilePicker,
    },
    {
      label: "Sticker",
      icon: <SmilePlus size={19} />,
      iconClass: "text-amber-500",
      iconBg: "bg-amber-50",
      action: toggleSticker,
    },
    {
      label: "Emoji",
      icon: <Laugh size={19} />,
      iconClass: "text-orange-500",
      iconBg: "bg-orange-50",
      action: toggleEmoji,
    },
  ];

  return (
    <div className="relative z-30 border-t border-slate-100/80 bg-white/95 px-3 pb-3 pt-2 backdrop-blur-xl">
      {reply && (
        <div
          className="mb-2 flex items-center gap-3 rounded-[16px] border border-blue-100/80 bg-blue-50/60 px-3 py-2.5"
          style={{
            animation:
              "composerReplyIn .2s cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <div className="h-9 w-1 shrink-0 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" />

          <Reply size={16} className="shrink-0 text-blue-500" />

          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-blue-600">
              Trả lời {reply.senderName}
            </div>

            <div className="mt-0.5 truncate text-xs text-slate-500">
              {reply.content || reply.messageType}
            </div>
          </div>

          <button
            type="button"
            onClick={onCancelReply}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {emojiOpen && (
        <div
          className="absolute bottom-[66px] left-3 right-3 z-[60]"
          style={{
            animation:
              "floatingPanelIn .2s cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <div className="relative w-fit max-w-full">
            <EmojiPicker
              onSelect={(emoji) => {
                setText((value) =>
                  (value + emoji).slice(0, 5000)
                );
              }}
            />
          </div>
        </div>
      )}

      {stickerOpen && (
        <div className="absolute bottom-[66px] left-0 right-0 z-[60]">
          <StickerPicker
            packs={stickers}
            onSelect={async (id) => {
              await onSendSticker(id, reply?.messageId);
              setStickerOpen(false);
              setMoreOpen(false);
              onCancelReply();
            }}
          />
        </div>
      )}

      {cameraOpen && (
        <div
          className="absolute bottom-[68px] left-2 right-2 z-[70] overflow-hidden rounded-[26px] border border-white/10 bg-slate-950 shadow-[0_25px_70px_-15px_rgba(15,23,42,.65)]"
          style={{
            animation:
              "cameraPanelIn .28s cubic-bezier(.2,.8,.2,1)",
          }}
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 py-3 text-white backdrop-blur-xl">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Camera size={17} />
                Camera
              </div>

              <div className="mt-0.5 text-[10px] text-white/45">
                Chụp ảnh và gửi ngay
              </div>
            </div>

            <button
              type="button"
              onClick={closeCamera}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:rotate-90 hover:bg-white/10 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>

          <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
            {!capturedImage && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            )}

            {capturedImage && (
              <img
                src={capturedImage}
                alt="Ảnh vừa chụp"
                className="h-full w-full object-cover"
              />
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />

            {cameraLoading && !capturedImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3 text-white">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span className="text-xs font-medium">
                    Đang mở camera...
                  </span>
                </div>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/95 p-6 text-center">
                <div>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-slate-400">
                    <Camera size={25} />
                  </div>

                  <p className="mt-4 text-sm leading-5 text-white">
                    {cameraError}
                  </p>

                  <button
                    type="button"
                    onClick={() => void openCamera()}
                    className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-900 transition hover:scale-105"
                  >
                    Thử lại
                  </button>
                </div>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="relative flex min-h-[76px] items-center justify-center gap-4 bg-slate-950 px-4 py-3">
            {!capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={closeCamera}
                  className="absolute left-5 rounded-full px-3 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={() => void capturePhoto()}
                  disabled={cameraLoading || !!cameraError}
                  className="group/capture flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white transition-all duration-200 hover:scale-105 active:scale-90 disabled:opacity-30"
                  title="Chụp ảnh"
                >
                  <span className="h-11 w-11 rounded-full bg-white transition-transform group-hover/capture:scale-90" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void retakePhoto()}
                  disabled={sending}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/15 disabled:opacity-40"
                >
                  <RotateCcw size={15} />
                  Chụp lại
                </button>

                <button
                  type="button"
                  onClick={() => void sendCapturedPhoto()}
                  disabled={sending}
                  className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-950/30 transition hover:-translate-y-0.5 hover:bg-blue-500 disabled:opacity-40"
                >
                  {sending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Check size={16} />
                  )}

                  Gửi ảnh
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex w-full items-end gap-2">
        <div
          ref={actionAreaRef}
          className="relative shrink-0"
          onMouseEnter={keepMoreOpen}
          onMouseLeave={scheduleCloseMore}
        >
          {moreOpen && (
            <div
              className="
                absolute bottom-[calc(100%+10px)] left-0 z-[80]
                w-[178px] overflow-hidden rounded-[22px]
                border border-slate-200/80 bg-white/95 p-2
                shadow-[0_20px_55px_-15px_rgba(15,23,42,.38)]
                backdrop-blur-xl
              "
              style={{
                animation:
                  "composerMenuIn .2s cubic-bezier(.2,.8,.2,1)",
              }}
            >
              {actions.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="
                    group flex w-full items-center gap-3
                    rounded-[15px] px-2 py-2 text-left
                    transition-all duration-150
                    hover:bg-slate-50 active:scale-[.98]
                  "
                  style={{
                    animation:
                      "composerMenuItemIn .22s cubic-bezier(.2,.8,.2,1) backwards",
                    animationDelay: `${index * 30}ms`,
                  }}
                >
                  <span
                    className={`
                      flex h-9 w-9 shrink-0 items-center justify-center
                      rounded-[12px] transition-all duration-200
                      group-hover:scale-105
                      ${item.iconBg}
                      ${item.iconClass}
                    `}
                  >
                    {item.icon}
                  </span>

                  <span className="min-w-0 flex-1 text-[13px] font-semibold text-slate-700">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              clearCloseMoreTimeout();

              setMoreOpen((value) => !value);
              setEmojiOpen(false);
              setStickerOpen(false);
            }}
            aria-label={moreOpen ? "Đóng menu" : "Thêm nội dung"}
            aria-expanded={moreOpen}
            className={`
              relative flex h-10 w-10 shrink-0 items-center
              justify-center rounded-full
              transition-all duration-300
              ease-[cubic-bezier(.34,1.56,.64,1)]
              ${
                moreOpen
                  ? "rotate-45 bg-blue-600 text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,.65)]"
                  : "bg-slate-100 text-slate-500 hover:rotate-90 hover:bg-blue-50 hover:text-blue-600"
              }
            `}
          >
            <Plus size={21} />
          </button>
        </div>

        <div
          className="
            group/input flex min-h-10 min-w-0 flex-1 items-end
            rounded-[20px] border border-transparent
            bg-slate-100/90 px-3.5 py-2
            transition-all duration-200
            focus-within:border-blue-200 focus-within:bg-white
            focus-within:shadow-[0_0_0_3px_rgba(59,130,246,.08)]
          "
        >
          <textarea
            rows={1}
            maxLength={5000}
            value={text}
            onChange={(event) => changeText(event.target.value)}
            onKeyDown={keyDown}
            onFocus={() => {
              setMoreOpen(false);
              setEmojiOpen(false);
              setStickerOpen(false);
            }}
            placeholder="Nhập tin nhắn..."
            className="
              max-h-28 min-h-6 w-full resize-none
              bg-transparent text-[14px] leading-6
              text-slate-800 outline-none
              placeholder:text-slate-400
            "
          />
        </div>

        {!text.trim() && (
          <VoiceRecorder
            onSend={(blob, duration) =>
              onSendVoice(
                blob,
                duration,
                reply?.messageId
              )
            }
          />
        )}

        <button
          type="button"
          onClick={() => void send()}
          disabled={!text.trim() || sending}
          aria-label="Gửi tin nhắn"
          className={`
            flex h-10 w-10 shrink-0 items-center justify-center
            rounded-full transition-all duration-200
            ${
              text.trim() && !sending
                ? "scale-100 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,.55)] hover:-translate-y-0.5 hover:scale-105 active:scale-90"
                : "scale-[.92] bg-slate-100 text-slate-300"
            }
          `}
        >
          <Send
            size={17}
            className={text.trim() ? "-rotate-[8deg]" : ""}
          />
        </button>
      </div>

      <input
        ref={fileRef}
        hidden
        type="file"
        onChange={selectFile}
      />

      <input
        ref={imageRef}
        hidden
        type="file"
        accept="image/*"
        onChange={selectFile}
      />
    </div>
  );
}