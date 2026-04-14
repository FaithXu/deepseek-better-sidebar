/**
 * DeepSeek 会话导航 v2.4
 * - 面板插入到输入栏容器外部（前一个兄弟元素位置）
 * - 消息区分：用户消息无 .ds-markdown，AI 回复有
 */

(function () {
  'use strict';

  if (window.__dsNavV2) return;
  window.__dsNavV2 = true;

  const CONFIG = {
    highlightDuration: 2500,
    debounceMs: 500,
  };

  let questions = [];
  let isExpanded = false;
  let panelEl = null;
  let listEl = null;
  let injected = false;

  function log(...args) {
    console.log('[DeepSeek 导航]', ...args);
  }

  // ============ 消息提取 ============
  function extractQuestions() {
    const extracted = [];

    // 所有消息都在 .ds-virtual-list-visible-items 下的直接子元素里
    // 或者直接在 .ds-virtual-list 下的消息项
    const containers = document.querySelectorAll('.ds-virtual-list-visible-items');

    containers.forEach((container) => {
      const items = container.querySelectorAll(':scope > div[class]');
      items.forEach((item) => {
        // 跳过无内容的 div
        if (!item.innerText || item.innerText.trim().length < 4) return;

        // 跳过面板自身
        if (item.closest('#ds-nav-panel-v2')) return;

        // 判断是用户消息还是 AI 回复
        // 用户消息：有 .fbb737a4 或 .ds-markdown 内容，且无 .ds-markdown 包装的
        // AI 回复：有 .ds-markdown（带 Markdown 格式的回复）
        const hasMarkdown = item.querySelector('.ds-markdown') !== null;
        if (hasMarkdown) return; // 跳过 AI 回复

        // 提取文字
        const text = item.innerText.trim();

        // 去重
        if (extracted.some((q) => q.fullText === text)) return;

        const preview = text.length > 150 ? text.substring(0, 150) + '…' : text;
        const timestamp = new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit', minute: '2-digit'
        });

        extracted.push({
          id: extracted.length,
          text: preview,
          fullText: text,
          timestamp,
          _el: item,
        });
      });
    });

    log('提取用户问题:', extracted.length);
    return extracted;
  }

  // ============ 滚动定位 ============
  function scrollToQuestion(question) {
    if (!question._el) return;
    question._el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    question._el.style.transition = 'background 0.4s ease';
    question._el.style.background = 'rgba(99, 102, 241, 0.18)';
    question._el.style.borderRadius = '12px';
    setTimeout(() => {
      question._el.style.background = '';
      setTimeout(() => { question._el.style.borderRadius = ''; }, 400);
    }, CONFIG.highlightDuration);
  }

  // ============ UI ============
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderPanel() {
    if (!panelEl) return;

    const btn = panelEl.querySelector('.ds-nav-toggle');
    if (btn) {
      btn.innerHTML = `📜 ${questions.length} 个问题 <span class="ds-nav-arrow">${isExpanded ? '˄' : '˅'}</span>`;
    }

    if (!isExpanded) {
      if (listEl) listEl.style.display = 'none';
      return;
    }

    if (listEl) listEl.style.display = '';

    if (questions.length === 0) {
      if (listEl) listEl.innerHTML = '<div class="ds-nav-empty">暂无问题，开始对话吧！</div>';
      return;
    }

    if (listEl) {
      listEl.innerHTML = questions
        .map((q, i) => `
          <div class="ds-nav-item" data-index="${i}" title="${escapeHtml(q.fullText)}">
            <span class="ds-nav-num">${i + 1}</span>
            <span class="ds-nav-text">${escapeHtml(q.text)}</span>
            <span class="ds-nav-time">${q.timestamp}</span>
          </div>
        `)
        .join('');

      listEl.querySelectorAll('.ds-nav-item').forEach((item) => {
        item.addEventListener('click', () => {
          const idx = parseInt(item.dataset.index, 10);
          if (!isNaN(idx) && questions[idx]) {
            scrollToQuestion(questions[idx]);
          }
        });
      });
    }
  }

  // ============ 注入 ============
  function doInject() {
    if (injected) return;

    // 插入到页面最上方
    const main = document.querySelector('main') || document.body;

    panelEl = document.createElement('div');
    panelEl.id = 'ds-nav-panel-v2';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'ds-nav-toggle';
    toggleBtn.innerHTML = `📜 0 个问题 <span class="ds-nav-arrow">˅</span>`;
    toggleBtn.addEventListener('click', () => {
      isExpanded = !isExpanded;
      renderPanel();
    });

    listEl = document.createElement('div');
    listEl.className = 'ds-nav-list';
    listEl.style.display = 'none';

    panelEl.appendChild(toggleBtn);
    panelEl.appendChild(listEl);

    main.insertBefore(panelEl, main.firstChild);
    injected = true;
    log('面板注入成功：页面最上方');
  }

  function inject() {
    if (injected) return;
    doInject();
    if (!injected) {
      setTimeout(doInject, 2000);
    }
  }

  // ============ 更新 ============
  let updateTimer = null;
  function update() {
    questions = extractQuestions();
    if (!injected) {
      inject();
    } else {
      renderPanel();
    }
  }

  function debouncedUpdate() {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(update, CONFIG.debounceMs);
  }

  // ============ 启动 ============
  function init() {
    log('初始化');
    update();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes.length > 0) { debouncedUpdate(); break; }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setInterval(debouncedUpdate, 3000);

    // 快捷键 Alt+Shift+G
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        isExpanded = !isExpanded;
        if (!injected) inject();
        else renderPanel();
        if (panelEl) {
          panelEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          const btn = panelEl.querySelector('.ds-nav-toggle');
          if (btn) {
            btn.style.background = '#ede9fe';
            setTimeout(() => { btn.style.background = ''; }, 400);
          }
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 600);
  }
})();
