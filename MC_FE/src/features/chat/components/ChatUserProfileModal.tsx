import {
  BriefcaseBusiness,
  Cake,
  Languages,
  Loader2,
  Mail,
  Phone,
  Target,
  UserRound,
  X,
} from "lucide-react";
import {
  ReactNode,
  useEffect,
  useState,
} from "react";
import { chatApi } from "../api/chatApi";
import {
  ChatUserProfile,
  Conversation,
} from "../types/chatTypes";

interface Props {
  conversation: Conversation;
  onClose: () => void;
}

export function ChatUserProfileModal({
  conversation,
  onClose,
}: Props) {
  const [profile, setProfile] =
    useState<ChatUserProfile | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      try {
        const data =
          await chatApi.getUserProfile(
            conversation.conversationId
          );

        if (mounted) {
          setProfile(data);
        }
      } catch (error) {
        console.error(
          "Load user profile error:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [
    conversation.conversationId,
  ]);

  const name =
    profile?.fullName ||
    conversation.otherUserName;

  const avatar =
    profile?.avatarUrl ||
    conversation.otherUserAvatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}`;

  return (
    <div
      className="
        absolute inset-0 z-[70]
        flex items-center
        justify-center
        overflow-hidden
        bg-slate-950/35
        p-4
        backdrop-blur-[5px]
      "
      onClick={onClose}
      style={{
        animation:
          "fadeIn .2s ease-out",
      }}
    >
      <div
        className="
          mseek-chat-scroll
          relative
          max-h-[92%] w-full
          overflow-y-auto
          rounded-[30px]
          border border-white/70
          bg-white
          shadow-[0_30px_90px_-20px_rgba(15,23,42,.5)]
        "
        onClick={(event) =>
          event.stopPropagation()
        }
        style={{
          animation:
            "profileModalIn .35s cubic-bezier(.2,.9,.25,1.08)",
        }}
      >
        {/* COVER */}
        <div
          className="
            relative h-28
            overflow-hidden
            bg-gradient-to-br
            from-blue-500
            via-indigo-600
            to-violet-600
          "
        >
          <div
            className="
              absolute -left-10
              -top-12
              h-36 w-36
              rounded-full
              bg-cyan-300/30
              blur-3xl
            "
          />

          <div
            className="
              absolute -right-8
              top-2
              h-32 w-32
              rounded-full
              bg-violet-300/30
              blur-3xl
            "
          />

          <button
            type="button"
            onClick={onClose}
            className="
              absolute right-3 top-3
              z-10 flex
              h-9 w-9
              items-center
              justify-center
              rounded-full
              bg-black/15
              text-white
              backdrop-blur-md
              transition-all
              duration-200
              hover:rotate-90
              hover:bg-black/25
              active:scale-90
            "
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div
            className="
              flex h-72
              items-center
              justify-center
            "
          >
            <Loader2
              size={28}
              className="
                animate-spin
                text-indigo-600
              "
            />
          </div>
        ) : (
          <div className="px-5 pb-5">
            {/* PROFILE */}
            <div
              className="
                -mt-12
                flex flex-col
                items-center
                text-center
              "
            >
              <div
                className="
                  relative
                  rounded-full
                  bg-white p-1
                  shadow-xl
                "
              >
                <img
                  src={avatar}
                  alt={name}
                  className="
                    h-24 w-24
                    rounded-full
                    object-cover
                  "
                />

                <span
                  className="
                    absolute
                    bottom-2 right-1
                    h-4 w-4
                    rounded-full
                    border-[3px]
                    border-white
                    bg-emerald-500
                  "
                />
              </div>

              <h3
                className="
                  mt-3 text-xl
                  font-bold
                  tracking-tight
                  text-slate-900
                "
              >
                {name}
              </h3>

              <div
                className="
                  mt-1 flex
                  items-center gap-1.5
                  text-xs
                  font-medium
                  text-emerald-600
                "
              >
                <span
                  className="
                    h-1.5 w-1.5
                    rounded-full
                    bg-emerald-500
                  "
                />

                Sẵn sàng trò chuyện
              </div>

              {profile?.role && (
                <span
                  className="
                    mt-2 rounded-full
                    bg-indigo-50
                    px-3 py-1
                    text-[11px]
                    font-semibold
                    text-indigo-600
                  "
                >
                  {profile.role}
                </span>
              )}

              {profile?.bio && (
                <p
                  className="
                    mt-3
                    max-w-[290px]
                    text-[13px]
                    leading-5
                    text-slate-500
                  "
                >
                  {profile.bio}
                </p>
              )}
            </div>

            {/* INFORMATION */}
            <div className="mt-6">
              <div
                className="
                  mb-2 px-1
                  text-[11px]
                  font-bold
                  uppercase
                  tracking-[0.12em]
                  text-slate-400
                "
              >
                Thông tin
              </div>

              <div className="space-y-2">
                {profile?.email && (
                  <InfoRow
                    icon={
                      <Mail
                        size={17}
                      />
                    }
                    label="Email"
                    value={
                      profile.email
                    }
                    index={0}
                  />
                )}

                {profile?.phoneNumber && (
                  <InfoRow
                    icon={
                      <Phone
                        size={17}
                      />
                    }
                    label="Số điện thoại"
                    value={
                      profile.phoneNumber
                    }
                    index={1}
                  />
                )}

                {profile?.gender && (
                  <InfoRow
                    icon={
                      <UserRound
                        size={17}
                      />
                    }
                    label="Giới tính"
                    value={
                      profile.gender
                    }
                    index={2}
                  />
                )}

                {profile?.dateOfBirth && (
                  <InfoRow
                    icon={
                      <Cake
                        size={17}
                      />
                    }
                    label="Ngày sinh"
                    value={
                      profile.dateOfBirth
                    }
                    index={3}
                  />
                )}

                {profile
                  ?.experienceLevel && (
                  <InfoRow
                    icon={
                      <BriefcaseBusiness
                        size={17}
                      />
                    }
                    label="Trình độ"
                    value={
                      profile.experienceLevel
                    }
                    index={4}
                  />
                )}

                {profile
                  ?.learningGoal && (
                  <InfoRow
                    icon={
                      <Target
                        size={17}
                      />
                    }
                    label="Mục tiêu"
                    value={
                      profile.learningGoal
                    }
                    index={5}
                  />
                )}

                {profile
                  ?.preferredLanguage && (
                  <InfoRow
                    icon={
                      <Languages
                        size={17}
                      />
                    }
                    label="Ngôn ngữ"
                    value={
                      profile.preferredLanguage
                    }
                    index={6}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  index,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  index: number;
}) {
  return (
    <div
      className="
        group flex
        items-center gap-3
        rounded-2xl
        border border-slate-100
        bg-slate-50/80
        p-3
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:border-indigo-100
        hover:bg-white
        hover:shadow-[0_8px_24px_-12px_rgba(79,70,229,.3)]
      "
      style={{
        animation:
          "profileRowIn .35s ease-out backwards",
        animationDelay:
          `${index * 45}ms`,
      }}
    >
      <div
        className="
          flex h-10 w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-white
          text-indigo-500
          shadow-sm
          ring-1
          ring-slate-100
          transition-transform
          duration-200
          group-hover:scale-110
        "
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="
            text-[10px]
            font-semibold
            uppercase
            tracking-wide
            text-slate-400
          "
        >
          {label}
        </div>

        <div
          className="
            mt-0.5
            break-words
            text-[13px]
            font-semibold
            text-slate-700
          "
        >
          {value}
        </div>
      </div>
    </div>
  );
}