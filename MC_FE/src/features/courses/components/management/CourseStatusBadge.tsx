// =============================================================================
// CourseStatusBadge.tsx  —  Reusable status pill for course rows
//
// WHY a dedicated component?
//   The status badge is rendered in the table row, the form header, and
//   potentially admin views. A single component ensures visual consistency
//   and means styling changes propagate everywhere automatically.
// =============================================================================

import React from 'react';
import type { CourseStatus } from '../../types/courseTypes';

interface CourseStatusBadgeProps {
  status: CourseStatus;
  // Optional size variant — 'sm' for table rows, 'md' for form header
  size?: 'sm' | 'md';
}

// Maps each status to a Tailwind color scheme with Vietnamese labels
const STATUS_CONFIG: Record<CourseStatus, { label: string; className: string; dotColor: string }> = {
  DRAFT: {
    label: 'Bản nháp',
    className: 'bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs',
    dotColor: 'bg-amber-500',
  },
  PUBLISHED: {
    label: 'Đã xuất bản',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs',
    dotColor: 'bg-emerald-500 animate-pulse',
  },
  ARCHIVED: {
    label: 'Đã lưu trữ',
    className: 'bg-slate-100 text-slate-600 border border-slate-200 shadow-xs',
    dotColor: 'bg-slate-400',
  },
};

export const CourseStatusBadge: React.FC<CourseStatusBadgeProps> = ({
  status,
  size = 'sm',
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const sizeClass = size === 'sm' ? 'text-xs px-2.5 py-1 font-medium' : 'text-sm px-3.5 py-1.5 font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-full transition-colors ${sizeClass} ${config.className}`}
    >
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
};
