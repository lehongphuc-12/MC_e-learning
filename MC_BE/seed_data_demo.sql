-- =============================================================================
-- SQL Seed Data script for Demo: LE13 (Learning) & LE15 (Certification)
-- Learner ID: 1 (huynhthiminhnguyet198@gmail.com)
-- =============================================================================

-- 1. Insert Categories
INSERT INTO "CATEGORY" ("CategoryID", "CategoryName", "Description", "Status")
VALUES 
  (1, 'Dẫn Chương Trình Sự Kiện', 'Khóa học đào tạo kỹ năng MC sự kiện chuyên nghiệp', 'ACTIVE'),
  (2, 'Luyện Giọng Nói & Ngôn Ngữ', 'Khóa học làm chủ giọng nói và biểu cảm', 'ACTIVE')
ON CONFLICT ("CategoryID") DO NOTHING;

-- 2. Insert Sample Courses (3 Courses, InstructorID = 1, Status = PUBLISHED)
INSERT INTO "COURSE" ("CourseID", "CategoryID", "InstructorID", "Title", "Slug", "Description", "ThumbnailUrl", "Price", "Level", "Status", "CreatedAt", "UpdatedAt")
VALUES 
  (1, 1, 1, 'Kỹ Năng MC Sự Kiện & Hội Nghị Chuyên Nghiệp', 'ky-nang-mc-su-kien-hoi-nghi-chuyen-nghiep', 'Khóa học hướng dẫn quy trình dẫn chương trình từ A-Z, xử lý sự cố sân khấu và làm chủ không khí hội nghị.', 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=60', 1490000.00, 'BEGINNER', 'PUBLISHED', NOW(), NOW()),
  (2, 2, 1, 'Nghệ Thuật Làm Chủ Giọng Nói & Ngôn Ngữ Cơ Thể', 'nghe-thuat-lam-chu-giong-noi-ngon-ngu-co-the', 'Khóa học rèn luyện hơi thở, phát âm tròn vành rõ chữ, kiểm soát cảm xúc và làm chủ ngôn ngữ cơ thể trên sân khấu.', 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&auto=format&fit=crop&q=60', 1990000.00, 'INTERMEDIATE', 'PUBLISHED', NOW(), NOW()),
  (3, 1, 1, 'Kỹ Thuật Xử Lý Kịch Bản MC & Biến Tấu Linh Hoạt', 'ky-thuat-xu-ly-kich-ban-mc-bien-tau-linh-hoat', 'Khóa học chuyên sâu hướng dẫn cách biên tập, dàn dựng và biến tấu linh hoạt mọi thể loại kịch bản MC sự kiện.', 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&auto=format&fit=crop&q=60', 1290000.00, 'ADVANCED', 'PUBLISHED', NOW(), NOW())
ON CONFLICT ("CourseID") DO UPDATE SET "Status" = 'PUBLISHED';

-- 3. Insert Modules for Courses
INSERT INTO "MODULE" ("ModuleID", "CourseID", "Title", "Description", "OrderIndex", "CreatedAt", "UpdatedAt")
VALUES 
  (1, 1, 'Chương 1: Kỹ năng nhập môn & Chuẩn bị kịch bản chương trình', 'Tổng quan về nghề MC và tác phong chuyên nghiệp', 1, NOW(), NOW()),
  (2, 1, 'Chương 2: Xử lý tình huống & Làm chủ sân khấu', 'Kỹ thuật xử lý sự cố kịch bản và điều phối sự kiện', 2, NOW(), NOW()),
  (3, 2, 'Chương 1: Phương pháp luyện hơi thở & Phát âm', 'Luyện tập khẩu hình và làm chủ hơi thở bụng', 1, NOW(), NOW()),
  (4, 2, 'Chương 2: Ngôn ngữ cơ thể & Phong thái sân khấu', 'Giao tiếp mắt, cử chỉ tay và làm chủ không gian', 2, NOW(), NOW()),
  (5, 3, 'Chương 1: Cấu trúc kịch bản MC tiêu chuẩn', 'Quy trình xây dựng kịch bản Gala Dinner, Teambuilding và Tiệc Cưới', 1, NOW(), NOW()),
  (6, 3, 'Chương 2: Kỹ thuật ứng biến & Biến tấu kịch bản', 'Ứng biến ngôn từ linh hoạt khi sự kiện phát sinh thay đổi phút chót', 2, NOW(), NOW())
ON CONFLICT ("ModuleID") DO NOTHING;

-- 4. Insert Lessons (2 Lessons per Course)
INSERT INTO "LESSON" ("LessonID", "CourseID", "ModuleID", "Title", "Description", "LessonType", "OrderIndex", "DurationMinutes", "IsPreview", "Status", "CreatedAt")
VALUES 
  -- Course 1 Lessons
  (1, 1, 1, 'Bài 1: Tác phong MC & Chuẩn bị kịch bản chương trình', 'Hướng dẫn chi tiết cách đọc, phân tích kịch bản và chuẩn bị trang phục MC hội nghị.', 'VIDEO', 1, 15, true, 'ACTIVE', NOW()),
  (2, 1, 2, 'Bài 2: Làm chủ sân khấu & Giải quyết sự cố bất ngờ', 'Phương pháp làm chủ micro, di chuyển sân khấu và xử lý tình huống phát sinh.', 'VIDEO', 2, 20, false, 'ACTIVE', NOW()),
  
  -- Course 2 Lessons
  (3, 2, 3, 'Bài 1: Kỹ thuật nén hơi bụng & Phát âm tròn vành rõ chữ', 'Bài tập thực hành mở khẩu hình và duy trì lực giọng chuẩn trong suốt sự kiện.', 'VIDEO', 1, 18, true, 'ACTIVE', NOW()),
  (4, 2, 4, 'Bài 2: Ngôn ngữ cơ thể & Giao tiếp ánh mắt với khán giả', 'Quy tắc di chuyển, vị trí đứng và làm chủ ánh mắt kết nối khán phòng.', 'VIDEO', 2, 22, false, 'ACTIVE', NOW()),

  -- Course 3 Lessons
  (5, 3, 5, 'Bài 1: Phân tích cấu trúc kịch bản Gala Dinner & Tiệc Cưới', 'Phương pháp phân tích kịch bản lời nói và kịch bản âm thanh ánh sáng sự kiện.', 'VIDEO', 1, 16, true, 'ACTIVE', NOW()),
  (6, 3, 6, 'Bài 2: Nghệ thuật ứng biến khi kịch bản thay đổi phút chót', 'Kỹ thuật nối lời, kéo dài thời gian và giữ lửa chương trình khi đại biểu đến trễ.', 'VIDEO', 2, 25, false, 'ACTIVE', NOW())
ON CONFLICT ("LessonID") DO NOTHING;

-- 5. Insert Valid Enrollment Records for Learner ID = 1 (beo) - 3 Courses Total
INSERT INTO "ENROLLMENT" ("EnrollmentID", "LearnerID", "CourseID", "Status", "CompletionPercentage", "EnrolledAt", "CreatedAt", "UpdatedAt")
VALUES 
  (1, 1, 1, 'ACTIVE', 0.00, NOW(), NOW(), NOW()),
  (2, 1, 2, 'ACTIVE', 0.00, NOW(), NOW(), NOW()),
  (3, 1, 3, 'ACTIVE', 0.00, NOW(), NOW(), NOW())
ON CONFLICT ("EnrollmentID") DO UPDATE SET "Status" = 'ACTIVE';

-- Reset Sequences for PostgreSQL identity columns
SELECT setval(pg_get_serial_sequence('"CATEGORY"', 'CategoryID'), coalesce(max("CategoryID"), 1)) FROM "CATEGORY";
SELECT setval(pg_get_serial_sequence('"COURSE"', 'CourseID'), coalesce(max("CourseID"), 1)) FROM "COURSE";
SELECT setval(pg_get_serial_sequence('"MODULE"', 'ModuleID'), coalesce(max("ModuleID"), 1)) FROM "MODULE";
SELECT setval(pg_get_serial_sequence('"LESSON"', 'LessonID'), coalesce(max("LessonID"), 1)) FROM "LESSON";
SELECT setval(pg_get_serial_sequence('"ENROLLMENT"', 'EnrollmentID'), coalesce(max("EnrollmentID"), 1)) FROM "ENROLLMENT";
