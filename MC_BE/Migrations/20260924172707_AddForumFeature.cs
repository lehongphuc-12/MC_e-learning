using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddForumFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
            CREATE TABLE IF NOT EXISTS forum_topics (
                ""TopicID"" SERIAL PRIMARY KEY,
                ""Name"" VARCHAR(100) NOT NULL,
                ""Slug"" VARCHAR(120) NOT NULL UNIQUE,
                ""Description"" TEXT,
                ""Icon"" VARCHAR(50),
                ""OrderIndex"" INT NOT NULL DEFAULT 1,
                ""Status"" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS forum_posts (
                ""PostID"" SERIAL PRIMARY KEY,
                ""TopicID"" INT NOT NULL REFERENCES forum_topics(""TopicID"") ON DELETE RESTRICT,
                ""AuthorID"" INT NOT NULL REFERENCES users(""UserID"") ON DELETE RESTRICT,
                ""Title"" VARCHAR(255) NOT NULL,
                ""Content"" TEXT NOT NULL,
                ""ImageUrl"" TEXT,
                ""ViewsCount"" INT NOT NULL DEFAULT 0,
                ""ReactionsCount"" INT NOT NULL DEFAULT 0,
                ""CommentsCount"" INT NOT NULL DEFAULT 0,
                ""ReportsCount"" INT NOT NULL DEFAULT 0,
                ""Status"" VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED',
                ""IsPinned"" BOOLEAN NOT NULL DEFAULT FALSE,
                ""IsLocked"" BOOLEAN NOT NULL DEFAULT FALSE,
                ""IsAnonymous"" BOOLEAN NOT NULL DEFAULT FALSE,
                ""RestoredAt"" TIMESTAMP WITH TIME ZONE,
                ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS forum_comments (
                ""CommentID"" SERIAL PRIMARY KEY,
                ""PostID"" INT NOT NULL REFERENCES forum_posts(""PostID"") ON DELETE CASCADE,
                ""AuthorID"" INT NOT NULL REFERENCES users(""UserID"") ON DELETE RESTRICT,
                ""ParentCommentID"" INT REFERENCES forum_comments(""CommentID"") ON DELETE RESTRICT,
                ""DepthLevel"" INT NOT NULL DEFAULT 1,
                ""Content"" TEXT NOT NULL,
                ""ImageUrl"" TEXT,
                ""IsAnonymous"" BOOLEAN NOT NULL DEFAULT FALSE,
                ""ReactionsCount"" INT NOT NULL DEFAULT 0,
                ""ReportsCount"" INT NOT NULL DEFAULT 0,
                ""Status"" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
                ""RestoredAt"" TIMESTAMP WITH TIME ZONE,
                ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS forum_reactions (
                ""ReactionID"" SERIAL PRIMARY KEY,
                ""UserID"" INT NOT NULL REFERENCES users(""UserID"") ON DELETE CASCADE,
                ""TargetType"" VARCHAR(20) NOT NULL DEFAULT 'POST',
                ""PostID"" INT REFERENCES forum_posts(""PostID"") ON DELETE CASCADE,
                ""CommentID"" INT REFERENCES forum_comments(""CommentID"") ON DELETE CASCADE,
                ""ReactionType"" VARCHAR(20) NOT NULL DEFAULT 'LIKE',
                ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS forum_reports (
                ""ReportID"" SERIAL PRIMARY KEY,
                ""ReporterID"" INT NOT NULL REFERENCES users(""UserID"") ON DELETE RESTRICT,
                ""TargetType"" VARCHAR(20) NOT NULL DEFAULT 'POST',
                ""PostID"" INT REFERENCES forum_posts(""PostID"") ON DELETE CASCADE,
                ""CommentID"" INT REFERENCES forum_comments(""CommentID"") ON DELETE CASCADE,
                ""Reason"" VARCHAR(50) NOT NULL DEFAULT 'OTHER',
                ""Details"" VARCHAR(500),
                ""Status"" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ""ResolvedAt"" TIMESTAMP WITH TIME ZONE,
                ""ResolvedByID"" INT REFERENCES users(""UserID"") ON DELETE RESTRICT
            );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "forum_reactions");

            migrationBuilder.DropTable(
                name: "forum_reports");

            migrationBuilder.DropTable(
                name: "forum_comments");

            migrationBuilder.DropTable(
                name: "forum_posts");

            migrationBuilder.DropTable(
                name: "forum_topics");
        }
    }
}
