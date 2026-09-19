-- =============================================================================
-- SQL SEED DATA FOR POSTGRESQL DATABASE (Smart MC E-Learning)
-- Dữ liệu được trích xuất trực tiếp từ:
--   - danh_sach_khoa_hoc.csv
--   - chuong_va_bai_hoc_mc_dam_cuoi.csv
-- =============================================================================

-- 0. Đảm bảo có sẵn các Role trong hệ thống
INSERT INTO roles ("RoleID", "RoleName", "Description")
VALUES
  (1, 'INSTRUCTOR', 'Giảng viên'),
  (2, 'LEARNER', 'Học viên'),
  (3, 'ADMIN', 'Quản trị viên')
ON CONFLICT ("RoleID") DO NOTHING;

-- 1. Đảm bảo có sẵn 1 User Giảng viên (Instructor) để gán làm người tạo khóa học
INSERT INTO users ("RoleID", "FullName", "Email", "PasswordHash", "Status", "CreatedAt", "UpdatedAt")
SELECT 1, 'Giảng Viên MSEEK Academy', 'instructor@mseek.edu.vn', '$2a$11$q9oO6rPZ.yH5G/e2R9y2e.8A/tW0e/cR5lW0w7k5e.8A/tW0e/cR', 'ACTIVE', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE "Email" = 'instructor@mseek.edu.vn');

-- 2. Thêm Danh mục Khóa học (Categories)
INSERT INTO categories ("CategoryID", "CategoryName", "Description", "Status")
VALUES
  (1, 'MC Tiệc Cưới & Sự Kiện', 'Các khóa học đào tạo kỹ năng làm MC tiệc cưới, hội nghị chuyên nghiệp', 'ACTIVE'),
  (2, 'Luyện Giọng Nói & Phát Âm', 'Khóa học luyện giọng nói truyền cảm, mở khẩu hình và phát âm chuẩn', 'ACTIVE')
ON CONFLICT ("CategoryID") DO UPDATE SET "CategoryName" = EXCLUDED."CategoryName";

SELECT setval(pg_get_serial_sequence('categories', 'CategoryID'), COALESCE(MAX("CategoryID"), 1)) FROM categories;

-- 3. Thêm Danh sách Khóa học (Courses)
INSERT INTO courses ("CourseID", "CategoryID", "InstructorID", "Title", "Slug", "Description", "ThumbnailUrl", "Price", "Level", "Status", "CreatedAt", "UpdatedAt")
VALUES
  (1, 1, 1, 'Khóa học MC Đám Cưới Chuyên Nghiệp', 'khoa-hoc-mc-dam-cuoi-chuyen-nghiep', 'Hướng dẫn kỹ năng dẫn chương trình tiệc cưới sang trọng.', 'https://images.unsplash.com/photo-1519741497674-611481863552', 199000, 'BEGINNER', 'PUBLISHED', NOW(), NOW()),
  (2, 1, 1, 'Khóa học MC Sự Kiện & Hội Nghị', 'khoa-hoc-mc-su-kien-hoi-nghi', 'Kỹ năng đọc kịch bản, xử lý tình huống sân khấu.', 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2', 299000, 'INTERMEDIATE', 'DRAFT', NOW(), NOW()),
  (3, 2, 1, 'Kỹ Thuật Luyện Giọng Nói & Phát Âm Chuẩn', 'ky-thuat-luyen-giong-noi-phat-am-chuan', 'Phương pháp lấy hơi bụng, mở khẩu hình và phát âm tròn vành rõ chữ.', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc', 150000, 'ALL_LEVELS', 'PUBLISHED', NOW(), NOW())
ON CONFLICT ("CourseID") DO UPDATE SET
  "Title" = EXCLUDED."Title",
  "Description" = EXCLUDED."Description",
  "Price" = EXCLUDED."Price",
  "Status" = EXCLUDED."Status";

SELECT setval(pg_get_serial_sequence('courses', 'CourseID'), COALESCE(MAX("CourseID"), 1)) FROM courses;

-- 4. Thêm Các Chương học (Modules) cho Khóa học MC Đám Cưới (CourseID = 1)
INSERT INTO modules ("ModuleID", "CourseID", "Title", "Description", "OrderIndex", "CreatedAt", "UpdatedAt")
VALUES
  (1, 1, 'Chương 1: Nền tảng giọng nói & Phong thái MC Đám Cưới', 'Cấu trúc chuẩn của một lễ cưới hiện đại và kỹ năng viết lời dẫn ấn tượng', 1, NOW(), NOW()),
  (2, 1, 'Chương 2: Luyện kịch bản MC & Biên soạn lời dẫn tiệc cưới', 'Biết cách khuấy động không khí phần Hội và xử lý sự cố tiệc cưới', 2, NOW(), NOW()),
  (3, 1, 'Chương 3: Điều phối Game show & Phối hợp Ê-kíp sự kiện', 'Luyện Giọng', 3, NOW(), NOW())
ON CONFLICT ("ModuleID") DO UPDATE SET "Title" = EXCLUDED."Title";

SELECT setval(pg_get_serial_sequence('modules', 'ModuleID'), COALESCE(MAX("ModuleID"), 1)) FROM modules;

-- 5. Thêm Các Bài học (Lessons) thuộc từng Chương
INSERT INTO lessons ("LessonID", "CourseID", "ModuleID", "Title", "Description", "LessonType", "OrderIndex", "DurationMinutes", "IsPreview", "Status", "CreatedAt")
VALUES
  (1, 1, 1, 'LỄ VU QUY - ĐÊM TRƯỚC LỄ VU QUY- P1', 'Đêm trước buổi lễ vu quy (Bố cục và lời dẫn): Tổng quan, Ban lễ tân, Band nhạc, Mời tiệc, Đón CR', 'VIDEO', 1, 39, true, 'ACTIVE', NOW()),
  (2, 1, 1, 'LỄ VU QUY- ĐÊM TRƯỚC LỄ VU QUY-P2', 'Bố cục và Lời dẫn chi tiết.', 'VIDEO', 2, 29, false, 'ACTIVE', NOW()),
  (3, 1, 1, 'Bố cục cho Lễ chính sự kiện: Lễ Vu Quy.', 'Bố cục tổ chức sự kiện là phần kiến thức cực kỳ quan trọng. Nó là bộ khung để mỗi Mc làm được đúng và đủ cho mỗi sự kiện.', 'VIDEO', 3, 56, false, 'ACTIVE', NOW()),
  (4, 1, 1, 'HƯỚNG DẪN CÁC MẪU THÔNG BÁO TRONG TIỆC CƯỚI', 'Các mẫu thông báo quan trọng trong tiệc cưới.', 'VIDEO', 4, 31, false, 'ACTIVE', NOW()),
  (5, 1, 1, 'CÁCH MỞ ĐẦU TIỆC CƯỚI CHUẨN NHẤT', 'Kỹ thuật mở đầu tạo dấu ấn ấn tượng cho tiệc cưới.', 'VIDEO', 5, 21, false, 'ACTIVE', NOW()),
  (6, 1, 2, 'Bài 1: Cấu trúc kịch bản lễ cưới truyền thống & hiện đại', 'Phân tích quy trình các phần chính trong một tiệc cưới chuẩn.', 'VIDEO', 1, 20, false, 'ACTIVE', NOW()),
  (7, 1, 2, 'Bài 2: Kỹ thuật dẫn phần Lễ: Chú rể - Cô dâu lên sân khấu', 'Lời dẫn nhập tiệc cảm xúc, tạo điểm nhấn rạng ngời cho đôi tân nhân.', 'VIDEO', 2, 30, false, 'ACTIVE', NOW()),
  (8, 1, 3, 'Bài 1: Kỹ năng tổ chức Mini Game khuấy động tiệc cưới', 'Các trò chơi sân khấu vui nhộn, lịch sự phù hợp với mọi độ tuổi quan khách.', 'VIDEO', 1, 35, false, 'ACTIVE', NOW()),
  (9, 1, 3, 'Bài 2: Phối hợp với Âm thanh, Ánh sáng & Nhà hàng', 'Kỹ năng làm việc với kíp trực âm thanh để tạo hiệu ứng âm nhạc trọn vẹn.', 'VIDEO', 2, 25, false, 'ACTIVE', NOW())
ON CONFLICT ("LessonID") DO UPDATE SET "Title" = EXCLUDED."Title", "Description" = EXCLUDED."Description";

SELECT setval(pg_get_serial_sequence('lessons', 'LessonID'), COALESCE(MAX("LessonID"), 1)) FROM lessons;

-- 6. Gán Video URL cho từng Bài học vào bảng course_materials
INSERT INTO course_materials ("CourseID", "LessonID", "UploaderID", "Title", "MaterialType", "FileUrl", "CreatedAt")
VALUES
  (1, 1, 1, 'LỄ VU QUY - ĐÊM TRƯỚC LỄ VU QUY- P1 - Video', 'VIDEO', 'https://www.youtube.com/watch?v=xMZ5hYTfuP4', NOW()),
  (1, 2, 1, 'LỄ VU QUY- ĐÊM TRƯỚC LỄ VU QUY-P2 - Video', 'VIDEO', 'https://www.youtube.com/watch?v=xOaeNOQB5cc', NOW()),
  (1, 3, 1, 'Bố cục cho Lễ chính sự kiện: Lễ Vu Quy. - Video', 'VIDEO', 'https://www.youtube.com/watch?v=gD6nvfIqN88', NOW()),
  (1, 4, 1, 'HƯỚNG DẪN CÁC MẪU THÔNG BÁO TRONG TIỆC CƯỚI - Video', 'VIDEO', 'https://www.youtube.com/watch?v=mLhePAr5jfo', NOW()),
  (1, 5, 1, 'CÁCH MỞ ĐẦU TIỆC CƯỚI CHUẨN NHẤT - Video', 'VIDEO', 'https://www.youtube.com/watch?v=OflKb1ZLViw', NOW()),
  (1, 6, 1, 'Bài 1: Cấu trúc kịch bản lễ cưới - Video', 'VIDEO', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NOW()),
  (1, 7, 1, 'Bài 2: Kỹ thuật dẫn phần Lễ - Video', 'VIDEO', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NOW()),
  (1, 8, 1, 'Bài 1: Kỹ năng tổ chức Mini Game - Video', 'VIDEO', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NOW()),
  (1, 9, 1, 'Bài 2: Phối hợp với Âm thanh - Video', 'VIDEO', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NOW());
