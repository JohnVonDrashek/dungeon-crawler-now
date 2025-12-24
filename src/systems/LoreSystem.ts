export type LoreType = 'tablet' | 'scratch' | 'whisper';

export interface LoreEntry {
  id: string;
  type: LoreType;
  title?: string; // For tablets
  text: string;
  minFloor: number;
  maxFloor: number;
}

// All lore entries organized by type and floor range
const LORE_ENTRIES: LoreEntry[] = [
  // === TABLETS (long-form, modal display) ===

  // Floor 1-5: Welcome and introduction
  {
    id: 'tablet_welcome',
    type: 'tablet',
    title: 'Stone of Greeting',
    text: 'Welcome, weary soul. This is the threshold between worlds. You stand in Purgatory, the realm of trials. Only through suffering may you ascend. Only through perseverance may you find peace.',
    minFloor: 1,
    maxFloor: 3,
  },
  {
    id: 'tablet_rules',
    type: 'tablet',
    title: 'The Laws of This Place',
    text: 'Three truths govern this realm:\n\nFirst: What you carry weighs upon your soul.\nSecond: The guardians were once as you are now.\nThird: There is no death here, only beginning again.',
    minFloor: 1,
    maxFloor: 5,
  },
  {
    id: 'tablet_hope',
    type: 'tablet',
    title: 'Words of Solace',
    text: 'Do not despair, pilgrim. Many have walked these halls before you. Some have ascended. The path is long, but redemption awaits those who persevere. Keep faith.',
    minFloor: 2,
    maxFloor: 5,
  },

  // Floor 6-10: Warnings about sins
  {
    id: 'tablet_sins',
    type: 'tablet',
    title: 'Of the Seven',
    text: 'The seven guardians were once like you - souls who wandered these depths. But they surrendered to sin and became its vessel. Pride, Greed, Wrath, Sloth, Envy, Gluttony, Lust. Learn their names. Fear their embrace.',
    minFloor: 5,
    maxFloor: 10,
  },
  {
    id: 'tablet_greed_warning',
    type: 'tablet',
    title: 'The Clutching Ones',
    text: 'Gold means nothing here. Yet still the greedy clutch their coins, forever hungry, never satisfied. They will take from you what you value. Do not let material wealth anchor your soul.',
    minFloor: 6,
    maxFloor: 10,
  },
  {
    id: 'tablet_sloth_warning',
    type: 'tablet',
    title: 'The Endless Rest',
    text: 'Beware the gray ones who shuffle slowly. Their aura brings lethargy, their presence drains will. They sought eternal rest and found eternal imprisonment. Do not linger in their presence.',
    minFloor: 6,
    maxFloor: 10,
  },

  // Floor 11-15: Deeper truths
  {
    id: 'tablet_origin',
    type: 'tablet',
    title: 'Before the Fall',
    text: 'This place was not always so. Once, souls passed through swiftly, cleansed by gentle trials. But something changed. The guardians rose. The trials became deadly. Now we are all trapped in their game.',
    minFloor: 10,
    maxFloor: 15,
  },
  {
    id: 'tablet_wrath',
    type: 'tablet',
    title: 'The Burning Rage',
    text: 'The red ones burn with fury that never fades. Wound them and they grow stronger. Their anger feeds upon itself, an eternal flame. Face them with calm resolve, not matching rage.',
    minFloor: 11,
    maxFloor: 15,
  },
  {
    id: 'tablet_pride',
    type: 'tablet',
    title: 'The Crowned Shadow',
    text: 'Of all the sins, Pride is most dangerous. It reflects all harm back upon the attacker. It stands tall, unbroken, convinced of its own glory. Strike carefully, or be struck down by your own hand.',
    minFloor: 12,
    maxFloor: 15,
  },

  // Floor 16-20: Final revelations
  {
    id: 'tablet_truth',
    type: 'tablet',
    title: 'The Hidden Truth',
    text: 'The guardians do not block the way - they ARE the way. Each sin you overcome purifies a part of your soul. This was always the design. The cruelty is the cure.',
    minFloor: 15,
    maxFloor: 20,
  },
  {
    id: 'tablet_final',
    type: 'tablet',
    title: 'The Last Gate',
    text: 'Beyond the final guardian lies the threshold. Those who pass through are cleansed, reborn, ready to ascend. You are close now, pilgrim. Do not falter at the end.',
    minFloor: 18,
    maxFloor: 20,
  },

  // === SCRATCHES (short messages, floating text) ===

  // Early floors
  {
    id: 'scratch_counting',
    type: 'scratch',
    text: 'Day 47... still descending',
    minFloor: 1,
    maxFloor: 5,
  },
  {
    id: 'scratch_gold',
    type: 'scratch',
    text: 'Trust not the golden light',
    minFloor: 1,
    maxFloor: 8,
  },
  {
    id: 'scratch_tired',
    type: 'scratch',
    text: 'So tired... just rest a moment...',
    minFloor: 2,
    maxFloor: 6,
  },
  {
    id: 'scratch_name',
    type: 'scratch',
    text: 'M.K. was here',
    minFloor: 1,
    maxFloor: 10,
  },
  {
    id: 'scratch_stairs',
    type: 'scratch',
    text: 'The stairs only go down',
    minFloor: 1,
    maxFloor: 5,
  },

  // Middle floors
  {
    id: 'scratch_sloth',
    type: 'scratch',
    text: 'The gray one... moves so slow...',
    minFloor: 4,
    maxFloor: 10,
  },
  {
    id: 'scratch_red',
    type: 'scratch',
    text: 'Dont make the red ones angry',
    minFloor: 6,
    maxFloor: 12,
  },
  {
    id: 'scratch_coins',
    type: 'scratch',
    text: 'It took everything I had',
    minFloor: 5,
    maxFloor: 12,
  },
  {
    id: 'scratch_mirror',
    type: 'scratch',
    text: 'I saw myself in the green one',
    minFloor: 6,
    maxFloor: 14,
  },
  {
    id: 'scratch_pull',
    type: 'scratch',
    text: 'She calls to me... so beautiful...',
    minFloor: 8,
    maxFloor: 15,
  },

  // Late floors
  {
    id: 'scratch_close',
    type: 'scratch',
    text: 'Almost there... I can feel it',
    minFloor: 14,
    maxFloor: 20,
  },
  {
    id: 'scratch_crown',
    type: 'scratch',
    text: 'Beware the crowned one',
    minFloor: 12,
    maxFloor: 20,
  },
  {
    id: 'scratch_hope',
    type: 'scratch',
    text: 'There IS an end',
    minFloor: 16,
    maxFloor: 20,
  },

  // === WHISPERS (ethereal, brief) ===

  // All floors, increasing frequency deeper
  {
    id: 'whisper_back',
    type: 'whisper',
    text: 'Turn back...',
    minFloor: 1,
    maxFloor: 10,
  },
  {
    id: 'whisper_waiting',
    type: 'whisper',
    text: 'We are waiting...',
    minFloor: 3,
    maxFloor: 15,
  },
  {
    id: 'whisper_below',
    type: 'whisper',
    text: 'Redemption lies below...',
    minFloor: 5,
    maxFloor: 20,
  },
  {
    id: 'whisper_join',
    type: 'whisper',
    text: 'Join us...',
    minFloor: 8,
    maxFloor: 20,
  },
  {
    id: 'whisper_remember',
    type: 'whisper',
    text: 'Do you remember the sun?',
    minFloor: 10,
    maxFloor: 20,
  },
  {
    id: 'whisper_name',
    type: 'whisper',
    text: 'I forgot my name...',
    minFloor: 6,
    maxFloor: 18,
  },
  {
    id: 'whisper_help',
    type: 'whisper',
    text: 'Help me...',
    minFloor: 1,
    maxFloor: 12,
  },
  {
    id: 'whisper_cold',
    type: 'whisper',
    text: 'So cold here...',
    minFloor: 8,
    maxFloor: 20,
  },
  {
    id: 'whisper_time',
    type: 'whisper',
    text: 'How long have I been here?',
    minFloor: 5,
    maxFloor: 15,
  },
  {
    id: 'whisper_almost',
    type: 'whisper',
    text: 'You are almost free...',
    minFloor: 16,
    maxFloor: 20,
  },
];

export class LoreSystem {
  private discoveredLore: Set<string> = new Set();

  constructor() {}

  // Get a random lore entry appropriate for the current floor
  getRandomLore(floor: number, type?: LoreType): LoreEntry | null {
    const available = LORE_ENTRIES.filter((entry) => {
      // Must be within floor range
      if (floor < entry.minFloor || floor > entry.maxFloor) return false;
      // Must match type if specified
      if (type && entry.type !== type) return false;
      // Must not already be discovered
      if (this.discoveredLore.has(entry.id)) return false;
      return true;
    });

    if (available.length === 0) return null;

    return available[Math.floor(Math.random() * available.length)];
  }

  // Get lore type based on floor depth (more whispers deeper down)
  getRandomLoreType(floor: number): LoreType {
    const roll = Math.random();

    if (floor <= 5) {
      // Early: More tablets and scratches
      if (roll < 0.5) return 'tablet';
      if (roll < 0.9) return 'scratch';
      return 'whisper';
    } else if (floor <= 10) {
      // Middle: Balanced
      if (roll < 0.35) return 'tablet';
      if (roll < 0.7) return 'scratch';
      return 'whisper';
    } else if (floor <= 15) {
      // Deep: More whispers
      if (roll < 0.25) return 'tablet';
      if (roll < 0.5) return 'scratch';
      return 'whisper';
    } else {
      // Deepest: Mostly whispers
      if (roll < 0.15) return 'tablet';
      if (roll < 0.35) return 'scratch';
      return 'whisper';
    }
  }

  markDiscovered(id: string): void {
    this.discoveredLore.add(id);
  }

  isDiscovered(id: string): boolean {
    return this.discoveredLore.has(id);
  }

  getDiscoveredCount(): number {
    return this.discoveredLore.size;
  }

  getTotalCount(): number {
    return LORE_ENTRIES.length;
  }
}
