using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MC_BE.Migrations
{
    /// <inheritdoc />
    public partial class AddChatFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "conversations",
                columns: table => new
                {
                    ConversationID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    User1ID = table.Column<int>(type: "integer", nullable: false),
                    User2ID = table.Column<int>(type: "integer", nullable: false),
                    LastMessageAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_conversations", x => x.ConversationID);
                    table.ForeignKey(
                        name: "FK_conversations_users_User1ID",
                        column: x => x.User1ID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_conversations_users_User2ID",
                        column: x => x.User2ID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sticker_packs",
                columns: table => new
                {
                    StickerPackID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ThumbnailUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sticker_packs", x => x.StickerPackID);
                });

            migrationBuilder.CreateTable(
                name: "chat_calls",
                columns: table => new
                {
                    CallID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ConversationID = table.Column<int>(type: "integer", nullable: false),
                    CallerID = table.Column<int>(type: "integer", nullable: false),
                    ReceiverID = table.Column<int>(type: "integer", nullable: false),
                    CallType = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AnsweredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EndedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_calls", x => x.CallID);
                    table.ForeignKey(
                        name: "FK_chat_calls_conversations_ConversationID",
                        column: x => x.ConversationID,
                        principalTable: "conversations",
                        principalColumn: "ConversationID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_chat_calls_users_CallerID",
                        column: x => x.CallerID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_chat_calls_users_ReceiverID",
                        column: x => x.ReceiverID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "conversation_reads",
                columns: table => new
                {
                    ConversationReadID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ConversationID = table.Column<int>(type: "integer", nullable: false),
                    UserID = table.Column<int>(type: "integer", nullable: false),
                    LastReadMessageID = table.Column<long>(type: "bigint", nullable: true),
                    ReadAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_conversation_reads", x => x.ConversationReadID);
                    table.ForeignKey(
                        name: "FK_conversation_reads_conversations_ConversationID",
                        column: x => x.ConversationID,
                        principalTable: "conversations",
                        principalColumn: "ConversationID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_conversation_reads_users_UserID",
                        column: x => x.UserID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "stickers",
                columns: table => new
                {
                    StickerID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    StickerPackID = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stickers", x => x.StickerID);
                    table.ForeignKey(
                        name: "FK_stickers_sticker_packs_StickerPackID",
                        column: x => x.StickerPackID,
                        principalTable: "sticker_packs",
                        principalColumn: "StickerPackID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "chat_messages",
                columns: table => new
                {
                    MessageID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ConversationID = table.Column<int>(type: "integer", nullable: false),
                    SenderID = table.Column<int>(type: "integer", nullable: false),
                    Content = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: true),
                    MessageType = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    StickerID = table.Column<int>(type: "integer", nullable: true),
                    ReplyToMessageID = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RecalledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_messages", x => x.MessageID);
                    table.ForeignKey(
                        name: "FK_chat_messages_chat_messages_ReplyToMessageID",
                        column: x => x.ReplyToMessageID,
                        principalTable: "chat_messages",
                        principalColumn: "MessageID",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_chat_messages_conversations_ConversationID",
                        column: x => x.ConversationID,
                        principalTable: "conversations",
                        principalColumn: "ConversationID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_chat_messages_stickers_StickerID",
                        column: x => x.StickerID,
                        principalTable: "stickers",
                        principalColumn: "StickerID",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_chat_messages_users_SenderID",
                        column: x => x.SenderID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "message_attachments",
                columns: table => new
                {
                    AttachmentID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MessageID = table.Column<long>(type: "bigint", nullable: false),
                    FileUrl = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    MimeType = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    AttachmentType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_message_attachments", x => x.AttachmentID);
                    table.ForeignKey(
                        name: "FK_message_attachments_chat_messages_MessageID",
                        column: x => x.MessageID,
                        principalTable: "chat_messages",
                        principalColumn: "MessageID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "message_reactions",
                columns: table => new
                {
                    ReactionID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MessageID = table.Column<long>(type: "bigint", nullable: false),
                    UserID = table.Column<int>(type: "integer", nullable: false),
                    Reaction = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_message_reactions", x => x.ReactionID);
                    table.ForeignKey(
                        name: "FK_message_reactions_chat_messages_MessageID",
                        column: x => x.MessageID,
                        principalTable: "chat_messages",
                        principalColumn: "MessageID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_message_reactions_users_UserID",
                        column: x => x.UserID,
                        principalTable: "users",
                        principalColumn: "UserID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_chat_calls_CallerID",
                table: "chat_calls",
                column: "CallerID");

            migrationBuilder.CreateIndex(
                name: "IX_chat_calls_ConversationID",
                table: "chat_calls",
                column: "ConversationID");

            migrationBuilder.CreateIndex(
                name: "IX_chat_calls_ReceiverID",
                table: "chat_calls",
                column: "ReceiverID");

            migrationBuilder.CreateIndex(
                name: "IX_chat_calls_Status",
                table: "chat_calls",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_chat_messages_ConversationID_MessageID",
                table: "chat_messages",
                columns: new[] { "ConversationID", "MessageID" });

            migrationBuilder.CreateIndex(
                name: "IX_chat_messages_ReplyToMessageID",
                table: "chat_messages",
                column: "ReplyToMessageID");

            migrationBuilder.CreateIndex(
                name: "IX_chat_messages_SenderID",
                table: "chat_messages",
                column: "SenderID");

            migrationBuilder.CreateIndex(
                name: "IX_chat_messages_StickerID",
                table: "chat_messages",
                column: "StickerID");

            migrationBuilder.CreateIndex(
                name: "IX_conversation_reads_ConversationID_UserID",
                table: "conversation_reads",
                columns: new[] { "ConversationID", "UserID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_conversation_reads_UserID",
                table: "conversation_reads",
                column: "UserID");

            migrationBuilder.CreateIndex(
                name: "IX_conversations_LastMessageAt",
                table: "conversations",
                column: "LastMessageAt");

            migrationBuilder.CreateIndex(
                name: "IX_conversations_User1ID_User2ID",
                table: "conversations",
                columns: new[] { "User1ID", "User2ID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_conversations_User2ID",
                table: "conversations",
                column: "User2ID");

            migrationBuilder.CreateIndex(
                name: "IX_message_attachments_MessageID",
                table: "message_attachments",
                column: "MessageID");

            migrationBuilder.CreateIndex(
                name: "IX_message_reactions_MessageID_UserID",
                table: "message_reactions",
                columns: new[] { "MessageID", "UserID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_message_reactions_UserID",
                table: "message_reactions",
                column: "UserID");

            migrationBuilder.CreateIndex(
                name: "IX_stickers_StickerPackID",
                table: "stickers",
                column: "StickerPackID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chat_calls");

            migrationBuilder.DropTable(
                name: "conversation_reads");

            migrationBuilder.DropTable(
                name: "message_attachments");

            migrationBuilder.DropTable(
                name: "message_reactions");

            migrationBuilder.DropTable(
                name: "chat_messages");

            migrationBuilder.DropTable(
                name: "conversations");

            migrationBuilder.DropTable(
                name: "stickers");

            migrationBuilder.DropTable(
                name: "sticker_packs");
        }
    }
}
