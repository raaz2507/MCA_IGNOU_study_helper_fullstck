import { questionCardMarkup } from "../components/question-card.js";
import { getQuestionContent, getQuestionManifest } from "../api/questions.api.js";
import { getProgress, updateProgress } from "../api/progress.api.js";

const APP_THEMES = ["light", "dark", "sepia"];

function applyAppTheme(theme) {
  const selectedTheme = APP_THEMES.includes(theme) ? theme : "sepia";
  document.documentElement.dataset.theme = selectedTheme;
  document.body.classList.toggle("dark", selectedTheme === "dark");
  localStorage.setItem("study-helper-theme", selectedTheme);
  return selectedTheme;
}

applyAppTheme(localStorage.getItem("study-helper-theme") || "sepia");

class QuestionBankApp {
  constructor() {
    this.manifest = null;
    this.db = [];
    this.filtered = [];
    this.selectedMeta = null;
    this.selectedQuestion = null;
    this.questionCache = new Map();
    this.lang = "english";
    this.answerMode = "exam";
    this.view = "all";
    this.subjectFolder = this.getSubjectFolder();
    this.resourceFolder = `../assets/resources/${this.subjectFolder}`;
    this.state = { done: [], bookmarks: [], revision: [] };
    this.init();
  }
  getSubjectFolder() {
    const params = new URLSearchParams(window.location.search);
    return params.get("subject") || "MCA_new/Semester_1/MCS_211";
  }
  getQuestionFileUrl(meta) {
    const basePath =
      this.manifest?.paths?.questions || this.manifest?.basePath || "data/";
    return `${this.subjectFolder}/${basePath}${meta.file}`;
  }
  getMediaUrl(item) {
    if (item.src) {
      return item.src.startsWith("data/")
        ? `${this.resourceFolder}/${item.src}`
        : item.src;
    }
    const mediaPath =
      this.manifest?.paths?.media ||
      this.manifest?.mediaBasePath ||
      "data/images/";
    return `${this.resourceFolder}/${mediaPath}${item.file || ""}`;
  }
  fixMarkdownPaths(md) {
    let text = String(md || "");

    const mediaPath = `${this.resourceFolder}/${
      this.manifest?.paths?.media ||
      this.manifest?.mediaBasePath ||
      "data/images/"
    }`;

    // Markdown images
    text = text.replaceAll("](data/images/", `](${mediaPath}`);

    // HTML images
    text = text.replaceAll('src="data/images/', `src="${mediaPath}`);

    return text;
  }
  replaceMediaPlaceholders(md, media) {
    let html = md;

    for (const item of media) {
      html = html.replace(`{{MEDIA:${item.id}}}`, this.renderMediaItem(item));
    }

    return html;
  }
  renderMediaItem(item) {
    switch (item.kind || item.type) {
      case "svg":
      case "image":
        return `<div class="mediaBox" data-media-id="${this.escapeAttr(
          item.id || "",
        )}"><img src="${this.escapeAttr(
          this.getMediaUrl(item),
        )}" class="diagram" alt="${this.escapeAttr(
          item.alt || "Question media",
        )}"></div>`;

      case "table":
        return item.html;

      case "code":
        return `<pre><code>${this.escapeHtml(item.code || "")}</code></pre>`;

      case "flowchart":
        return item.html;

      default:
        return "";
    }
  }
  updateSubjectInfo() {
    if (!this.manifest || !this.manifest.subject) {
      console.warn("Manifest अभी load नहीं हुआ या subject missing है.");
      return;
    }

    const subject = this.manifest.subject;

    document.title = `${subject.code} Question Bank`;

    const subjectCode = this.$("#subjectCode");
    const subjectTitle = this.$("#subjectTitle");

    if (subjectCode) subjectCode.textContent = subject.code;
    if (subjectTitle) subjectTitle.textContent = subject.title;
  }
  $(s) {
    return document.querySelector(s);
  }
  $$(s) {
    return document.querySelectorAll(s);
  }
  async init() {
    this.bindEvents();
    await this.loadState();
    await this.loadManifest();
    this.applyFilters();
    this.updateStats();
    if (this.db.length) await this.selectQuestion(this.db[0].id);
    else this.renderDetail();
  }
  async loadManifest() {
    try {
      this.manifest = await getQuestionManifest(this.subjectFolder);

      this.updateSubjectInfo();

      this.db = (this.manifest.questions || []).map((q) =>
        this.normalizeQuestionMeta(q),
      );
      this.selectedMeta = this.db[0] || null;
    } catch (error) {
      console.error("Manifest load failed:", error);
      this.showError("Question bank could not be loaded from the Node API.");
    }
  }
  normalizeAppearance(item = {}) {
    if (item.session) return item;
    const term = item.term
      ? item.term.charAt(0).toUpperCase() + item.term.slice(1)
      : "";
    return {
      ...item,
      session: [term, item.year].filter(Boolean).join(" "),
      paperQuestionNo: item.paperQuestionNo || item.questionNo || "",
    };
  }
  normalizeQuestionMeta(q) {
    const group = this.manifest?.groups?.[q.groupId] || null;
    return {
      ...q,
      category: q.category || q.classification?.chapterTitle || "",
      difficulty: String(q.difficulty || "").toLowerCase(),
      appearedIn: (q.appearedIn || []).map((x) =>
        this.normalizeAppearance(x),
      ),
      relatedQuestions:
        q.relatedQuestionIds ||
        q.relatedQuestions ||
        group?.questionIds?.filter((id) => id !== q.id) ||
        [],
      repeatCount: group?.frequency || q.frequency || 1,
    };
  }

  async selectQuestion(id) {
    const m = this.getQuestionMeta(id);
    if (!m) return;
    this.selectedMeta = m;
    this.renderList();
    this.showLoading("Question load हो रहा है...");
    try {
      this.selectedQuestion = await this.loadQuestion(m);
      this.renderDetail();
    } catch (e) {
      console.error(e);
      this.showError(
        `Question file load failed: ${this.getQuestionFileUrl(m)}`,
      );
    }
  }
  async loadQuestion(m) {
    if (this.questionCache.has(m.id)) return this.questionCache.get(m.id);
    if (m.contentStatus === "pending" || m.hasAnswer === false) {
      return {
        ...m,
        question: { markdown: m.title || "" },
        answers: {},
        media: [],
      };
    }
    const q = await getQuestionContent(this.subjectFolder, m.file);
    const merged = {
      ...m,
      ...q,
      id: q.id || m.id,
      questionMd: q.question?.markdown || q.questionMd || "",
      appearedIn: (q.appearedIn || m.appearedIn || []).map((x) =>
        this.normalizeAppearance(x),
      ),
      relatedAppearedIn:
        q.relatedAppearedIn?.length > 0
          ? q.relatedAppearedIn
          : m.relatedAppearedIn || [],
      relatedQuestions:
        q.relatedQuestionIds?.length > 0
          ? q.relatedQuestionIds
          : q.relatedQuestions?.length > 0
            ? q.relatedQuestions
            : m.relatedQuestions || [],
      marks: q.marks ?? m.marks,
      category: q.category || m.category,
      difficulty: q.difficulty || m.difficulty,
      tags: q.tags || m.tags || [],
    };
    this.questionCache.set(m.id, merged);
    return merged;
  }
  getQuestionMeta(id) {
    return this.db.find((q) => q.id === id);
  }
  async loadState() {
    try {
      this.state = await getProgress(this.subjectFolder);
    } catch {
      this.state = { done: [], bookmarks: [], revision: [] };
    }
  }
  async saveState() {
    try {
      await updateProgress(this.subjectFolder, this.state);
    } catch {
      // Progress requires a signed-in student account.
    }
    this.updateStats();
  }
  getRepeatCount(q) {
    return (
      q.repeatCount ||
      q.relatedAppearedIn?.length ||
      q.appearedIn?.length ||
      1
    );
  }
  repeatLabel(q) {
    const c = this.getRepeatCount(q);
    return c > 1 ? `Asked ${c} Times` : `Asked ${c} Time`;
  }
  yearNum(q) {
    const y = (q.appearedIn || [])
      .map((x) => String(x.session || "").match(/(\d{4})/)?.[1])
      .filter(Boolean)
      .map(Number);
    return y.length ? Math.max(...y) : 0;
  }
  applyFilters() {
    const search = this.$("#searchBox")?.value.toLowerCase().trim() || "",
      marks = this.$("#marksFilter")?.value || "all",
      diff = this.$("#difficultyFilter")?.value || "all",
      sort = this.$("#sortBy")?.value || "default";
    this.filtered = this.db.filter((q) => {
      if (this.view === "repeated" && this.getRepeatCount(q) < 2) return false;
      if (this.view === "bookmarks" && !this.state.bookmarks.includes(q.id))
        return false;
      if (this.view === "revision" && !this.state.revision.includes(q.id))
        return false;
      if (this.view === "completed" && !this.state.done.includes(q.id))
        return false;
      if (marks !== "all" && String(q.marks) !== marks) return false;
      if (diff !== "all" && q.difficulty !== diff) return false;
      const text = [
        q.id,
        q.title,
        q.question,
        q.question?.markdown,
        q.questionMd,
        q.category,
        q.classification?.chapterTitle,
        q.classification?.topicTitle,
        q.difficulty,
        ...(q.tags || []),
        ...(q.appearedIn || []).map(
          (x) => `${x.session || ""} ${x.paperQuestionNo || ""}`,
        ),
        ...(q.relatedAppearedIn || []).map(
          (x) => `${x.session || ""} ${x.paperQuestionNo || ""}`,
        ),
      ]
        .join(" ")
        .toLowerCase();
      return !search || text.includes(search);
    });
    this.sortQuestions(sort);
    this.renderList();
  }
  sortQuestions(sort) {
    if (sort === "repeated" || this.view === "repeated")
      this.filtered.sort(
        (a, b) => this.getRepeatCount(b) - this.getRepeatCount(a),
      );
    else if (sort === "marks")
      this.filtered.sort((a, b) => Number(b.marks || 0) - Number(a.marks || 0));
    else if (sort === "latest")
      this.filtered.sort((a, b) => this.yearNum(b) - this.yearNum(a));
    else if (sort === "oldest")
      this.filtered.sort((a, b) => this.yearNum(a) - this.yearNum(b));
  }
  renderList() {
    const count = this.$("#countText"),
      list = this.$("#questionList");
    if (!count || !list) return;
    count.textContent = `${this.filtered.length} Questions`;
    list.innerHTML =
      this.filtered.map((q, i) => this.createQuestionCard(q, i)).join("") ||
      `<div class="empty">No questions found.</div>`;
    this.$$(".qcard").forEach(
      (card) => (card.onclick = () => this.selectQuestion(card.dataset.id)),
    );
  }
  createQuestionCard(q, i) {
    const sessions = (q.appearedIn || []).map((x) => x.session).join(", "),
      title =
        q.title || q.question || this.stripMarkdown(q.questionMd || "") || q.id,
      active = this.selectedMeta?.id === q.id;
    const marksLabel = q.marks == null ? "Marks pending" : `${q.marks} Marks`;
    return questionCardMarkup({
      question: q,
      index: i,
      active,
      title,
      sessions,
      repeatLabel: this.repeatLabel(q),
      marksLabel,
      escapeHtml: (value) => this.escapeHtml(value),
      escapeAttr: (value) => this.escapeAttr(value),
    });
  }
  renderDetail() {
    const p = this.$("#detailPanel");
    if (!p) return;
    if (!this.selectedQuestion) {
      p.innerHTML =
        '<div class="empty">Select a question to view answer.</div>';
      return;
    }
    const q = this.selectedQuestion,
      questionMd = q.question?.markdown || q.questionMd || q.question || "",
      answerMd = this.getAnswerMd(q);
    const questionWithMedia = this.replaceMediaPlaceholders(
      questionMd,
      q.media || [],
    );
    const tags = (q.tags || [])
      .map((tag) => `<span class="tag">${this.escapeHtml(tag)}</span>`)
      .join("");
    const marksLabel = q.marks == null ? "Marks pending" : `${q.marks} Marks`;
    const questionClass =
      q.id === "MCS211-Q001" ? " notebookQuestion" : "";
    p.innerHTML = `<div class="studyPage"><div class="paperHeader"><span class="badge">${this.escapeHtml(q.id)}</span><span class="divider">|</span><span class="badge orange">${this.escapeHtml(marksLabel)}</span><span class="divider">|</span><span class="badge green">${this.repeatLabel(q)}</span><span class="divider">|</span><span class="badge">${this.escapeHtml(q.difficulty || "")}</span></div><div class="tagList detailTags">${tags}</div><section class="paperQuestion markdown-body${questionClass}"><div class="questionTitle">Q.</div>${this.renderMarkdown(questionWithMedia)}${this.renderMedia(q.media || [], "question", true)}</section><section class="paperHistory"><h3>Asked In Previous Papers</h3><div class="yearList">${this.renderAppearedIn(q)}</div></section><div class="studyToolbar"><div class="toolrow"><span>Answer Language:</span><button id="detailEn" class="${this.lang === "english" ? "active" : ""}">English</button><button id="detailHi" class="${this.lang === "hinglish" ? "active" : ""}">Hinglish</button><span class="push">Answer Mode:</span><button id="shortBtn" class="${this.answerMode === "short" ? "active" : ""}">Short</button><button id="examBtn" class="${this.answerMode === "exam" ? "active" : ""}">Exam</button><button id="detailedBtn" class="${this.answerMode === "detailed" ? "active" : ""}">Detailed</button></div></div><section class="answerPaper markdown-body"><h2 class="answerTitle">Answer (${this.lang === "english" ? "English" : "Hinglish"})</h2>${this.renderMarkdown(answerMd || "Answer अभी add नहीं है।")}${this.renderMedia(q.media || [], "answer")}</section>${this.renderRelatedQuestions(q)}<div class="bottomActions"><button class="done" id="doneBtn">${this.state.done.includes(q.id) ? "✓ Completed" : "Mark as Completed"}</button><button class="rev" id="revBtn">${this.state.revision.includes(q.id) ? "★ In Revision" : "Add to Revision"}</button><button class="book" id="bookBtn">${this.state.bookmarks.includes(q.id) ? "🔖 Bookmarked" : "Bookmark"}</button></div></div>`;
    this.bindDetailEvents();
  }
  renderAppearedIn(q) {
    const list = q.relatedAppearedIn?.length
      ? q.relatedAppearedIn
      : q.appearedIn || [];
    if (!list.length) return `<span class="year">No data</span>`;
    return list
      .map(
        (x) =>
          `<span class="year">${this.escapeHtml(x.id ? x.id + " • " : "")}${this.escapeHtml(x.session || "")} - ${this.escapeHtml(x.paperQuestionNo || "")}</span>`,
      )
      .join("");
  }
  renderRelatedQuestions(q) {
    const rel = q.relatedQuestions || [];
    if (!rel.length) return "";
    const items = rel
      .map((id) => {
        const m = this.getQuestionMeta(id),
          title = m?.title || m?.question || id;
        return `<button class="year relatedBtn" data-id="${this.escapeAttr(id)}">${this.escapeHtml(title)}</button>`;
      })
      .join("");
    setTimeout(
      () =>
        this.$$(".relatedBtn").forEach(
          (btn) => (btn.onclick = () => this.selectQuestion(btn.dataset.id)),
        ),
      0,
    );
    return `<section class="relatedList"><h3>Related Questions</h3><div class="yearList">${items}</div></section>`;
  }
  getAnswerMd(q) {
    const languageCode = this.lang === "english" ? "en" : "hi-en";
    const modern = q.answers?.[languageCode] || {};
    if (modern[this.answerMode]) return modern[this.answerMode];
    const a = q.answer?.[this.lang] || {},
      key = `${this.answerMode}Md`;
    return a[key] || a.examMd || a.exam || a.shortMd || a.short || "";
  }
  renderMarkdown(md) {
    let t = String(md || "");

    // data/images/ → mcs_211/data/images/
    t = this.fixMarkdownPaths(t);

    return window.marked?.parse
      ? window.marked.parse(t)
      : this.basicMarkdown(t);
  }
  basicMarkdown(t) {
    let h = this.escapeHtml(t);
    h = h
      .replace(
        /```([\s\S]*?)```/g,
        (_m, c) => `<pre><code>${c.trim()}</code></pre>`,
      )
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(
        /!\[(.*?)\]\((.*?)\)/g,
        '<img src="$2" alt="$1" class="diagram">',
      )
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br>");
    return `<p>${h}</p>`;
  }
  renderMedia(items = [], place = "question", skipPlaceholderMedia = false) {
    return items
      .filter(
        (x) =>
          (x.placement || x.usage) === place &&
          (!skipPlaceholderMedia || !x.id),
      )
      .map((x) => {
        const type = x.kind || x.type;
        if (["image", "svg", "code-image"].includes(type))
          return `<div class="mediaBox"><img src="${this.escapeAttr(this.getMediaUrl(x))}" alt="${this.escapeAttr(x.alt || "Question diagram")}" class="diagram"></div>`;
        if (["table", "code", "math", "html"].includes(x.type))
          return `<div class="mediaBox">${x.html || ""}</div>`;
        return "";
      })
      .join("");
  }
  bindDetailEvents() {
    this.$("#shortBtn")?.addEventListener("click", () =>
      this.setAnswerMode("short"),
    );
    this.$("#examBtn")?.addEventListener("click", () =>
      this.setAnswerMode("exam"),
    );
    this.$("#detailedBtn")?.addEventListener("click", () =>
      this.setAnswerMode("detailed"),
    );
    this.$("#detailEn")?.addEventListener("click", () =>
      this.setLang("english"),
    );
    this.$("#detailHi")?.addEventListener("click", () =>
      this.setLang("hinglish"),
    );
    this.$("#doneBtn")?.addEventListener("click", () =>
      this.toggleState("done", this.selectedQuestion.id),
    );
    this.$("#revBtn")?.addEventListener("click", () =>
      this.toggleState("revision", this.selectedQuestion.id),
    );
    this.$("#bookBtn")?.addEventListener("click", () =>
      this.toggleState("bookmarks", this.selectedQuestion.id),
    );
  }
  setLang(v) {
    this.lang = v;
    this.$("#langEn")?.classList.toggle("active", v === "english");
    this.$("#langHi")?.classList.toggle("active", v === "hinglish");
    this.renderDetail();
  }
  setAnswerMode(v) {
    this.answerMode = v;
    this.renderDetail();
  }
  async toggleState(k, id) {
    const a = this.state[k],
      i = a.indexOf(id);
    if (i > -1) a.splice(i, 1);
    else a.push(id);
    await this.saveState();
    this.renderDetail();
    this.applyFilters();
  }
  updateStats() {
    if (this.$("#totalQ")) this.$("#totalQ").textContent = this.db.length;
    if (this.$("#doneQ")) this.$("#doneQ").textContent = this.state.done.length;
    if (this.$("#bookQ"))
      this.$("#bookQ").textContent = this.state.bookmarks.length;
    const pr = this.db.length
      ? Math.round((this.state.done.length / this.db.length) * 100)
      : 0;
    if (this.$("#progressBar")) this.$("#progressBar").style.width = `${pr}%`;
  }
  bindEvents() {
    ["searchBox", "sortBy", "marksFilter", "difficultyFilter"].forEach((id) =>
      this.$(`#${id}`)?.addEventListener("input", () => this.applyFilters()),
    );
    this.$$(".nav").forEach((b) =>
      b.addEventListener("click", () => {
        this.$$(".nav").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        this.view = b.dataset.view;
        if (this.$("#subtitle"))
          this.$("#subtitle").textContent = b.textContent.trim();
        this.applyFilters();
      }),
    );
    this.$("#langEn")?.addEventListener("click", () => this.setLang("english"));
    this.$("#langHi")?.addEventListener("click", () =>
      this.setLang("hinglish"),
    );
    this.$("#themeBtn")?.addEventListener("click", () => {
      const currentTheme = document.documentElement.dataset.theme || "light";
      const nextTheme =
        APP_THEMES[(APP_THEMES.indexOf(currentTheme) + 1) % APP_THEMES.length];
      applyAppTheme(nextTheme);
    });
    this.$("#resetBtn")?.addEventListener("click", () => this.resetFilters());
  }
  resetFilters() {
    if (this.$("#searchBox")) this.$("#searchBox").value = "";
    if (this.$("#sortBy")) this.$("#sortBy").value = "default";
    if (this.$("#marksFilter")) this.$("#marksFilter").value = "all";
    if (this.$("#difficultyFilter")) this.$("#difficultyFilter").value = "all";
    this.applyFilters();
  }
  showLoading(m) {
    if (this.$("#detailPanel"))
      this.$("#detailPanel").innerHTML =
        `<div class="empty">${this.escapeHtml(m)}</div>`;
  }
  showError(m) {
    if (this.$("#detailPanel"))
      this.$("#detailPanel").innerHTML =
        `<div class="empty imageError">${this.escapeHtml(m)}</div>`;
  }
  stripMarkdown(md) {
    return String(md || "")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/[#>*_`]/g, "")
      .replace(/\n+/g, " ")
      .trim()
      .slice(0, 140);
  }
  escapeHtml(v) {
    return String(v ?? "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  }
  escapeAttr(v) {
    return this.escapeHtml(v).replace(/'/g, "&#039;");
  }
}
document.addEventListener("DOMContentLoaded", () => new QuestionBankApp());
