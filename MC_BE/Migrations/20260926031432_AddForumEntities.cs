using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddForumEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "forum_topics",
                columns: table => new
                {
                    TopicID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Icon = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "ACTIVE"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_forum_topics", x => x.TopicID);
                });

            migrationBuilder.CreateTable(
                name: "forum_posts",
                columns: table => new
                {
                    PostID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TopicID = table.Column<int>(type: "integer", nullable: false),
                    AuthorID = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    ViewsCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    ReactionsCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    CommentsCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    ReportsCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "PUBLISHED"),
                    IsPinned = table.Column<bool>(type: "boolean", nullable: false),
                    IsLocked = table.Column<bool>(type: "boolean", nullable: false),
                    IsAnonymous = table.Column<bool>(type: "boolean", nullable: false),
                    RestoredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_forum_posts", x => x.PostID);
                    table.ForeignKey(
                        name: "FK_forum_posts_forum_topics_TopicID",
                        column: x => x.TopicID,
                        principalTable: "forum_topics",
                        principalColumn: "TopicID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_forum_posts_users_AuthorID",
                        column: x => x.AuthorID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "forum_comments",
                columns: table => new
                {
                    CommentID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PostID = table.Column<int>(type: "integer", nullable: false),
                    AuthorID = table.Column<int>(type: "integer", nullable: false),
                    ParentCommentID = table.Column<int>(type: "integer", nullable: true),
                    DepthLevel = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    Content = table.Column<string>(type: "text", nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    IsAnonymous = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    ReactionsCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    ReportsCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "ACTIVE"),
                    RestoredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_forum_comments", x => x.CommentID);
                    table.ForeignKey(
                        name: "FK_forum_comments_forum_comments_ParentCommentID",
                        column: x => x.ParentCommentID,
                        principalTable: "forum_comments",
                        principalColumn: "CommentID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_forum_comments_forum_posts_PostID",
                        column: x => x.PostID,
                        principalTable: "forum_posts",
                        principalColumn: "PostID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_forum_comments_users_AuthorID",
                        column: x => x.AuthorID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "forum_reactions",
                columns: table => new
                {
                    ReactionID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserID = table.Column<int>(type: "integer", nullable: false),
                    TargetType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PostID = table.Column<int>(type: "integer", nullable: true),
                    CommentID = table.Column<int>(type: "integer", nullable: true),
                    ReactionType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "LIKE"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_forum_reactions", x => x.ReactionID);
                    table.ForeignKey(
                        name: "FK_forum_reactions_forum_comments_CommentID",
                        column: x => x.CommentID,
                        principalTable: "forum_comments",
                        principalColumn: "CommentID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_forum_reactions_forum_posts_PostID",
                        column: x => x.PostID,
                        principalTable: "forum_posts",
                        principalColumn: "PostID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_forum_reactions_users_UserID",
                        column: x => x.UserID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "forum_reports",
                columns: table => new
                {
                    ReportID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReporterID = table.Column<int>(type: "integer", nullable: false),
                    TargetType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PostID = table.Column<int>(type: "integer", nullable: true),
                    CommentID = table.Column<int>(type: "integer", nullable: true),
                    Reason = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Details = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "PENDING"),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResolvedByID = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_forum_reports", x => x.ReportID);
                    table.ForeignKey(
                        name: "FK_forum_reports_forum_comments_CommentID",
                        column: x => x.CommentID,
                        principalTable: "forum_comments",
                        principalColumn: "CommentID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_forum_reports_forum_posts_PostID",
                        column: x => x.PostID,
                        principalTable: "forum_posts",
                        principalColumn: "PostID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_forum_reports_users_ReporterID",
                        column: x => x.ReporterID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_forum_reports_users_ResolvedByID",
                        column: x => x.ResolvedByID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

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
