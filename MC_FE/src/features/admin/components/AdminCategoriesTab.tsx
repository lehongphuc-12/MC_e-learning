import React from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  BookOpen,
  Mic,
  Volume2,
  Sparkles,
  FileText,
  Zap,
  Award,
  Users,
  Heart,
  Radio,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { AdminCategory } from '../types/adminTypes';

interface AdminCategoriesTabProps {
  categories: AdminCategory[];
  onAddCategory: () => void;
  onEditCategory: (category: AdminCategory) => void;
  onToggleStatus?: (categoryId: string) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case 'Mic':
      return <Mic className="w-5 h-5 text-purple-400" />;
    case 'Volume2':
    case 'Volume':
      return <Volume2 className="w-5 h-5 text-cyan-400" />;
    case 'Sparkles':
      return <Sparkles className="w-5 h-5 text-amber-400" />;
    case 'FileText':
      return <FileText className="w-5 h-5 text-indigo-400" />;
    case 'Zap':
      return <Zap className="w-5 h-5 text-yellow-400" />;
    case 'Award':
      return <Award className="w-5 h-5 text-emerald-400" />;
    case 'Users':
      return <Users className="w-5 h-5 text-blue-400" />;
    case 'Heart':
      return <Heart className="w-5 h-5 text-rose-400" />;
    case 'Radio':
      return <Radio className="w-5 h-5 text-pink-400" />;
    default:
      return <Mic className="w-5 h-5 text-purple-400" />;
  }
};

export const AdminCategoriesTab: React.FC<AdminCategoriesTabProps> = ({
  categories,
  onAddCategory,
  onEditCategory,
  onToggleStatus,
  onDeleteCategory,
  onRefresh,
  isLoading,
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
            Cấu hình phân loại các nhóm chủ đề bài học thực tế kết nối với Backend database.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer disabled:opacity-50"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
              <span>Làm mới</span>
            </button>
          )}

          <button
            onClick={onAddCategory}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Danh Mục</span>
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl">
          <FolderTree className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Chưa có danh mục nào trong hệ thống.</p>
          <button
            onClick={onAddCategory}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Thêm danh mục đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat) => {
            const isActive = cat.status === 'active';
            return (
              <div
                key={cat.id}
                className={`p-5 rounded-2xl bg-slate-900/70 border flex flex-col justify-between transition group shadow-lg ${
                  isActive
                    ? 'border-slate-800 hover:border-purple-500/40'
                    : 'border-slate-800/50 opacity-75 hover:opacity-100 hover:border-amber-500/40'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 group-hover:scale-105 transition-transform">
                        {getCategoryIcon(cat.iconName)}
                      </div>
                      <span
                        className={`inline-flex items-center space-x-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Hoạt động</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>Tạm ngưng</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      {onToggleStatus && (
                        <button
                          onClick={() => onToggleStatus(cat.id)}
                          className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                            isActive
                              ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                              : 'text-emerald-400 hover:bg-slate-800'
                          }`}
                          title={isActive ? 'Tạm ngưng danh mục' : 'Kích hoạt danh mục'}
                        >
                          {isActive ? 'Khóa' : 'Mở'}
                        </button>
                      )}

                      <button
                        onClick={() => onEditCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        title="Chỉnh sửa danh mục"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {onDeleteCategory && (
                        <button
                          onClick={() => onDeleteCategory(cat.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                          title="Xóa danh mục"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {cat.description || 'Chưa có mô tả'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center space-x-1.5 text-slate-300 font-semibold">
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    <span>{cat.coursesCount} khóa học</span>
                  </span>
                  <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 font-mono text-slate-400">
                    ID: {cat.id}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

