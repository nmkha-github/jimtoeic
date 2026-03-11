/**
 * TOEIC Part 5 - Full Logic Script
 * Chế độ: Cuộn vô hạn, Không phân trang, Tính điểm theo Index, Submit Sticky
 */

const FILES = Array.from({ length: 10 }, (_, i) => `jim/test${String(i + 1).padStart(2, '0')}_part5.json`);

const el = (id) => document.getElementById(id);

// --- DOM Elements ---
const testSelect = el('testSelect');
const quiz = el('quiz');
const progressFill = el('progressFill');
const submitBtn = el('submitBtn');
const scoreEl = el('score');
const summary = el('summary');
const instantToggle = el('instant');
const shuffleToggle = el('shuffle');
const random40Toggle = el('random40');

// --- App State ---
let allQuestions = [];   // Toàn bộ câu hỏi từ các file đã load
let questions = [];      // Câu hỏi sau khi lọc/ngẫu nhiên (để hiển thị)
let answers = {};        // Lưu trữ: { index_cau_hoi: "origKey_dap_an" }

// --- Initialization ---
function init() {
    // 1. Tạo danh sách chọn test
    FILES.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f.replace(/^.*\//, '');
        testSelect.appendChild(opt);
    });

    // 2. Lắng nghe sự kiện
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

    // Chạy lần đầu
    updateModeLogic();
    loadPoolFromSelected();
}

/**
 * Logic: Nếu chọn "All tests" thì ép buộc "Show answer immediate"
 */
function updateModeLogic() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    if (mode === 'all') {
        instantToggle.checked = true;
        instantToggle.disabled = true;
    } else {
        instantToggle.disabled = false;
    }
}

/**
 * Tải dữ liệu từ các file JSON
 */
async function loadPoolFromSelected() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const filesToLoad = mode === 'all' ? FILES : [testSelect.value];
    
    try {
        const loads = await Promise.all(filesToLoad.map(async f => {
            const res = await fetch(f);
            if (!res.ok) throw new Error(`Không thể tải file: ${f}`);
            return await res.json();
        }));
        
        allQuestions = loads.flat();
        prepareQuestionsAndRender();
    } catch (err) {
        console.error("Lỗi Fetch:", err);
        quiz.innerHTML = `<p style="color:red; text-align:center;">Lỗi tải dữ liệu. Vui lòng kiểm tra file JSON.</p>`;
    }
}

/**
 * Xử lý trộn câu hỏi, trộn đáp án và chuẩn bị mảng questions
 */
function prepareQuestionsAndRender() {
    if (!allQuestions.length) return;
    
    // Reset bộ nhớ câu trả lời khi thay đổi bộ đề hoặc trộn lại
    answers = {}; 
    scoreEl.textContent = ''; 
    
    let pool = [...allQuestions];

    // 1. Xử lý Random 40 câu
    if (random40Toggle.checked) {
        pool = pool.sort(() => 0.5 - Math.random()).slice(0, 40);
    }

    // 2. Cấu trúc lại dữ liệu và trộn Options (nếu cần)
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

/**
 * Hiển thị tất cả câu hỏi ra màn hình
 */
function renderAll() {
    quiz.innerHTML = '';
    
    questions.forEach((q, idx) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.id = `q${idx}`;
        
        // Tiêu đề câu hỏi
        card.innerHTML = `<div class="q-title">${idx + 1}. ${q.question}</div>`;
        
        const optWrap = document.createElement('div');
        optWrap.className = 'options';
        
        q.displayedOptions.forEach((o, j) => {
            const opt = document.createElement('div');
            opt.className = 'option';
            
            // Nếu đã có câu trả lời (trường hợp render lại)
            if (answers[idx] === o.origKey) opt.classList.add('selected');

            opt.innerHTML = `
                <div class="label">${String.fromCharCode(65 + j)}</div>
                <div class="text">${o.text}</div>
            `;
            
            opt.onclick = () => handleSelect(q, opt, idx, o.origKey);
            optWrap.appendChild(opt);
        });
        
        card.appendChild(optWrap);
        quiz.appendChild(card);
    });
    
    updateProgress();
}

/**
 * Xử lý khi người dùng chọn đáp án
 * @param {Object} q - Đối tượng câu hỏi
 * @param {HTMLElement} optElement - Element option vừa click
 * @param {Number} idx - Số thứ tự câu hỏi trong danh sách
 * @param {String} key - Key đáp án (A, B, C, D)
 */
function handleSelect(q, optElement, idx, key) {
    // Lưu đáp án dựa trên INDEX để không bao giờ bị trùng
    answers[idx] = key;
    
    const card = document.getElementById(`q${idx}`);
    const allOpts = card.querySelectorAll('.option');
    
    // Xóa style cũ
    allOpts.forEach(o => o.classList.remove('selected', 'correct', 'wrong'));
    
    if (instantToggle.checked) {
        // Chế độ hiện đáp án ngay lập tức
        if (key === q.answer) {
            optElement.classList.add('correct');
        } else {
            optElement.classList.add('wrong');
            // Hiển thị đáp án đúng để người dùng học
            q.displayedOptions.forEach((o, i) => {
                if (o.origKey === q.answer) {
                    allOpts[i].classList.add('correct');
                }
            });
        }
    } else {
        // Chế độ thi bình thường
        optElement.classList.add('selected');
    }
    
    updateProgress();
}

/**
 * Cập nhật thanh tiến trình và số câu đã làm
 */
function updateProgress() {
    const answeredCount = Object.keys(answers).length;
    const totalCount = questions.length;
    
    const percent = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;
    progressFill.style.width = percent + '%';
    summary.textContent = `${answeredCount} / ${totalCount} câu đã hoàn thành`;
}

/**
 * Tính điểm và hiển thị thông báo
 */
function submitQuiz() {
    if (questions.length === 0) return;

    let correctCount = 0;
    const totalCount = questions.length;

    // So sánh câu trả lời dựa trên Index
    questions.forEach((q, idx) => {
        if (answers[idx] === q.answer) {
            correctCount++;
        }
    });
    
    // Hiển thị điểm lên Header
    scoreEl.textContent = `Score: ${correctCount} / ${totalCount}`;
    
    // Thông báo Pop-up
    alert(`🎉 Chúc mừng bạn đã hoàn thành bài test!\n\n` +
          `✅ Số câu đúng: ${correctCount}\n` +
          `❌ Số câu sai/bỏ trống: ${totalCount - correctCount}\n` +
          `🎯 Tỷ lệ chính xác: ${((correctCount / totalCount) * 100).toFixed(1)}%`);
    
    // Cuộn lên đầu trang
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Khởi tạo ứng dụng
init();