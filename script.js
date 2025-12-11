// Web 版 天策抓取小游戏（Canvas）
// 行为与桌面版等价：0.9s 翻滚（180°），0.2s 停顿窗口；50% 概率 1.2s 大旋转（360°），6s 冷却；停顿内按空格成功抓取并暂停，按空格继续。

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// 参数（秒）
// 正常翻滚时间提高到 1.0s，正常翻滚角度改为 360°，大旋转角度改为 720°（持续时间保持 1.2s）
const ROLL_DURATION = 1.0;
const PAUSE_DURATION = 0.2;
const BIG_ROT_DURATION = 1.2;
const BIG_ROT_COOLDOWN = 6.0;

const ROLL_ANGLE = 360; // deg per roll (was 180)
const BIG_ROT_ANGLE = 720; // deg (was 360)

let state = 'rolling'; // 'rolling','pause','big_rot','caught_pause'
let stateStart = performance.now();
let baseAngle = 0; // deg
let angle = 0; // deg
let lastBigTime = -BIG_ROT_COOLDOWN * 1000;
let caught = false;
// 玩家抓取相关
const CAPTURE_COOLDOWN = 1500; // ms
let lastCaptureAttemptTime = -Infinity;
let failureCount = 0;
let failureMessage = '';
let failureMessageTime = -Infinity;
const FAILURE_MESSAGE_DURATION = 2000;
// 回合开始时间（用于统计耗时）
let roundStartTime = performance.now();

const rectW = 200, rectH = 120;
// 中间替换图片（请将附件图片保存为同目录下的 `center.png`）
const centerImg = new Image();
centerImg.src = 'center.png';

const stateText = document.getElementById('stateText');
const hint = document.getElementById('hint');
const cooldownEl = document.getElementById('cooldown');

function nowMs() { return performance.now(); }
function timeInStateMs(){ return nowMs() - stateStart; }
function startState(s){ state = s; stateStart = nowMs(); }

function decideBigRotation(now){
  if ((now - lastBigTime) >= BIG_ROT_COOLDOWN * 1000 && Math.random() < 0.5) return true;
  return false;
}

// 键盘事件
window.addEventListener('keydown', (e)=>{
  if (e.code === 'Space'){
    // 如果当前处于成功暂停，按空格为继续（非抓取尝试）
    if (state === 'caught_pause'){
      caught = false;
      baseAngle = angle % 360;
      // 重新开始一轮，重置统计
      roundStartTime = nowMs();
      failureCount = 0;
      document.getElementById('elapsed').textContent = '';
      document.getElementById('failures').textContent = '';
      startState('rolling');
      return;
    }

    const now = nowMs();
    // 冷却检查
    if (now - lastCaptureAttemptTime < CAPTURE_COOLDOWN) {
      // 在冷却期间忽略
      return;
    }
    lastCaptureAttemptTime = now;

    if (state === 'pause' && timeInStateMs() <= PAUSE_DURATION*1000){
      // 成功抓取
      caught = true;
      startState('caught_pause');
      // 更新左侧统计（从本轮开始到现在的耗时与失败次数）
      const elapsed = (now - roundStartTime)/1000;
      document.getElementById('elapsed').textContent = `耗时：${elapsed.toFixed(2)}s`;
      document.getElementById('failures').textContent = `失败次数：${failureCount}`;
    } else {
      // 抓取失败（在非停顿窗口按下）
      failureCount++;
      // 每次失败在“杂鱼”后追加一个“杂鱼”，不设上限
      if (!failureMessage) {
        failureMessage = '后跳都抓不到？杂鱼';
      } else {
        failureMessage += '杂鱼';
      }
      failureMessageTime = now;
    }
  }
});

// 鼠标点击也可以作为触发（方便触摸与测试）
canvas.addEventListener('pointerdown', ()=>{
  // 支持触摸/点击：行为与空格相同
  if (state === 'caught_pause'){
    caught = false;
    baseAngle = angle % 360;
    roundStartTime = nowMs();
    failureCount = 0;
    document.getElementById('elapsed').textContent = '';
    document.getElementById('failures').textContent = '';
    startState('rolling');
    return;
  }
  const now = nowMs();
  if (now - lastCaptureAttemptTime < CAPTURE_COOLDOWN) return;
  lastCaptureAttemptTime = now;
  if (state === 'pause' && timeInStateMs() <= PAUSE_DURATION*1000){
    caught = true;
    startState('caught_pause');
    const elapsed = (now - roundStartTime)/1000;
    document.getElementById('elapsed').textContent = `耗时：${elapsed.toFixed(2)}s`;
    document.getElementById('failures').textContent = `失败次数：${failureCount}`;
  } else {
    failureCount++;
    if (!failureMessage) {
      failureMessage = '后跳都抓不到？杂鱼';
    } else {
      failureMessage += '杂鱼';
    }
    failureMessageTime = now;
  }
});

function update(ms){
  const now = nowMs();
  if (state === 'rolling'){
    const t = Math.min(1, timeInStateMs() / (ROLL_DURATION*1000));
    angle = baseAngle + t * ROLL_ANGLE;
    if (t >= 1.0){
      if (decideBigRotation(now)){
        lastBigTime = now;
        baseAngle = angle % 360;
        startState('big_rot');
      } else {
        baseAngle = angle % 360;
        startState('pause');
      }
    }
  } else if (state === 'pause'){
    angle = baseAngle;
    if (timeInStateMs() >= PAUSE_DURATION*1000){
      if (!caught){
        baseAngle = angle % 360;
        startState('rolling');
      }
    }
  } else if (state === 'big_rot'){
    const t = Math.min(1, timeInStateMs() / (BIG_ROT_DURATION*1000));
    angle = baseAngle + t * BIG_ROT_ANGLE;
    if (t >= 1.0){
      baseAngle = angle % 360;
      startState('rolling');
    }
  } else if (state === 'caught_pause'){
    angle = baseAngle % 360;
  }
}

function draw(){
  ctx.clearRect(0,0,W,H);
  // 绘制矩形中心旋转
  ctx.save();
  ctx.translate(W/2, H/2);
  ctx.rotate(-angle * Math.PI/180); // 负号视觉更像桌面版
  if (centerImg && centerImg.complete && centerImg.naturalWidth) {
    // 绘制图片，保持矩形大小为参考，图片按比例缩放以填充 rectW x rectH
    const iw = centerImg.naturalWidth, ih = centerImg.naturalHeight;
    const scale = Math.min(rectW / iw, rectH / ih);
    const drawW = iw * scale, drawH = ih * scale;
    ctx.drawImage(centerImg, -drawW/2, -drawH/2, drawW, drawH);
  } else {
    // 回退到方块显示
    ctx.fillStyle = '#c8643c';
    ctx.fillRect(-rectW/2, -rectH/2, rectW, rectH);
  }
  ctx.restore();

  // UI 文本
  stateText.textContent = `状态：${state}`;
  if (state === 'pause'){
    const remaining = Math.max(0, PAUSE_DURATION - timeInStateMs()/1000);
    hint.textContent = `停顿窗口：${remaining.toFixed(2)}s — 在此按 空格 抓取`;
  } else if (state === 'caught_pause'){
    hint.textContent = '抓取成功！按 空格 或 点击 继续';
  } else if (state === 'big_rot'){
    const remaining = Math.max(0, BIG_ROT_DURATION - timeInStateMs()/1000);
    hint.textContent = `大旋转中：${remaining.toFixed(2)}s`;
  } else {
    hint.textContent = '按 空格 在停顿窗口内抓取';
  }

  const sinceBig = (nowMs() - lastBigTime)/1000;
  const cd = Math.max(0, BIG_ROT_COOLDOWN - sinceBig);
  cooldownEl.textContent = `大旋转冷却：${cd.toFixed(1)}s`;

  // 在画布上绘制角度信息
  ctx.fillStyle = '#ddd';
  ctx.font = '16px Arial';
  ctx.fillText(`角度: ${(angle%360).toFixed(1)}°`, 10, 20);

  // 显示失败提示（若有）
  const now = nowMs();
  if (now - failureMessageTime <= FAILURE_MESSAGE_DURATION){
    ctx.fillStyle = '#ffd080';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(failureMessage, W/2, H/2 - rectH/2 - 20);
  }
}

function loop(ms){
  update(ms);
  draw();
  requestAnimationFrame(loop);
}

// 启动
startState('rolling');
requestAnimationFrame(loop);
