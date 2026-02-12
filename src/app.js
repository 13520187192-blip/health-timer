// ==================== 版本和更新系统 ====================
const CURRENT_VERSION = '1.0.1';
let latestVersion = '1.0.1';
let updateUrl = '';

// 检查更新（模拟，实际会从服务器获取）
async function checkUpdate() {
    latestVersion = '1.1.0';
    updateUrl = 'https://example.com/download/v1.1.0';

    if (compareVersion(latestVersion, CURRENT_VERSION) > 0) {
        document.getElementById('updateInfo').textContent =
            `检测到新版本 v${latestVersion}，当前版本 v${CURRENT_VERSION}`;
        document.getElementById('updateModal').classList.add('show');
    } else {
        showNotification('已是最新版本', '当前使用的是最新版本 v' + CURRENT_VERSION);
    }
}

// 版本号比较
function compareVersion(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const a = parts1[i] || 0;
        const b = parts2[i] || 0;
        if (a > b) return 1;
        if (a < b) return -1;
    }
    return 0;
}

// 执行更新
async function doUpdate() {
    const progressDiv = document.getElementById('updateProgress');
    const progressBar = document.getElementById('progressBar');
    progressDiv.classList.add('show');

    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        progressBar.style.width = progress + '%';

        if (progress >= 100) {
            clearInterval(interval);
            showNotification('更新完成', '请重启应用以使用新版本');
            closeUpdate();
        }
    }, 200);
}

function closeUpdate() {
    document.getElementById('updateModal').classList.remove('show');
}

// 显示通知
function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
    } else {
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #333; color: white; padding: 12px 24px;
            border-radius: 8px; z-index: 9999; font-size: 13px;
        `;
        div.textContent = title + ': ' + body;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }
}

// 启动时自动检查更新（每天一次）
function autoCheckUpdate() {
    const lastCheck = localStorage.getItem('lastUpdateCheck');
    const today = new Date().toDateString();

    if (lastCheck !== today) {
        localStorage.setItem('lastUpdateCheck', today);
        setTimeout(checkUpdate, 5000);
    }
}

// ==================== 计时器系统 ====================
let workMinutes = 30, restMinutes = 15;
let soundEnabled = true, volume = 0.7;
let isRunning = false, isWorkPhase = true;
let timeLeft = 30 * 60, cycleCount = 1;
let timerInterval = null;
let stats = { workCycles: 0, restCycles: 0, totalMinutes: 0 };

const els = {
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    progressRing: document.getElementById('progressRing'),
    modeText: document.getElementById('modeText'),
    timerDisplay: document.getElementById('timerDisplay'),
    cycleCount: document.getElementById('cycleCount'),
    mainBtn: document.getElementById('mainBtn'),
    workCount: document.getElementById('workCount'),
    totalTime: document.getElementById('totalTime'),
    currentStreak: document.getElementById('currentStreak'),
    workOverlay: document.getElementById('workOverlay'),
    restOverlay: document.getElementById('restOverlay')
};

function init() {
    loadSettings();
    updateDisplay();
    autoCheckUpdate();

    if (window.__TAURI__) {
        document.getElementById('checkUpdateBtn').style.display = 'inline-block';
    }

    document.getElementById('volumeSlider').addEventListener('input', function() {
        volume = this.value / 100;
        saveSettings();
    });
}

function playSound(type) {
    if (!soundEnabled) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.value = volume;

    function playTone(freq, startTime, duration) {
        const partials = [
            { ratio: 1, amp: 0.35 },
            { ratio: 2, amp: 0.15 },
            { ratio: 3, amp: 0.05 },
        ];
        partials.forEach(p => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq * p.ratio;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(p.amp, startTime + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(startTime);
            osc.stop(startTime + duration);
        });
    }

    if (type === 'work') {
        playTone(1318.51, t,        0.35);
        playTone(1108.73, t + 0.18, 0.35);
        playTone(880.00,  t + 0.36, 0.50);
    } else {
        playTone(880.00,  t,        0.35);
        playTone(1108.73, t + 0.18, 0.35);
        playTone(1318.51, t + 0.36, 0.50);
    }
}

function updateDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    els.timerDisplay.textContent =
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    els.cycleCount.textContent = cycleCount;

    const total = (isWorkPhase ? workMinutes : restMinutes) * 60;
    const progress = Math.min(1, (total - timeLeft) / total);
    const circumference = 2 * Math.PI * 100;
    els.progressRing.style.strokeDashoffset = circumference - (progress * circumference);

    els.modeText.textContent = isWorkPhase ? '工作' : '休息';
    els.modeText.classList.toggle('resting', !isWorkPhase);
    els.progressRing.classList.toggle('resting', !isWorkPhase);
    els.mainBtn.classList.toggle('resting', !isWorkPhase);
    els.statusDot.classList.toggle('resting', !isWorkPhase);
    els.statusText.textContent = isRunning ? (isWorkPhase ? '工作中...' : '休息中...') : '已暂停';
}

function toggleTimer() {
    if (isRunning) pauseTimer();
    else startTimer();
}

function startTimer() {
    isRunning = true;
    els.mainBtn.innerHTML = '⏸ 暂停';
    workMinutes = parseInt(document.getElementById('workInput').value) || 30;
    restMinutes = parseInt(document.getElementById('restInput').value) || 15;
    saveSettings();

    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateDisplay();
        } else {
            phaseComplete();
        }
    }, 1000);
}

function pauseTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    els.mainBtn.innerHTML = '▶ 继续';
    els.statusText.textContent = '已暂停';
}

function phaseComplete() {
    pauseTimer();

    if (window.__TAURI__) {
        window.__TAURI__.invoke('force_show_window');
    }

    if (isWorkPhase) {
        stats.workCycles++;
        stats.totalMinutes += workMinutes;
        updateStats();
        document.getElementById('overlayCycle').textContent = cycleCount;
        document.getElementById('overlayRestTime').textContent = restMinutes;
        els.workOverlay.classList.add('show');
        playSound('work');
        sendNotification('健康提醒', `第 ${cycleCount} 轮工作完成，休息 ${restMinutes} 分钟`);
    } else {
        stats.restCycles++;
        stats.totalMinutes += restMinutes;
        cycleCount++;
        updateStats();
        document.getElementById('overlayNextCycle').textContent = cycleCount;
        els.restOverlay.classList.add('show');
        playSound('rest');
        sendNotification('健康提醒', `休息结束，开始第 ${cycleCount} 轮工作`);
    }
}

async function sendNotification(title, body) {
    if (window.__TAURI__) {
        const { notify } = window.__TAURI__;
        await notify.sendNotification({ title, body });
    } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
    }
}

function dismissOverlay(type) {
    if (type === 'work') els.workOverlay.classList.remove('show');
    else els.restOverlay.classList.remove('show');

    if (window.__TAURI__) {
        window.__TAURI__.invoke('dismiss_alert');
    }

    isWorkPhase = !isWorkPhase;
    timeLeft = (isWorkPhase ? workMinutes : restMinutes) * 60;
    updateDisplay();
    startTimer();
}

function resetTimer() {
    pauseTimer();
    isWorkPhase = true;
    cycleCount = 1;
    timeLeft = workMinutes * 60;
    stats = { workCycles: 0, restCycles: 0, totalMinutes: 0 };
    els.mainBtn.innerHTML = '▶ 开始';
    updateDisplay();
    updateStats();
}

function updateStats() {
    els.workCount.textContent = stats.workCycles;
    els.totalTime.textContent = stats.totalMinutes;
    els.currentStreak.textContent = cycleCount;
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    document.getElementById('soundToggle').classList.toggle('active', soundEnabled);
    saveSettings();
}

function saveSettings() {
    const s = { workMinutes, restMinutes, soundEnabled, volume };
    localStorage.setItem('healthTimerSettings', JSON.stringify(s));
}

function loadSettings() {
    const saved = localStorage.getItem('healthTimerSettings');
    if (saved) {
        const s = JSON.parse(saved);
        workMinutes = s.workMinutes || 30;
        restMinutes = s.restMinutes || 15;
        soundEnabled = s.soundEnabled !== false;
        volume = s.volume !== undefined ? s.volume : 0.7;

        document.getElementById('workInput').value = workMinutes;
        document.getElementById('restInput').value = restMinutes;
        document.getElementById('soundToggle').classList.toggle('active', soundEnabled);
        document.getElementById('volumeSlider').value = volume * 100;
        timeLeft = workMinutes * 60;
    }
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

init();
