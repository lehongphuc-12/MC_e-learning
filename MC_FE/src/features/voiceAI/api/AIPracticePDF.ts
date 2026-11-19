
import type { AIPracticeResult } from '../types/aiPracticeTypes';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Không xác định'
    : date.toLocaleString('vi-VN');
}

function formatStatus(status: string): string {
  switch (status) {
    case 'PASSED':
      return 'Đạt';
    case 'FAILED':
      return 'Chưa đạt';
    case 'NOT_EVALUATED':
      return 'Chưa xác định đạt/chưa đạt';
    default:
      return status;
  }
}

function renderText(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function renderList(
  items: string[],
  emptyMessage = 'Chưa có dữ liệu.'
): string {
  if (!items.length) {
    return `<p class="muted">${escapeHtml(emptyMessage)}</p>`;
  }

  return `
    <ul>
      ${items
        .map((item) => `<li>${renderText(item)}</li>`)
        .join('')}
    </ul>
  `;
}

export function printAIPracticePDF(
  result: AIPracticeResult
): boolean {
  const printWindow = window.open(
    '',
    '_blank',
    'width=900,height=800'
  );

  if (!printWindow) {
    return false;
  }

  const criteria = result.criteria ?? [];
  const strengths = result.strengths ?? [];
  const issues = result.issues ?? [];
  const recommendations = result.recommendations ?? [];
  const practicePlan = result.practicePlan ?? [];

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Bao-cao-AI-${result.practiceSessionId}</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 35px;
      background: #fff;
      color: #1e293b;
      font-family: Arial, sans-serif;
      font-size: 13px;
      line-height: 1.7;
    }

    .header {
      border-bottom: 3px solid #7c3aed;
      padding-bottom: 18px;
      margin-bottom: 25px;
    }

    .brand {
      color: #7c3aed;
      font-size: 14px;
      font-weight: bold;
      letter-spacing: 2px;
    }

    h1 {
      margin: 10px 0;
      color: #0f172a;
      font-size: 25px;
    }

    h2 {
      margin: 24px 0 12px;
      color: #5b21b6;
      font-size: 16px;
      border-bottom: 1px solid #ddd6fe;
      padding-bottom: 7px;
    }

    h3 {
      margin: 10px 0 5px;
      font-size: 13px;
    }

    .muted {
      color: #64748b;
    }

    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 20px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
    }

    .box {
      padding: 14px;
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      break-inside: avoid;
    }

    .summary {
      background: #f5f3ff;
      border-left: 4px solid #8b5cf6;
      padding: 14px;
      border-radius: 6px;
    }

    .criterion {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
    }

    .criterion:last-child {
      border-bottom: none;
    }

    .evidence {
      margin-top: 6px;
      color: #475569;
      white-space: normal;
    }

    ul {
      padding-left: 20px;
    }

    li {
      margin-bottom: 7px;
    }

    .footer {
      margin-top: 35px;
      border-top: 1px solid #cbd5e1;
      padding-top: 12px;
      color: #64748b;
      font-size: 11px;
    }

    .print-button {
      display: block;
      margin: 0 0 25px auto;
      padding: 10px 20px;
      background: #7c3aed;
      color: white;
      border: 0;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
    }

    @page {
      size: A4;
      margin: 16mm;
    }

    @media print {
      body {
        padding: 0;
      }

      .print-button {
        display: none;
      }

      h2 {
        break-after: avoid;
      }
    }
  </style>
</head>

<body>
  <button class="print-button" onclick="window.print()">
    In / Lưu thành PDF
  </button>

  <header class="header">
    <div class="brand">MSEEK AI SPEAKING</div>

    <h1>BÁO CÁO LUYỆN TẬP AI</h1>

    <p class="muted">
      Báo cáo phản hồi hỗ trợ luyện nói và phát âm
    </p>
  </header>

  <div class="meta">
    <div>
      <strong>Mã phiên:</strong>
      #${result.practiceSessionId}
    </div>

    <div>
      <strong>Ngày tạo:</strong>
      ${escapeHtml(formatDate(result.createdAt))}
    </div>

    <div>
      <strong>Hình thức:</strong>
      ${result.practiceMode === 'COURSE'
        ? 'Trong khóa học'
        : 'Luyện tập tự do'}
    </div>

    <div>
      <strong>Mô hình:</strong>
      ${escapeHtml(result.modelVersion)}
    </div>

    <div>
      <strong>Khóa học:</strong>
      ${result.courseId ?? 'Không áp dụng'}
    </div>

    <div>
      <strong>Bài học:</strong>
      ${result.lessonId ?? 'Không áp dụng'}
    </div>
  </div>

  <h2>1. Tổng quan đánh giá</h2>

  <div class="summary">
    ${renderText(result.overallAssessment)}
  </div>

  <h2>2. Các tiêu chí đánh giá</h2>

  ${
    criteria.length
      ? criteria
          .map(
            (criterion) => `
              <div class="criterion">
                <strong>
                  ${escapeHtml(criterion.code)} -
                  ${escapeHtml(criterion.name)}
                </strong>

                <div>
                  Trạng thái:
                  ${escapeHtml(formatStatus(criterion.status))}
                </div>

                <div class="muted">
                  ${
                    criterion.evidenceAvailable
                      ? 'Có dữ liệu phân tích tham khảo'
                      : 'Chưa có dữ liệu phân tích'
                  }
                </div>
              </div>
            `
          )
          .join('')
      : '<p class="muted">Chưa có dữ liệu tiêu chí.</p>'
  }

  <h2>3. Nhận xét tổng hợp</h2>

  <div class="box">
    ${renderText(result.summary)}
  </div>

  <h2>4. Điểm mạnh</h2>

  ${
    strengths.length
      ? strengths
          .map(
            (item) => `
              <div class="box">
                <h3>${escapeHtml(item.category)}</h3>

                <div>${renderText(item.explanation)}</div>

                ${
                  item.evidence
                    ? `<div class="evidence">
                        <strong>Minh chứng:</strong>
                        ${renderText(item.evidence)}
                       </div>`
                    : ''
                }
              </div>
            `
          )
          .join('')
      : '<p class="muted">Chưa có điểm mạnh được xác nhận.</p>'
  }

  <h2>5. Nội dung cần chú ý</h2>

  ${
    issues.length
      ? issues
          .map(
            (item) => `
              <div class="box">
                <h3>${escapeHtml(item.category)}</h3>

                <div>${renderText(item.explanation)}</div>

                ${
                  item.evidence
                    ? `<div class="evidence">
                        <strong>Minh chứng:</strong>
                        ${renderText(item.evidence)}
                       </div>`
                    : ''
                }
              </div>
            `
          )
          .join('')
      : '<p class="muted">Chưa có vấn đề được xác nhận.</p>'
  }

  <h2>6. Khuyến nghị luyện tập</h2>

  ${renderList(recommendations)}

  <h2>7. Kế hoạch luyện tập</h2>

  ${
    practicePlan.length
      ? practicePlan
          .map(
            (item, index) => `
              <div class="box">
                <h3>
                  Bài ${index + 1}:
                  ${escapeHtml(item.title)}
                </h3>

                <div>${renderText(item.instruction)}</div>

                <div class="evidence">
                  <strong>Ví dụ:</strong>
                  ${renderText(item.example)}
                </div>
              </div>
            `
          )
          .join('')
      : '<p class="muted">Chưa có kế hoạch luyện tập cụ thể.</p>'
  }

  <h2>8. Lời động viên</h2>

  <div class="summary">
    ${renderText(result.encouragement)}
  </div>

  ${
    result.transcript
      ? `
        <h2>9. Bản chép lời tham khảo</h2>

        <div class="box">
          ${renderText(result.transcript)}
        </div>
      `
      : ''
  }

  <footer class="footer">
    Báo cáo được tạo từ kết quả AI đã lưu.

    <p>
      Kết quả mang tính chất hỗ trợ luyện tập,
      không thay thế điểm chấm thi chính thức.
      Trạng thái chưa đánh giá không đồng nghĩa với không đạt.
    </p>
  </footer>
</body>
</html>
`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  return true;
}
