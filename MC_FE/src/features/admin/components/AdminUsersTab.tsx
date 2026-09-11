import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Lock,
  Unlock,
  Edit2,
  Shield,
  GraduationCap,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { AdminUser, UserRole, UserStatus } from '../types/adminTypes';

interface AdminUsersTabProps {
  users: AdminUser[];
  onAddUser: () => void;
  onEditUser: (user: AdminUser) => void;
  onToggleStatus: (userId: string, currentStatus: UserStatus) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  onAddUser,
  onEditUser,
  onToggleStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Shield className="w-3 h-3 mr-1" /> Admin
          </span>
        );
      case 'instructor':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Briefcase className="w-3 h-3 mr-1" /> Giảng Viên
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <GraduationCap className="w-3 h-3 mr-1" /> Học Viên
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-400" />
            <span>Quản Lý Người Dùng</span>
          </h1>
          <p className="text-sm text-slate-400">
            Danh sách tất cả tài khoản Học viên, Giảng viên và Quản trị viên trong hệ thống.
          </p>
        </div>
        <button
          onClick={onAddUser}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Người Dùng</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên hoặc email tài khoản..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              roleFilter === 'all'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả ({users.length})
          </button>
          <button
            onClick={() => setRoleFilter('student')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              roleFilter === 'student'
                ? 'bg-blue-500/20 text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Học viên
          </button>
          <button
            onClick={() => setRoleFilter('instructor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              roleFilter === 'instructor'
                ? 'bg-purple-500/20 text-purple-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Giảng viên
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              roleFilter === 'admin'
                ? 'bg-rose-500/20 text-rose-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Admin
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Tài Khoản / Email</th>
                <th className="px-6 py-4">Vai Trò (Role)</th>
                <th className="px-6 py-4">Trạng Thái</th>
                <th className="px-6 py-4">Ngày Tham Gia</th>
                <th className="px-6 py-4">Hoạt Động Khóa Học</th>
                <th className="px-6 py-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Không tìm thấy người dùng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={
                            user.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              user.name
                            )}&background=2563eb&color=fff`
                          }
                          alt={user.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <p className="font-semibold text-white text-sm">{user.name}</p>
                          <p className="text-slate-400 text-xs">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>

                    <td className="px-6 py-4">
                      {user.status === 'active' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <UserCheck className="w-3 h-3 mr-1" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <Lock className="w-3 h-3 mr-1" /> Bị khóa
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-slate-400">{user.joinedDate}</td>

                    <td className="px-6 py-4">
                      {user.role === 'student' && (
                        <span className="text-slate-300 font-medium">
                          {user.coursesEnrolled || 0} khóa đăng ký
                        </span>
                      )}
                      {user.role === 'instructor' && (
                        <span className="text-purple-300 font-medium">
                          {user.coursesCreated || 0} khóa đã tạo
                        </span>
                      )}
                      {user.role === 'admin' && (
                        <span className="text-slate-500 italic">Quản trị viên hệ thống</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onEditUser(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Chỉnh sửa tài khoản"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onToggleStatus(user.id, user.status)}
                          className={`p-1.5 rounded-lg transition ${
                            user.status === 'active'
                              ? 'text-rose-400 hover:bg-rose-500/10'
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                          title={user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
                        >
                          {user.status === 'active' ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
