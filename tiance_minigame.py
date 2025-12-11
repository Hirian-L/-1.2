import pygame
import sys
import time
import random

# 配置
WIDTH, HEIGHT = 640, 480
BG_COLOR = (30, 30, 30)
RECT_COLOR = (200, 100, 60)
TEXT_COLOR = (220, 220, 220)
FPS = 60

# 时长（秒）
# 正常翻滚耗时已调整为 1.0s，停顿 0.2s，大旋转持续 1.2s
ROLL_DURATION = 1.0
PAUSE_DURATION = 0.2
BIG_ROT_DURATION = 1.2
BIG_ROT_COOLDOWN = 6.0

# 角度设置（翻滚改为 360 度 / 次，大旋转改为 720 度）
ROLL_ANGLE = 360
BIG_ROT_ANGLE = 720

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption('天策 — 抓取小游')
clock = pygame.time.Clock()
font = pygame.font.SysFont(None, 28)
large_font = pygame.font.SysFont(None, 40)

# 创建矩形 surface（以便旋转）
RECT_W, RECT_H = 200, 120
rect_surf = pygame.Surface((RECT_W, RECT_H), pygame.SRCALPHA)
rect_surf.fill(RECT_COLOR)

# 状态机
# state: 'rolling', 'pause', 'big_rot', 'caught_pause' (等待玩家按键重启)
state = 'rolling'
state_start = time.time()
angle = 0.0  # 当前角度

# 为了在旋转时连续（使角度从上次结束接着开始）保留基角
base_angle = 0.0

last_big_rot_time = -BIG_ROT_COOLDOWN
caught = False

# 帮助函数

def time_in_state():
    return time.time() - state_start


def start_state(new_state):
    global state, state_start
    state = new_state
    state_start = time.time()


def draw_text(s, pos, color=TEXT_COLOR, center=False, big=False):
    f = large_font if big else font
    surf = f.render(s, True, color)
    r = surf.get_rect()
    if center:
        r.center = pos
    else:
        r.topleft = pos
    screen.blit(surf, r)


def decide_big_rotation(now):
    if now - last_big_rot_time >= BIG_ROT_COOLDOWN and random.random() < 0.5:
        return True
    return False


# 初始开始为翻滚
start_state('rolling')
roll_progress = 0.0  # 0..1
big_rot_allowed = True

running = True
while running:
    dt = clock.tick(FPS) / 1000.0
    now = time.time()

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                running = False
            elif event.key == pygame.K_SPACE:
                # 空格键交互：在停顿窗口内按下视为抓取成功
                if state == 'pause' and time_in_state() <= PAUSE_DURATION:
                    caught = True
                    start_state('caught_pause')
                elif state == 'caught_pause':
                    # 在成功暂停中再次按空格，重新开始游戏（从新的翻滚开始）
                    caught = False
                    base_angle = angle  # 从当前角度继续
                    start_state('rolling')
                else:
                    # 如果在非目标时间按下空格，暂不做处理
                    pass

    # 状态逻辑
    if state == 'rolling':
        # 计算翻滚进度
        t = time_in_state()
        progress = min(1.0, t / ROLL_DURATION)
        angle = base_angle + progress * ROLL_ANGLE
        if progress >= 1.0:
            # 翻滚完成，决定是否触发大旋转（若冷却允许）
            # 大旋转在本次翻滚后发生则没有停顿
            if decide_big_rotation(now):
                last_big_rot_time = now
                base_angle = angle % 360
                start_state('big_rot')
            else:
                # 进入 0.2s 停顿窗口
                base_angle = angle % 360
                start_state('pause')

    elif state == 'pause':
        # 停顿期间角度固定（base_angle）
        angle = base_angle
        if time_in_state() >= PAUSE_DURATION:
            # 停顿结束，若未被抓取，继续下一次翻滚
            if not caught:
                # 准备下一次翻滚
                base_angle = angle % 360
                start_state('rolling')
            else:
                # 如果已经 caught（应已切到 caught_pause），此处一般不会执行
                pass

    elif state == 'big_rot':
        t = time_in_state()
        progress = min(1.0, t / BIG_ROT_DURATION)
        angle = base_angle + progress * BIG_ROT_ANGLE
        if progress >= 1.0:
            # 大旋转结束后直接进入下一次翻滚（无停顿）
            base_angle = angle % 360
            start_state('rolling')

    elif state == 'caught_pause':
        # 游戏暂停，等待玩家再次按空格；角度固定
        angle = base_angle % 360

    # 绘制
    screen.fill(BG_COLOR)

    # 旋转并绘制矩形
    rotated = pygame.transform.rotate(rect_surf, -angle)  # 负号使视觉方向更自然
    rect = rotated.get_rect()
    rect.center = (WIDTH // 2, HEIGHT // 2)
    screen.blit(rotated, rect)

    # 显示状态信息
    draw_text(f'State: {state}', (10, 10))
    draw_text('按 空格 进行抓取（只在停顿窗口有效）', (10, 40))
    draw_text(f'角度: {angle%360:.1f}°', (10, 70))

    if state == 'pause':
        remaining = max(0.0, PAUSE_DURATION - time_in_state())
        draw_text(f'停顿窗口：{remaining:.2f}s', (WIDTH//2, 20), center=True)
        draw_text('在此期间按空格抓取！', (WIDTH//2, 50), center=True, big=True)
    elif state == 'caught_pause':
        draw_text('抓取成功！按空格继续', (WIDTH//2, HEIGHT//2 + RECT_H//2 + 20), center=True, big=True)
    elif state == 'big_rot':
        remaining = max(0.0, BIG_ROT_DURATION - time_in_state())
        draw_text(f'大旋转中：{remaining:.2f}s', (WIDTH//2, 20), center=True)

    # 冷却提示
    since_big = now - last_big_rot_time
    cd = max(0.0, BIG_ROT_COOLDOWN - since_big)
    draw_text(f'大旋转冷却：{cd:.1f}s', (10, HEIGHT - 30))

    pygame.display.flip()

pygame.quit()
sys.exit()
