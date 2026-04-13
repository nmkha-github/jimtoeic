const KNOWN_FOLDERS = ["jim", "ybm2", "old_test"];
const MAX_TRIES = 99;
const STOP_AFTER_MISSES = 3;

let FILES = [];

const el = (id) => document.getElementById(id);

const folderSelect = el("folderSelect");
const quiz = el("quiz");
const progressFill = el("progressFill");
const summary = el("summary");
const shuffleToggle = el("shuffle");
const random40Toggle = el("random40");
const discoverStatus = el("discoverStatus");

const redoButtons = document.querySelectorAll(".redo-btn");

let allQuestions = [];
let questions = [];
let answers = {};

const SHUFFLE_KEY_PREFIX = "jim_part5_shuffle_";

// INIT
function init() {
  KNOWN_FOLDERS.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f;
    opt.textContent = f;
    folderSelect.appendChild(opt);
  });

  folderSelect.value = KNOWN_FOLDERS[0];

  folderSelect.addEventListener("change", onFolderChanged);
  shuffleToggle.addEventListener("change", () => {
    saveShuffleSetting();
    prepareQuestions();
  });

  random40Toggle.addEventListener("change", prepareQuestions);

  redoButtons.forEach(btn => btn.addEventListener("click", redoQuiz));

  onFolderChanged();
}

// DISCOVER FILES
async function discoverFiles(folder) {
  const found = [];
  let misses = 0;

  for (let i = 1; i <= MAX_TRIES; i++) {
    const name = `test${String(i).padStart(2, "0")}_part5.json`;
    const path = `${folder}/${name}`;

    try {
      const res = await fetch(path);
      if (res.ok) {
        found.push(path);
        misses = 0;
      } else misses++;
    } catch {
      misses++;
    }

    if (found.length > 0 && misses >= STOP_AFTER_MISSES) break;
  }

  return found;
}

async function onFolderChanged() {
  const folder = folderSelect.value;

  // Show spinner
  discoverStatus.innerHTML = `<span class="spinner"></span> Đang load ${folder}...`;

  FILES = await discoverFiles(folder);

  if (!FILES.length) {
    discoverStatus.textContent = "";
    quiz.innerHTML = `<p style="color:red;text-align:center;">Không có dữ liệu</p>`;
    return;
  }

  // Still loading all JSON files — keep spinner
  discoverStatus.innerHTML = `<span class="spinner"></span> Đang tải ${FILES.length} bài test...`;

  await loadAll();

  // Done — show clean status, no spinner
  discoverStatus.textContent = `✅ Đã tải ${FILES.length} bài test`;
}

// LOAD ALL
async function loadAll() {
  const loads = await Promise.all(
    FILES.map(f => fetch(f).then(r => r.json()))
  );

  allQuestions = loads.flat();
  loadShuffleSetting();
  prepareQuestions();
  // status is set by onFolderChanged after this resolves
}

// PREPARE
function prepareQuestions() {
  answers = {};

  let pool = [...allQuestions];

  if (random40Toggle.checked) {
    pool = pool.sort(() => 0.5 - Math.random()).slice(0, 40);
  }

  const isShuffle = shuffleToggle.checked;

  questions = pool.map(q => {
    const entries = Object.entries(q.options).map(([k, t]) => ({
      key: k,
      text: t
    }));

    return {
      ...q,
      options: isShuffle
        ? entries.sort(() => 0.5 - Math.random())
        : entries
    };
  });

  render();
}

// RENDER
function render() {
  quiz.innerHTML = "";

  questions.forEach((q, i) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `<div class="q-title">${i + 1}. ${q.question}</div>`;

    const wrap = document.createElement("div");
    wrap.className = "options";

    q.options.forEach((o, j) => {
      const opt = document.createElement("div");
      opt.className = "option";

      opt.innerHTML = `
        <div class="label">${String.fromCharCode(65 + j)}</div>
        <div>${o.text}</div>
      `;

      opt.onclick = () => select(q, i, o.key, opt);

      wrap.appendChild(opt);
    });

    card.appendChild(wrap);
    quiz.appendChild(card);
  });

  updateProgress();
}

// SELECT (LUÔN HIỆN ĐÚNG SAI)
function select(q, idx, key, el) {
  answers[idx] = key;

  const card = quiz.children[idx];
  const opts = card.querySelectorAll(".option");

  opts.forEach(o => o.classList.remove("correct", "wrong"));

  q.options.forEach((o, i) => {
    if (o.key === q.answer) {
      opts[i].classList.add("correct");
    } else if (o.key === key) {
      opts[i].classList.add("wrong");
    }
  });

  updateProgress();
}

// PROGRESS
function updateProgress() {
  const done = Object.keys(answers).length;
  const total = questions.length;

  progressFill.style.width = (done / total * 100) + "%";
  summary.textContent = `${done} / ${total}`;
}

// REDO
function redoQuiz() {
  prepareQuestions();
}

// STORAGE
function getShuffleKey() {
  return SHUFFLE_KEY_PREFIX + folderSelect.value;
}

function saveShuffleSetting() {
  localStorage.setItem(getShuffleKey(), shuffleToggle.checked ? "1" : "0");
}

function loadShuffleSetting() {
  const v = localStorage.getItem(getShuffleKey());
  if (v !== null) shuffleToggle.checked = v === "1";
}

init();