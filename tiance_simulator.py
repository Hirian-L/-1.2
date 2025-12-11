# 天策模拟器（简版）
# 说明：一个非常小的回合制战斗模拟器，易于扩展。

import random
import argparse

class Unit:
    def __init__(self, name, hp, atk, defense, speed):
        self.name = name
        self.max_hp = hp
        self.hp = hp
        self.atk = atk
        self.defense = defense
        self.speed = speed

    def is_alive(self):
        return self.hp > 0

    def take_damage(self, dmg):
        self.hp = max(0, self.hp - dmg)

    def attack_target(self, other):
        # 简单伤害计算：伤害 = 攻击 - 防御 * 0.5 + 随机浮动
        base = max(0, self.atk - other.defense * 0.5)
        variance = random.uniform(0.85, 1.15)
        dmg = int(base * variance)
        if dmg < 1:
            dmg = 1
        other.take_damage(dmg)
        return dmg

    def __str__(self):
        return f"{self.name}: HP {self.hp}/{self.max_hp}, ATK {self.atk}, DEF {self.defense}, SPD {self.speed}"


def simulate_battle(unit_a, unit_b, max_rounds=50, verbose=True):
    # 按速度决定先手（速度相同随机）
    round_no = 0
    log = []
    while unit_a.is_alive() and unit_b.is_alive() and round_no < max_rounds:
        round_no += 1
        if verbose:
            print(f"--- 回合 {round_no} ---")
            print(unit_a)
            print(unit_b)
        # 决定出手顺序
        if unit_a.speed > unit_b.speed:
            order = [unit_a, unit_b]
        elif unit_b.speed > unit_a.speed:
            order = [unit_b, unit_a]
        else:
            order = [unit_a, unit_b] if random.random() < 0.5 else [unit_b, unit_a]

        for actor in order:
            if not unit_a.is_alive() or not unit_b.is_alive():
                break
            target = unit_b if actor is unit_a else unit_a
            dmg = actor.attack_target(target)
            entry = f"{actor.name} 攻击 {target.name}，造成 {dmg} 点伤害。"
            log.append(entry)
            if verbose:
                print(entry)
            if not target.is_alive():
                end_entry = f"{target.name} 倒下，{actor.name} 获胜。"
                log.append(end_entry)
                if verbose:
                    print(end_entry)
                break

    if unit_a.is_alive() and not unit_b.is_alive():
        winner = unit_a
    elif unit_b.is_alive() and not unit_a.is_alive():
        winner = unit_b
    elif not unit_a.is_alive() and not unit_b.is_alive():
        winner = None  # 双亡
        if verbose:
            print("双方同归于尽。")
        log.append("双方同归于尽。")
    else:
        winner = None
        if verbose:
            print("达到回合上限，平局。")
        log.append("达到回合上限，平局。")

    return {
        'winner': winner.name if winner else None,
        'rounds': round_no,
        'log': log,
        'final_a': unit_a,
        'final_b': unit_b,
    }


def example_scenario():
    # 示例：两个预设单位
    a = Unit('天策·侠客', hp=120, atk=30, defense=10, speed=20)
    b = Unit('秦军·先锋', hp=150, atk=25, defense=12, speed=15)
    return simulate_battle(a, b, verbose=True)


def cli():
    parser = argparse.ArgumentParser(description='天策模拟器（简版）')
    parser.add_argument('--demo', action='store_true', help='运行示例对战')
    parser.add_argument('--a', nargs=4, metavar=('HP','ATK','DEF','SPD'), help='单位A 参数（HP ATK DEF SPD）')
    parser.add_argument('--b', nargs=4, metavar=('HP','ATK','DEF','SPD'), help='单位B 参数（HP ATK DEF SPD）')
    parser.add_argument('--rounds', type=int, default=50, help='最大回合数')
    args = parser.parse_args()

    if args.demo:
        example_scenario()
        return

    if args.a and args.b:
        a_hp, a_atk, a_def, a_spd = map(int, args.a)
        b_hp, b_atk, b_def, b_spd = map(int, args.b)
        a = Unit('单位A', a_hp, a_atk, a_def, a_spd)
        b = Unit('单位B', b_hp, b_atk, b_def, b_spd)
        simulate_battle(a, b, max_rounds=args.rounds, verbose=True)
    else:
        print('请使用 --demo 运行示例，或用 --a 和 --b 提供两个单位的参数。')


if __name__ == '__main__':
    cli()
