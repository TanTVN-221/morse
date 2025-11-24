/* --- DỮ LIỆU CƠ BẢN --- */
const morseDb = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', 'CH': '----',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', 
    '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    ' ': ' ' 
};

/* --- TÌM VÀ THAY THẾ BIẾN tablesConfig --- */

const tablesConfig = {
    // Bảng 1: Sắp xếp đối xứng E-T, I-M, S-O...
    1: ['E', 'T', 'I', 'M', 'S', 'O', 'H', 'CH'],

    // Bảng 2: A-N, U-D...
    2: ['A', 'N', 'U', 'D', 'V', 'B'],

    // Bảng 3: R-K, L-Y...
    3: ['R', 'K', 'L', 'Y', 'F', 'Q'],

    // Bảng 4: W-G, P-X
    4: ['W', 'G', 'P', 'X'],

    // Bảng 5: Bất quy tắc
    5: ['C', 'J', 'Z']
};

/* --- BẢNG MÃ HÓA TIẾNG VIỆT SANG TELEX --- */
const vietToTelex = {
    'Á': 'AS', 'À': 'AF', 'Ả': 'AR', 'Ã': 'AX', 'Ạ': 'AJ',
    'Ă': 'AW', 'Ắ': 'AWS', 'Ằ': 'AWF', 'Ẳ': 'AWR', 'Ẵ': 'AWX', 'Ặ': 'AWJ',
    'Â': 'AA', 'Ấ': 'AAS', 'Ầ': 'AAF', 'Ẩ': 'AAR', 'Ẫ': 'AAX', 'Ậ': 'AAJ',
    'Đ': 'DD',
    'É': 'ES', 'È': 'EF', 'Ẻ': 'ER', 'Ẽ': 'EX', 'Ẹ': 'EJ',
    'Ê': 'EE', 'Ế': 'EES', 'Ề': 'EEF', 'Ể': 'EER', 'Ễ': 'EEX', 'Ệ': 'EEJ',
    'Í': 'IS', 'Ì': 'IF', 'Ỉ': 'IR', 'Ĩ': 'IX', 'Ị': 'IJ',
    'Ó': 'OS', 'Ò': 'OF', 'Ỏ': 'OR', 'Õ': 'OX', 'Ọ': 'OJ',
    'Ô': 'OO', 'Ố': 'OOS', 'Ồ': 'OOF', 'Ổ': 'OOR', 'Ỗ': 'OOX', 'Ộ': 'OOJ',
    'Ơ': 'OW', 'Ớ': 'OWS', 'Ờ': 'OWF', 'Ở': 'OWR', 'Ỡ': 'OWX', 'Ợ': 'OWJ',
    'Ú': 'US', 'Ù': 'UF', 'Ủ': 'UR', 'Ũ': 'UX', 'Ụ': 'UJ',
    'Ư': 'UW', 'Ứ': 'UWS', 'Ừ': 'UWF', 'Ử': 'UWR', 'Ữ': 'UWX', 'Ự': 'UWJ',
    'Ý': 'YS', 'Ỳ': 'YF', 'Ỷ': 'YR', 'Ỹ': 'YX', 'Ỵ': 'YJ'
};

function convertVietnameseToMorse(text) {
    const upperText = text.toUpperCase();
    let telexString = "";
    for (let i = 0; i < upperText.length; i++) {
        const char = upperText[i];
        if (vietToTelex[char]) {
            telexString += vietToTelex[char] + " "; 
        } else {
            telexString += char + " "; 
        }
    }
    return telexString.trim();
}

/* --- AUDIO ENGINE --- */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let titBuffer = null, teBuffer = null;

// [SỬA] Thêm biến startTimer vào đây
let activeSources = [];   
let stopTimer = null;     
let audioStartTimer = null;  // <--- Biến mới để quản lý độ trễ 1s

function stopAllSounds() {
    // 1. Dừng nguồn âm đang chạy
    activeSources.forEach(source => { try { source.stop(); } catch(e) {} });
    activeSources = [];

    // 2. Hủy bộ đếm tắt loa (nếu có)
    if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }

    // 3. [SỬA TẠI ĐÂY] Hủy bộ đếm chờ phát
    if (audioStartTimer) { clearTimeout(audioStartTimer); audioStartTimer = null; } 

    // 4. Tắt hiệu ứng rung
    document.querySelectorAll('.playing').forEach(el => el.classList.remove('playing'));
}

async function loadSoundFile(url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) { console.error(e); return null; }
}

(async function initAudio() {
    titBuffer = await loadSoundFile('tit.mp3');
    teBuffer = await loadSoundFile('te.mp3');
    if(titBuffer && teBuffer) {
        const btn = document.getElementById('btn-start');
        if(btn) btn.innerText = "Bắt Đầu (10 Vòng)";
    }
})();

function playMorseString(text, speedPercent, iconId) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (!titBuffer || !teBuffer) return 0;

    // Ngắt âm thanh cũ ngay lập tức
    stopAllSounds();

    const telexText = convertVietnameseToMorse(text);
    const codeSequence = telexText.split(/\s+/).map(char => {
        return char.split('').map(c => morseDb[c] || '').join(' ');
    }).join('   '); 

    const flatCode = codeSequence.replace(/\s+/g, ' '); 
    const speedFactor = parseInt(speedPercent) / 100; 
    const baseGap = 0.25 - (speedFactor * 0.2); 
    const playbackRate = 0.8 + (speedFactor * 0.4); 

    // [QUAN TRỌNG] Đặt thời gian bắt đầu là Tương lai (Sau 1 giây)
    let startTime = audioCtx.currentTime + 0.5; 

    const icon = document.getElementById(iconId);

    // Lên lịch phát âm thanh
    for (let symbol of flatCode) {
        let buffer = (symbol === '.') ? titBuffer : (symbol === '-' ? teBuffer : null);
        if (buffer) {
            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = playbackRate;
            source.connect(audioCtx.destination);
            
            // source.start nhận tham số là thời gian tuyệt đối
            source.start(startTime);
            activeSources.push(source);

            startTime += (buffer.duration / playbackRate) + baseGap;
        } else if (symbol === ' ') {
            startTime += baseGap * 7;
        }
    }

    // Tính tổng thời gian (bao gồm cả 1s delay)
    const totalDuration = (startTime - audioCtx.currentTime) * 200;

    // [XỬ LÝ HIỆU ỨNG LOA]
    if(icon) {
        // [SỬA TẠI ĐÂY] Đổi startTimer thành audioStartTimer
        audioStartTimer = setTimeout(() => {
            icon.classList.add('playing');
        }, 1000);

        // Hẹn giờ tắt Rung khi phát xong
        stopTimer = setTimeout(() => { 
            icon.classList.remove('playing'); 
        }, totalDuration);
    }

    return totalDuration;
}

function playSoundSimple(code) {
     if (!titBuffer || !teBuffer) return;

     // Ngắt âm thanh cũ
     stopAllSounds();

     // [MỚI] Bắt đầu sau 1 giây
     let start = audioCtx.currentTime + 1.0;

     for(let c of code) {
         let buf = c==='.'?titBuffer:teBuffer;
         let src = audioCtx.createBufferSource();
         src.buffer = buf; 
         src.connect(audioCtx.destination);
         
         src.start(start); 
         activeSources.push(src);

         start += buf.duration + 0.15;
     }
}

/* --- RENDER BẢNG HỌC --- */
const studyContent = document.getElementById('study-content');
for (let i = 1; i <= 5; i++) {
    const chars = tablesConfig[i];
    let html = `<div class="group-header">Bảng ${i}</div><div class="morse-grid">`;
    chars.forEach(char => {
        html += `<div class="morse-card" onclick="playSoundSimple('${morseDb[char]}')">
            <span class="char-large">${char}</span><span class="morse-code">${morseDb[char]}</span>
        </div>`;
    });
    studyContent.innerHTML += html + `</div>`;
}

/* --- LUYỆN TẬP --- */
let practiceSettings = { table: 1, speed: 5000 };
let quizState = { score: 0, round: 0, target: '', timerId: null, isPlaying: false };

function selectFilter(type, val, el) {
    practiceSettings[type] = val;
    el.parentNode.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
}

function initAndStart() {
    if(!titBuffer || !teBuffer) { alert("Thiếu file mp3!"); return; }
    document.getElementById('practice-menu').style.display = 'none';
    document.getElementById('practice-game').style.display = 'block';
    quizState.score = 0; quizState.round = 0; quizState.isPlaying = true;
    document.getElementById('current-score').innerText = '0';
    nextQuiz();
}

function nextQuiz() {
    if (quizState.round >= 10) { showGameOver(true); return; }
    quizState.round++;
    document.getElementById('current-round').innerText = quizState.round;
    document.getElementById('timer-bar').style.width = '100%';
    document.getElementById('timer-bar').style.transition = 'none';

    const pool = tablesConfig[practiceSettings.table];
    quizState.target = pool[Math.floor(Math.random() * pool.length)];

    let options = [quizState.target];
    let distractors = pool.filter(c => c !== quizState.target).sort(()=>0.5-Math.random()).slice(0,3);
    options = options.concat(distractors).sort(()=>0.5-Math.random());

    const area = document.getElementById('answers-area');
    area.innerHTML = '';
    options.forEach(char => {
        const btn = document.createElement('div');
        btn.className = 'ans-btn disabled';
        btn.innerText = char;
        btn.onclick = () => checkQuizAnswer(char, btn);
        area.appendChild(btn);
    });

    const dur = playMorseString(quizState.target, 50, 'speaker-practice');
    setTimeout(() => {
        if(!quizState.isPlaying) return;
        document.querySelectorAll('.ans-btn').forEach(b => b.classList.remove('disabled'));
        startTimer();
    }, dur);
}

function startTimer() {
    const bar = document.getElementById('timer-bar');
    void bar.offsetWidth; 
    bar.style.transition = `width ${practiceSettings.speed}ms linear`;
    bar.style.width = '0%';
    quizState.timerId = setTimeout(() => {
        if(quizState.isPlaying) showGameOver(false, `Hết giờ! Đáp án: ${quizState.target}`);
    }, practiceSettings.speed);
}

function checkQuizAnswer(char, btn) {
    if(btn.classList.contains('disabled')) return;
    clearTimeout(quizState.timerId);
    document.querySelectorAll('.ans-btn').forEach(b => b.classList.add('disabled'));
    if(char === quizState.target) {
        btn.classList.add('correct'); quizState.score += 10;
        document.getElementById('current-score').innerText = quizState.score;
        setTimeout(nextQuiz, 1000);
    } else {
        btn.classList.add('wrong');
        document.querySelectorAll('.ans-btn').forEach(b => { if(b.innerText === quizState.target) b.classList.add('correct'); });
        setTimeout(() => showGameOver(false, `Sai rồi! Đáp án: ${quizState.target}`), 1500);
    }
}
function replayAudio() { if(quizState.isPlaying) playMorseString(quizState.target, 50, 'speaker-practice'); }
function showGameOver(isWin, msg) {
    quizState.isPlaying = false; clearTimeout(quizState.timerId);
    document.getElementById('modal-title').innerText = isWin ? "Hoàn Thành!" : "Kết Thúc";
    document.getElementById('modal-title').style.color = isWin ? "#22c55e" : "#ef4444";
    document.getElementById('modal-msg').innerText = isWin ? "Làm tốt lắm!" : msg;
    document.getElementById('final-score').innerText = quizState.score;
    document.getElementById('game-over-modal').style.display = 'flex';
}
function resetToMenu() {
    document.getElementById('game-over-modal').style.display = 'none';
    document.getElementById('practice-game').style.display = 'none';
    document.getElementById('practice-menu').style.display = 'block';
}

/* --- NHẬN TIN --- */
let questionList = [];
let currentRecQuestion = { answer: "" };

(async function loadCSV() {
    try {
        const res = await fetch('data.csv');
        if(!res.ok) throw new Error();
        const text = await res.text();
        const lines = text.split('\n');
        questionList = [];
        for(let line of lines) {
            const ans = line.trim().toUpperCase();
            if(ans) questionList.push({ answer: ans });
        }
        pickRandomQuestion();
    } catch(e) {
        questionList = [{answer:'TINH TẤN'}, {answer:'BI TRÍ DŨNG'}, {answer:'SEN TRẮNG'}];
        pickRandomQuestion();
    }
})();

function pickRandomQuestion() {
    if(questionList.length === 0) return;
    const btn = document.querySelector('.btn-change-orange span');
    if(btn) { btn.style.transition='transform 0.5s'; btn.style.transform='rotate(360deg)'; setTimeout(()=>btn.style.transform='rotate(0deg)',500); }
    
    const idx = Math.floor(Math.random() * questionList.length);
    currentRecQuestion = questionList[idx];
    document.getElementById('user-input-receive').value = '';
    document.getElementById('receive-result').innerText = '';
}

function playCurrentQuestion() {
    playMorseString(currentRecQuestion.answer, document.getElementById('speed-range').value, 'speaker-receive');
}

function checkCsvAnswer() {
    const userVal = document.getElementById('user-input-receive').value.trim().toUpperCase();
    const correctVal = currentRecQuestion.answer.toUpperCase();
    const res = document.getElementById('receive-result');
    
    if(userVal === correctVal) {
        res.innerText = "CHÍNH XÁC!"; res.className = "result-text txt-correct";
    } else {
        res.innerText = "Sai rồi! Đáp án là: " + correctVal; 
        res.className = "result-text txt-wrong";
    }
}
function revealAnswer() {
    const res = document.getElementById('receive-result');
    res.innerText = "Đáp án: " + currentRecQuestion.answer;
    res.className = "result-text"; res.style.color="#64748b";
}

function switchTab(id, el) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    el.classList.add('active');
}