import { mockCourses } from '../../../data/mockData';
import { Course } from '../../../types';

export const courseApi = {
  async getCourses(): Promise<Course[]> {
    // Simulate async data fetching / caching layer for courses
    return Promise.resolve(mockCourses);
  },

  async getCourseById(id: string): Promise<Course | undefined> {
    const found = mockCourses.find((c) => c.id === id);
    return Promise.resolve(found);
  },
};
