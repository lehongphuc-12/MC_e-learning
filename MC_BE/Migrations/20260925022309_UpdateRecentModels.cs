using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class UpdateRecentModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_forum_comments_AuthorID"
                ON forum_comments ("AuthorID");
            """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_forum_comments_ParentCommentID"
                ON forum_comments ("ParentCommentID");
            """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_forum_comments_PostID"
                ON forum_comments ("PostID");
            """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_forum_comments_Status"
                ON forum_comments ("Status");
            """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_forum_posts_AuthorID"
                ON forum_posts ("AuthorID");
            """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_forum_posts_Status"
                ON forum_posts ("Status");
            """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_forum_posts_TopicID"
                ON forum_posts ("TopicID");
            """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_forum_reactions_CommentID"
                ON forum_reactions ("CommentID");
            """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_forum_reactions_PostID"
                ON forum_reactions ("PostID");
            """);

            migrationBuilder.Sql("""
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_forum_reactions_UserID_TargetType_PostID_CommentID"
                ON forum_reactions ("UserID", "TargetType", "PostID", "CommentID");
            """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_forum_reports_CommentID"
                ON forum_reports ("CommentID");
            """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_forum_reports_PostID"
                ON forum_reports ("PostID");
            """);

            migrationBuilder.Sql("""
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_forum_reports_ReporterID_TargetType_PostID_CommentID"
                ON forum_reports ("ReporterID", "TargetType", "PostID", "CommentID");
            """);

            migrationBuilder.Sql("""
                CREATE INDEX IF NOT EXISTS "IX_forum_reports_ResolvedByID"
                ON forum_reports ("ResolvedByID");
            """);

            migrationBuilder.Sql("""
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_forum_topics_Slug"
                ON forum_topics ("Slug");
            """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
