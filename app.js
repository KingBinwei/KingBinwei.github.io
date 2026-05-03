const STORAGE_KEY = "7heFoo1-site-state-v2";

const demoState = {
  posts: [
    {
      id: "post-demo-1",
      title: "第一份站点日志",
      tags: ["站点", "日常", "草稿"],
      body:
        "今天把 7heFoo1 整理成一个可以持续写下去的地方。\n\n博客会收纳那些还在变化中的想法，作品分区则保存已经愿意公开的片段。这里不需要一次完成，只需要可以一篇一篇地长出来。",
      createdAt: "2026-05-03T09:20:00.000Z",
      pinned: true,
    },
    {
      id: "post-demo-2",
      title: "给未完成作品留一张桌子",
      tags: ["创作", "记录"],
      body:
        "未完成的作品也值得有位置。它们可能只是一个标题、一段声音、几张草图，或者一个项目的开头。\n\n在这里，分区不是目录的终点，而是每种创作自己的房间。",
      createdAt: "2026-05-02T18:45:00.000Z",
      pinned: false,
    },
  ],
  sections: [
    {
      id: "sec-writing",
      name: "文字实验",
      color: "#db5b4d",
      description: "短篇、随笔、片段和还没有确定形状的文本。",
    },
    {
      id: "sec-visual",
      name: "视觉记录",
      color: "#4368b1",
      description: "图片、影像、拼贴和视觉练习。",
    },
    {
      id: "sec-project",
      name: "项目档案",
      color: "#2f8f83",
      description: "阶段性项目、工具、网页和可继续迭代的创作。",
    },
  ],
  works: [
    {
      id: "work-demo-1",
      sectionId: "sec-writing",
      title: "夜间笔记选段",
      format: "文章",
      summary: "一组关于深夜、城市灯光和自我观察的短句。",
      link: "",
      createdAt: "2026-05-03T10:00:00.000Z",
    },
    {
      id: "work-demo-2",
      sectionId: "sec-project",
      title: "7heFoo1 发布台",
      format: "项目",
      summary: "个人博客与多分区作品发布的站点原型。",
      link: "",
      createdAt: "2026-05-03T10:15:00.000Z",
    },
  ],
  activeSectionId: "sec-writing",
};

const notePosts = Array.isArray(window.NOTE_POSTS) ? window.NOTE_POSTS : [];
const initialState = {
  ...demoState,
  posts: mergePosts(notePosts, demoState.posts),
};

let state = loadState();
let toastTimer = 0;
const expandedPostIds = new Set();

const els = {
  blogForm: document.querySelector("#blog-form"),
  sectionForm: document.querySelector("#section-form"),
  workForm: document.querySelector("#work-form"),
  posts: document.querySelector("#posts"),
  sectionTabs: document.querySelector("#section-tabs"),
  worksList: document.querySelector("#works-list"),
  sectionDetail: document.querySelector("#active-section-detail"),
  activeSectionName: document.querySelector("#active-section-name"),
  postCount: document.querySelector("#post-count"),
  workCount: document.querySelector("#work-count"),
  sectionCount: document.querySelector("#section-count"),
  resetDemo: document.querySelector("#reset-demo"),
  toast: document.querySelector("#toast"),
};

render();
startIdentityCanvas();

els.blogForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(els.blogForm);
  const title = normalizeText(form.get("title"));
  const body = normalizeText(form.get("body"));
  const tags = normalizeText(form.get("tags"))
    .split(/[，,]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (!title || !body) return;

  state.posts.unshift({
    id: createId("post"),
    title,
    tags,
    body,
    createdAt: new Date().toISOString(),
    pinned: false,
  });

  saveState();
  els.blogForm.reset();
  render();
  showToast("文章已发布");
});

els.sectionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(els.sectionForm);
  const name = normalizeText(form.get("name"));
  const color = form.get("color") || "#2f8f83";
  const description = normalizeText(form.get("description"));

  if (!name) return;

  const section = {
    id: createId("sec"),
    name,
    color,
    description: description || `${name} 的作品档案。`,
  };

  state.sections.push(section);
  state.activeSectionId = section.id;
  saveState();
  els.sectionForm.reset();
  document.querySelector("#section-color").value = "#2f8f83";
  render();
  showToast("分区已创建");
});

els.workForm.addEventListener("submit", (event) => {
  event.preventDefault();
  ensureActiveSection();
  const form = new FormData(els.workForm);
  const title = normalizeText(form.get("title"));
  const format = normalizeText(form.get("format"));
  const summary = normalizeText(form.get("summary"));
  const link = normalizeText(form.get("link"));

  if (!title || !summary) return;

  state.works.unshift({
    id: createId("work"),
    sectionId: state.activeSectionId,
    title,
    format: format || "其他",
    summary,
    link,
    createdAt: new Date().toISOString(),
  });

  saveState();
  els.workForm.reset();
  render();
  showToast("作品已发布");
});

els.sectionTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-section-id]");
  if (!button) return;
  state.activeSectionId = button.dataset.sectionId;
  saveState();
  render();
});

els.posts.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-post-action]");
  if (!button) return;

  const post = state.posts.find((item) => item.id === button.dataset.postId);
  if (!post) return;

  if (button.dataset.postAction === "pin") {
    post.pinned = !post.pinned;
    saveState();
    render();
    showToast(post.pinned ? "文章已置顶" : "文章已取消置顶");
  }

  if (button.dataset.postAction === "toggle") {
    if (expandedPostIds.has(post.id)) {
      expandedPostIds.delete(post.id);
    } else {
      expandedPostIds.add(post.id);
    }
    render();
  }

  if (button.dataset.postAction === "delete") {
    if (!window.confirm("确定删除这篇文章？")) return;
    state.posts = state.posts.filter((item) => item.id !== post.id);
    saveState();
    render();
    showToast("文章已删除");
  }
});

els.worksList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-work-id]");
  if (!button) return;
  if (!window.confirm("确定删除这件作品？")) return;
  state.works = state.works.filter((work) => work.id !== button.dataset.workId);
  saveState();
  render();
  showToast("作品已删除");
});

els.resetDemo.addEventListener("click", () => {
  if (!window.confirm("恢复示例会覆盖当前本地内容，确定继续？")) return;
  state = cloneState(initialState);
  saveState();
  render();
  showToast("示例内容已恢复");
});

function render() {
  ensureActiveSection();
  renderMetrics();
  renderPosts();
  renderSections();
  renderWorks();
}

function renderMetrics() {
  els.postCount.textContent = String(state.posts.length);
  els.workCount.textContent = String(state.works.length);
  els.sectionCount.textContent = String(state.sections.length);
}

function renderPosts() {
  const sortedPosts = [...state.posts].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (!sortedPosts.length) {
    els.posts.innerHTML = `<p class="empty-state">还没有文章。</p>`;
    return;
  }

  els.posts.innerHTML = sortedPosts
    .map(
      (post) => {
        const body = normalizeText(post.body);
        const isLong = body.length > 900;
        const isExpanded = expandedPostIds.has(post.id) || !isLong;
        const visibleBody = isExpanded ? body : `${body.slice(0, 760)}...`;

        return `
          <article class="post-card ${post.pinned ? "pinned" : ""}">
            <div class="post-meta">
              <span>${formatDate(post.createdAt)}</span>
              ${post.pinned ? "<span>置顶</span>" : ""}
              ${post.sourcePath ? `<span>${escapeHtml(post.sourcePath)}</span>` : ""}
            </div>
            <h3>${escapeHtml(post.title)}</h3>
            ${formatBody(visibleBody)}
            ${renderTags(post.tags)}
            <div class="card-actions">
              ${
                isLong
                  ? `<button class="button secondary" type="button" data-post-action="toggle" data-post-id="${post.id}" aria-expanded="${isExpanded}">
                      ${isExpanded ? "收起" : "阅读全文"}
                    </button>`
                  : ""
              }
              <button class="button ghost" type="button" data-post-action="pin" data-post-id="${post.id}">
                ${post.pinned ? "取消置顶" : "置顶"}
              </button>
              <button class="button danger" type="button" data-post-action="delete" data-post-id="${post.id}">
                删除
              </button>
            </div>
          </article>
        `;
      }
    )
    .join("");
}

function renderSections() {
  const activeSection = getActiveSection();
  els.activeSectionName.textContent = activeSection ? activeSection.name : "未选择";

  els.sectionTabs.innerHTML = state.sections
    .map((section) => {
      const count = state.works.filter((work) => work.sectionId === section.id).length;
      const isActive = section.id === state.activeSectionId;
      return `
        <button
          class="section-tab ${isActive ? "active" : ""}"
          type="button"
          role="tab"
          aria-selected="${isActive}"
          data-section-id="${section.id}"
        >
          <span class="swatch" style="background:${escapeAttr(section.color)}"></span>
          <strong>${escapeHtml(section.name)}</strong>
          <span>${count} 件</span>
        </button>
      `;
    })
    .join("");
}

function renderWorks() {
  const activeSection = getActiveSection();
  if (!activeSection) {
    els.sectionDetail.innerHTML = "";
    els.worksList.innerHTML = `<p class="empty-state">还没有作品分区。</p>`;
    return;
  }

  const sectionWorks = state.works
    .filter((work) => work.sectionId === activeSection.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  els.sectionDetail.style.borderTopColor = activeSection.color;
  els.sectionDetail.innerHTML = `
    <h3>${escapeHtml(activeSection.name)}</h3>
    <p>${escapeHtml(activeSection.description)}</p>
  `;

  if (!sectionWorks.length) {
    els.worksList.innerHTML = `<p class="empty-state">这个分区还没有作品。</p>`;
    return;
  }

  els.worksList.innerHTML = sectionWorks
    .map(
      (work) => `
        <article class="work-card">
          <div class="work-accent" style="background:${escapeAttr(activeSection.color)}"></div>
          <div class="work-body">
            <div class="work-meta">
              <span>${escapeHtml(work.format)}</span>
              <span>${formatDate(work.createdAt)}</span>
            </div>
            <h3>${escapeHtml(work.title)}</h3>
            <p>${escapeHtml(work.summary)}</p>
            ${renderWorkLink(work.link)}
            <div class="card-actions">
              <button class="button danger" type="button" data-work-id="${work.id}">删除</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderWorkLink(link) {
  if (!link) return "";
  return `<a class="work-link" href="${escapeAttr(link)}" target="_blank" rel="noreferrer">打开链接</a>`;
}

function renderTags(tags = []) {
  if (!tags.length) return "";
  return `
    <div class="tag-row">
      ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
    </div>
  `;
}

function formatBody(body) {
  return normalizeText(body)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function ensureActiveSection() {
  if (!Array.isArray(state.sections)) state.sections = [];
  if (!Array.isArray(state.posts)) state.posts = [];
  if (!Array.isArray(state.works)) state.works = [];

  if (!state.sections.length) {
    const section = {
      id: createId("sec"),
      name: "作品集",
      color: "#2f8f83",
      description: "默认作品分区。",
    };
    state.sections.push(section);
    state.activeSectionId = section.id;
  }

  if (!state.sections.some((section) => section.id === state.activeSectionId)) {
    state.activeSectionId = state.sections[0].id;
  }
}

function getActiveSection() {
  return state.sections.find((section) => section.id === state.activeSectionId);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneState(initialState);
    const parsed = JSON.parse(raw);
    return {
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      works: Array.isArray(parsed.works) ? parsed.works : [],
      activeSectionId: parsed.activeSectionId || "",
    };
  } catch (error) {
    return cloneState(initialState);
  }
}

function mergePosts(...groups) {
  const seen = new Set();
  return groups.flat().filter((post) => {
    if (!post || !post.id || seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("visible");
  toastTimer = window.setTimeout(() => {
    els.toast.classList.remove("visible");
  }, 1800);
}

function startIdentityCanvas() {
  const canvas = document.querySelector(".identity-canvas");
  const context = canvas.getContext("2d");
  const palette = ["#db5b4d", "#2f8f83", "#d79b24", "#4368b1"];
  const panels = Array.from({ length: 16 }, (_, index) => ({
    x: (index % 4) / 4,
    y: Math.floor(index / 4) / 4,
    color: palette[index % palette.length],
    phase: index * 0.6,
  }));

  let width = 0;
  let height = 0;
  let dpr = 1;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const draw = (time) => {
    const t = time * 0.001;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#f8faf8";
    context.fillRect(0, 0, width, height);

    drawGrid(context, width, height);
    drawShelf(context, width, height, t);

    panels.forEach((panel, index) => {
      const panelWidth = width * 0.16;
      const panelHeight = height * 0.13;
      const baseX = width * (0.12 + panel.x * 0.72);
      const baseY = height * (0.18 + panel.y * 0.62);
      const drift = Math.sin(t + panel.phase) * 7;
      const lift = Math.cos(t * 0.8 + panel.phase) * 5;

      context.save();
      context.translate(baseX + drift, baseY + lift);
      context.fillStyle = index % 2 ? "#ffffff" : "#f0f4f1";
      context.strokeStyle = "rgba(23, 32, 36, 0.2)";
      context.lineWidth = 1;
      roundedRect(context, 0, 0, panelWidth, panelHeight, 7);
      context.fill();
      context.stroke();

      context.fillStyle = panel.color;
      context.fillRect(12, 12, panelWidth * 0.38, 5);
      context.fillStyle = "rgba(23, 32, 36, 0.24)";
      context.fillRect(12, 28, panelWidth - 24, 4);
      context.fillRect(12, 42, panelWidth * 0.72, 4);
      context.restore();
    });

    drawWordmark(context, width, height, t);
    requestAnimationFrame(draw);
  };

  requestAnimationFrame(draw);
}

function drawGrid(context, width, height) {
  context.strokeStyle = "rgba(23, 32, 36, 0.06)";
  context.lineWidth = 1;
  for (let x = 22; x < width; x += 32) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 24; y < height; y += 32) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

function drawShelf(context, width, height, t) {
  const y = height * 0.78;
  context.strokeStyle = "rgba(23, 32, 36, 0.18)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(width * 0.08, y);
  context.lineTo(width * 0.92, y);
  context.stroke();

  const markers = [
    ["#db5b4d", 0.18],
    ["#4368b1", 0.34],
    ["#d79b24", 0.54],
    ["#2f8f83", 0.73],
  ];

  markers.forEach(([color, pos], index) => {
    const x = width * pos + Math.sin(t + index) * 5;
    context.fillStyle = color;
    context.fillRect(x, y - 24 - index * 2, 8, 24 + index * 2);
  });
}

function drawWordmark(context, width, height, t) {
  context.save();
  context.translate(width * 0.09, height * 0.11);
  context.fillStyle = "#172024";
  context.font = "800 28px Inter, system-ui, sans-serif";
  context.fillText("7heFoo1", 0, 34);
  context.fillStyle = "rgba(23, 32, 36, 0.54)";
  context.font = "700 13px Inter, system-ui, sans-serif";
  context.fillText("blog / works / archive", 2, 58);

  const caretX = 164 + Math.sin(t * 3) * 3;
  context.fillStyle = "#db5b4d";
  context.fillRect(caretX, 16, 3, 28);
  context.restore();
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}
