import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2 } from 'lucide-react';
import { useDeleteQuiz } from '../hooks/useQuiz';
import type { ToastType } from '../../../components/common/Toast';

interface DeleteQuizButtonProps {
  quizId: number;
  quizTitle?: string;
  disabled?: boolean;
  variant?: 'default' | 'menu';
  onDeleted?: () => void;
  onToast?: (title: string, desc?: string, type?: ToastType) => void;
  onError?: (message: string) => void;
}

export const DeleteQuizButton: React.FC<DeleteQuizButtonProps> = ({ quizId, quizTitle, disabled = false, variant = 'default', onDeleted, onToast, onError }) => {
  const navigate = useNavigate();
  const deleteQuizMutation = useDeleteQuiz();

  const handleDelete = async () => {
    if (disabled || deleteQuizMutation.isPending) return;
    if (!window.confirm(`Bạn có chắc muốn lưu trữ Quiz #${quizId} (${quizTitle ?? ''})?`)) return;
    onError?.('');
    try {
      await deleteQuizMutation.mutateAsync(quizId);
      onToast?.('Đã lưu trữ Quiz', 'Quiz đã được lưu trữ thành công.', 'success');
      if (onDeleted) onDeleted();
      else navigate('/instructor/quizzes', { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể lưu trữ Quiz. Vui lòng thử lại.';
      if (onError) onError(message);
      else window.alert(message);
    }
  };

  return (
    <button type="button" disabled={disabled || deleteQuizMutation.isPending} onClick={handleDelete} className={variant === 'menu' ? 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40' : 'mr-auto inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60'}>
      {deleteQuizMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {deleteQuizMutation.isPending ? 'Đang lưu trữ...' : 'Xóa Quiz'}
    </button>
  );
};
