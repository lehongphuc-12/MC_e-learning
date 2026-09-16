import { request } from '../../../services/api';
import type { CourseModule, CreateModuleDto, UpdateModuleDto, BulkImportModuleItem } from '../types/moduleTypes';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const moduleApi = {
  getModulesByCourseId: async (courseId: number): Promise<CourseModule[]> => {
    const envelope = await request<ApiEnvelope<CourseModule[]>>(`/courses/${courseId}/modules`);
    return envelope.data;
  },

  createModule: async (courseId: number, dto: CreateModuleDto): Promise<CourseModule> => {
    const envelope = await request<ApiEnvelope<CourseModule>>(`/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return envelope.data;
  },

  updateModule: async (moduleId: number, dto: UpdateModuleDto): Promise<CourseModule> => {
    const envelope = await request<ApiEnvelope<CourseModule>>(`/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
    return envelope.data;
  },

  deleteModule: async (moduleId: number): Promise<void> => {
    await request<ApiEnvelope<null>>(`/modules/${moduleId}`, {
      method: 'DELETE',
    });
  },

  bulkCreateModules: async (courseId: number, items: BulkImportModuleItem[]): Promise<CourseModule[]> => {
    const envelope = await request<ApiEnvelope<CourseModule[]>>(`/courses/${courseId}/modules/bulk`, {
      method: 'POST',
      body: JSON.stringify(items),
    });
    return envelope.data;
  },
};
