/**
 * DeepSeek 侧边栏折叠脚本
 * 时间分组（今天/30天内/7天内）折叠整个分组容器
 */

(function () {
  'use strict';

  if (window.__dsSidebarCollapsed) return;
  window.__dsSidebarCollapsed = true;

  const CONFIG = {
    sectionSelector: 'div.f3d18f6a',
    containerClass: 'ds-sidebar-group',
    storageKey: 'ds-sidebar-collapse-v2',
  };

  // ═══════════════════════════════════
  // 存储
  // ═══════════════════════════════════

  function getState() {
    try { return JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}'); }
    catch (e) { return {}; }
  }

  function saveState(state) {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(state)); }
    catch (e) {}
  }

  // ═══════════════════════════════════
  // 折叠 / 展开
  // ═══════════════════════════════════

  function collapseGroup(container) {
    // 只隐藏直接子元素中的 a 标签，不递归进子分组
    const btn = container.querySelector(CONFIG.sectionSelector);
    const items = [...container.children].filter(el => el.tagName === 'A');
    items.forEach(a => { a.style.display = 'none'; });

    if (btn) {
      btn.classList.add('ds-collapsed');
      const arrow = btn.querySelector('.ds-arrow');
      if (arrow) { arrow.textContent = '▶'; arrow.style.transform = 'rotate(-90deg)'; }
      btn.style.color = '#bbb';
    }
  }

  function expandGroup(container) {
    const items = [...container.children].filter(el => el.tagName === 'A');
    items.forEach(a => { a.style.display = ''; });

    const btn = container.querySelector(CONFIG.sectionSelector);
    if (btn) {
      btn.classList.remove('ds-collapsed');
      const arrow = btn.querySelector('.ds-arrow');
      if (arrow) { arrow.textContent = '▼'; arrow.style.transform = ''; }
      btn.style.color = '#999';
    }
  }

  function toggleGroup(container) {
    const btn = container.querySelector(CONFIG.sectionSelector);
    if (!btn) return;
    const key = btn.textContent.trim();
    const isCollapsed = btn.classList.contains('ds-collapsed');

    if (isCollapsed) expandGroup(container);
    else collapseGroup(container);

    const state = getState();
    state[key] = !isCollapsed;
    saveState(state);
  }

  // ═══════════════════════════════════
  // 初始化每个分组
  // ═══════════════════════════════════

  function initGroup(header) {
    const container = header.parentElement;
    if (!container || container === document.body) return;

    // 标记已处理
    if (container.classList.contains(CONFIG.containerClass)) return;
    container.classList.add(CONFIG.containerClass);

    const key = header.textContent.trim();

    // 给标题加样式和箭头
    header.style.cssText = `
      cursor: pointer;
      user-select: none;
      font-size: 12px;
      font-weight: 600;
      color: #999;
      padding: 6px 12px 4px;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: color 0.15s;
    `;

    // 只加一次全局样式
    if (!document.getElementById('ds-collapse-style')) {
      const style = document.createElement('style');
      style.id = 'ds-collapse-style';
      style.textContent = `.ds-collapsed { opacity: 0.55; } .ds-collapsed:hover { opacity: 1; }`;
      document.head.appendChild(style);
    }

    const arrow = document.createElement('span');
    arrow.className = 'ds-arrow';
    arrow.textContent = '▼';
    arrow.style.cssText = 'font-size: 8px; color: #bbb; transition: transform 0.2s; display: inline-block;';
    header.insertBefore(arrow, header.firstChild);

    // 点击折叠
    header.addEventListener('click', () => toggleGroup(container));
    header.addEventListener('mouseover', () => header.style.color = '#444');
    header.addEventListener('mouseout', () => {
      if (!header.classList.contains('ds-collapsed')) header.style.color = '#999';
    });

    // 恢复保存的状态
    const state = getState();
    if (key in state) {
      if (!state[key]) collapseGroup(container);
      else expandGroup(container);
    }
  }

  // ═══════════════════════════════════
  // 注入浮动控制条
  // ═══════════════════════════════════

  function collapseAll() {
    const groups = document.querySelectorAll('.' + CONFIG.containerClass);
    groups.forEach(c => collapseGroup(c));
    const state = getState();
    document.querySelectorAll(CONFIG.sectionSelector).forEach(h => { state[h.textContent.trim()] = false; });
    saveState(state);
  }

  function expandAll() {
    const groups = document.querySelectorAll('.' + CONFIG.containerClass);
    groups.forEach(c => expandGroup(c));
    const state = getState();
    document.querySelectorAll(CONFIG.sectionSelector).forEach(h => { state[h.textContent.trim()] = true; });
    saveState(state);
  }

  // ═══════════════════════════════════
  // 搜索会话标题
  // ═══════════════════════════════════

  function filterSessions(query) {
    const q = query.trim().toLowerCase();

    document.querySelectorAll('.' + CONFIG.containerClass).forEach(container => {
      const directA = [...container.children].filter(el => el.tagName === 'A');
      const header = container.querySelector(CONFIG.sectionSelector);
      let visibleCount = 0;

      directA.forEach(a => {
        const titleEl = a.querySelector('.c08e6e93') || a.firstChild || a;
        const title = (titleEl.textContent || '').toLowerCase();
        const match = !q || title.includes(q);
        a.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });

      // 无搜索词 → 显示全部；有搜索词 → 只有匹配的才显示标题
      if (!q && header) {
        header.style.display = '';
      } else if (header) {
        header.style.display = visibleCount > 0 ? '' : 'none';
      }
    });
  }

  // ═══════════════════════════════════
  // 注入控制条（搜索框 + 折叠按钮）
  // ═══════════════════════════════════

  function injectControls() {
    if (document.getElementById('ds-collapse-controls')) return;

    const sidebar = document.querySelector('aside') ||
                   document.querySelector('[class*="sidebar"]') ||
                   document.querySelector('[class*="side"]') ||
                   document.querySelector('[class*="nav"]') ||
                   document.querySelector('[class*="menu"]');

    if (!sidebar) return;

    const wrap = document.createElement('div');
    wrap.id = 'ds-collapse-controls';
    wrap.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 6px 10px 8px;
      border-bottom: 1px solid #eee;
      margin-bottom: 4px;
      background: #fafaf8;
      position: sticky;
      top: 0;
      z-index: 10;
    `;

    // 搜索框
    const searchWrap = document.createElement('div');
    searchWrap.style.cssText = 'position: relative;';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '🔍 搜索会话标题…';
    searchInput.style.cssText = `
      width: 100%;
      padding: 6px 28px 6px 28px;
      font-size: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 16px;
      outline: none;
      background: #fff;
      color: #333;
      box-sizing: border-box;
    `;
    searchInput.onfocus = () => { searchInput.style.borderColor = '#9b8fd4'; searchInput.style.boxShadow = '0 0 0 2px #e8e0ff'; };
    searchInput.onblur = () => { searchInput.style.borderColor = '#e0e0e0'; searchInput.style.boxShadow = ''; };

    const searchIcon = document.createElement('span');
    searchIcon.textContent = '🔍';
    searchIcon.style.cssText = 'position:absolute; left:9px; top:50%; transform:translateY(-50%); font-size:11px; pointer-events:none;';

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '✕';
    clearBtn.title = '清除';
    clearBtn.style.cssText = `
      position: absolute;
      right: 7px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: none;
      cursor: pointer;
      font-size: 11px;
      color: #aaa;
      padding: 2px 4px;
      display: none;
      line-height: 1;
    `;
    clearBtn.onclick = () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      filterSessions('');
      searchInput.focus();
    };
    searchInput.addEventListener('input', () => {
      clearBtn.style.display = searchInput.value ? '' : 'none';
      filterSessions(searchInput.value);
    });

    searchWrap.appendChild(searchIcon);
    searchWrap.appendChild(searchInput);
    searchWrap.appendChild(clearBtn);

    // 按钮行
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:6px;';

    function makeBtn(label) {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = `
        flex: 1;
        padding: 5px 8px;
        font-size: 11px;
        font-weight: 600;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 16px;
        cursor: pointer;
        color: #555;
        transition: all 0.15s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      `;
      b.addEventListener('mouseover', () => { b.style.background = '#f0eeff'; b.style.borderColor = '#aaa'; });
      b.addEventListener('mouseout', () => { b.style.background = '#fff'; b.style.borderColor = '#ddd'; });
      return b;
    }

    const collapseAllBtn = makeBtn('◀ 折叠所有');
    const expandAllBtn = makeBtn('▶ 展开所有');
    collapseAllBtn.onclick = collapseAll;
    expandAllBtn.onclick = expandAll;

    btnRow.appendChild(collapseAllBtn);
    btnRow.appendChild(expandAllBtn);
    wrap.appendChild(searchWrap);
    wrap.appendChild(btnRow);
    sidebar.insertBefore(wrap, sidebar.firstChild);
  }

  // ═══════════════════════════════════
  // 扫描并初始化
  // ═══════════════════════════════════

  function scan() {
    const headers = document.querySelectorAll(CONFIG.sectionSelector);
    headers.forEach(h => initGroup(h));
    injectControls();
    return headers.length > 0;
  }

  // ═══════════════════════════════════
  // 启动
  // ═══════════════════════════════════

  function run() {
    if (!scan()) {
      setTimeout(run, 1000);
    }
  }

  // 监听侧边栏动态加载
  const observer = new MutationObserver(() => { scan(); });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    run();
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
      run();
    });
  }
})();
