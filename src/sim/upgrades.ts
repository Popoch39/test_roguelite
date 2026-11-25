import { drawSequence } from "./random";
import type { Tuning } from "./tuning";
import type { Command, EffectiveStats, HeroStats, RunState, Upgrade } from "./types";

export const UPGRADES_PER_OFFER = 3;

/** Suspends the fight until one of the Upgrades drawn here is chosen. */
export function offerUpgrades(state: RunState, tuning: Tuning): void {
  state.phase = "choosing";
  state.upgradeOffer = drawSequence(state, tuning.upgrades, UPGRADES_PER_OFFER);
}

/** The base stats plus the sum of the Upgrades taken, the same one counting as often as it was taken. */
export function effectiveStats(
  baseStats: HeroStats,
  tuning: Tuning,
  upgrades: readonly Upgrade[],
): EffectiveStats {
  const stats: EffectiveStats = {
    ...baseStats,
    attackDamage: tuning.heroAttack.damage,
    attackReach: tuning.heroAttack.reach,
    dashCooldownTicks: tuning.dash.cooldownTicks,
  };
  for (const { stat, amount } of upgrades) stats[stat] += amount;
  stats.dashCooldownTicks = Math.max(stats.dashCooldownTicks, tuning.dash.cooldownFloorTicks);
  return stats;
}

/** Takes the Upgrade a command picks from the offer and resumes the fight; returns whether one did. */
export function takeChosenUpgrade(
  state: RunState,
  tuning: Tuning,
  commands: readonly Command[],
): boolean {
  const upgrade = commands
    .filter(({ heroId }) => state.heroes.some((hero) => hero.id === heroId))
    .map(({ upgradeChoice }) => state.upgradeOffer[upgradeChoice ?? -1])
    .find((picked) => picked !== undefined);
  if (!upgrade) return false;

  state.upgrades.push(upgrade);
  for (const hero of state.heroes) {
    const stats = effectiveStats(hero.baseStats, tuning, state.upgrades);
    // Without this, more maximum health would leave a wounded Hero no better off.
    hero.health += stats.maxHealth - hero.stats.maxHealth;
    hero.stats = stats;
  }
  state.upgradeOffer = [];
  state.phase = "combat";
  return true;
}
