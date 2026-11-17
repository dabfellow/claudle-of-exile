
export const HEIST_SYSTEM = {
  // Field Mastery: XP Gain
  addXp: (rogue, amount) => {
    rogue.xp += amount;
    if (rogue.xp >= rogue.level * 100) {
      rogue.level += 1;
      rogue.xp = 0;
    }
  },

  // Mentor Training: 5000 Gold + 2 Heist cooldown
  trainRogue: (rogue, skill, gold) => {
    if (gold < 5000) return { success: false, msg: 'Insufficient Gold' };
    // Logic for 2-heist lock would be tracked in state
    return { success: true, skillUnlocked: skill };
  },

  // Tactical Loop Choice
  handleTalentCheck: (rogue, roomType, action) => {
    if (action === 'Bypass' && rogue.primary === roomType) {
      return { status: 'Bypassed', reward: 'Safety' };
    } else if (action === 'Bonus Loot') {
      return { status: 'Risky', reward: 'Bonus Gold', alarm: 15 };
    }
    return { status: 'Failed', alarm: 5 };
  }
};
