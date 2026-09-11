import React, { useState, useEffect } from 'react';
import { X, Tag, FileText, LayoutGrid } from 'lucide-react';
import { AdminCategory } from '../../types/adminTypes';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: AdminCategory | null;
  onSave: (categoryData: Partial<AdminCategory>) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconName, setIconName] = useState('Code');

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description);
      setIconName(category.iconName);
    } else {
      setName('');
      setDescription('');
      setIconName('Code');
    }
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: category?.id,
      name: name.trim(),
      slug: name.trim().toLowerCase().replace(/\s+/g, '-'),
      description: description.trim(),
      iconName,
      status: 'active',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg text-white">
              {category ? 'Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Tên danh mục
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Điện Toán Đám Mây"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Biểu tượng (Icon)
            </label>
            <select
              value={iconName}
              onChange={(e) => setIconName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:border-purple-500"
            >
              <option value="Code">Code (Lập trình)</option>
              <option value="Palette">Palette (Thiết kế)</option>
              <option value="Cpu">Cpu (AI / Công nghệ)</option>
              <option value="Database">Database (Dữ liệu)</option>
              <option value="TrendingUp">TrendingUp (Marketing)</option>
              <option value="Globe">Globe (Ngoại ngữ)</option>
              <option value="Briefcase">Briefcase (Kinh doanh)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Mô tả danh mục
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tóm tắt ngắn gọn chủ đề của danh mục này..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-lg shadow-purple-600/20 transition"
            >
              {category ? 'Cập Nhật' : 'Tạo Danh Mục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
