import { useQuery } from '@tanstack/react-query';
import { courseApi } from '../api/courseApi';
import { Course } from '../../../types';
import type { Course as BackendCourse } from '../types/courseTypes';

export const COURSE_QUERY_KEYS = {
  all: ['courses', 'public'] as const,
  learned: ['courses', 'learned'] as const,
  detail: (id: string) => ['courses', 'public', id] as const,
};

// Helper: Map Backend DB Course to UI Course shape expected by CourseCard & Screens
export function mapBackendCourseToUI(b: BackendCourse): Course {
  return {
    id: String(b.courseId),
    title: b.title,
    slug: b.slug,
    subtitle: b.description || 'Professional Masterclass Course',
    description: b.description || '',
    category: b.categoryName || 'General Communication',
    level: b.level === 'BEGINNER' ? 'Beginner'
         : b.level === 'INTERMEDIATE' ? 'Intermediate'
         : b.level === 'ADVANCED' ? 'Advanced'
         : 'All Levels',
    thumbnail: b.thumbnailUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    videoPreviewThumb: b.thumbnailUrl || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    instructor: {
      id: String(b.instructorId),
      name: b.instructorName || 'Expert Mentor',
      title: 'Master Host & Instructor',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      bio: 'Professional instructor with years of live stage and broadcasting experience.',
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
    originalPrice: b.price > 0 ? Math.round(b.price * 1.3) : undefined,
    badge: b.price === 0 ? 'Free' : 'Best Seller',
    durationHours: 8.5,
    lecturesCount: 24,
    updatedDate: new Date(b.updatedAt || b.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    language: 'English',
    subtitles: ['English', 'Vietnamese'],
    learningOutcomes: [
      'Master stage presence and vocal resonance.',
      'Handle live audience interactions with poise and confidence.',
      'Access downloadable scripts and timeline templates.'
    ],
    requirements: ['Basic passion for public speaking and presentation.'],
    targetAudience: ['Event hosts, public speakers, and corporate leaders.'],
    curriculum: [],
    reviews: [],
    featured: true,
  };
}

// Public catalog — fetches courses from GET /courses
export const useCoursesQuery = () => {
  return useQuery({
    queryKey: COURSE_QUERY_KEYS.all,
    queryFn: async () => {
      const result = await courseApi.getCourses();
      return result.data.map(mapBackendCourseToUI);
    },
    staleTime: 1000 * 60 * 5,
  });
};

// Learned courses — fetches enrolled courses from GET /courses/learned-courses
export const useLearnedCoursesQuery = () => {
  return useQuery({
    queryKey: COURSE_QUERY_KEYS.learned,
    queryFn: async () => {
      const items = await courseApi.getLearnedCourses();
      return items.map((item) => ({
        id: String(item.enrollmentId),
        course: mapBackendCourseToUI(item.course),
        progressPercent: item.progressPercent,
        completedLecturesCount: item.completedLecturesCount,
        totalLecturesCount: item.totalLecturesCount,
        lastAccessed: item.lastAccessedAt
          ? new Date(item.lastAccessedAt).toLocaleDateString('vi-VN')
          : 'Mới đăng ký',
        lastLectureTitle: item.lastLectureTitle || '',
        status: item.status,
        enrolledDate: item.enrolledDate
          ? new Date(item.enrolledDate).toLocaleDateString('vi-VN')
          : '',
        certificateId: item.certificateId ? String(item.certificateId) : undefined,
      }));
    },
    staleTime: 1000 * 10,
  });
};

// Detail query for learner catalog
export const useCourseDetailQuery = (courseId: string) => {
  return useQuery({
    queryKey: COURSE_QUERY_KEYS.detail(courseId),
    queryFn: async () => {
      if (!courseId) return null;
      const bCourse = await courseApi.getCourseById(Number(courseId));
      return bCourse ? mapBackendCourseToUI(bCourse) : null;
    },
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5,
  });
};


