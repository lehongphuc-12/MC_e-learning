// =============================================================================
// courseTypes.ts
// Defines all TypeScript types for the Course Management feature.
// These types are derived DIRECTLY from the PostgreSQL COURSE and CATEGORY
// tables defined in schemaSample.txt to ensure strict DB alignment.
// =============================================================================

// ---------------------------------------------------------------------------
// 1. ENUMS — mirror DB VARCHAR columns with fixed allowed values
// ---------------------------------------------------------------------------

/**
 * Maps to the COURSE.Status column.
 * Matches the C# CourseStatus enum in MC_BE/Core/Enums/CourseAndLearning/CourseStatus.cs:
 *   DRAFT      = not yet published, only visible to instructor
 *   PUBLISHED  = live and enrollable by learners
 *   ARCHIVED   = hidden from catalog, data preserved
 */
export type CourseStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';

/**
 * Maps to the COURSE.Level column.
 * Represents the difficulty level of the course content.
 */
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';

/**
 * Maps to the CATEGORY.Status column.
 */
export type CategoryStatus = 'ACTIVE' | 'INACTIVE';

// ---------------------------------------------------------------------------
// 2. CORE DB ENTITIES — 1-to-1 mapping with DB table rows
// ---------------------------------------------------------------------------

/**
 * Represents a row in the CATEGORY table.
 * Used to populate the Category dropdown in course forms.
 */
export interface Category {
  categoryId: number;       // PK: CATEGORY.CategoryID
  categoryName: string;     // CATEGORY.CategoryName
  description?: string;     // CATEGORY.Description (nullable)
  status: CategoryStatus;   // CATEGORY.Status
}

/**
 * Represents a full COURSE row as returned by the backend (GET response).
 * All fields match the COURSE table columns in schemaSample.txt.
 */
export interface Course {
  courseId: number;           // PK: COURSE.CourseID
  categoryId?: number | null; // FK: COURSE.CategoryID (nullable — ON DELETE SET NULL)
  instructorId: number;       // FK: COURSE.InstructorID
  title: string;              // COURSE.Title (VARCHAR 255, NOT NULL)
  slug: string;               // COURSE.Slug (VARCHAR 255, UNIQUE, NOT NULL)
  description?: string;       // COURSE.Description (TEXT, nullable)
  thumbnailUrl?: string;      // COURSE.ThumbnailUrl (VARCHAR 255, nullable)
  price: number;              // COURSE.Price (DECIMAL 10,2, DEFAULT 0.00)
  level?: CourseLevel;        // COURSE.Level (VARCHAR 50, nullable)
  status: CourseStatus;       // COURSE.Status (DEFAULT 'DRAFT')
  createdAt: string;          // COURSE.CreatedAt (ISO 8601 string from backend)
  updatedAt: string;          // COURSE.UpdatedAt
  submittedAt?: string | null;
  approvedAt?: string | null;
  approvedById?: number | null;
  approvedByName?: string | null;
  submissionNote?: string | null;
  rejectionReason?: string | null;

  // Joined/computed fields the backend may include in list responses
  categoryName?: string;      // Joined from CATEGORY.CategoryName
  instructorName?: string;    // Joined from USER.FullName
}

// ---------------------------------------------------------------------------
// 3. DTO (Data Transfer Objects) — shapes sent TO the backend
// ---------------------------------------------------------------------------

/**
 * Payload for POST /courses — creating a new course.
 * InstructorID is NOT included here; the backend extracts it from the JWT.
 * Slug is also excluded — the backend auto-generates it from the Title.
 */
export interface CreateCourseDto {
  title: string;              // Required: min 3 chars
  description?: string;       // Optional
  categoryId?: number | null; // Optional FK
  thumbnailUrl?: string;      // Optional URL
  price: number;              // Required: >= 0
  level?: CourseLevel;        // Optional
  status?: CourseStatus;      // Default: 'DRAFT'
  submissionNote?: string;
  submitForApproval?: boolean;
}

/**
 * Payload for PUT/PATCH /courses/:id — updating an existing course.
 * All fields are optional (partial update pattern).
 */
export type UpdateCourseDto = Partial<CreateCourseDto>;

// ---------------------------------------------------------------------------
// 4. QUERY PARAMS — for filtering / pagination in list views
// ---------------------------------------------------------------------------

/**
 * Query parameters for GET /courses (Instructor view).
 * Enables server-side filtering for the Course List page.
 */
export interface CourseListParams {
  page?: number;
  limit?: number;
  status?: CourseStatus;
  categoryId?: number;
  search?: string;         // Full-text search on Title
}

// ---------------------------------------------------------------------------
// 5. API RESPONSE WRAPPERS — align with your backend envelope pattern
// ---------------------------------------------------------------------------

/**
 * Generic paginated response wrapper.
 * Backend wraps list responses with { success, data, pagination }.
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Generic single-item response wrapper.
 */
export interface SingleResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ---------------------------------------------------------------------------
// 6. FORM TYPES — for React Hook Form integration
// ---------------------------------------------------------------------------

/**
 * The form values shape used by the Create/Edit Course Form.
 * Mirrors CreateCourseDto but uses string for price input
 * (HTML <input type="number"> returns string; we coerce before sending).
 */
export interface CourseFormValues {
  title: string;
  description: string;
  categoryId: string;      // Select returns string; coerce to number on submit
  thumbnailUrl: string;
  price: string;           // Coerce to number on submit
  level: CourseLevel | '';
  status: CourseStatus;    // 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED'
  submissionNote?: string;
  submitForApproval?: boolean;
}

// ---------------------------------------------------------------------------
// 7. LEARNED COURSE TYPE — returned from GET /courses/learned-courses
// ---------------------------------------------------------------------------
export interface LearnedCourse {
  enrollmentId: number;
  courseId: number;
  course: Course;
  progressPercent: number;
  completedLecturesCount: number;
  totalLecturesCount: number;
  lastAccessedAt?: string;
  lastLectureTitle?: string;
  status: 'in-progress' | 'completed';
  enrolledDate?: string;
  certificateId?: number;
}

