/**
 * MC MentorChat - RAG Chatbot Application Logic
 * Supports Drag & Drop for PDF, DOCX, DOC, TXT files
 * Mode: Standalone Interactive Demo + Live FastAPI Backend Support
 */

// Application State
const state = {
  apiMode: 'demo', // 'demo' | 'api'
  apiBaseUrl: 'http://localhost:8000',
  documents: [
    {
      id: 'doc-sample-1',
      name: 'Giao_Trinh_Nhap_Mon_AI.pdf',
      type: 'pdf',
      size: 2450000,
      pages: 18,
      chunks: 36,
      date: 'Vừa xong',
      selected: true,
      textPreview: 'Trí tuệ nhân tạo (AI) là lĩnh vực nghiên cứu nhằm xây dựng các hệ thống máy tính có khả năng thực hiện nhiệm vụ đòi hỏi trí thông minh con người như học hỏi, suy luận, tự thích nghi. Mô hình RAG (Retrieval-Augmented Generation) kết hợp khả năng tìm kiếm vector và mô hình ngôn ngữ lớn để trả lời dựa trên tài liệu thực tế.'
    }
  ],
  messages: [],
  isUploading: false,
  isGenerating: false
};

// DOM Elements
const elements = {
  dropzone: document.getElementById('dropzone'),
  fileInput: document.getElementById('file-input'),
  uploadProgressBox: document.getElementById('upload-progress-box'),
  progressBarFill: document.getElementById('progress-bar-fill'),
  progressPercent: document.getElementById('progress-percent'),
  progressStatusText: document.getElementById('progress-status-text'),
  documentList: document.getElementById('document-list'),
  docCountBadge: document.getElementById('doc-count-badge'),
  statDocCount: document.getElementById('stat-doc-count'),
  statChunkCount: document.getElementById('stat-chunk-count'),
  clearDocsBtn: document.getElementById('clear-docs-btn'),
  chatContainer: document.getElementById('chat-messages'),
  welcomeHero: document.getElementById('welcome-hero'),
  chatInput: document.getElementById('chat-input'),
  sendBtn: document.getElementById('send-btn'),
  ragTargetName: document.getElementById('rag-target-name'),
  previewModal: document.getElementById('preview-modal'),
  previewTitle: document.getElementById('preview-title'),
  previewContent: document.getElementById('preview-content'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  clearChatBtn: document.getElementById('clear-chat-btn'),
  sidebar: document.getElementById('app-sidebar'),
  sidebarToggleBtn: document.getElementById('sidebar-toggle-btn'),
  btnModeDemo: document.getElementById('btn-mode-demo'),
  btnModeApi: document.getElementById('btn-mode-api')
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupDragAndDrop();
  renderDocumentList();
  updateRAGTargetBadge();
  setupQuickPrompts();
});

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================
function setupEventListeners() {
  // Input Auto-resize
  elements.chatInput.addEventListener('input', () => {
    elements.chatInput.style.height = 'auto';
    elements.chatInput.style.height = Math.min(elements.chatInput.scrollHeight, 160) + 'px';
    elements.sendBtn.disabled = !elements.chatInput.value.trim() || state.isGenerating;
  });

  // Enter to send, Shift+Enter for new line
  elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  elements.sendBtn.addEventListener('click', handleSendMessage);

  // File input click
  elements.dropzone.addEventListener('click', () => {
    elements.fileInput.click();
  });

  elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesUpload(Array.from(e.target.files));
      elements.fileInput.value = '';
    }
  });

  // Clear documents button
  elements.clearDocsBtn.addEventListener('click', () => {
    if (confirm('Bạn có chắc muốn xóa tất cả tài liệu khỏi bộ nhớ RAG?')) {
      state.documents = [];
      renderDocumentList();
      updateRAGTargetBadge();
    }
  });

  // Clear chat
  elements.clearChatBtn.addEventListener('click', () => {
    state.messages = [];
    elements.chatContainer.innerHTML = '';
    if (elements.welcomeHero) {
      elements.welcomeHero.style.display = 'flex';
      elements.chatContainer.appendChild(elements.welcomeHero);
    }
  });

  // Modal close
  elements.closeModalBtn.addEventListener('click', () => {
    elements.previewModal.classList.remove('active');
  });

  elements.previewModal.addEventListener('click', (e) => {
    if (e.target === elements.previewModal) {
      elements.previewModal.classList.remove('active');
    }
  });

  // Sidebar mobile toggle
  if (elements.sidebarToggleBtn) {
    elements.sidebarToggleBtn.addEventListener('click', () => {
      elements.sidebar.classList.toggle('open');
    });
  }

  // Demo / API toggle
  elements.btnModeDemo.addEventListener('click', () => setApiMode('demo'));
  elements.btnModeApi.addEventListener('click', () => setApiMode('api'));
}

function setApiMode(mode) {
  state.apiMode = mode;
  if (mode === 'demo') {
    elements.btnModeDemo.classList.add('active');
    elements.btnModeApi.classList.remove('active');
    showToast('Đang ở Chế độ Mô phỏng (Demo Offline)!', 'info');
  } else {
    elements.btnModeApi.classList.add('active');
    elements.btnModeDemo.classList.remove('active');
    showToast(`Đã chuyển sang kết nối FastAPI (${state.apiBaseUrl})!`, 'info');
  }
}

// ==========================================================================
// DRAG AND DROP FUNCTIONALITY
// ==========================================================================
function setupDragAndDrop() {
  const dropzone = elements.dropzone;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      handleFilesUpload(Array.from(files));
    }
  }, false);

  // Allow dropping files anywhere on chat area as well!
  const chatMain = document.querySelector('.chat-main');
  chatMain.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  chatMain.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  });
  chatMain.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(Array.from(e.dataTransfer.files));
    }
  });
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// ==========================================================================
// FILE UPLOAD & PROCESSING
// ==========================================================================
async function handleFilesUpload(files) {
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md'];
  const validFiles = files.filter(f => {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    return allowedExtensions.includes(ext);
  });

  if (validFiles.length === 0) {
    showToast('Vui lòng chọn tệp định dạng PDF, DOCX, DOC hoặc TXT!', 'error');
    return;
  }

  state.isUploading = true;
  elements.uploadProgressBox.classList.add('active');

  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i];
    await processFile(file, i + 1, validFiles.length);
  }

  setTimeout(() => {
    elements.uploadProgressBox.classList.remove('active');
    elements.progressBarFill.style.width = '0%';
    state.isUploading = false;
    showToast(`Đã thêm thành công ${validFiles.length} tài liệu vào bộ nhớ RAG!`, 'success');
  }, 700);
}

async function processFile(file, currentIdx, totalFiles) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  const fileType = ext.replace('.', '');
  
  // Update progress animation
  updateProgress(25, `[${currentIdx}/${totalFiles}] Đang đọc dữ liệu ${file.name}...`);
  await delay(350);

  updateProgress(60, `[${currentIdx}/${totalFiles}] Đang phân tích cú pháp & trích xuất nội dung...`);
  
  // Read text preview if possible
  let previewText = '';
  try {
    if (fileType === 'txt' || fileType === 'md') {
      previewText = await file.text();
    } else {
      previewText = `Nội dung tài liệu ${file.name}. Đã phân tích các trang, đoạn văn và tiêu đề tài liệu để phục vụ truy xuất RAG vector.`;
    }
  } catch (err) {
    previewText = `Tài liệu: ${file.name}`;
  }

  await delay(300);
  updateProgress(85, `[${currentIdx}/${totalFiles}] Đang tạo Vector Embeddings (Chunking)...`);
  await delay(400);

  // Compute simulated chunks and pages based on file size
  const estimatedPages = Math.max(1, Math.round(file.size / (1024 * 60)));
  const estimatedChunks = Math.max(2, Math.round(file.size / (1024 * 25)));

  const newDoc = {
    id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    name: file.name,
    type: fileType,
    size: file.size,
    pages: estimatedPages,
    chunks: estimatedChunks,
    date: 'Vừa xong',
    selected: true,
    textPreview: previewText
  };

  state.documents.unshift(newDoc);
  renderDocumentList();
  updateRAGTargetBadge();
  updateProgress(100, `Hoàn tất nạp ${file.name}!`);
}

function updateProgress(percent, statusText) {
  elements.progressBarFill.style.width = percent + '%';
  elements.progressPercent.textContent = percent + '%';
  elements.progressStatusText.innerHTML = `<span>⚡</span> ${statusText}`;
}

// ==========================================================================
// RENDER DOCUMENT LIST
// ==========================================================================
function renderDocumentList() {
  const container = elements.documentList;
  container.innerHTML = '';

  elements.docCountBadge.textContent = state.documents.length;
  elements.statDocCount.textContent = state.documents.length;
  
  const totalChunks = state.documents.reduce((acc, d) => acc + (d.chunks || 0), 0);
  elements.statChunkCount.textContent = totalChunks;

  if (state.documents.length === 0) {
    container.innerHTML = `
      <div class="empty-docs-placeholder">
        <span>📂 Chưa có tài liệu nào</span><br>
        <small style="color:var(--text-dim); margin-top:4px; display:inline-block;">Kéo thả file PDF hoặc Word vào khung phía trên để nạp.</small>
      </div>
    `;
    return;
  }

  state.documents.forEach(doc => {
    const card = document.createElement('div');
    card.className = 'doc-item-card';

    // File type styling
    let iconClass = 'pdf';
    let iconText = '📄';
    if (doc.type === 'docx' || doc.type === 'doc') {
      iconClass = 'docx';
      iconText = '📝';
    } else if (doc.type === 'txt' || doc.type === 'md') {
      iconClass = 'txt';
      iconText = '📑';
    }

    card.innerHTML = `
      <div class="doc-type-icon ${iconClass}">
        ${iconText}
      </div>
      <div class="doc-meta">
        <div class="doc-name" title="${escapeHtml(doc.name)}">${escapeHtml(doc.name)}</div>
        <div class="doc-subinfo">
          <span>${formatFileSize(doc.size)}</span> • 
          <span>${doc.pages} trang</span> • 
          <span class="badge-rag">${doc.chunks} chunks</span>
        </div>
      </div>
      <div class="doc-actions">
        <button class="doc-action-btn view-btn" title="Xem chi tiết" data-id="${doc.id}">
          👁️
        </button>
        <button class="doc-action-btn delete delete-btn" title="Xóa tài liệu" data-id="${doc.id}">
          ✕
        </button>
      </div>
    `;

    // Click to preview
    card.querySelector('.view-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openDocPreview(doc);
    });

    // Click to delete
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteDocument(doc.id);
    });

    container.appendChild(card);
  });
}

function deleteDocument(docId) {
  state.documents = state.documents.filter(d => d.id !== docId);
  renderDocumentList();
  updateRAGTargetBadge();
  showToast('Đã xóa tài liệu khỏi bộ nhớ RAG', 'info');
}

function openDocPreview(doc) {
  elements.previewTitle.textContent = doc.name;
  elements.previewContent.innerHTML = `
    <div style="margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px;">
      <p><strong>Loại tệp:</strong> .${doc.type.toUpperCase()}</p>
      <p><strong>Dung lượng:</strong> ${formatFileSize(doc.size)}</p>
      <p><strong>Số trang / section:</strong> ${doc.pages}</p>
      <p><strong>Số lượng vector chunks:</strong> ${doc.chunks}</p>
    </div>
    <h4 style="margin-bottom:8px; color: #fff;">Nội dung trích xuất mẫu:</h4>
    <div style="background: rgba(0,0,0,0.4); padding: 14px; border-radius: 8px; font-family: var(--font-mono); font-size: 0.82rem; color: #94a3b8; max-height: 250px; overflow-y: auto; white-space: pre-wrap;">
      ${escapeHtml(doc.textPreview || 'Nội dung văn bản sẵn sàng cho vector query.')}
    </div>
  `;
  elements.previewModal.classList.add('active');
}

function updateRAGTargetBadge() {
  if (state.documents.length === 0) {
    elements.ragTargetName.textContent = 'Chưa có tài liệu';
    elements.ragTargetName.style.color = 'var(--accent-amber)';
  } else if (state.documents.length === 1) {
    elements.ragTargetName.textContent = state.documents[0].name;
    elements.ragTargetName.style.color = 'var(--primary-light)';
  } else {
    elements.ragTargetName.textContent = `${state.documents.length} tài liệu đang hoạt động`;
    elements.ragTargetName.style.color = 'var(--accent-emerald)';
  }
}

// ==========================================================================
// QUICK PROMPTS
// ==========================================================================
function setupQuickPrompts() {
  document.querySelectorAll('.prompt-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const promptText = btn.getAttribute('data-prompt');
      if (promptText) {
        elements.chatInput.value = promptText;
        elements.chatInput.style.height = 'auto';
        elements.chatInput.style.height = elements.chatInput.scrollHeight + 'px';
        elements.sendBtn.disabled = false;
        elements.chatInput.focus();
      }
    });
  });
}

// ==========================================================================
// CHAT & RAG ENGINE
// ==========================================================================
async function handleSendMessage() {
  const text = elements.chatInput.value.trim();
  if (!text || state.isGenerating) return;

  // Clear input
  elements.chatInput.value = '';
  elements.chatInput.style.height = 'auto';
  elements.sendBtn.disabled = true;

  // Hide welcome hero if active
  if (elements.welcomeHero) {
    elements.welcomeHero.style.display = 'none';
  }

  // Append User Message
  appendUserMessage(text);
  state.isGenerating = true;

  // Append Assistant Thinking indicator
  const thinkingBubble = appendThinkingIndicator();
  scrollToBottom();

  try {
    if (state.apiMode === 'api') {
      // Live API Call to FastAPI Backend
      const response = await fetch(`${state.apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          document_ids: state.documents.map(d => d.id)
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Lỗi máy chủ`);
      }

      const data = await response.json();
      thinkingBubble.remove();
      appendAssistantMessage(data.answer, data.sources || []);
    } else {
      // Interactive Demo RAG Simulation
      await delay(900); // Simulate embedding search
      updateThinkingText(thinkingBubble, 'Đang tìm kiếm trong kho vector embeddings...');
      await delay(800);
      updateThinkingText(thinkingBubble, 'Đang phân tích ngữ cảnh và tổng hợp câu trả lời...');
      await delay(700);

      thinkingBubble.remove();
      const mockResult = generateMockRAGResponse(text);
      appendAssistantMessage(mockResult.answer, mockResult.sources);
    }
  } catch (error) {
    thinkingBubble.remove();
    appendAssistantMessage(
      `⚠️ **Đã xảy ra lỗi khi kết nối backend:**\n\`${error.message}\`\n\n*Mẹo: Bạn có thể bật Chế độ Mô phỏng (Demo) ở thanh menu trên cùng để trải nghiệm ngay mà không cần server.*`,
      []
    );
  } finally {
    state.isGenerating = false;
    elements.sendBtn.disabled = !elements.chatInput.value.trim();
    scrollToBottom();
  }
}

function appendUserMessage(text) {
  const row = document.createElement('div');
  row.className = 'message-row user';
  row.innerHTML = `
    <div class="message-avatar">👤</div>
    <div class="message-content-wrapper">
      <div class="message-sender-name">Bạn</div>
      <div class="message-bubble">
        ${escapeHtml(text)}
      </div>
    </div>
  `;
  elements.chatContainer.appendChild(row);
  scrollToBottom();
}

function appendThinkingIndicator() {
  const row = document.createElement('div');
  row.className = 'message-row assistant';
  row.innerHTML = `
    <div class="message-avatar">⚡</div>
    <div class="message-content-wrapper">
      <div class="message-sender-name">MC AI Mentor</div>
      <div class="message-bubble typing-bubble">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <span class="typing-text">Đang tra cứu tài liệu với RAG...</span>
      </div>
    </div>
  `;
  elements.chatContainer.appendChild(row);
  return row;
}

function updateThinkingText(bubbleElement, text) {
  const span = bubbleElement.querySelector('.typing-text');
  if (span) span.textContent = text;
}

function appendAssistantMessage(rawText, sources) {
  const row = document.createElement('div');
  row.className = 'message-row assistant';

  const formattedHtml = parseMarkdown(rawText);

  // Build Sources Accordion if available
  let sourcesHtml = '';
  if (sources && sources.length > 0) {
    const sourceItems = sources.map((src, i) => `
      <div class="source-item">
        <div class="source-header">
          <span class="source-file-badge">📄 ${escapeHtml(src.filename)} (Trang ${src.page || 1})</span>
          <span class="source-score">${Math.round(src.score * 100)}% khớp</span>
        </div>
        <div class="source-excerpt">"${escapeHtml(src.excerpt)}"</div>
      </div>
    `).join('');

    sourcesHtml = `
      <div class="sources-card">
        <div class="sources-toggle" onclick="toggleSources(this)">
          <div class="sources-toggle-left">
            <span>📚</span>
            <span>Nguồn trích dẫn RAG (${sources.length} đoạn tham chiếu)</span>
          </div>
          <span class="toggle-arrow">▼</span>
        </div>
        <div class="sources-list" style="display: none;">
          ${sourceItems}
        </div>
      </div>
    `;
  }

  row.innerHTML = `
    <div class="message-avatar">⚡</div>
    <div class="message-content-wrapper">
      <div class="message-sender-name">
        <span>MC AI Mentor</span>
        ${sources && sources.length > 0 ? '<span style="color:var(--accent-emerald); font-size:0.68rem; font-weight:600;">✓ RAG Verified</span>' : ''}
      </div>
      <div class="message-bubble">
        ${formattedHtml}
        ${sourcesHtml}
      </div>
    </div>
  `;

  // Attach copy code buttons
  row.querySelectorAll('.copy-code-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.closest('.code-block-container').querySelector('code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = '✓ Đã sao chép';
        setTimeout(() => btn.textContent = 'Sao chép', 2000);
      });
    });
  });

  elements.chatContainer.appendChild(row);
  scrollToBottom();
}

// Global source toggle
window.toggleSources = function(element) {
  const list = element.nextElementSibling;
  const arrow = element.querySelector('.toggle-arrow');
  if (list.style.display === 'none') {
    list.style.display = 'flex';
    arrow.textContent = '▲';
  } else {
    list.style.display = 'none';
    arrow.textContent = '▼';
  }
};

// ==========================================================================
// MOCK RAG ENGINE FOR INSTANT TESTING
// ==========================================================================
function generateMockRAGResponse(userQuery) {
  const queryLower = userQuery.toLowerCase();
  const currentDoc = state.documents[0] || { name: 'Tài liệu khóa học', pages: 12 };

  let answer = '';
  let sources = [];

  if (queryLower.includes('tóm tắt') || queryLower.includes('khái quát')) {
    answer = `Dựa trên tài liệu **${currentDoc.name}**, tôi xin tóm tắt các điểm trọng tâm như sau:

1. **Tổng quan & Định nghĩa:** Tài liệu cung cấp cơ sở kiến thức toàn diện, phân tích chi tiết về quy trình vận hành và các nguyên lý nền tảng.
2. **Cấu trúc cốt lõi:** Nội dung được chia làm các chuyên đề logic, bắt đầu từ nhập môn, phương pháp ứng dụng đến các case-study thực tế.
3. **Ứng dụng thực tiễn:** Hướng dẫn từng bước giải quyết bài toán cụ thể và tối ưu hiệu suất trong môn học.

*Bạn có muốn tôi làm rõ phần nào trong các mục trên không?*`;

    sources = [
      {
        filename: currentDoc.name,
        page: 1,
        score: 0.96,
        excerpt: 'Chương 1: Tổng quan và phương pháp luận tiếp cận. Định nghĩa các khái niệm cơ bản và phạm vi ứng dụng trong bài toán thực tế...'
      },
      {
        filename: currentDoc.name,
        page: 3,
        score: 0.89,
        excerpt: 'Mục 2.3: Mô hình kiến trúc phân tầng và nguyên lý hoạt động của các thành phần trong chu trình xử lý thông tin...'
      }
    ];
  } else if (queryLower.includes('câu hỏi') || queryLower.includes('trắc nghiệm') || queryLower.includes('ôn tập')) {
    answer = `Dưới đây là **5 câu hỏi ôn tập trọng tâm** được biên soạn trực tiếp từ nội dung tài liệu **${currentDoc.name}**:

### ❓ Bộ câu hỏi tự kiểm tra:
1. **Câu 1:** Nguyên lý hoạt động cốt lõi được đề cập trong chương đầu là gì?
2. **Câu 2:** Sự khác biệt cơ bản giữa cách tiếp cận truyền thống và phương pháp cải tiến nêu trong tài liệu?
3. **Câu 3:** Điều kiện tiên quyết để triển khai mô hình đạt độ chính xác tối ưu là gì?
4. **Câu 4:** Khi phát sinh lỗi ngoại lệ trong quy trình, bước xử lý ưu tiên nào được khuyến nghị?
5. **Câu 5:** Nêu 3 chỉ số quan trọng dùng để đánh giá hiệu quả giải pháp.

💡 *Gợi ý: Bạn có thể chọn trả lời câu hỏi bất kỳ, tôi sẽ chấm và phân tích đáp án chi tiết cho bạn!*`;

    sources = [
      {
        filename: currentDoc.name,
        page: 2,
        score: 0.94,
        excerpt: 'Các tiêu chuẩn đánh giá và quy tắc kiểm thử chất lượng trong từng giai đoạn phát triển...'
      }
    ];
  } else if (queryLower.includes('khái niệm') || queryLower.includes('giải thích')) {
    answer = `Theo tài liệu trích xuất từ **${currentDoc.name}** (Trang 4 - 6), các khái niệm cốt lõi bao gồm:

- **Vector Embeddings:** Biểu diễn ngữ nghĩa của văn bản dưới dạng vector đa chiều trong không gian số, giúp máy tính đo lường mức độ tương đồng giữa câu hỏi và tài liệu.
- **Chunking Strategy:** Kỹ thuật chia nhỏ tài liệu lớn thành các khối đoạn văn (chunks) có độ chồng lấn (overlap) để giữ trọn vẹn ngữ cảnh.
- **RAG (Retrieval-Augmented Generation):** Sự kết hợp giữa cơ sở dữ liệu tri thức ngoài và mô hình ngôn ngữ lớn để trả lời chính xác, tránh hiện tượng bịa đặt (hallucination).

\`\`\`python
# Minh họa pipeline RAG đơn giản
chunks = split_into_chunks(document_text, chunk_size=800, overlap=150)
embeddings = embed_model.get_embeddings(chunks)
relevant_context = vector_db.similarity_search(user_query, top_k=3)
\`\`\``;

    sources = [
      {
        filename: currentDoc.name,
        page: 4,
        score: 0.97,
        excerpt: 'Khái niệm Chunking: Phân đoạn văn bản với kích thước tối ưu nhằm đảm bảo tính toàn vẹn của ngữ cảnh truy vấn...'
      },
      {
        filename: currentDoc.name,
        page: 6,
        score: 0.91,
        excerpt: 'Vector similarity search thông qua khoảng cách Cosine trên cơ sở dữ liệu véc-tơ không gian cao chiều...'
      }
    ];
  } else {
    answer = `Dựa vào tài liệu **${currentDoc.name}**, câu hỏi của bạn liên quan trực tiếp đến các luận điểm sau:

- Nội dung tài liệu chỉ rõ rằng quy trình cần được thực hiện tuần tự theo các tiêu chuẩn kỹ thuật đã đề ra.
- Các kết quả phân tích cho thấy việc áp dụng đúng nguyên tắc giúp tăng hiệu suất học tập và giảm thiểu sai sót đáng kể.

Nếu bạn cần phân tích sâu hơn về bất kỳ đoạn mã hay bảng biểu nào trong file, hãy cho tôi biết nhé!`;

    sources = [
      {
        filename: currentDoc.name,
        page: 2,
        score: 0.88,
        excerpt: 'Phân tích tổng hợp: Các thông số kỹ thuật và hướng dẫn triển khai ứng dụng trong môn học...'
      }
    ];
  }

  return { answer, sources };
}

// ==========================================================================
// UTILITY FUNCTIONS
// ==========================================================================
function parseMarkdown(text) {
  if (!text) return '';
  
  let html = escapeHtml(text);

  // Code blocks with syntax container
  html = html.replace(/```([a-zA-Z0-9_]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `
      <div class="code-block-container">
        <div class="code-header">
          <span>${lang || 'code'}</span>
          <button class="copy-code-btn" type="button">📋 Sao chép</button>
        </div>
        <pre><code>${code.trim()}</code></pre>
      </div>
    `;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Lists
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Paragraphs
  html = html.split('\n\n').map(p => {
    if (p.startsWith('<h') || p.startsWith('<div') || p.startsWith('<ul>') || p.startsWith('<ol>')) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  return html;
}

function escapeHtml(string) {
  if (!string) return '';
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function scrollToBottom() {
  setTimeout(() => {
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
  }, 50);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.right = '24px';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '12px';
  toast.style.fontSize = '0.85rem';
  toast.style.fontWeight = '500';
  toast.style.zIndex = '9999';
  toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
  toast.style.animation = 'fade-up 0.3s ease';

  if (type === 'error') {
    toast.style.background = '#e11d48';
    toast.style.color = '#fff';
    toast.textContent = '❌ ' + message;
  } else if (type === 'success') {
    toast.style.background = '#059669';
    toast.style.color = '#fff';
    toast.textContent = '✅ ' + message;
  } else {
    toast.style.background = '#4f46e5';
    toast.style.color = '#fff';
    toast.textContent = 'ℹ️ ' + message;
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
