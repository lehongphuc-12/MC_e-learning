import { useQuery } from '@tanstack/react-query';
import { courseApi } from '../api/courseApi';
import { Course } from '../../../types';
import type { Course as BackendCourse, RecommendedCourseDto } from '../types/courseTypes';

export const COURSE_QUERY_KEYS = {
  all: ['courses', 'public'] as const,
  learned: ['courses', 'learned'] as const,
  detail: (id: string) => ['courses', 'public', id] as const,
  recommended: (top: number) => ['courses', 'recommended', top] as const,
};

// ============================================================
// HELPER - VALIDATE DATABASE COURSE ID
// ============================================================

const parseCourseId = (
  courseId?: string | number | null
): number | null => {
  if (
    courseId === undefined ||
    courseId === null ||
    courseId === ''
  ) {
    return null;
  }

  const parsed = Number(courseId);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
};

// ============================================================
// MAP BACKEND COURSE -> UI COURSE
// ============================================================

export function mapBackendCourseToUI(
  b: BackendCourse
): Course {
  return {
    // QUAN TRỌNG:
    // Đây chính là CourseID thật từ database.
    id: String(b.courseId),

    title: b.title,
    slug: b.slug,

    subtitle:
      b.description ||
      'Professional Masterclass Course',

    description: b.description || '',

    category:
      b.categoryName ||
      'General Communication',

    level:
      b.level === 'BEGINNER'
        ? 'Beginner'
        : b.level === 'INTERMEDIATE'
        ? 'Intermediate'
        : b.level === 'ADVANCED'
        ? 'Advanced'
        : 'All Levels',

    thumbnail:
      b.thumbnailUrl ||
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',

    videoPreviewThumb:
      b.thumbnailUrl ||
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',

    instructor: {
      id: String(b.instructorId),

      name:
        b.instructorName ||
        'Expert Mentor',

      title:
        'Master Host & Instructor',

      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',

      bio:
        'Professional instructor with years of live stage and broadcasting experience.',

      rating: 4.9,
      studentsCount: 1250,
      coursesCount: 3,
      badge: 'Master Mentor',
      verified: true,
    },

    rating: 4.9,
    reviewsCount: 128,
    studentsCount: 1250,

    price: b.price,

    originalPrice:
      b.price > 0
        ? Math.round(b.price * 1.3)
        : undefined,

    badge:
      b.price === 0
        ? 'Free'
        : 'Best Seller',

    durationHours: 8.5,
    lecturesCount: 24,

    updatedDate: new Date(
      b.updatedAt || b.createdAt
    ).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    }),

    language: 'English',

    subtitles: [
      'English',
      'Vietnamese',
    ],

    learningOutcomes: [
      'Master stage presence and vocal resonance.',
      'Handle live audience interactions with poise and confidence.',
      'Access downloadable scripts and timeline templates.',
    ],

    requirements: [
      'Basic passion for public speaking and presentation.',
    ],

    targetAudience: [
      'Event hosts, public speakers, and corporate leaders.',
    ],

    curriculum: [],
    reviews: [],

    featured: true,
  };
}

// ============================================================
// PUBLIC COURSES
// GET /courses
// ============================================================

export const useCoursesQuery = () => {
  return useQuery({
    queryKey: COURSE_QUERY_KEYS.all,

    queryFn: async () => {
      const result =
        await courseApi.getCourses();

      return result.data.map(
        mapBackendCourseToUI
      );
    },

    staleTime: 1000 * 60 * 5,
  });
};

// ============================================================
// LEARNED COURSES
// GET /courses/learned-courses
// ============================================================

export const useLearnedCoursesQuery = () => {
  return useQuery({
    queryKey:
      COURSE_QUERY_KEYS.learned,

    queryFn: async () => {
      const items =
        await courseApi.getLearnedCourses();

      return items.map((item) => ({
        id: String(item.enrollmentId),

        course:
          mapBackendCourseToUI(
            item.course
          ),

        progressPercent:
          item.progressPercent,

        completedLecturesCount:
          item.completedLecturesCount,

        totalLecturesCount:
          item.totalLecturesCount,

        lastAccessed:
          item.lastAccessedAt
            ? new Date(
                item.lastAccessedAt
              ).toLocaleDateString(
                'vi-VN'
              )
            : 'Mới đăng ký',

        lastLectureTitle:
          item.lastLectureTitle || '',

        status: item.status,

        enrolledDate:
          item.enrolledDate
            ? new Date(
                item.enrolledDate
              ).toLocaleDateString(
                'vi-VN'
              )
            : '',

        certificateId:
          item.certificateId
            ? String(
                item.certificateId
              )
            : undefined,
      }));
    },

    staleTime: 1000 * 10,

  });
};

// ============================================================
// COURSE DETAIL
// GET /courses/{courseId}
// ============================================================

export const useCourseDetailQuery = (
  courseId?: string | number | null
) => {
  const validCourseId =
    parseCourseId(courseId);

  return useQuery({
    queryKey:
      COURSE_QUERY_KEYS.detail(
        validCourseId
          ? String(validCourseId)
          : 'invalid'
      ),

    queryFn: async () => {
      if (!validCourseId) {
        return null;
      }

      const backendCourse =
        await courseApi.getCourseById(
          validCourseId
        );

      if (!backendCourse) {
        return null;
      }

      return mapBackendCourseToUI(
        backendCourse
      );
    },

    // QUAN TRỌNG:
    // Không bao giờ gọi /courses/NaN
    enabled:
      validCourseId !== null,

    staleTime: 1000 * 60 * 5,
  });
};

// ============================================================
// MAP RECOMMENDED COURSE DTO -> UI COURSE
// ============================================================

export function mapRecommendedToUICourse(
  r: RecommendedCourseDto
): Course & { recommendationReason: string } {
  const levelText =
    r.level === 'BEGINNER' || r.level === 'Beginner'
      ? 'Beginner'
      : r.level === 'INTERMEDIATE' || r.level === 'Intermediate'
      ? 'Intermediate'
      : r.level === 'ADVANCED' || r.level === 'Advanced'
      ? 'Advanced'
      : 'All Levels';

  return {
    id: String(r.courseId || r.id),
    title: r.title,
    slug: r.slug,
    subtitle: r.description || 'Khóa học được đề xuất theo định hướng và kỹ năng của bạn',
    description: r.description || '',
    category: r.categoryName || 'General Communication',
    level: levelText,
    thumbnail:
      r.thumbnailUrl ||
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    videoPreviewThumb:
      r.thumbnailUrl ||
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    instructor: {
      id: String(r.instructorId),
      name: r.instructorName || 'Expert Mentor',
      title: 'Master Host & Instructor',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      bio: 'Professional instructor with years of live stage and broadcasting experience.',
      rating: r.rating || 4.9,
      studentsCount: 1250,
      coursesCount: 3,
      badge: 'Master Mentor',
      verified: true,
    },
    rating: r.rating || 5.0,
    reviewsCount: r.reviewCount || 0,
    studentsCount: 1250,
    price: r.price,
    originalPrice:
      r.originalPrice && r.originalPrice > r.price
        ? r.originalPrice
        : r.price > 0
        ? Math.round(r.price * 1.3)
        : undefined,
    badge:
      r.isFree || r.price === 0
        ? 'Free'
        : r.discountPercent > 0
        ? 'Hot Deal'
        : 'Best Seller',
    durationHours: 8.5,
    lecturesCount: 24,
    updatedDate: 'Gần đây',
    language: 'Tiếng Việt',
    subtitles: ['Tiếng Việt'],
    learningOutcomes: [],
    requirements: [],
    targetAudience: [],
    curriculum: [],
    reviews: [],
    featured: true,
    recommendationReason: r.recommendationReason || 'Gợi ý phù hợp mục tiêu của bạn',
  };
}

// ============================================================
// RECOMMENDED COURSES
// GET /courses/recommendations?top=3
// ============================================================

export const useRecommendedCoursesQuery = (top: number = 3) => {
  return useQuery({
    queryKey: COURSE_QUERY_KEYS.recommended(top),
    queryFn: async () => {
      try {
        const data = await courseApi.getRecommendedCourses(top);
        return data || [];
      } catch (err) {
        console.warn('Failed to fetch recommended courses:', err);
        return [];
      }
    },
    staleTime: 1000 * 60 * 3, // 3 minutes cache
  });
};
