/**
 * TOEIC Part 5 - Full Logic Script (with shuffle persisted in localStorage)
 */

const FILES = Array.from({ length: 10 }, (_, i) =>
  `jim/test${String(i + 1).padStart(2, "0")}_part5.json`
);

const el = (id) => document.getElementById(id);

// DOM
const testSelect = el("testSelect");
const testSelectWrap = el("testSelectWrap");
const quiz = el("quiz");
const progressFill = el("progressFill");
const submitBtn = el("submitBtn");
const scoreEl = el("score");
const summary = el("summary");
const instantToggle = el("instant");
const shuffleToggle = el("shuffle");
const random40Toggle = el("random40");
const random40Wrap = el("random40Wrap");
const bottomActions = el("bottomActions");

const redoButtons = document.querySelectorAll(".redo-btn");

// STATE
let allQuestions = [];
let questions = [];
let answers = {};
let isSubmitted = false;

// localStorage key prefix for shuffle (per-mode / per-file)
const SHUFFLE_KEY_PREFIX = "jim_part5_shuffle_";

// INIT
function init() {
  FILES.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f;
    opt.textContent = f.replace(/^.*\//, "");
    testSelect.appendChild(opt);
  });

  testSelect.addEventListener("change", () => {
    // when user picks a different test, restore saved shuffle for that test
    loadShuffleSetting();
    loadPoolFromSelected();
  });

  document.querySelectorAll('input[name="mode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      updateModeLogic();
      // when mode changes, restore shuffle for the new mode (e.g., "all" or specific file)
      loadShuffleSetting();
      loadPoolFromSelected();
    });
  });

  // save shuffle when changed and re-render
  shuffleToggle.addEventListener("change", () => {
    saveShuffleSetting();
    prepareQuestionsAndRender();
  });

  // keep existing behavior for these toggles
  random40Toggle.addEventListener("change", prepareQuestionsAndRender);

  submitBtn.addEventListener("click", submitQuiz);

  // tất cả redo button
  redoButtons.forEach((btn) => {
    btn.addEventListener("click", redoQuiz);
  });

  updateModeLogic();
  // load saved shuffle for initial selection
  loadShuffleSetting();
  loadPoolFromSelected();
}

// MODE
function updateModeLogic() {
  const mode = document.querySelector('input[name="mode"]:checked').value;

  if (mode === "all") {
    random40Wrap.style.display = "flex";
    testSelectWrap.style.display = "none";

    instantToggle.checked = true;
    instantToggle.disabled = true;

    bottomActions.style.display = "none";
  } else {
    random40Wrap.style.display = "none";
    random40Toggle.checked = false;

    testSelectWrap.style.display = "inline-block";

    instantToggle.disabled = false;

    bottomActions.style.display = "flex";
  }
}

// Helpers for localStorage key
function getShuffleKey() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  if (mode === "all") return SHUFFLE_KEY_PREFIX + "all";
  const file = testSelect.value || FILES[0];
  const name = file.replace(/^.*\//, "");
  return SHUFFLE_KEY_PREFIX + name; // e.g. jim_part5_shuffle_test01_part5.json
}

function saveShuffleSetting() {
  try {
    localStorage.setItem(getShuffleKey(), shuffleToggle.checked ? "1" : "0");
  } catch (e) {
    // ignore storage errors (e.g., quota/private mode)
    console.warn("Không thể lưu shuffle vào localStorage:", e);
  }
}

function loadShuffleSetting() {
  try {
    const key = getShuffleKey();
    const val = localStorage.getItem(key);
    if (val !== null) {
      shuffleToggle.checked = val === "1";
    } else {
      // default fallback if nothing saved
      shuffleToggle.checked = false;
    }
  } catch (e) {
    console.warn("Không thể đọc shuffle từ localStorage:", e);
  }
}

// LOAD DATA
async function loadPoolFromSelected() {
  const mode = document.querySelector('input[name="mode"]:checked').value;

  const filesToLoad = mode === "all" ? FILES : [testSelect.value];

  try {
    const loads = await Promise.all(
      filesToLoad.map(async (f) => {
        const res = await fetch(f);
        if (!res.ok) throw new Error(`Fetch error: ${f}`);
        return await res.json();
      })
    );

    allQuestions = loads.flat();

    prepareQuestionsAndRender();
  } catch (err) {
    console.error(err);

    quiz.innerHTML = `<p style="color:red;text-align:center;">
        Lỗi tải dữ liệu. Hãy chạy bằng Live Server.
        </p>`;
  }
}

// PREPARE
function prepareQuestionsAndRender() {
  if (!allQuestions.length) return;

  answers = {};
  scoreEl.textContent = "";
  isSubmitted = false;

  let pool = [...allQuestions];

  if (random40Toggle.checked && random40Wrap.style.display !== "none") {
    pool = pool.sort(() => 0.5 - Math.random()).slice(0, 40);
  }

  const isShuffle = shuffleToggle.checked;

  questions = pool.map((q) => {
    const entries = Object.entries(q.options || {}).map(([k, t]) => ({
      origKey: k,
      text: t,
    }));

    return {
      id: q.id,
      question: q.question,
      displayedOptions: isShuffle
        ? entries.sort(() => 0.5 - Math.random())
        : entries,
      answer: q.answer,
    };
  });

  renderAll();
}

// RENDER
function renderAll() {
  quiz.innerHTML = "";

  questions.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "card";
    card.id = `q${idx}`;

    card.innerHTML = `<div class="q-title">${idx + 1}. ${q.question}</div>`;

    const optWrap = document.createElement("div");
    optWrap.className = "options";

    q.displayedOptions.forEach((o, j) => {
      const opt = document.createElement("div");
      opt.className = "option";

      if (answers[idx] === o.origKey) opt.classList.add("selected");

      opt.innerHTML = `<div class="label">${String.fromCharCode(65 + j)}</div>
           <div class="text">${o.text}</div>`;

      opt.onclick = () => handleSelect(q, opt, idx, o.origKey);

      optWrap.appendChild(opt);
    });

    card.appendChild(optWrap);
    quiz.appendChild(card);
  });

  updateProgress();
}

// SELECT
function handleSelect(q, optElement, idx, key) {
  if (isSubmitted) return;

  answers[idx] = key;

  const card = document.getElementById(`q${idx}`);
  const allOpts = card.querySelectorAll(".option");

  allOpts.forEach((o) => o.classList.remove("selected", "correct", "wrong"));

  if (instantToggle.checked) {
    if (key === q.answer) {
      optElement.classList.add("correct");
    } else {
      optElement.classList.add("wrong");

      q.displayedOptions.forEach((o, i) => {
        if (o.origKey === q.answer) allOpts[i].classList.add("correct");
      });
    }
  } else {
    optElement.classList.add("selected");
  }

  updateProgress();
}

// PROGRESS
function updateProgress() {
  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;

  const percent = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

  progressFill.style.width = percent + "%";

  summary.textContent = `${answeredCount} / ${totalCount} câu đã hoàn thành`;
}

// SUBMIT
function submitQuiz() {
  if (questions.length === 0 || isSubmitted) return;

  isSubmitted = true;

  let correctCount = 0;

  questions.forEach((q, idx) => {
    const userAns = answers[idx];

    const card = document.getElementById(`q${idx}`);
    const allOpts = card.querySelectorAll(".option");

    if (userAns === q.answer) correctCount++;

    q.displayedOptions.forEach((o, i) => {
      const optEl = allOpts[i];

      optEl.classList.remove("selected");

      if (o.origKey === q.answer) {
        optEl.classList.add("correct");
      } else if (o.origKey === userAns) {
        optEl.classList.add("wrong");
      }
    });
  });

  scoreEl.textContent = `Score: ${correctCount} / ${questions.length}`;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// REDO
function redoQuiz() {
  if (!confirm("Bạn có chắc chắn muốn làm lại bài này?")) return;

  answers = {};
  scoreEl.textContent = "";
  isSubmitted = false;

  renderAll();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

init();