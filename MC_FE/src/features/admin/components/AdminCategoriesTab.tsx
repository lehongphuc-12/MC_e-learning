import React from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  BookOpen,
  Code,
  Palette,
  Cpu,
  Database,
  TrendingUp,
  Globe,
  Briefcase,
} from 'lucide-react';
import { AdminCategory } from '../types/adminTypes';

interface AdminCategoriesTabProps {
  categories: AdminCategory[];
  onAddCategory: () => void;
  onEditCategory: (category: AdminCategory) => void;
}

const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case 'Palette':
      return <Palette className="w-5 h-5 text-purple-400" />;
    case 'Cpu':
      return <Cpu className="w-5 h-5 text-cyan-400" />;
    case 'Database':
      return <Database className="w-5 h-5 text-indigo-400" />;
    case 'TrendingUp':
      return <TrendingUp className="w-5 h-5 text-emerald-400" />;
    case 'Globe':
      return <Globe className="w-5 h-5 text-blue-400" />;
    case 'Briefcase':
      return <Briefcase className="w-5 h-5 text-amber-400" />;
    default:
      return <Code className="w-5 h-5 text-blue-400" />;
  }
};

export const AdminCategoriesTab: React.FC<AdminCategoriesTabProps> = ({
  categories,
  onAddCategory,
  onEditCategory,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FolderTree className="w-6 h-6 text-purple-400" />
            <span>Quản Lý Danh Mục Khóa Học</span>
          </h1>
          <p className="text-sm text-slate-400">
            Cấu hình phân loại các nhóm chủ đề bài học để học viên dễ dàng tìm kiếm.
          </p>
        </div>
        <button
          onClick={onAddCategory}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/20 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Danh Mục</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between hover:border-purple-500/40 transition group shadow-lg cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 group-hover:scale-110 transition-transform">
                  {getCategoryIcon(cat.iconName)}
                </div>
                <button
                  onClick={() => onEditCategory(cat)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Chỉnh sửa danh mục"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cat.description}</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center space-x-1.5 text-slate-300 font-semibold">
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                <span>{cat.coursesCount} khóa học</span>
              </span>
              <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                Slug: {cat.slug}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
