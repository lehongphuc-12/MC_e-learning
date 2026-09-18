import React, { useState } from 'react';
import { X, Users, Search, CheckCircle2, Clock, Mail, Calendar, GraduationCap } from 'lucide-react';

interface StudentItem {
  id: number;
  name: string;
  email: string;
  avatar: string;
  enrolledDate: string;
  progress: number;
  status: 'COMPLETED' | 'IN_PROGRESS';
}

const MOCK_STUDENTS: StudentItem[] = [
  {
    id: 1,
    name: 'Nguyễn Văn An',
    email: 'nguyen.an@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop',
    enrolledDate: '15/09/2026',
    progress: 85,
    status: 'IN_PROGRESS',
  },
  {
    id: 2,
    name: 'Trần Thị Mai',
    email: 'mai.tran@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop',
    enrolledDate: '12/09/2026',
    progress: 100,
    status: 'COMPLETED',
  },
  {
    id: 3,
    name: 'Lê Hoàng Nam',
    email: 'nam.le@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop',
    enrolledDate: '10/09/2026',
    progress: 40,
    status: 'IN_PROGRESS',
  },
  {
    id: 4,
    name: 'Phạm Thu Thảo',
    email: 'thao.pham@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop',
    enrolledDate: '08/09/2026',
    progress: 92,
    status: 'IN_PROGRESS',
  },
  {
    id: 5,
    name: 'Đặng Minh Khoa',
    email: 'khoa.dang@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop',
    enrolledDate: '05/09/2026',
    progress: 100,
    status: 'COMPLETED',
  },
];

interface CourseStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle?: string;
}

export const CourseStudentsModal: React.FC<CourseStudentsModalProps> = ({
  isOpen,
  onClose,
  courseTitle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredStudents = MOCK_STUDENTS.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-cyan-500/20 text-cyan-300 rounded-2xl border border-cyan-400/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Danh Sách Học Viên Ghi Danh</h3>
              <p className="text-xs text-cyan-200/80 line-clamp-1">
                {courseTitle ? `Khóa: ${courseTitle}` : 'Quản lý thông tin & tiến độ học tập của học viên'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Toolbar */}
        <div className="px-6 pt-4 pb-2 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm học viên theo tên, email..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Tổng cộng:</span>
            <span className="font-bold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
              {filteredStudents.length} / 128 học viên
            </span>
          </div>
        </div>

        {/* Modal Body: Student List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Không tìm thấy học viên phù hợp</p>
              <p className="text-xs text-slate-400">Thử tìm kiếm với từ khóa khác</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3">Học viên</th>
                    <th className="pb-3 px-3">Ngày tham gia</th>
                    <th className="pb-3 px-3">Tiến độ học</th>
                    <th className="pb-3 px-3 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Name & Email */}
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-3">
                          <img
                            src={student.avatar}
                            alt={student.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-cyan-600 transition-colors">
                              {student.name}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" /> {student.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Enrollment Date */}
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{student.enrolledDate}</span>
                        </div>
                      </td>

                      {/* Progress bar */}
                      <td className="py-3 px-3 w-44">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span>{student.progress}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                student.progress === 100
                                  ? 'bg-emerald-500'
                                  : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                              }`}
                              style={{ width: `${student.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-right">
                        {student.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Hoàn thành
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3 animate-pulse" /> Đang học
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[11px] text-slate-400 italic">
            * Dữ liệu học viên minh họa cho giao diện người dùng (UI Preview)
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200/60 bg-white border border-slate-200 rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
