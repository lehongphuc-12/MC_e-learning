namespace MC_BE.Core.Enums.Chat;

public enum CallType
{
    VOICE = 1,
    VIDEO = 2
}

public enum CallStatus
{
    RINGING = 1,
    ACCEPTED = 2,
    REJECTED = 3,
    MISSED = 4,
    ENDED = 5,
    CANCELLED = 6
}