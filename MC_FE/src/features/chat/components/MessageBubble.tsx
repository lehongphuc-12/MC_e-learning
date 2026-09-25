import {
  CheckCheck,
  Download,
  FileText,
  Forward,
  MoreHorizontal,
  Plus,
  Reply,
  RotateCcw,
  SmilePlus,
} from "lucide-react";
import {
  MouseEvent,
  RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useAuthStore } from "../../../store/useAuthStore";
import { ChatMessage } from "../types/chatTypes";

interface Props {
  message: ChatMessage;
  showTimeSeparator?: boolean;
  showStatus?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  otherUserAvatarUrl?: string | null;
  onReply: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onReact: (messageId: number, reaction: string) => void;
  onRecall: (messageId: number) => void;
}

type MenuState = "none" | "reaction" | "more";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5239";
const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

function resolveMediaUrl(url?: string | null) {
  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  return `${BACKEND_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSeparatorTime(value: string) {
  const date = new Date(value);
  const today = new Date();

  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleString([], {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isFresh(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && Math.abs(Date.now() - time) < 30_000;
}

export function MessageBubble({
  message,
  showTimeSeparator = false,
  showStatus = false,
  isFirstInGroup = true,
  isLastInGroup = true,
  otherUserAvatarUrl,
  onReply,
  onForward,
  onReact,
  onRecall,
}: Props) {
  const user = useAuthStore((state) => state.user);
  const currentUserId = Number(user?.id);

  const [hovered, setHovered] = useState(false);
  const [mobileActions, setMobileActions] = useState(false);
  const [menu, setMenu] = useState<MenuState>("none");
  const [animateIn] = useState(() => isFresh(message.createdAt));
  const [justSent, setJustSent] = useState(true);

  const rootRef = useRef<HTMLDivElement>(null);

  const isMine = Number.isFinite(currentUserId)
    ? Number(message.senderId) === currentUserId
    : !!message.isMine;

  const recalled =
    !!message.recalledAt ||
    message.status?.toUpperCase() === "RECALLED";

  const attachments = message.attachments || [];
  const hasSticker = !!message.sticker;
  const hasAttachments = attachments.length > 0;
  const hasContent = !!message.content?.trim();

  const mediaOnly =
    !recalled &&
    !hasContent &&
    (hasSticker || hasAttachments);

  const actionsVisible =
    hovered ||
    mobileActions ||
    menu !== "none";

  const bubbleRadius = isMine
    ? `rounded-[22px] ${
        !isFirstInGroup ? "rounded-tr-[8px]" : ""
      } ${
        !isLastInGroup ? "rounded-br-[8px]" : ""
      }`
    : `rounded-[22px] ${
        !isFirstInGroup ? "rounded-tl-[8px]" : ""
      } ${
        !isLastInGroup ? "rounded-bl-[8px]" : ""
      }`;

  useEffect(() => {
    const timer = window.setTimeout(() => setJustSent(false), 500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mobileActions && menu === "none") return;

    const close = (event: PointerEvent) => {
      const target = event.target as Node;

      if (rootRef.current?.contains(target)) return;

      if (
        target instanceof Element &&
        target.closest("[data-reaction-picker]")
      ) {
        return;
      }

      if (
        target instanceof Element &&
        target.closest("[data-message-more-menu]")
      ) {
        return;
      }

      setMobileActions(false);
      setMenu("none");
    };

    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [mobileActions, menu]);

  const isDesktopPointer = () =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const closeActions = () => {
    setHovered(false);
    if (menu === "none") setMobileActions(false);
  };

  const handleMouseEnter = () => {
    if (isDesktopPointer()) setHovered(true);
  };

  const handleMouseLeave = () => {
    if (isDesktopPointer()) closeActions();
  };

  const toggleMobileActions = () => {
    if (isDesktopPointer()) return;

    setMobileActions((value) => {
      const next = !value;
      if (!next) setMenu("none");
      return next;
    });
  };

  const openReactionMenu = (event: MouseEvent) => {
    event.stopPropagation();
    setMenu((current) =>
      current === "reaction" ? "none" : "reaction"
    );
  };

  const openMoreMenu = (event: MouseEvent) => {
    event.stopPropagation();
    setMenu((current) =>
      current === "more" ? "none" : "more"
    );
  };

  const selectReaction = (
    event: MouseEvent,
    reaction: string
  ) => {
    event.stopPropagation();
    onReact(message.messageId, reaction);
    setMenu("none");
    setMobileActions(false);
  };

  const reply = (event: MouseEvent) => {
    event.stopPropagation();
    onReply(message);
    setMenu("none");
    setMobileActions(false);
  };

  const forward = (event: MouseEvent) => {
    event.stopPropagation();
    onForward(message);
    setMenu("none");
    setMobileActions(false);
  };

  const recall = (event: MouseEvent) => {
    event.stopPropagation();
    onRecall(message.messageId);
    setMenu("none");
    setMobileActions(false);
  };

  return (
    <>
      {showTimeSeparator && (
        <div className="my-5 flex justify-center">
          <span className="rounded-full border border-slate-200/70 bg-white/90 px-3 py-1 text-[10px] font-semibold text-slate-400 shadow-sm backdrop-blur-xl">
            {formatSeparatorTime(message.createdAt)}
          </span>
        </div>
      )}

      <div
        ref={rootRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={toggleMobileActions}
        className={`group/message relative flex w-full select-none items-end gap-2 ${
          isMine ? "justify-end" : "justify-start"
        } ${actionsVisible ? "z-30" : "z-0"}`}
      >
        {!isMine && (
          <div className="w-8 shrink-0 self-end">
            {isLastInGroup && (
              <img
                src={
                  otherUserAvatarUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    message.senderName || "User"
                  )}`
                }
                alt={message.senderName || "User"}
                className="h-8 w-8 rounded-full object-cover shadow-sm ring-2 ring-white"
              />
            )}
          </div>
        )}

        <div
          className={`relative flex min-w-0 max-w-[calc(100%-40px)] items-center gap-2 ${
            isMine ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <div
            className="relative min-w-0 max-w-[72%] overflow-visible"
            style={{
              animation:
                animateIn && justSent
                  ? `${
                      isMine
                        ? "messageInMine"
                        : "messageInOther"
                    } .34s cubic-bezier(.2,.8,.2,1)`
                  : "none",
            }}
          >
            {!isMine && isFirstInGroup && (
              <div className="mb-1.5 ml-2 text-[11px] font-semibold text-slate-500">
                {message.senderName}
              </div>
            )}

            <div
              className={
                mediaOnly
                  ? "relative max-w-full overflow-visible"
                  : `relative max-w-full px-3.5 py-2.5 ${bubbleRadius} ${
                      recalled
                        ? "border border-dashed border-slate-300 bg-white/60 text-slate-500"
                        : isMine
                        ? "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-[0_8px_22px_-8px_rgba(37,99,235,.65)]"
                        : "border border-slate-200/70 bg-white text-slate-800 shadow-[0_3px_12px_-5px_rgba(15,23,42,.16)]"
                    }`
              }
            >
              {isMine && !mediaOnly && !recalled && (
                <span
                  className={`pointer-events-none absolute inset-0 ${bubbleRadius}`}
                  style={{
                    background:
                      "linear-gradient(180deg,rgba(255,255,255,.16),transparent 50%)",
                  }}
                />
              )}

              {message.replyTo && !recalled && (
                <div
                  className={`relative mb-2 max-w-full overflow-hidden rounded-xl border-l-[3px] px-2.5 py-2 text-xs ${
                    mediaOnly
                      ? "border-blue-500 bg-slate-100 text-slate-700"
                      : isMine
                      ? "border-white/70 bg-white/15"
                      : "border-blue-500 bg-slate-50"
                  }`}
                >
                  <div className="truncate font-semibold">
                    {message.replyTo.senderName}
                  </div>

                  <div className="mt-0.5 max-w-full truncate opacity-75">
                    {message.replyTo.content ||
                      message.replyTo.messageType}
                  </div>
                </div>
              )}

              {recalled ? (
                <div className="flex items-center gap-2 text-[13px] italic">
                  <RotateCcw size={14} />
                  Tin nhắn đã được thu hồi
                </div>
              ) : (
                <>
                  {hasContent && (
                    <div className="relative whitespace-pre-wrap break-words text-[14px] leading-[1.55]">
                      {message.content}
                    </div>
                  )}

                  {message.sticker && (
                    <img
                      src={resolveMediaUrl(
                        message.sticker.imageUrl
                      )}
                      alt={message.sticker.name}
                      className="h-32 w-32 max-w-full object-contain transition-transform duration-300 hover:scale-105"
                    />
                  )}

                  {attachments.map((attachment) => {
                    const mimeType =
                      attachment.mimeType?.toLowerCase() || "";

                    const attachmentType =
                      attachment.attachmentType?.toUpperCase() ||
                      "";

                    const image =
                      mimeType.startsWith("image/") ||
                      attachmentType.includes("IMAGE");

                    const audio =
                      mimeType.startsWith("audio/") ||
                      attachmentType.includes("VOICE") ||
                      attachmentType.includes("AUDIO");

                    const fileUrl = resolveMediaUrl(
                      attachment.fileUrl
                    );

                    if (image) {
                      return (
                        <a
                          key={attachment.attachmentId}
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                          className={`group/image relative block max-w-full overflow-hidden rounded-[22px] ${
                            hasContent ? "mt-2" : ""
                          }`}
                        >
                          <img
                            src={fileUrl}
                            alt={attachment.fileName}
                            className="block h-auto max-h-[360px] w-auto max-w-full rounded-[22px] object-cover transition-transform duration-500 ease-out group-hover/image:scale-[1.02]"
                          />

                          <span className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-inset ring-black/5" />
                        </a>
                      );
                    }

                    if (audio) {
                      return (
                        <div
                          key={attachment.attachmentId}
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                          className={`max-w-full overflow-hidden rounded-[18px] bg-white p-1.5 shadow-sm ring-1 ring-slate-200/70 ${
                            hasContent ? "mt-2" : ""
                          }`}
                        >
                          <audio
                            controls
                            preload="metadata"
                            src={fileUrl}
                            className="h-11 w-[240px] max-w-full"
                          />
                        </div>
                      );
                    }

                    return (
                      <a
                        key={attachment.attachmentId}
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={attachment.fileName}
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                        className={`group/file flex w-[255px] max-w-full items-center gap-3 overflow-hidden rounded-[18px] border border-slate-200/80 bg-white p-3 text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                          hasContent ? "mt-2" : ""
                        }`}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-blue-50 text-blue-600">
                          <FileText size={21} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold">
                            {attachment.fileName}
                          </div>

                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {formatBytes(
                              attachment.fileSize
                            )}
                          </div>
                        </div>

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-blue-600 transition group-hover/file:bg-blue-50">
                          <Download size={16} />
                        </div>
                      </a>
                    );
                  })}
                </>
              )}
            </div>

            {(message.reactions?.length || 0) > 0 && (
              <div
                className={`relative z-20 -mt-2.5 flex ${
                  isMine
                    ? "justify-end pr-1"
                    : "justify-start pl-1"
                }`}
              >
                <div
                  className="flex min-h-6 items-center rounded-full border border-slate-200/80 bg-white px-2 py-0.5 text-xs shadow-sm"
                  style={{
                    animation:
                      "reactionBadgeIn .25s cubic-bezier(.34,1.56,.64,1)",
                  }}
                >
                  <span>
                    {[
                      ...new Set(
                        message.reactions.map(
                          (item) => item.reaction
                        )
                      ),
                    ].join(" ")}
                  </span>

                  <span className="ml-1 text-[10px] font-semibold text-slate-400">
                    {message.reactions.length}
                  </span>
                </div>
              </div>
            )}

            {showStatus && isMine && (
              <div
                className={`mt-1.5 flex items-center justify-end gap-1 px-1 text-[10px] font-medium ${
                  message.isRead
                    ? "text-blue-500"
                    : "text-slate-400"
                }`}
              >
                <CheckCheck size={12} />
                {message.isRead ? "Đã xem" : "Đã gửi"}
              </div>
            )}

            {!showStatus &&
              isLastInGroup &&
              actionsVisible && (
                <div
                  className={`mt-1.5 flex px-1 text-[10px] font-medium text-slate-400 ${
                    isMine
                      ? "justify-end"
                      : "justify-start"
                  }`}
                  style={{
                    animation:
                      "messageMetaIn .16s ease-out",
                  }}
                >
                  {formatMessageTime(message.createdAt)}
                </div>
              )}
          </div>

          {!recalled && (
            <MessageActions
              isMine={isMine}
              visible={actionsVisible}
              menu={menu}
              onReaction={openReactionMenu}
              onMore={openMoreMenu}
              onReply={reply}
              onForward={forward}
              onRecall={recall}
              onSelectReaction={selectReaction}
              onCloseMenu={() => {
                setMenu("none");
                setMobileActions(false);
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}

interface MessageActionsProps {
  isMine: boolean;
  visible: boolean;
  menu: MenuState;
  onReaction: (event: MouseEvent) => void;
  onMore: (event: MouseEvent) => void;
  onReply: (event: MouseEvent) => void;
  onForward: (event: MouseEvent) => void;
  onRecall: (event: MouseEvent) => void;
  onSelectReaction: (
    event: MouseEvent,
    reaction: string
  ) => void;
  onCloseMenu: () => void;
}

function MessageActions({
  isMine,
  visible,
  menu,
  onReaction,
  onMore,
  onReply,
  onForward,
  onRecall,
  onSelectReaction,
  onCloseMenu,
}: MessageActionsProps) {
  const reactionButtonRef =
    useRef<HTMLButtonElement>(null);

  const moreButtonRef =
    useRef<HTMLButtonElement>(null);

  return (
    <>
      <div
        onClick={(event) =>
          event.stopPropagation()
        }
        className={`relative z-[70] flex w-max shrink-0 items-center transition-all duration-150 ease-out ${
          visible
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-[.96] opacity-0"
        }`}
      >
        <div className="flex items-center gap-0.5 rounded-full border border-slate-200/80 bg-white/95 p-1 shadow-[0_10px_28px_-10px_rgba(15,23,42,.35)] ring-1 ring-black/[0.02] backdrop-blur-xl">
          <button
            ref={reactionButtonRef}
            type="button"
            onClick={onReaction}
            title="Cảm xúc"
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 hover:-translate-y-0.5 hover:scale-105 ${
              menu === "reaction"
                ? "bg-amber-50 text-amber-500"
                : "text-slate-500 hover:bg-amber-50 hover:text-amber-500"
            }`}
          >
            <SmilePlus size={17} />
          </button>

          <button
            type="button"
            onClick={onReply}
            title="Trả lời"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-all duration-150 hover:-translate-y-0.5 hover:scale-105 hover:bg-blue-50 hover:text-blue-600 active:scale-90"
          >
            <Reply size={17} />
          </button>

          <button
            ref={moreButtonRef}
            type="button"
            onClick={onMore}
            title="Thêm"
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 hover:-translate-y-0.5 hover:scale-105 ${
              menu === "more"
                ? "bg-slate-100 text-slate-900"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {menu === "reaction" &&
        createPortal(
          <ReactionPicker
            anchorRef={reactionButtonRef}
            isMine={isMine}
            onSelectReaction={onSelectReaction}
          />,
          document.body
        )}

      {menu === "more" &&
        createPortal(
          <MoreMenu
            anchorRef={moreButtonRef}
            isMine={isMine}
            onReply={onReply}
            onForward={onForward}
            onRecall={onRecall}
            onClose={onCloseMenu}
          />,
          document.body
        )}
    </>
  );
}

interface ReactionPickerProps {
  anchorRef: RefObject<HTMLButtonElement | null>;
  isMine: boolean;
  onSelectReaction: (
    event: MouseEvent,
    reaction: string
  ) => void;
}

function ReactionPicker({
  anchorRef,
  isMine,
  onSelectReaction,
}: ReactionPickerProps) {
  const pickerRef =
    useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    ready: false,
  });

  useLayoutEffect(() => {
    const updatePosition = () => {
      const anchor = anchorRef.current;
      const picker = pickerRef.current;

      if (!anchor || !picker) return;

      const anchorRect =
        anchor.getBoundingClientRect();

      const pickerRect =
        picker.getBoundingClientRect();

      const EDGE = 12;
      const GAP = 10;

      let left = isMine
        ? anchorRect.right - pickerRect.width
        : anchorRect.left;

      left = Math.max(EDGE, left);

      left = Math.min(
        left,
        window.innerWidth -
          pickerRect.width -
          EDGE
      );

      let top =
        anchorRect.top -
        pickerRect.height -
        GAP;

      if (top < EDGE) {
        top = anchorRect.bottom + GAP;
      }

      top = Math.min(
        top,
        window.innerHeight -
          pickerRect.height -
          EDGE
      );

      setPosition({
        top,
        left,
        ready: true,
      });
    };

    updatePosition();

    window.addEventListener(
      "resize",
      updatePosition
    );

    window.addEventListener(
      "scroll",
      updatePosition,
      true
    );

    return () => {
      window.removeEventListener(
        "resize",
        updatePosition
      );

      window.removeEventListener(
        "scroll",
        updatePosition,
        true
      );
    };
  }, [anchorRef, isMine]);

  return (
    <div
      ref={pickerRef}
      data-reaction-picker
      onClick={(event) =>
        event.stopPropagation()
      }
      className="fixed z-[999999] flex w-max max-w-[calc(100vw-24px)] flex-nowrap items-center gap-0.5 whitespace-nowrap rounded-full border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_18px_45px_-10px_rgba(15,23,42,.45)] ring-1 ring-black/[0.03] backdrop-blur-xl"
      style={{
        top: position.top,
        left: position.left,
        visibility:
          position.ready
            ? "visible"
            : "hidden",
        animation: position.ready
          ? "reactionMenuIn .22s cubic-bezier(.34,1.56,.64,1)"
          : "none",
      }}
    >
      {REACTIONS.map((reaction, index) => (
        <button
          key={reaction}
          type="button"
          onClick={(event) =>
            onSelectReaction(
              event,
              reaction
            )
          }
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[21px] transition-all duration-150 hover:-translate-y-1.5 hover:scale-125 hover:bg-slate-50 active:scale-90"
          style={{
            animation:
              "reactionItemIn .22s cubic-bezier(.34,1.56,.64,1) backwards",
            animationDelay: `${index * 25}ms`,
          }}
        >
          {reaction}
        </button>
      ))}

      <button
        type="button"
        title="Thêm cảm xúc"
        className="ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-90"
      >
        <Plus size={20} />
      </button>
    </div>
  );
}

interface MoreMenuProps {
  anchorRef: RefObject<HTMLButtonElement | null>;
  isMine: boolean;
  onReply: (event: MouseEvent) => void;
  onForward: (event: MouseEvent) => void;
  onRecall: (event: MouseEvent) => void;
  onClose: () => void;
}

function MoreMenu({
  anchorRef,
  isMine,
  onReply,
  onForward,
  onRecall,
}: MoreMenuProps) {
  const menuRef =
    useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    ready: false,
  });

  useLayoutEffect(() => {
    const updatePosition = () => {
      const anchor = anchorRef.current;
      const element = menuRef.current;

      if (!anchor || !element) return;

      const anchorRect =
        anchor.getBoundingClientRect();

      const menuRect =
        element.getBoundingClientRect();

      const EDGE = 12;
      const GAP = 10;

      let left = isMine
        ? anchorRect.right - menuRect.width
        : anchorRect.left;

      left = Math.max(EDGE, left);

      left = Math.min(
        left,
        window.innerWidth -
          menuRect.width -
          EDGE
      );

      let top =
        anchorRect.top -
        menuRect.height -
        GAP;

      if (top < EDGE) {
        top = anchorRect.bottom + GAP;
      }

      top = Math.min(
        top,
        window.innerHeight -
          menuRect.height -
          EDGE
      );

      setPosition({
        top,
        left,
        ready: true,
      });
    };

    updatePosition();

    window.addEventListener(
      "resize",
      updatePosition
    );

    window.addEventListener(
      "scroll",
      updatePosition,
      true
    );

    return () => {
      window.removeEventListener(
        "resize",
        updatePosition
      );

      window.removeEventListener(
        "scroll",
        updatePosition,
        true
      );
    };
  }, [anchorRef, isMine]);

  return (
    <div
      ref={menuRef}
      data-message-more-menu
      onClick={(event) =>
        event.stopPropagation()
      }
      className="fixed z-[999999] w-[180px] overflow-hidden rounded-[18px] border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_20px_50px_-12px_rgba(15,23,42,.4)] backdrop-blur-xl"
      style={{
        top: position.top,
        left: position.left,
        visibility:
          position.ready
            ? "visible"
            : "hidden",
        animation: position.ready
          ? "actionMenuIn .2s cubic-bezier(.2,.8,.2,1)"
          : "none",
      }}
    >
      <button
        type="button"
        onClick={onReply}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-100"
      >
        <Reply
          size={16}
          className="text-blue-600"
        />
        Trả lời
      </button>

      <button
        type="button"
        onClick={onForward}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-100"
      >
        <Forward
          size={16}
          className="text-indigo-600"
        />
        Chuyển tiếp
      </button>

      {isMine && (
        <>
          <div className="mx-2 my-1 h-px bg-slate-100" />

          <button
            type="button"
            onClick={onRecall}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-rose-500 transition hover:bg-rose-50"
          >
            <RotateCcw size={16} />
            Thu hồi
          </button>
        </>
      )}
    </div>
  );
}