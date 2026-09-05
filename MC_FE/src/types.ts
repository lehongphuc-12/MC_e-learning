export type ScreenType = 'home' | 'courses' | 'course-detail' | 'login' | 'register' | 'profile' | 'forgot-password' | 'reset-password';

export interface Instructor {
  id: string;
  name: string;
  title: string;
  avatar: string;
  bio: string;
  rating: number;
  studentsCount: number;
  coursesCount: number;
  badge?: string;
  verified?: boolean;
}

export interface CurriculumLecture {
  id: string;
  title: string;
  duration: string;
  previewAvailable?: boolean;
  videoUrl?: string;
}

export interface CurriculumSection {
  id: string;
  title: string;
  lecturesCount: number;
  totalDuration: string;
  lectures: CurriculumLecture[];
}

export interface Review {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
  helpfulCount: number;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  thumbnail: string;
  videoPreviewThumb?: string;
  instructor: Instructor;
  rating: number;
  reviewsCount: number;
  studentsCount: number;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  badge?: 'Best Seller' | 'Hot Deal' | 'New' | 'Top Rated' | 'Free';
  durationHours: number;
  lecturesCount: number;
  updatedDate: string;
  language: string;
  subtitles: string[];
  learningOutcomes: string[];
  requirements: string[];
  targetAudience: string[];
  curriculum: CurriculumSection[];
  reviews: Review[];
  featured?: boolean;
}

export interface Category {
  id: string;
  name: string;
  iconName: string;
  coursesCount: number;
  image: string;
  description: string;
  tag?: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar: string;
  rating: number;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  popular?: boolean;
  features: string[];
  ctaText: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'student' | 'instructor' | 'admin';
  isGoogleLogin?: boolean;
}

export interface EnrolledCourseProgress {
  courseId: string;
  progressPercent: number;
  lastAccessedLectureId: string;
  lastAccessedLectureTitle: string;
  moduleIndex: number;
  totalModules: number;
  completedLectures: string[];
}

export interface ActivityLog {
  id: string;
  title: string;
  type: 'certificate' | 'quiz' | 'discussion' | 'milestone';
  timestamp: string;
  courseTitle?: string;
  badgeColor?: string;
}
