using MC_BE.Core.Entities.Chat;
using MC_BE.Core.Enums.Chat;
using MC_BE.Features.Chat.DTOs;
using MC_BE.Features.Chat.Services.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Chat.Services;

public class ChatService : IChatService {
    private readonly SmartMcDbContext _context;
    private readonly ICloudinaryService _cloudinaryService;

    private const long MaxImageSize = 10 * 1024 * 1024;
    private const long MaxFileSize = 25 * 1024 * 1024;
    private const long MaxVoiceSize = 20 * 1024 * 1024;

    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tif", ".tiff", ".heic", ".heif", ".avif"
    };

    // File thường: cho phép mọi phần mở rộng, chỉ chặn các định dạng có khả năng thực thi/script trực tiếp.
    private static readonly HashSet<string> BlockedFileExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".exe", ".dll", ".com", ".scr", ".msi", ".msp", ".msix", ".appx", ".appxbundle",
        ".bat", ".cmd", ".ps1", ".psm1", ".vbs", ".vbe", ".js", ".jse", ".wsf", ".wsh",
        ".hta", ".cpl", ".reg", ".lnk", ".scf", ".jar", ".apk", ".app", ".dmg", ".pkg", ".sh", ".bash", ".zsh", ".fish", ".run", ".bin"
    };

    private static readonly HashSet<string> AllowedAudioExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".webm", ".mp3", ".m4a", ".wav", ".ogg", ".oga", ".aac", ".flac", ".opus", ".3gp"
    };

    private static readonly HashSet<string> AllowedReactions = new()
    {
        "👍", "❤️", "😂", "😮", "😢", "😡"
    };

    public ChatService(SmartMcDbContext context, ICloudinaryService cloudinaryService)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
    }

    // ============================================================
    // SEARCH USERS
    // ============================================================

    public async Task<List<ChatUserDto>> SearchUsersAsync(int currentUserId, string keyword)
    {
        keyword = keyword?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(keyword))
        {
            return new List<ChatUserDto>();
        }

        var searchPattern = $"%{keyword}%";

        var users = await _context.Users.AsNoTracking().Where(user => user.UserId != currentUserId && user.Status == "ACTIVE" && (
                        EF.Functions.ILike(user.FullName, searchPattern) || EF.Functions.ILike(user.Email, searchPattern)
)).OrderBy(user => user.FullName).Take(20).Select(user => new
                {
                    user.UserId, user.FullName, user.Email, user.AvatarUrl, user.LastSeenAt
                }).ToListAsync();

        if (users.Count == 0)
        {
            return new List<ChatUserDto>();
        }

        var userIds = users.Select(x => x.UserId).ToList();

        var existingConversations = await _context.Conversations.AsNoTracking().Where(conversation => (conversation.User1Id == currentUserId &&
                        userIds.Contains(conversation.User2Id)
) || (conversation.User2Id == currentUserId && userIds.Contains(conversation.User1Id))).Select(conversation => new
                {
                    conversation.ConversationId,

                    OtherUserId = conversation.User1Id == currentUserId ? conversation.User2Id : conversation.User1Id }).ToListAsync();

        var conversationMap = existingConversations.GroupBy(x => x.OtherUserId).ToDictionary(group => group.Key, group => group.Select(x =>
                                (int?)x.ConversationId).FirstOrDefault());

        return users.Select(user => new ChatUserDto { UserId = user.UserId,

                    FullName = user.FullName,

                    Email = user.Email,

                    AvatarUrl = user.AvatarUrl, LastSeenAt = user.LastSeenAt,

                    ConversationId = conversationMap.GetValueOrDefault(user.UserId) }).ToList();
    }

    // ============================================================
    // CREATE OR GET CONVERSATION
    // ============================================================

    public async Task<ConversationDto> CreateOrGetConversationAsync(int currentUserId, int otherUserId)
    {
        if (currentUserId == otherUserId)
        {
            throw new ArgumentException("Không thể tạo cuộc trò chuyện với chính mình.");
        }

        var otherUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == otherUserId && x.Status == "ACTIVE")
            ?? throw new KeyNotFoundException("Người dùng không tồn tại hoặc không hoạt động.");

        var conversation = await _context.Conversations.FirstOrDefaultAsync(x => (x.User1Id == currentUserId && x.User2Id == otherUserId) || (
                        x.User1Id == otherUserId && x.User2Id == currentUserId));

        if (conversation == null)
        {
            var first = Math.Min(currentUserId, otherUserId);

            var second = Math.Max(currentUserId, otherUserId);

            conversation = new Conversation
                {
                    User1Id = first, User2Id = second,

                    CreatedAt = DateTime.UtcNow,

                    UpdatedAt = DateTime.UtcNow };

            _context.Conversations.Add(conversation);

            await _context.SaveChangesAsync();
        }

        return await BuildConversationDtoAsync(conversation.ConversationId, currentUserId);
    }

    // ============================================================
    // GET CONVERSATIONS
    // ============================================================

    public async Task<List<ConversationDto>> GetConversationsAsync(int currentUserId)
    {
        var ids = await _context.Conversations.AsNoTracking().Where(x => x.User1Id == currentUserId || x.User2Id == currentUserId)
.OrderByDescending(x => x.LastMessageAt ?? x.CreatedAt).Select(x => x.ConversationId).ToListAsync();

        var result = new List<ConversationDto>();

        foreach (var id in ids)
        {
            result.Add(await BuildConversationDtoAsync(id, currentUserId));
        }

        return result;
    }

    // ============================================================
    // GET CHAT USER PROFILE
    // ============================================================
    public async Task<ChatUserProfileDto> GetUserProfileAsync(int currentUserId, int conversationId)
    {
        var conversation = await GetConversationForUserAsync(conversationId, currentUserId);
        var otherUserId = conversation.User1Id == currentUserId ? conversation.User2Id : conversation.User1Id;

        var user = await _context.Users.AsNoTracking().Include(x => x.Role).Include(x => x.UserProfile)
.FirstOrDefaultAsync(x => x.UserId == otherUserId && x.Status == "ACTIVE")
            ?? throw new KeyNotFoundException("Người dùng không tồn tại hoặc không hoạt động.");

        return new ChatUserProfileDto
        {
            UserId = user.UserId, FullName = user.FullName, Email = user.Email, AvatarUrl = user.AvatarUrl, PhoneNumber = user.PhoneNumber,
            Role = user.Role.RoleName, Bio = user.UserProfile?.Bio, Gender = user.UserProfile?.Gender, DateOfBirth = user.UserProfile?.DateOfBirth,
            ExperienceLevel = user.UserProfile?.ExperienceLevel, LearningGoal = user.UserProfile?.LearningGoal,
            PreferredLanguage = user.UserProfile?.PreferredLanguage };
    }

    // ============================================================
    // GET MESSAGES
    // ============================================================

    public async Task< ChatPagedResult<ChatMessageDto>> GetMessagesAsync(int currentUserId, int conversationId, int page, int pageSize)
    {
        await EnsureConversationMemberAsync(currentUserId, conversationId);

        page = Math.Max(1, page);

        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.ChatMessages.AsNoTracking().Where(x => x.ConversationId == conversationId);

        var totalItems = await query.CountAsync();

        var messageIds = await query.OrderByDescending(x => x.MessageId).Skip((page - 1) * pageSize).Take(pageSize).Select(x => x.MessageId)
.ToListAsync();

        messageIds.Reverse();

        var messages = new List<ChatMessageDto>();

        foreach (var messageId in messageIds)
        {
            messages.Add(await GetMessageDtoAsync(messageId, currentUserId));
        }

        return new ChatPagedResult<ChatMessageDto>
        {
            Items = messages,

            Page = page,

            PageSize = pageSize,

            TotalItems = totalItems,

            TotalPages = (int)Math.Ceiling(totalItems / (double)pageSize) };
    }

    // ============================================================
    // SEND TEXT
    // ============================================================

    public async Task<ChatMessageDto> SendTextAsync(int currentUserId, SendTextMessageRequest request)
    {
        var content = request.Content?.Trim();

        if (string.IsNullOrWhiteSpace(content))
        {
            throw new ArgumentException("Tin nhắn không được để trống.");
        }

        if (content.Length > 5000)
        {
            throw new ArgumentException("Tin nhắn không được vượt quá 5000 ký tự.");
        }

        var conversation = await GetConversationForUserAsync(request.ConversationId, currentUserId);

        await ValidateReplyAsync(request.ConversationId, request.ReplyToMessageId);

        var message = new ChatMessage
            {
                ConversationId = request.ConversationId,

                SenderId = currentUserId,

                Content = content,

                MessageType = ChatMessageType.TEXT,

                Status = ChatMessageStatus.SENT,

                ReplyToMessageId = request.ReplyToMessageId,

                CreatedAt = DateTime.UtcNow,

                UpdatedAt = DateTime.UtcNow };

        _context.ChatMessages.Add(message);

        conversation.LastMessageAt = message.CreatedAt;

        conversation.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetMessageDtoAsync(message.MessageId, currentUserId);
    }

    // ============================================================
    // SEND STICKER
    // ============================================================

    public async Task<ChatMessageDto> SendStickerAsync(int currentUserId, SendStickerRequest request)
    {
        var conversation = await GetConversationForUserAsync(request.ConversationId, currentUserId);

        var sticker = await _context.Stickers.FirstOrDefaultAsync(x => x.StickerId == request.StickerId && x.IsActive);

        if (sticker == null)
        {
            throw new KeyNotFoundException("Sticker không tồn tại.");
        }

        await ValidateReplyAsync(request.ConversationId, request.ReplyToMessageId);

        var message = new ChatMessage
            {
                ConversationId = request.ConversationId,

                SenderId = currentUserId,

                StickerId = sticker.StickerId,

                MessageType = ChatMessageType.STICKER,

                Status = ChatMessageStatus.SENT,

                ReplyToMessageId = request.ReplyToMessageId,

                CreatedAt = DateTime.UtcNow,

                UpdatedAt = DateTime.UtcNow };

        _context.ChatMessages.Add(message);

        conversation.LastMessageAt = message.CreatedAt;

        conversation.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetMessageDtoAsync(message.MessageId, currentUserId);
    }

    // ============================================================
    // SEND FILE / IMAGE - CLOUDINARY
    // ============================================================

    public async Task<ChatMessageDto> SendFileAsync(int currentUserId, int conversationId, IFormFile file, long? replyToMessageId)
    {
        var conversation = await GetConversationForUserAsync(conversationId, currentUserId);
        if (file == null || file.Length <= 0) throw new ArgumentException("File không hợp lệ.");

        var originalFileName = Path.GetFileName(file.FileName);
        if (string.IsNullOrWhiteSpace(originalFileName)) throw new ArgumentException("Tên file không hợp lệ.");

        var extension = Path.GetExtension(originalFileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(extension)) throw new ArgumentException("File phải có phần mở rộng.");
        if (BlockedFileExtensions.Contains(extension)) throw new ArgumentException($"Định dạng file '{extension}' không được phép tải lên.");

        var contentType = file.ContentType?.Trim() ?? string.Empty;
        var isImage = AllowedImageExtensions.Contains(extension) && contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);

        if (AllowedImageExtensions.Contains(extension) && !contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Ảnh có Content-Type không hợp lệ.");

        if (isImage && file.Length > MaxImageSize) throw new ArgumentException("Ảnh không được vượt quá 10MB.");
        if (!isImage && file.Length > MaxFileSize) throw new ArgumentException("File không được vượt quá 25MB.");

        await ValidateReplyAsync(conversationId, replyToMessageId);

        string fileUrl;

        if (isImage)
        {
            var uploadResult = await _cloudinaryService.UploadImageAsync(file, "mc_elearning/chat/images");
            if (uploadResult.Error != null) throw new InvalidOperationException($"Không thể tải ảnh lên Cloudinary: {uploadResult.Error.Message}");
            if (uploadResult.SecureUrl == null) throw new InvalidOperationException("Cloudinary không trả về URL của ảnh.");
            fileUrl = uploadResult.SecureUrl.ToString();
        }
        else
        {
            var uploadResult = await _cloudinaryService.UploadRawFileAsync(file, "mc_elearning/chat/files");
            if (uploadResult.Error != null) throw new InvalidOperationException($"Không thể tải file lên Cloudinary: {uploadResult.Error.Message}");
            if (uploadResult.SecureUrl == null) throw new InvalidOperationException("Cloudinary không trả về URL của file.");
            fileUrl = uploadResult.SecureUrl.ToString();
        }

        var now = DateTime.UtcNow;
        var message = new ChatMessage
        {
            ConversationId = conversationId, SenderId = currentUserId, MessageType = isImage ? ChatMessageType.IMAGE : ChatMessageType.FILE,
            Status = ChatMessageStatus.SENT, ReplyToMessageId = replyToMessageId, CreatedAt = now, UpdatedAt = now };

        _context.ChatMessages.Add(message);
        await _context.SaveChangesAsync();

        _context.MessageAttachments.Add(new MessageAttachment { MessageId = message.MessageId, FileUrl = fileUrl, FileName = originalFileName,
            MimeType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType, FileSize = file.Length,
            AttachmentType = isImage ? "IMAGE" : "FILE", CreatedAt = now });

        conversation.LastMessageAt = now;
        conversation.UpdatedAt = now;
        await _context.SaveChangesAsync();

        return await GetMessageDtoAsync(message.MessageId, currentUserId);
    }

    // ============================================================
    // SEND VOICE - CLOUDINARY
    // ============================================================

    public async Task<ChatMessageDto> SendVoiceAsync(int currentUserId, int conversationId, IFormFile audio, int durationSeconds, long? replyToMessageId)
    {
        var conversation = await GetConversationForUserAsync(conversationId, currentUserId);
        if (audio == null || audio.Length <= 0) throw new ArgumentException("File ghi âm không hợp lệ.");
        if (durationSeconds is < 1 or > 600) throw new ArgumentException("Voice phải từ 1 đến 600 giây.");
        if (audio.Length > MaxVoiceSize) throw new ArgumentException("Voice không được vượt quá 20MB.");

        var originalFileName = Path.GetFileName(audio.FileName);
        if (string.IsNullOrWhiteSpace(originalFileName)) throw new ArgumentException("Tên file ghi âm không hợp lệ.");

        var extension = Path.GetExtension(originalFileName).ToLowerInvariant();
        if (!AllowedAudioExtensions.Contains(extension)) throw new ArgumentException("Định dạng audio không được hỗ trợ.");
        if (string.IsNullOrWhiteSpace(audio.ContentType) || !audio.ContentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("File không phải audio hợp lệ.");

        await ValidateReplyAsync(conversationId, replyToMessageId);

        // Cloudinary xử lý audio bằng resource type Video.
        var uploadResult = await _cloudinaryService.UploadVideoAsync(audio, "mc_elearning/chat/voices");
        if (uploadResult.Error != null) throw new InvalidOperationException($"Không thể tải voice lên Cloudinary: {uploadResult.Error.Message}");
        if (uploadResult.SecureUrl == null) throw new InvalidOperationException("Cloudinary không trả về URL của voice.");

        var now = DateTime.UtcNow;
        var message = new ChatMessage
        {
            ConversationId = conversationId, SenderId = currentUserId, MessageType = ChatMessageType.VOICE, Status = ChatMessageStatus.SENT,
            ReplyToMessageId = replyToMessageId, CreatedAt = now, UpdatedAt = now };

        _context.ChatMessages.Add(message);
        await _context.SaveChangesAsync();

        _context.MessageAttachments.Add(new MessageAttachment { MessageId = message.MessageId, FileUrl = uploadResult.SecureUrl.ToString(),
            FileName = originalFileName, MimeType = audio.ContentType, FileSize = audio.Length, AttachmentType = "VOICE",
            DurationSeconds = durationSeconds, CreatedAt = now });

        conversation.LastMessageAt = now;
        conversation.UpdatedAt = now;
        await _context.SaveChangesAsync();

        return await GetMessageDtoAsync(message.MessageId, currentUserId);
    }

    // ============================================================
    // FORWARD MESSAGE
    // ============================================================

    public async Task<List<ChatMessageDto>> ForwardMessageAsync(int currentUserId, long messageId, ForwardMessageRequest request)
    {
        if (request.ConversationIds == null || request.ConversationIds.Count == 0)
        {
            throw new ArgumentException("Phải chọn ít nhất một cuộc trò chuyện.");
        }

        var sourceMessage = await _context.ChatMessages.AsNoTracking().Include(x => x.Attachments).FirstOrDefaultAsync(x =>
                    x.MessageId == messageId) ?? throw new KeyNotFoundException("Tin nhắn không tồn tại.");

        await EnsureConversationMemberAsync(currentUserId, sourceMessage.ConversationId);

        if (sourceMessage.Status == ChatMessageStatus.RECALLED)
        {
            throw new InvalidOperationException("Không thể chuyển tiếp tin nhắn đã thu hồi.");
        }

        var conversationIds = request.ConversationIds.Where(x => x > 0).Distinct().ToList();

        if (conversationIds.Count == 0)
        {
            throw new ArgumentException("Danh sách cuộc trò chuyện không hợp lệ.");
        }

        if (conversationIds.Count > 20)
        {
            throw new ArgumentException("Chỉ có thể chuyển tiếp tối đa 20 cuộc trò chuyện.");
        }

        var createdMessages = new List<ChatMessage>();

        foreach (var conversationId in conversationIds)
        {
            var conversation = await GetConversationForUserAsync(conversationId, currentUserId);

            var now = DateTime.UtcNow;

            var forwarded = new ChatMessage
                {
                    ConversationId = conversationId,

                    SenderId = currentUserId,

                    Content = sourceMessage.Content,

                    MessageType = sourceMessage.MessageType,

                    Status = ChatMessageStatus.SENT,

                    StickerId = sourceMessage.StickerId,

                    ReplyToMessageId = null,

                    CreatedAt = now,

                    UpdatedAt = now };

            _context.ChatMessages.Add(forwarded);

            await _context.SaveChangesAsync();

            if (sourceMessage.Attachments.Count > 0)
            {
                foreach (var attachment in sourceMessage.Attachments)
                {
                    _context.MessageAttachments.Add(new MessageAttachment { MessageId = forwarded.MessageId,

                            FileUrl = attachment.FileUrl,

                            FileName = attachment.FileName,

                            MimeType = attachment.MimeType,

                            FileSize = attachment.FileSize,

                            AttachmentType = attachment.AttachmentType,

                            DurationSeconds = attachment.DurationSeconds,

                            CreatedAt = now });
                }
            }

            conversation.LastMessageAt = now;

            conversation.UpdatedAt = now;

            await _context.SaveChangesAsync();

            createdMessages.Add(forwarded);
        }

        var result = new List<ChatMessageDto>();

        foreach (var message in createdMessages)
        {
            result.Add(await GetMessageDtoAsync(message.MessageId, currentUserId));
        }

        return result;
    }
    // ============================================================
    // RECALL MESSAGE
    // ============================================================

    public async Task<ChatMessageDto> RecallMessageAsync(int currentUserId, long messageId)
    {
        var message = await _context.ChatMessages.FirstOrDefaultAsync(x => x.MessageId == messageId) ?? throw new KeyNotFoundException(
                "Tin nhắn không tồn tại.");

        if (message.SenderId != currentUserId)
        {
            throw new UnauthorizedAccessException("Bạn chỉ có thể thu hồi tin nhắn của mình.");
        }

        if (message.Status == ChatMessageStatus.RECALLED)
        {
            return await GetMessageDtoAsync(messageId, currentUserId);
        }

        message.Status = ChatMessageStatus.RECALLED;

        message.Content = null;
        message.StickerId = null;

        message.RecalledAt = DateTime.UtcNow;

        message.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetMessageDtoAsync(messageId, currentUserId);
    }

    // ============================================================
    // REACTION
    // ============================================================

    public async Task<ChatMessageDto> ReactAsync(int currentUserId, long messageId, string reaction)
    {
        if (!AllowedReactions.Contains(reaction))
        {
            throw new ArgumentException("Reaction không hợp lệ.");
        }

        var message = await _context.ChatMessages.AsNoTracking().FirstOrDefaultAsync(x => x.MessageId == messageId)
            ?? throw new KeyNotFoundException("Tin nhắn không tồn tại.");

        await EnsureConversationMemberAsync(currentUserId, message.ConversationId);

        if (message.Status == ChatMessageStatus.RECALLED)
        {
            throw new InvalidOperationException("Không thể reaction tin nhắn đã thu hồi.");
        }

        var existing = await _context.MessageReactions.FirstOrDefaultAsync(x => x.MessageId == messageId && x.UserId == currentUserId);

        if (existing == null)
        {
            _context.MessageReactions.Add(new MessageReaction { MessageId = messageId,

                    UserId = currentUserId,

                    Reaction = reaction,

                    CreatedAt = DateTime.UtcNow });
        }
        else if (existing.Reaction == reaction)
        {
            _context.MessageReactions.Remove(existing);
        }
        else
        {
            existing.Reaction = reaction;

            existing.CreatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return await GetMessageDtoAsync(messageId, currentUserId);
    }

    // ============================================================
    // MARK READ
    // ============================================================

    public async Task MarkReadAsync(int currentUserId, int conversationId, long messageId)
    {
        await EnsureConversationMemberAsync(currentUserId, conversationId);

        var messageExists = await _context.ChatMessages.AnyAsync(x => x.MessageId == messageId && x.ConversationId == conversationId);

        if (!messageExists)
        {
            throw new KeyNotFoundException("Tin nhắn không tồn tại trong cuộc trò chuyện.");
        }

        var read = await _context.ConversationReads.FirstOrDefaultAsync(x => x.ConversationId == conversationId && x.UserId == currentUserId);

        if (read == null)
        {
            read = new ConversationRead
                {
                    ConversationId = conversationId,

                    UserId = currentUserId,

                    LastReadMessageId = messageId,

                    ReadAt = DateTime.UtcNow };

            _context.ConversationReads.Add(read);
        }
        else
        {
            if (!read.LastReadMessageId.HasValue || messageId > read.LastReadMessageId.Value)
            {
                read.LastReadMessageId = messageId;
            }

            read.ReadAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    // ============================================================
    // GET STICKER PACKS
    // ============================================================

    public async Task<List<StickerPackDto>> GetStickerPacksAsync()
    {
        return await _context.StickerPacks.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.StickerPackId).Select(x => new StickerPackDto {
                    StickerPackId = x.StickerPackId,

                    Name = x.Name,

                    ThumbnailUrl = x.ThumbnailUrl,

                    Stickers = x.Stickers.Where(s => s.IsActive).OrderBy(s => s.StickerId).Select(s => new StickerDto { StickerId = s.StickerId,

                                    StickerPackId = s.StickerPackId,

                                    Name = s.Name,

                                    ImageUrl = s.ImageUrl }).ToList() }).ToListAsync();
    }

    // ============================================================
    // GET OTHER USER
    // ============================================================

    public async Task<int> GetOtherUserIdAsync(int currentUserId, int conversationId)
    {
        var conversation = await GetConversationForUserAsync(conversationId, currentUserId);

        return conversation.User1Id == currentUserId ? conversation.User2Id : conversation.User1Id;
    }

    // ============================================================
    // ENSURE CONVERSATION MEMBER
    // ============================================================

    public async Task EnsureConversationMemberAsync(int currentUserId, int conversationId)
    {
        await GetConversationForUserAsync(conversationId, currentUserId);
    }

    // ============================================================
    // GET CONVERSATION FOR USER
    // ============================================================

    private async Task<Conversation> GetConversationForUserAsync(int conversationId, int currentUserId)
    {
        var conversation = await _context.Conversations.FirstOrDefaultAsync(x => x.ConversationId == conversationId);

        if (conversation == null)
        {
            throw new KeyNotFoundException("Cuộc trò chuyện không tồn tại.");
        }

        if (conversation.User1Id != currentUserId && conversation.User2Id != currentUserId)
        {
            throw new UnauthorizedAccessException("Bạn không thuộc cuộc trò chuyện.");
        }

        return conversation;
    }

    // ============================================================
    // VALIDATE REPLY
    // ============================================================

    private async Task ValidateReplyAsync(int conversationId, long? replyId)
    {
        if (!replyId.HasValue)
        {
            return;
        }

        var exists = await _context.ChatMessages.AnyAsync(x => x.MessageId == replyId.Value && x.ConversationId == conversationId);

        if (!exists)
        {
            throw new ArgumentException("Tin nhắn được reply không hợp lệ.");
        }
    }

    // ============================================================
    // BUILD MESSAGE DTO
    // ============================================================

    private async Task<ChatMessageDto> GetMessageDtoAsync(long messageId, int currentUserId)
    {
        var message = await _context.ChatMessages.AsNoTracking()

.Include(x => x.Sender)

.Include(x => x.Sticker)

.Include(x => x.Attachments)

.Include(x => x.Reactions).ThenInclude(x => x.User)

.Include(x => x.ReplyToMessage).ThenInclude(x => x!.Sender)

.FirstOrDefaultAsync(x => x.MessageId == messageId)

            ?? throw new KeyNotFoundException("Tin nhắn không tồn tại.");

        var otherUserId = await GetOtherUserIdAsync(currentUserId, message.ConversationId);

        var otherRead = await _context.ConversationReads.AsNoTracking().FirstOrDefaultAsync(x => x.ConversationId == message.ConversationId &&
                    x.UserId == otherUserId);

        var recalled = message.Status == ChatMessageStatus.RECALLED;

        return new ChatMessageDto
        {
            MessageId = message.MessageId,

            ConversationId = message.ConversationId,

            SenderId = message.SenderId,

            SenderName = message.Sender.FullName,

            SenderAvatarUrl = message.Sender.AvatarUrl,

            Content = recalled ? null : message.Content,

            MessageType = message.MessageType.ToString(),

            Status = message.Status.ToString(),

            CreatedAt = message.CreatedAt,

            UpdatedAt = message.UpdatedAt,

            RecalledAt = message.RecalledAt,

            IsRead = otherRead?.LastReadMessageId >= message.MessageId,

            Sticker = recalled || message.Sticker == null

                    ? null

                    : new StickerDto
                    {
                        StickerId = message.Sticker.StickerId,

                        StickerPackId = message.Sticker.StickerPackId,

                        Name = message.Sticker.Name,

                        ImageUrl = message.Sticker.ImageUrl },

            Attachments = recalled

                    ? new List<
                        AttachmentDto>()

                    : message.Attachments.Select(x => new AttachmentDto { AttachmentId = x.AttachmentId,

                                FileUrl = x.FileUrl,

                                FileName = x.FileName,

                                MimeType = x.MimeType,

                                FileSize = x.FileSize,

                                AttachmentType = x.AttachmentType,

                                DurationSeconds = x.DurationSeconds }).ToList(),

            Reactions = recalled

                    ? new List<
                        ReactionDto>()

                    : message.Reactions.Select(x => new ReactionDto { ReactionId = x.ReactionId,

                                UserId = x.UserId,

                                UserName = x.User.FullName,

                                Reaction = x.Reaction }).ToList(),

            ReplyTo = message.ReplyToMessage == null

                    ? null

                    : new ReplyMessageDto
                    {
                        MessageId = message.ReplyToMessage.MessageId,

                        SenderId = message.ReplyToMessage.SenderId,

                        SenderName = message.ReplyToMessage.Sender.FullName,

                        Content = message.ReplyToMessage.Status == ChatMessageStatus.RECALLED

                                ? null

                                : message.ReplyToMessage.Content,

                        MessageType = message.ReplyToMessage.MessageType.ToString(),

                        Status = message.ReplyToMessage.Status.ToString()
                    }
        };
    }

    // ============================================================
    // BUILD CONVERSATION DTO
    // ============================================================

    private async Task<ConversationDto> BuildConversationDtoAsync(int conversationId, int currentUserId)
    {
        var conversation = await _context.Conversations.AsNoTracking().Include(x => x.User1).Include(x => x.User2).FirstAsync(x =>
                    x.ConversationId == conversationId);

        var other = conversation.User1Id == currentUserId

                ? conversation.User2 : conversation.User1;

        var lastMessageId = await _context.ChatMessages.Where(x => x.ConversationId == conversationId).OrderByDescending(x => x.MessageId)
.Select(x => (long?)x.MessageId).FirstOrDefaultAsync();

        ChatMessageDto?
            lastMessage = null;

        if (lastMessageId.HasValue)
        {
            lastMessage = await GetMessageDtoAsync(lastMessageId.Value, currentUserId);
        }

        var read = await _context.ConversationReads.AsNoTracking().FirstOrDefaultAsync(x => x.ConversationId == conversationId && x.UserId ==
                    currentUserId);

        var lastRead = read?.LastReadMessageId ?? 0;

        var unread = await _context.ChatMessages.CountAsync(x => x.ConversationId == conversationId && x.SenderId != currentUserId && x.MessageId >
                    lastRead);

        return new ConversationDto
        {
            ConversationId = conversation.ConversationId,

            OtherUserId = other.UserId,

            OtherUserName = other.FullName,

            OtherUserAvatarUrl = other.AvatarUrl, OtherUserLastSeenAt = other.LastSeenAt,

            LastMessage = lastMessage,

            UnreadCount = unread,

            LastMessageAt = conversation.LastMessageAt,

            CreatedAt = conversation.CreatedAt };
    }
}
