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

            migrationBuilder.CreateIndex(
                name: "IX_forum_comments_AuthorID",
                table: "forum_comments",
                column: "AuthorID");

            migrationBuilder.CreateIndex(
                name: "IX_forum_comments_ParentCommentID",
                table: "forum_comments",
                column: "ParentCommentID");

            migrationBuilder.CreateIndex(
                name: "IX_forum_comments_PostID",
                table: "forum_comments",
                column: "PostID");

            migrationBuilder.CreateIndex(
                name: "IX_forum_comments_Status",
                table: "forum_comments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_forum_posts_AuthorID",
                table: "forum_posts",
                column: "AuthorID");

            migrationBuilder.CreateIndex(
                name: "IX_forum_posts_Status",
                table: "forum_posts",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_forum_posts_TopicID",
                table: "forum_posts",
                column: "TopicID");

            migrationBuilder.CreateIndex(
                name: "IX_forum_reactions_CommentID",
                table: "forum_reactions",
                column: "CommentID");

            migrationBuilder.CreateIndex(
                name: "IX_forum_reactions_PostID",
                table: "forum_reactions",
                column: "PostID");

            migrationBuilder.CreateIndex(
                name: "IX_forum_reactions_UserID_TargetType_PostID_CommentID",
                table: "forum_reactions",
                columns: new[] { "UserID", "TargetType", "PostID", "CommentID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_forum_reports_CommentID",
                table: "forum_reports",
                column: "CommentID");

            migrationBuilder.CreateIndex(
                name: "IX_forum_reports_PostID",
                table: "forum_reports",
                column: "PostID");

            migrationBuilder.CreateIndex(
                name: "IX_forum_reports_ReporterID_TargetType_PostID_CommentID",
                table: "forum_reports",
                columns: new[] { "ReporterID", "TargetType", "PostID", "CommentID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_forum_reports_ResolvedByID",
                table: "forum_reports",
                column: "ResolvedByID");

            migrationBuilder.CreateIndex(
                name: "IX_forum_topics_Slug",
                table: "forum_topics",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
