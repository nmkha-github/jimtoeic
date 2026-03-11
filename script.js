/**
 * TOEIC Part 5 - Full Logic Script
 * Update: Hide test selector on All tests, Hide Random 40 on Single test
 */

const FILES = Array.from({ length: 10 }, (_, i) => `jim/test${String(i + 1).padStart(2, '0')}_part5.json`);

const el = (id) => document.getElementById(id);

// --- DOM Elements ---
const testSelect = el('testSelect');
const testSelectWrap = el('testSelectWrap');
const quiz = el('quiz');
const progressFill = el('progressFill');
const submitBtn = el('submitBtn');
const scoreEl = el('score');
const summary = el('summary');
const instantToggle = el('instant');
const shuffleToggle = el('shuffle');
const random40Toggle = el('random40');
const random40Wrap = el('random40Wrap');

// --- App State ---
let allQuestions = []; 
let questions = [];    
let answers = {};      

function init() {
    // Khởi tạo danh sách test
    FILES.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f.replace(/^.*\//, '');
        testSelect.appendChild(opt);
    });

    // Listeners
    testSelect.addEventListener('change', loadPoolFromSelected);
    
    document.querySelectorAll('input[name="mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateModeLogic();
            loadPoolFromSelected();
        });
    });

    shuffleToggle.addEventListener('change', prepareQuestionsAndRender);
    random40Toggle.addEventListener('change', prepareQuestionsAndRender);
    submitBtn.addEventListener('click', submitQuiz);

    // Run first time
    updateModeLogic();
    loadPoolFromSelected();
}

/**
 * Điều khiển việc ẩn hiện các nút điều hướng và logic chế độ
 */
function updateModeLogic() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    
    if (mode === 'all') {
        // Chế độ All: Hiện Random 40, Ẩn chọn test, Khóa Instant Answer
        random40Wrap.style.display = 'flex';
        testSelectWrap.style.display = 'none';
        
        instantToggle.checked = true;
        instantToggle.disabled = true;
    } else {
        // Chế độ Single: Ẩn Random 40, Hiện chọn test, Mở khóa Instant Answer
        random40Wrap.style.display = 'none';
        random40Toggle.checked = false;
        
        testSelectWrap.style.display = 'inline-block';
        instantToggle.disabled = false;
    }
}

async function loadPoolFromSelected() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const filesToLoad = mode === 'all' ? FILES : [testSelect.value];
    
    try {
        const loads = await Promise.all(filesToLoad.map(async f => {
            const res = await fetch(f);
            if (!res.ok) throw new Error(`Fetch error: ${f}`);
            return await res.json();
        }));
        
        allQuestions = loads.flat();
        prepareQuestionsAndRender();
    } catch (err) {
        console.error(err);
        quiz.innerHTML = `<p style="color:red; text-align:center;">Lỗi tải dữ liệu.</p>`;
    }
}

function prepareQuestionsAndRender() {
    if (!allQuestions.length) return;
    
    answers = {}; 
    scoreEl.textContent = ''; 
    
    let pool = [...allQuestions];

    // Logic Random 40
    if (random40Toggle.checked && random40Wrap.style.display !== 'none') {
        pool = pool.sort(() => 0.5 - Math.random()).slice(0, 40);
    }

    const isShuffleOpt = shuffleToggle.checked;
    questions = pool.map(q => {
        const entries = Object.entries(q.options || {}).map(([k, t]) => ({ origKey: k, text: t }));
        return {
            id: q.id,
            question: q.question,
            displayedOptions: isShuffleOpt ? entries.sort(() => 0.5 - Math.random()) : entries,
            answer: q.answer
        };
    });

    renderAll();
}

function renderAll() {
    quiz.innerHTML = '';
    questions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.id = `q${idx}`;
        card.innerHTML = `<div class="q-title">${idx + 1}. ${q.question}</div>`;
        
        const optWrap = document.createElement('div');
        optWrap.className = 'options';
        
        q.displayedOptions.forEach((o, j) => {
            const opt = document.createElement('div');
            opt.className = 'option';
            if (answers[idx] === o.origKey) opt.classList.add('selected');
            opt.innerHTML = `<div class="label">${String.fromCharCode(65 + j)}</div><div class="text">${o.text}</div>`;
            opt.onclick = () => handleSelect(q, opt, idx, o.origKey);
            optWrap.appendChild(opt);
        });
        
        card.appendChild(optWrap);
        quiz.appendChild(card);
    });
    updateProgress();
}

function handleSelect(q, optElement, idx, key) {
    answers[idx] = key;
    const card = document.getElementById(`q${idx}`);
    const allOpts = card.querySelectorAll('.option');
    
    allOpts.forEach(o => o.classList.remove('selected', 'correct', 'wrong'));
    
    if (instantToggle.checked) {
        if (key === q.answer) {
            optElement.classList.add('correct');
        } else {
            optElement.classList.add('wrong');
            q.displayedOptions.forEach((o, i) => {
                if (o.origKey === q.answer) allOpts[i].classList.add('correct');
            });
        }
    } else {
        optElement.classList.add('selected');
    }
    updateProgress();
}

function updateProgress() {
    const answeredCount = Object.keys(answers).length;
    const totalCount = questions.length;
    const percent = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;
    progressFill.style.width = percent + '%';
    summary.textContent = `${answeredCount} / ${totalCount} câu đã hoàn thành`;
}

function submitQuiz() {
    if (questions.length === 0) return;
    let correctCount = 0;
    questions.forEach((q, idx) => {
        if (answers[idx] === q.answer) correctCount++;
    });
    
    scoreEl.textContent = `Score: ${correctCount} / ${questions.length}`;
    alert(`🎉 Xong! \nSố câu đúng: ${correctCount} / ${questions.length}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

init();