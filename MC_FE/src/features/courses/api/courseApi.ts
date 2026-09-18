// =============================================================================
// courseApi.ts  —  Service Layer for Course CRUD
//
// IMPORTANT — Response shape from backend:
//
//   request<T>() returns the RAW parsed JSON body, which is:
//   {
//     "success": true,
//     "data": <T>          ← the actual payload is nested under "data"
//   }
//
//   For list endpoints, <T> = CourseListResponse, so the full shape is:
//   {
//     "success": true,
//     "data": {
//       "data": [ ...CourseDto[] ],
//       "pagination": { page, limit, total, totalPages }
//     }
//   }
//
//   So in each method we unwrap one level: return res.data
// =============================================================================

import { request } from '../../../services/api';
import type {
  Course,
  CreateCourseDto,
  UpdateCourseDto,
  CourseListParams,
} from '../types/courseTypes';

// ---------------------------------------------------------------------------
// Backend envelope types (what request<T> actually returns)
// ---------------------------------------------------------------------------
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface CourseListPayload {
  data: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// What the FE components consume (already-unwrapped from ApiEnvelope)
export interface CourseListResult {
  data: Course[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// Helper: build a URL query string from an optional params object
// e.g. { page: 1, status: 'DRAFT' } → '?page=1&status=DRAFT'
// ---------------------------------------------------------------------------
function buildQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

export const courseApi = {
  // -------------------------------------------------------------------------
  // READ — Public courses catalog
  // GET /courses
  // -------------------------------------------------------------------------
  async getCourses(params?: CourseListParams): Promise<CourseListResult> {
    const query = buildQuery(params as Record<string, string | number | undefined>);
    const envelope = await request<ApiEnvelope<CourseListPayload>>(`/courses${query}`);
    return envelope.data;
  },

  // -------------------------------------------------------------------------
  // READ — Instructor's own courses (paginated + filterable)
  // GET /courses/my-courses
  // -------------------------------------------------------------------------
  async getInstructorCourses(params?: CourseListParams): Promise<CourseListResult> {
    const query = buildQuery(params as Record<string, string | number | undefined>);
    // request() returns: { success, data: { data: Course[], pagination: {...} } }
    const envelope = await request<ApiEnvelope<CourseListPayload>>(`/courses/my-courses${query}`);
    return envelope.data; // unwrap ApiEnvelope → CourseListPayload
  },

  // -------------------------------------------------------------------------
  // READ — All courses (Admin-only view)
  // GET /admin/courses
  // -------------------------------------------------------------------------
  async getAllCoursesAdmin(params?: CourseListParams): Promise<CourseListResult> {
    const query = buildQuery(params as Record<string, string | number | undefined>);
    const envelope = await request<ApiEnvelope<CourseListPayload>>(`/admin/courses${query}`);
    return envelope.data;
  },

  // -------------------------------------------------------------------------
  // READ — Single course by ID
  // GET /courses/:id
  // -------------------------------------------------------------------------
  async getCourseById(courseId: number): Promise<Course> {
    const envelope = await request<ApiEnvelope<Course>>(`/courses/${courseId}`);
    return envelope.data;
  },

  // -------------------------------------------------------------------------
  // CREATE — POST /courses
  // -------------------------------------------------------------------------
  async createCourse(dto: CreateCourseDto): Promise<Course> {
    const envelope = await request<ApiEnvelope<Course>>('/courses', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return envelope.data;
  },

  // -------------------------------------------------------------------------
  // UPDATE — PUT /courses/:id
  // -------------------------------------------------------------------------
  async updateCourse(courseId: number, dto: UpdateCourseDto): Promise<Course> {
    const envelope = await request<ApiEnvelope<Course>>(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
    return envelope.data;
  },

  // -------------------------------------------------------------------------
  // DELETE — DELETE /courses/:id
  // -------------------------------------------------------------------------
  async deleteCourse(courseId: number): Promise<void> {
    await request<ApiEnvelope<null>>(`/courses/${courseId}`, {
      method: 'DELETE',
    });
  },

  // -------------------------------------------------------------------------
  // STATUS TOGGLE — PATCH /courses/:id/status
  // -------------------------------------------------------------------------
  async toggleCourseStatus(
    courseId: number,
    newStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  ): Promise<Course> {
    const envelope = await request<ApiEnvelope<Course>>(
      `/courses/${courseId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      }
    );
    return envelope.data;
  },

  // -------------------------------------------------------------------------
  // BULK CREATE — POST /courses/bulk
  // -------------------------------------------------------------------------
  async createCoursesBulk(dtos: CreateCourseDto[]): Promise<Course[]> {
    const envelope = await request<ApiEnvelope<Course[]>>('/courses/bulk', {
      method: 'POST',
      body: JSON.stringify(dtos),
    });
    return envelope.data;
  },
};
