/**
 * 科研工作站 - 共享数据层
 * 基于 localStorage 的 CRUD + 导入/导出
 */

const DB = {
  KEYS: {
    ARTICLES: 'rw_articles',       // 公众号推文
    LITERATURE: 'rw_literature',   // 文献
    SCRIPTS: 'rw_scripts',         // 脚本
    IMAGES: 'rw_images',           // 图片
    WRITINGS: 'rw_writings',       // 文章撰写
    SETTINGS: 'rw_settings',       // 设置
  },

  // 初始化默认数据
  init() {
    if (!localStorage.getItem(this.KEYS.ARTICLES)) {
      this.save(this.KEYS.ARTICLES, []);
    }
    if (!localStorage.getItem(this.KEYS.LITERATURE)) {
      this.save(this.KEYS.LITERATURE, []);
    }
    if (!localStorage.getItem(this.KEYS.SCRIPTS)) {
      this.save(this.KEYS.SCRIPTS, []);
    }
    if (!localStorage.getItem(this.KEYS.IMAGES)) {
      this.save(this.KEYS.IMAGES, []);
    }
    if (!localStorage.getItem(this.KEYS.WRITINGS)) {
      this.save(this.KEYS.WRITINGS, []);
    }
    if (!localStorage.getItem(this.KEYS.SETTINGS)) {
      this.save(this.KEYS.SETTINGS, { siteName: '科研工作站', createdAt: new Date().toISOString() });
    }
  },

  // 读取
  getAll(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  },

  // 保存
  save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // 添加
  add(key, item) {
    const items = this.getAll(key);
    item.id = item.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    item.createdAt = item.createdAt || new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    items.unshift(item);
    this.save(key, items);
    return item;
  },

  // 更新
  update(key, id, updates) {
    const items = this.getAll(key);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save(key, items);
    return items[idx];
  },

  // 删除
  remove(key, id) {
    const items = this.getAll(key);
    const filtered = items.filter(i => i.id !== id);
    this.save(key, filtered);
    return items.length !== filtered.length;
  },

  // 获取单个
  get(key, id) {
    const items = this.getAll(key);
    return items.find(i => i.id === id) || null;
  },

  // 导出全部数据
  exportAll() {
    const data = {};
    Object.values(this.KEYS).forEach(k => {
      data[k] = this.getAll(k);
    });
    return { version: '1.0', exportDate: new Date().toISOString(), data };
  },

  // 导入数据
  importAll(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.data) throw new Error('Invalid format');
      Object.keys(parsed.data).forEach(k => {
        if (Object.values(this.KEYS).includes(k)) {
          this.save(k, parsed.data[k]);
        }
      });
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },

  // 获取所有关键词关联（用于知识网络）
  getAllKeywords() {
    const articles = this.getAll(this.KEYS.ARTICLES);
    const literature = this.getAll(this.KEYS.LITERATURE);
    const scripts = this.getAll(this.KEYS.SCRIPTS);
    const writings = this.getAll(this.KEYS.WRITINGS);
    const images = this.getAll(this.KEYS.IMAGES);

    const nodes = [];
    const edges = [];

    // 添加文章节点
    articles.forEach(a => {
      (a.keywords || []).forEach(kw => {
        nodes.push({ id: `kw-${kw}`, label: kw, type: 'keyword' });
        edges.push({ source: `article-${a.id}`, target: `kw-${kw}` });
      });
      nodes.push({ id: `article-${a.id}`, label: a.title || '无标题', type: 'article' });
    });

    // 添加文献节点
    literature.forEach(l => {
      (l.keywords || []).forEach(kw => {
        nodes.push({ id: `kw-${kw}`, label: kw, type: 'keyword' });
        edges.push({ source: `lit-${l.id}`, target: `kw-${kw}` });
      });
      nodes.push({ id: `lit-${l.id}`, label: l.title || '无标题', type: 'literature' });
    });

    // 添加脚本节点
    scripts.forEach(s => {
      (s.keywords || []).forEach(kw => {
        nodes.push({ id: `kw-${kw}`, label: kw, type: 'keyword' });
        edges.push({ source: `script-${s.id}`, target: `kw-${kw}` });
      });
      nodes.push({ id: `script-${s.id}`, label: s.title || '无标题', type: 'script' });
    });

    // 添加文章撰写节点
    writings.forEach(w => {
      (w.keywords || []).forEach(kw => {
        nodes.push({ id: `kw-${kw}`, label: kw, type: 'keyword' });
        edges.push({ source: `writing-${w.id}`, target: `kw-${kw}` });
      });
      nodes.push({ id: `writing-${w.id}`, label: w.title || '无标题', type: 'writing' });
    });

    // 图片节点
    images.forEach(img => {
      (img.keywords || []).forEach(kw => {
        nodes.push({ id: `kw-${kw}`, label: kw, type: 'keyword' });
        edges.push({ source: `image-${img.id}`, target: `kw-${kw}` });
      });
      nodes.push({ id: `image-${img.id}`, label: img.title || '图片', type: 'image' });
    });

    // 去重节点
    const uniqueNodes = [];
    const nodeIds = new Set();
    nodes.forEach(n => {
      if (!nodeIds.has(n.id)) {
        nodeIds.add(n.id);
        uniqueNodes.push(n);
      }
    });

    return { nodes: uniqueNodes, edges };
  },

  // 获取统计数据（用于首页）
  getStats() {
    return {
      articles: this.getAll(this.KEYS.ARTICLES).length,
      literature: this.getAll(this.KEYS.LITERATURE).length,
      scripts: this.getAll(this.KEYS.SCRIPTS).length,
      images: this.getAll(this.KEYS.IMAGES).length,
      writings: this.getAll(this.KEYS.WRITINGS).length,
    };
  },

  // HTML 转义
  escape(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
};

// 初始化
DB.init();

// 全局工具函数
const UI = {
  // 显示提示
  toast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;top:20px;right:20px;z-index:9999;
      padding:12px 20px;border-radius:8px;font-size:14px;
      font-family:'Noto Sans SC',sans-serif;
      background:${type === 'success' ? '#4A7C4A' : type === 'error' ? '#B0454B' : '#B8770C'};
      color:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.15);
      opacity:0;transition:opacity 0.3s;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.style.opacity = '1');
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  },

  // 确认对话框
  confirm(msg) {
    return window.confirm(msg);
  },

  // 生成模态框
  modal(title, bodyHTML) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(36,31,26,0.4);z-index:9998;
      display:flex;align-items:center;justify-content:center;padding:20px;
    `;
    const modal = document.createElement('div');
    modal.style.cssText = `
      background:var(--research-card,#fff);border:1px solid var(--research-border,#E8E2D8);
      border-radius:16px;max-width:640px;width:100%;max-height:85vh;overflow-y:auto;
      box-shadow:0 24px 60px -20px rgba(36,31,26,0.20);
    `;
    modal.innerHTML = `
      <div style="padding:24px 32px;border-bottom:1px solid var(--research-border,#E8E2D8);display:flex;justify-content:space-between;align-items:center;">
        <h2 style="font-family:'Noto Serif SC',serif;font-size:20px;font-weight:600;color:var(--research-ink,#241F1A);margin:0;">${DB.escape(title)}</h2>
        <button class="modal-close" style="background:none;border:none;font-size:24px;color:var(--research-ink-3,#8A8275);cursor:pointer;padding:4px 8px;">&times;</button>
      </div>
      <div style="padding:24px 32px;">${bodyHTML}</div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // 关闭逻辑
    const close = () => overlay.remove();
    modal.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    return { overlay, modal, close };
  }
};
