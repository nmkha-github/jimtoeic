/**
 * TOEIC Part 5 - Full Logic Script
 */

const FILES = Array.from({ length: 10 }, (_, i) => `jim/test${String(i + 1).padStart(2, '0')}_part5.json`);

const el = (id) => document.getElementById(id);

// --- DOM Elements ---
const testSelect = el('testSelect');
const testSelectWrap = el('testSelectWrap');
const quiz = el('quiz');
const progressFill = el('progressFill');
const submitBtn = el('submitBtn');
const redoBtn = el('redoBtn');
const bottomActions = el('bottomActions');
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
let isSubmitted = false; // Thêm trạng thái khóa nộp bài

function init() {
    FILES.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f.replace(/^.*\//, '');
        testSelect.appendChild(opt);
    });

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
    redoBtn.addEventListener('click', redoQuiz);

    updateModeLogic();
    loadPoolFromSelected();
}

function updateModeLogic() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    
    if (mode === 'all') {
        random40Wrap.style.display = 'flex';
        testSelectWrap.style.display = 'none';
        
        instantToggle.checked = true;
        instantToggle.disabled = true;
        
        bottomActions.style.display = 'none';
    } else {
        random40Wrap.style.display = 'none';
        random40Toggle.checked = false;
        
        testSelectWrap.style.display = 'inline-block';
        instantToggle.disabled = false;
        
        bottomActions.style.display = 'flex';
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
        quiz.innerHTML = `<p style="color:red; text-align:center;">Lỗi tải dữ liệu. Hãy chắc chắn bạn đang chạy trên Server (Live Server).</p>`;
    }
}

function prepareQuestionsAndRender() {
    if (!allQuestions.length) return;
    
    answers = {}; 
    scoreEl.textContent = ''; 
    isSubmitted = false; // Reset trạng thái khi đổi test
    
    let pool = [...allQuestions];

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
    // Nếu đã nộp bài thì không cho click chọn nữa
    if (isSubmitted) return; 

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
    // Chặn nộp lại nếu đã nộp rồi hoặc chưa có câu hỏi
    if (questions.length === 0 || isSubmitted) return;
    
    isSubmitted = true; // Đánh dấu đã nộp bài
    let correctCount = 0;
    
    // Duyệt qua toàn bộ câu hỏi để chấm điểm và hiển thị UI
    questions.forEach((q, idx) => {
        const userAns = answers[idx];
        const card = document.getElementById(`q${idx}`);
        const allOpts = card.querySelectorAll('.option');

        if (userAns === q.answer) correctCount++;

        // Cập nhật giao diện đúng/sai cho từng option
        q.displayedOptions.forEach((o, i) => {
            const optEl = allOpts[i];
            optEl.classList.remove('selected'); // Xóa màu xanh dương của lúc đang làm

            if (o.origKey === q.answer) {
                optEl.classList.add('correct'); // Bôi xanh lá đáp án đúng
            } else if (o.origKey === userAns) {
                optEl.classList.add('wrong'); // Bôi đỏ nếu người dùng chọn sai
            }
        });
    });
    
    scoreEl.textContent = `Score: ${correctCount} / ${questions.length}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function redoQuiz() {
    if (confirm('Bạn có chắc chắn muốn làm lại bài này? Mọi đáp án sẽ bị xóa.')) {
        answers = {}; 
        scoreEl.textContent = ''; 
        isSubmitted = false; // Mở khóa nộp bài
        renderAll(); 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    }
}

init();