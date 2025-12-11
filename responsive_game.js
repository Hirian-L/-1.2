// Web 版 天策抓取小游戏（响应式版）
// 行为与桌面版等价：1.0s 翻滚（360°），0.2s 停顿窗口；50% 概率 1.2s 大旋转（720°），6s 冷却

// 响应式画布设置
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let CANVAS_WIDTH = 640;
let CANVAS_HEIGHT = 480;

// 参数（秒）
const ROLL_DURATION = 1.0;
const PAUSE_DURATION = 0.2;
const BIG_ROT_DURATION = 1.2;
const BIG_ROT_COOLDOWN = 6.0;
const ROLL_ANGLE = 360;
const BIG_ROT_ANGLE = 720;

// 游戏状态
let state = 'rolling';
let stateStart = performance.now();
let baseAngle = 0;
let angle = 0;
let lastBigTime = -BIG_ROT_COOLDOWN * 1000;
let caught = false;

// 玩家抓取相关
const CAPTURE_COOLDOWN = 1500;
let lastCaptureAttemptTime = -Infinity;
let failureCount = 0;
let failureMessage = '';
let failureMessageTime = -Infinity;
const FAILURE_MESSAGE_DURATION = 2000;

// 回合开始时间
let roundStartTime = performance.now();

// 矩形大小（根据画布大小调整）
let rectW = 200;
let rectH = 120;

// 图片加载
const centerImg = new Image();
centerImg.src = 'center.png';

// UI 元素
const stateText = document.getElementById('stateText');
const hint = document.getElementById('hint');
const cooldownEl = document.getElementById('cooldown');
const captureBtn = document.getElementById('captureBtn');

// 工具函数
function nowMs() { return performance.now(); }
function timeInStateMs() { return nowMs() - stateStart; }
function startState(s) { state = s; stateStart = nowMs(); }

// 调整画布大小
function resizeCanvas() {
  const container = canvas.parentElement;
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  
  // 保持 4:3 比例
  const targetWidth = Math.min(containerWidth, containerHeight * 4/3);
  const targetHeight = targetWidth * 3/4;
  
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  
  // 设置CSS尺寸以缩放画布
  canvas.style.width = targetWidth + 'px';
  canvas.style.height = targetHeight + 'px';
  
  // 调整矩形大小（根据画布逻辑大小）
  rectW = CANVAS_WIDTH * 0.3125; // 200/640
  rectH = CANVAS_HEIGHT * 0.25;  // 120/480
}

// 决定是否进行大旋转
function decideBigRotation(now) {
  if ((now - lastBigTime) >= BIG_ROT_COOLDOWN * 1000 && Math.random() < 0.5) return true;
  return false;
}

// 处理抓取尝试
function attemptCapture() {
  // 如果当前处于成功暂停，按空格为继续（非抓取尝试）
  if (state === 'caught_pause') {
    continueGame();
    return;
  }

  const now = nowMs();
  // 冷却检查
  if (now - lastCaptureAttemptTime < CAPTURE_COOLDOWN) {
    return;
  }
  lastCaptureAttemptTime = now;

  if (state === 'pause' && timeInStateMs() <= PAUSE_DURATION * 1000) {
    // 成功抓取
    caught = true;
    startState('caught_pause');
    // 更新左侧统计
    const elapsed = (now - roundStartTime) / 1000;
    const elapsedEl = document.getElementById('elapsed');
    const failuresEl = document.getElementById('failures');
    if (elapsedEl) elapsedEl.textContent = `耗时：${elapsed.toFixed(2)}s`;
    if (failuresEl) failuresEl.textContent = `失败次数：${failureCount}`;
  } else {
    // 抓取失败（在非停顿窗口按下）
    failureCount++;
    if (!failureMessage) {
      failureMessage = '后跳都抓不到？杂鱼';
    } else {
      failureMessage += '杂鱼';
    }
    failureMessageTime = now;
  }
}

// 继续游戏
function continueGame() {
  caught = false;
  baseAngle = angle % 360;
  // 重新开始一轮，重置统计
  roundStartTime = nowMs();
  failureCount = 0;
  const elapsedEl = document.getElementById('elapsed');
  const failuresEl = document.getElementById('failures');
  if (elapsedEl) elapsedEl.textContent = '';
  if (failuresEl) failuresEl.textContent = '';
  startState('rolling');
}

// 键盘事件
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault(); // 防止空格键滚动页面
    attemptCapture();
  }
});

// 鼠标点击事件
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  attemptCapture();
});

// 移动端按钮点击事件
if (captureBtn) {
  captureBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    attemptCapture();
  });
}

// 触摸事件处理（防止页面滚动）
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
}, { passive: false });

// 更新游戏状态
function update(ms) {
  const now = nowMs();
  if (state === 'rolling') {
    const t = Math.min(1, timeInStateMs() / (ROLL_DURATION * 1000));
    angle = baseAngle + t * ROLL_ANGLE;
    if (t >= 1.0) {
      if (decideBigRotation(now)) {
        lastBigTime = now;
        baseAngle = angle % 360;
        startState('big_rot');
      } else {
        baseAngle = angle % 360;
        startState('pause');
      }
    }
  } else if (state === 'pause') {
    angle = baseAngle;
    if (timeInStateMs() >= PAUSE_DURATION * 1000) {
      if (!caught) {
        baseAngle = angle % 360;
        startState('rolling');
      }
    }
  } else if (state === 'big_rot') {
    const t = Math.min(1, timeInStateMs() / (BIG_ROT_DURATION * 1000));
    angle = baseAngle + t * BIG_ROT_ANGLE;
    if (t >= 1.0) {
      baseAngle = angle % 360;
      startState('rolling');
    }
  } else if (state === 'caught_pause') {
    angle = baseAngle % 360;
  }
}

// 绘制游戏
function draw() {
  // 清空画布
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // 绘制矩形中心旋转
  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  ctx.rotate(-angle * Math.PI / 180);
  
  if (centerImg && centerImg.complete && centerImg.naturalWidth) {
    // 绘制图片
    const iw = centerImg.naturalWidth, ih = centerImg.naturalHeight;
    const scale = Math.min(rectW / iw, rectH / ih);
    const drawW = iw * scale, drawH = ih * scale;
    ctx.drawImage(centerImg, -drawW / 2, -drawH / 2, drawW, drawH);
  } else {
    // 回退到方块显示
    ctx.fillStyle = '#c8643c';
    ctx.fillRect(-rectW / 2, -rectH / 2, rectW, rectH);
  }
  ctx.restore();

  // 更新UI文本
  stateText.textContent = `状态：${state === 'rolling' ? '翻滚中' : state === 'pause' ? '停顿窗口' : state === 'big_rot' ? '大旋转' : '抓取成功'}`;
  
  if (state === 'pause') {
    const remaining = Math.max(0, PAUSE_DURATION - timeInStateMs() / 1000);
    if (window.innerWidth > 768) {
      hint.textContent = `停顿窗口：${remaining.toFixed(2)}s — 在此按 空格 抓取`;
    } else {
      hint.textContent = `停顿窗口：${remaining.toFixed(2)}s — 点击按钮抓取`;
    }
  } else if (state === 'caught_pause') {
    hint.textContent = '抓取成功！点击继续';
    if (captureBtn) captureBtn.textContent = '继续游戏';
  } else if (state === 'big_rot') {
    const remaining = Math.max(0, BIG_ROT_DURATION - timeInStateMs() / 1000);
    hint.textContent = `大旋转中：${remaining.toFixed(2)}s`;
    if (captureBtn) captureBtn.textContent = '抓取';
  } else {
    if (window.innerWidth > 768) {
      hint.textContent = '按空格在停顿窗口内抓取';
    } else {
      hint.textContent = '点击按钮在停顿窗口内抓取';
    }
    if (captureBtn) captureBtn.textContent = '抓取';
  }

  // 更新冷却时间
  const sinceBig = (nowMs() - lastBigTime) / 1000;
  const cd = Math.max(0, BIG_ROT_COOLDOWN - sinceBig);
  cooldownEl.textContent = `大旋转冷却：${cd.toFixed(1)}s`;

  // 在画布上绘制角度信息
  ctx.fillStyle = '#ddd';
  ctx.font = '16px Arial';
  ctx.fillText(`角度: ${(angle % 360).toFixed(1)}°`, 10, 20);

  // 显示失败提示（若有）
  const now = nowMs();
  if (now - failureMessageTime <= FAILURE_MESSAGE_DURATION) {
    ctx.fillStyle = '#ffd080';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(failureMessage, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - rectH / 2 - 20);
  }
}

// 游戏循环
function loop(ms) {
  update(ms);
  draw();
  requestAnimationFrame(loop);
}

// 初始化
function init() {
  // 添加禁止选中类
  document.body.classList.add('noselect');
  
  // 初始调整画布大小
  resizeCanvas();
  
  // 监听窗口大小变化
  window.addEventListener('resize', resizeCanvas);
  
  // 开始游戏
  startState('rolling');
  requestAnimationFrame(loop);
}

// 页面加载完成后初始化
window.addEventListener('load', init);
