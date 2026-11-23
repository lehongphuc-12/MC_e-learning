import React from 'react';
import { ArrowLeft, Clock3, Info, RefreshCw } from 'lucide-react';

/** Never render raw server errors or technical timestamps to learners. */
export function friendlyQuizError(error: unknown): { title: string; description: string; retryAt?: string } {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const text = raw.toLowerCase();
  const iso = raw.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})/i);
  if (/(chờ đến|wait until|retry after|cooldown|bài tiếp theo|next attempt|next quiz)/i.test(raw)) {
    let retryAt: string | undefined;
    if (iso) {
      const date = new Date(iso[0]);
      if (!Number.isNaN(date.getTime())) retryAt = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    }
    return { title: 'Bài kiểm tra tiếp theo chưa mở', description: 'Theo quy định của khóa học, bạn cần chờ trước khi tiếp tục làm bài. Vui lòng quay lại khi đến thời gian được phép.', retryAt };
  }
  if (/(maximum|attempts? exceeded|hết lượt|số lượt)/i.test(text)) return { title: 'Bạn đã sử dụng hết lượt làm bài', description: 'Số lượt làm bài được quy định cho bài kiểm tra này đã hết. Vui lòng liên hệ bộ phận hỗ trợ nếu cần được hướng dẫn thêm.' };
  if (/(unauthorized|forbidden|403|401|permission|quyền truy cập)/i.test(text)) return { title: 'Bạn chưa có quyền truy cập', description: 'Vui lòng đăng nhập bằng tài khoản được cấp quyền tham gia khóa học.' };
  if (/(not found|404|không tồn tại)/i.test(text)) return { title: 'Không tìm thấy bài kiểm tra', description: 'Bài kiểm tra có thể đã được thay đổi hoặc không còn khả dụng. Vui lòng quay lại trang khóa học.' };
  if (/(network|fetch|timeout|connection|kết nối)/i.test(text)) return { title: 'Kết nối đang bị gián đoạn', description: 'Chưa thể kết nối đến hệ thống. Vui lòng kiểm tra kết nối Internet và thử lại.' };
  return { title: 'Chưa thể hoàn tất yêu cầu', description: 'Hệ thống chưa thể xử lý yêu cầu của bạn lúc này. Vui lòng thử lại sau ít phút. Nếu tình trạng tiếp diễn, hãy liên hệ bộ phận hỗ trợ.' };
}

export const QuizNotice: React.FC<{ error: unknown; onBack?: () => void; onRetry?: () => void }> = ({ error, onBack, onRetry }) => {
  const notice = friendlyQuizError(error);
  return <div className="flex min-h-[55vh] items-center justify-center bg-[#f6f9fe] px-4 py-12"><section role="status" aria-live="polite" className="w-full max-w-lg rounded-3xl border border-[#e2eaf6] bg-white px-6 py-10 text-center shadow-[0_14px_45px_rgba(30,66,120,.07)] sm:px-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eaf3ff] text-[#2469b8]">{notice.retryAt ? <Clock3 size={30}/> : <Info size={30}/>}</div><h2 className="mt-6 text-xl font-bold tracking-tight text-[#18365f]">{notice.title}</h2><p className="mt-3 text-sm leading-7 text-[#5f718b]">{notice.description}</p>{notice.retryAt && <div className="mt-6 rounded-2xl border border-[#dbe9f9] bg-[#f4f8ff] px-4 py-4"><p className="text-xs font-medium text-[#5f718b]">Thời gian có thể tiếp tục (giờ Việt Nam)</p><p className="mt-1 text-base font-bold text-[#194f91]">{notice.retryAt}</p></div>}<div className="mt-7 flex flex-wrap justify-center gap-3">{onBack && <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-[#d5e2f2] px-5 py-3 text-sm font-semibold text-[#234e80]"><ArrowLeft size={16}/> Quay lại</button>}{onRetry && <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-xl bg-[#1766c1] px-5 py-3 text-sm font-semibold text-white"><RefreshCw size={16}/> Thử lại</button>}</div></section></div>;
};
