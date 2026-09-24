using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace MC_BE.Features.Forum.DTOs;

public class ForumTopicDto
{
    public int TopicId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public int OrderIndex { get; set; }
    public int PostsCount { get; set; }
}

public class CreateForumTopicDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(120)]
    public string? Slug { get; set; }

    public string? Description { get; set; }

    [MaxLength(50)]
    public string? Icon { get; set; }

    public int OrderIndex { get; set; } = 1;
}

public class ForumPostDto
{
    public int PostId { get; set; }
    public int TopicId { get; set; }
    public string TopicName { get; set; } = string.Empty;
    public string TopicSlug { get; set; } = string.Empty;
    public int AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string? AuthorEmail { get; set; }
    public string? AuthorAvatar { get; set; }
    public string AuthorRole { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int ViewsCount { get; set; }
    public int ReactionsCount { get; set; }
    public int CommentsCount { get; set; }
    public int ReportsCount { get; set; }
    public string Status { get; set; } = "PUBLISHED";
    public bool IsPinned { get; set; }
    public bool IsLocked { get; set; }
    public bool IsAnonymous { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? UserReaction { get; set; }
    public bool UserHasReported { get; set; }
    public bool IsAuthor { get; set; }
}

public class CreatePostRequest
{
    [Required]
    public int TopicId { get; set; }

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }

    public bool IsAnonymous { get; set; } = false;
}

public class UpdatePostRequest
{
    [Required]
    public int TopicId { get; set; }

    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }

    public bool IsAnonymous { get; set; } = false;
}

public class PostQueryParameters
{
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 10;
    public int? TopicId { get; set; }
    public string? Search { get; set; }
    public string SortBy { get; set; } = "latest"; // latest, hot, most_commented
}

public class ForumCommentDto
{
    public int CommentId { get; set; }
    public int PostId { get; set; }
    public int AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string? AuthorAvatar { get; set; }
    public string AuthorRole { get; set; } = string.Empty;
    public int? ParentCommentId { get; set; }
    public int DepthLevel { get; set; } = 1;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public bool IsAnonymous { get; set; }
    public int ReactionsCount { get; set; }
    public int ReportsCount { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? UserReaction { get; set; }
    public bool UserHasReported { get; set; }
    public bool IsAuthor { get; set; }
    public List<ForumCommentDto> Replies { get; set; } = new List<ForumCommentDto>();
}

public class CreateCommentRequest
{
    [Required]
    public int PostId { get; set; }

    public int? ParentCommentId { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }

    public bool IsAnonymous { get; set; } = false;
}

public class UpdateCommentRequest
{
    [Required]
    public string Content { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }

    public bool IsAnonymous { get; set; } = false;
}

public class ToggleReactionRequest
{
    [Required]
    public string TargetType { get; set; } = "POST"; // POST or COMMENT

    public int? PostId { get; set; }
    public int? CommentId { get; set; }

    [Required]
    public string ReactionType { get; set; } = "LIKE"; // LIKE, LOVE, HELPFUL
}

public class ForumReactionSummaryDto
{
    public bool IsReacted { get; set; }
    public string? ReactionType { get; set; }
    public int TotalReactions { get; set; }
}

public class CreateReportRequest
{
    [Required]
    public string TargetType { get; set; } = "POST"; // POST or COMMENT

    public int? PostId { get; set; }
    public int? CommentId { get; set; }

    [Required]
    public string Reason { get; set; } = "OTHER"; // SPAM, HARASSMENT, INAPPROPRIATE, MISINFORMATION, OTHER

    public string? Details { get; set; }
}

public class ForumReportDto
{
    public int ReportId { get; set; }
    public int ReporterId { get; set; }
    public string ReporterName { get; set; } = string.Empty;
    public string TargetType { get; set; } = "POST";
    public int? PostId { get; set; }
    public string? PostTitle { get; set; }
    public string? PostContent { get; set; }
    public string? PostImageUrl { get; set; }
    public string? PostTopicName { get; set; }
    public int? CommentId { get; set; }
    public string? CommentSnippet { get; set; }
    public string? CommentContent { get; set; }
    public string? CommentImageUrl { get; set; }
    public int AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string? AuthorEmail { get; set; }
    public string TargetStatus { get; set; } = "ACTIVE";
    public string Reason { get; set; } = string.Empty;
    public string? Details { get; set; }
    public string Status { get; set; } = "PENDING";
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string? ResolvedByName { get; set; }
}

public class UpdateItemStatusRequest
{
    [Required]
    public string Status { get; set; } = "PUBLISHED"; // PUBLISHED/ACTIVE, HIDDEN_BY_ADMIN, DELETED
}
