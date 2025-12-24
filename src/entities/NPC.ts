import Phaser from 'phaser';
import { TILE_SIZE } from '../utils/constants';
import { DialogueLine } from '../ui/DialogueUI';
import { SinWorld } from '../config/WorldConfig';

export enum NPCType {
  CHRONICLER = 'chronicler',
  LOST_SOUL = 'lost_soul',
  WARNING_SPIRIT = 'warning_spirit',
  MYSTERIOUS_FIGURE = 'mysterious_figure',
}

export interface NPCData {
  type: NPCType;
  name: string;
  dialogue: DialogueLine[];
  texture: string;
  tint?: number;
  scale?: number;
}

// Lore content organized by sin world
export const WORLD_LORE: Record<SinWorld, DialogueLine[][]> = {
  [SinWorld.PRIDE]: [
    [
      { speaker: 'Lost Soul', text: 'I was a king once... ruler of a vast empire.', speakerColor: '#ffd700' },
      { speaker: 'Lost Soul', text: 'I built monuments to my own glory. Statues of gold, towers reaching to heaven.', speakerColor: '#ffd700' },
      { speaker: 'Lost Soul', text: 'Now I wander these halls, a reflection of my vanity...', speakerColor: '#ffd700' },
    ],
    [
      { speaker: 'Fallen Noble', text: 'They called me the fairest in all the land.', speakerColor: '#f5f5dc' },
      { speaker: 'Fallen Noble', text: 'I shattered every mirror that did not show perfection.', speakerColor: '#f5f5dc' },
      { speaker: 'Fallen Noble', text: 'Beware the one who waits above. He sees only himself...', speakerColor: '#f5f5dc' },
    ],
    [
      { speaker: 'Hollow Champion', text: 'I never lost a battle. I was invincible.', speakerColor: '#daa520' },
      { speaker: 'Hollow Champion', text: 'Until I faced an enemy I could not defeat: myself.', speakerColor: '#daa520' },
    ],
  ],
  [SinWorld.GREED]: [
    [
      { speaker: 'Lost Merchant', text: 'Gold... I can still smell it. Feel its weight in my hands.', speakerColor: '#22c55e' },
      { speaker: 'Lost Merchant', text: 'I traded everything for more. My family, my soul...', speakerColor: '#22c55e' },
      { speaker: 'Lost Merchant', text: 'And in the end? The gold meant nothing here.', speakerColor: '#22c55e' },
    ],
    [
      { speaker: 'Cursed Treasurer', text: 'I counted coins for forty years. Never spent a single one.', speakerColor: '#4ade80' },
      { speaker: 'Cursed Treasurer', text: 'The master of this place... he takes everything.', speakerColor: '#4ade80' },
      { speaker: 'Cursed Treasurer', text: 'Whatever you have, he will try to steal it. Guard yourself.', speakerColor: '#4ade80' },
    ],
    [
      { speaker: 'Empty Collector', text: 'I had rooms full of treasures I never used.', speakerColor: '#86efac' },
      { speaker: 'Empty Collector', text: 'Now those same treasures mock me from behind glass walls.', speakerColor: '#86efac' },
    ],
  ],
  [SinWorld.WRATH]: [
    [
      { speaker: 'Burned Warrior', text: 'Anger was my shield and my sword.', speakerColor: '#ef4444' },
      { speaker: 'Burned Warrior', text: 'I burned villages. Razed kingdoms. All for vengeance.', speakerColor: '#ef4444' },
      { speaker: 'Burned Warrior', text: 'But the fire... it never stopped burning. Even now.', speakerColor: '#ef4444' },
    ],
    [
      { speaker: 'Scorched Knight', text: 'I killed my own brother in a fit of rage.', speakerColor: '#f87171' },
      { speaker: 'Scorched Knight', text: 'The one above knows only fury. His flames never cool.', speakerColor: '#f87171' },
      { speaker: 'Scorched Knight', text: 'Do not let him touch you. The burning never stops.', speakerColor: '#f87171' },
    ],
    [
      { speaker: 'Ashborn Soldier', text: 'We marched to war with songs of glory.', speakerColor: '#fca5a5' },
      { speaker: 'Ashborn Soldier', text: 'We returned as ashes and regret.', speakerColor: '#fca5a5' },
    ],
  ],
  [SinWorld.SLOTH]: [
    [
      { speaker: 'Dreaming Soul', text: 'I just... wanted to rest. Just a little longer...', speakerColor: '#64748b' },
      { speaker: 'Dreaming Soul', text: 'Days became years. Years became... I do not know.', speakerColor: '#64748b' },
      { speaker: 'Dreaming Soul', text: 'The master sleeps eternal. His dreams trap all who enter.', speakerColor: '#64748b' },
    ],
    [
      { speaker: 'Frozen Dreamer', text: 'There was so much I meant to do...', speakerColor: '#94a3b8' },
      { speaker: 'Frozen Dreamer', text: 'Tomorrow, I always said. Tomorrow never came.', speakerColor: '#94a3b8' },
      { speaker: 'Frozen Dreamer', text: 'Time moves slowly here. Too slowly. Be swift, or join us.', speakerColor: '#94a3b8' },
    ],
    [
      { speaker: 'Idle Spirit', text: 'I had such dreams once. Such ambitions.', speakerColor: '#cbd5e1' },
      { speaker: 'Idle Spirit', text: 'Now I cannot even remember what they were.', speakerColor: '#cbd5e1' },
    ],
  ],
  [SinWorld.ENVY]: [
    [
      { speaker: 'Shadowed Twin', text: 'I wanted what others had. Their beauty. Their talent.', speakerColor: '#16a34a' },
      { speaker: 'Shadowed Twin', text: 'I copied them perfectly. But it was never enough.', speakerColor: '#16a34a' },
      { speaker: 'Shadowed Twin', text: 'The master here... he will become you. Fight your own shadow.', speakerColor: '#16a34a' },
    ],
    [
      { speaker: 'Mirror Ghost', text: 'My sister was always the favorite. Always.', speakerColor: '#22c55e' },
      { speaker: 'Mirror Ghost', text: 'I wished so hard to be her. And now... I am nothing.', speakerColor: '#22c55e' },
      { speaker: 'Mirror Ghost', text: 'Beware clones of yourself. They know your weaknesses.', speakerColor: '#22c55e' },
    ],
    [
      { speaker: 'Stolen Face', text: 'I wore so many masks, I forgot my own face.', speakerColor: '#4ade80' },
      { speaker: 'Stolen Face', text: 'Now I have no face at all.', speakerColor: '#4ade80' },
    ],
  ],
  [SinWorld.GLUTTONY]: [
    [
      { speaker: 'Hollow Feast', text: 'I ate and ate but was never satisfied.', speakerColor: '#f97316' },
      { speaker: 'Hollow Feast', text: 'The hunger only grew. Consuming everything.', speakerColor: '#f97316' },
      { speaker: 'Hollow Feast', text: 'The master devours all. He grows larger with each soul.', speakerColor: '#f97316' },
    ],
    [
      { speaker: 'Starving Noble', text: 'Feasts every night. The finest wines, the rarest meats.', speakerColor: '#fb923c' },
      { speaker: 'Starving Noble', text: 'Yet I wasted away, never tasting true fulfillment.', speakerColor: '#fb923c' },
      { speaker: 'Starving Noble', text: 'He will try to consume your very essence. Stay back.', speakerColor: '#fb923c' },
    ],
    [
      { speaker: 'Empty Belly', text: 'I threw away more food than villages ever saw.', speakerColor: '#fdba74' },
      { speaker: 'Empty Belly', text: 'Now I hunger for eternity.', speakerColor: '#fdba74' },
    ],
  ],
  [SinWorld.LUST]: [
    [
      { speaker: 'Heartbroken Shade', text: 'I loved too deeply. Too desperately.', speakerColor: '#ec4899' },
      { speaker: 'Heartbroken Shade', text: 'I destroyed everyone who tried to leave me.', speakerColor: '#ec4899' },
      { speaker: 'Heartbroken Shade', text: 'The master pulls you close. Do not let her embrace you.', speakerColor: '#ec4899' },
    ],
    [
      { speaker: 'Obsessed Spirit', text: 'I could not bear to be alone. Not for a moment.', speakerColor: '#f472b6' },
      { speaker: 'Obsessed Spirit', text: 'I clung to love until it suffocated.', speakerColor: '#f472b6' },
      { speaker: 'Obsessed Spirit', text: 'She will draw you in. Resist the pull.', speakerColor: '#f472b6' },
    ],
    [
      { speaker: 'Lonely Heart', text: 'I chased affection from anyone who would give it.', speakerColor: '#f9a8d4' },
      { speaker: 'Lonely Heart', text: 'In the end, I was more alone than ever.', speakerColor: '#f9a8d4' },
    ],
  ],
};

// Hub NPC dialogues
export const HUB_NPCS: NPCData[] = [
  {
    type: NPCType.CHRONICLER,
    name: 'The Chronicler',
    texture: 'shopkeeper',
    tint: 0x8b5cf6,
    dialogue: [
      { speaker: 'The Chronicler', text: 'Ah, another soul seeking redemption...', speakerColor: '#8b5cf6' },
      { speaker: 'The Chronicler', text: 'Seven towers stand before you. Seven sins to conquer.', speakerColor: '#8b5cf6' },
      { speaker: 'The Chronicler', text: 'Pride, Greed, Wrath, Sloth, Envy, Gluttony, Lust.', speakerColor: '#8b5cf6' },
      { speaker: 'The Chronicler', text: 'Each holds a fragment of the darkness within us all.', speakerColor: '#8b5cf6' },
      { speaker: 'The Chronicler', text: 'Defeat them all, and perhaps... you will find peace.', speakerColor: '#8b5cf6' },
    ],
  },
  {
    type: NPCType.MYSTERIOUS_FIGURE,
    name: 'Mysterious Figure',
    texture: 'player',
    tint: 0x1f2937,
    scale: 0.9,
    dialogue: [
      { speaker: '???', text: '...', speakerColor: '#4b5563' },
      { speaker: '???', text: 'You remind me of someone I once knew.', speakerColor: '#4b5563' },
      { speaker: '???', text: 'They too sought to purify their soul.', speakerColor: '#4b5563' },
      { speaker: '???', text: 'They failed.', speakerColor: '#4b5563' },
      { speaker: '???', text: '...Perhaps you will be different.', speakerColor: '#4b5563' },
    ],
  },
];

// Warning dialogues before boss floors
export const BOSS_WARNINGS: Record<SinWorld, DialogueLine[]> = {
  [SinWorld.PRIDE]: [
    { speaker: 'Warning Spirit', text: 'The Tower of Pride awaits above...', speakerColor: '#fbbf24' },
    { speaker: 'Warning Spirit', text: 'He who sits upon the golden throne sees only himself.', speakerColor: '#fbbf24' },
    { speaker: 'Warning Spirit', text: 'Your attacks may be turned against you. Strike wisely.', speakerColor: '#fbbf24' },
  ],
  [SinWorld.GREED]: [
    { speaker: 'Warning Spirit', text: 'The Vault of Greed lies ahead...', speakerColor: '#fbbf24' },
    { speaker: 'Warning Spirit', text: 'The master hoards all that glitters. Even your gold.', speakerColor: '#fbbf24' },
    { speaker: 'Warning Spirit', text: 'Watch for traps of treasure. Not all that shines is safe.', speakerColor: '#fbbf24' },
  ],
  [SinWorld.WRATH]: [
    { speaker: 'Warning Spirit', text: 'The Furnace of Wrath burns eternal...', speakerColor: '#fbbf24' },
    { speaker: 'Warning Spirit', text: 'His rage only grows as you fight. End it quickly.', speakerColor: '#fbbf24' },
    { speaker: 'Warning Spirit', text: 'The flames will seek you. Keep moving.', speakerColor: '#fbbf24' },
  ],
  [SinWorld.SLOTH]: [
    { speaker: 'Warning Spirit', text: 'The Eternal Rest awaits...', speakerColor: '#fbbf24' },
    { speaker: 'Warning Spirit', text: 'Time itself slows in his presence.', speakerColor: '#fbbf24' },
    { speaker: 'Warning Spirit', text: 'Do not linger, or you may never leave.', speakerColor: '#fbbf24' },
  ],
  [SinWorld.ENVY]: [
    { speaker: 'Warning Spirit', text: 'The Hall of Mirrors stands before you...', speakerColor: '#fbbf24' },
    { speaker: 'Warning Spirit', text: 'He will copy your every strength.', speakerColor: '#fbbf24' },
    { speaker: 'Warning Spirit', text: 'Can you defeat yourself?', speakerColor: '#fbbf24' },
  ],
  [SinWorld.GLUTTONY]: [
    { speaker: 'Warning Spirit', text: 'The Endless Feast hungers...', speakerColor: '#fbbf24' },
    { speaker: 'Warning Spirit', text: 'He consumes all. Health, hope, life itself.', speakerColor: '#fbbf24' },
    { speaker: 'Warning Spirit', text: 'Keep your distance. His reach grows with his appetite.', speakerColor: '#fbbf24' },
  ],
  [SinWorld.LUST]: [
    { speaker: 'Warning Spirit', text: 'The Chamber of Longing calls...', speakerColor: '#fbbf24' },
    { speaker: 'Warning Spirit', text: 'She will draw you close. Resist the pull.', speakerColor: '#fbbf24' },
    { speaker: 'Warning Spirit', text: 'Love corrupted is the cruelest trap of all.', speakerColor: '#fbbf24' },
  ],
};

export class NPC extends Phaser.Physics.Arcade.Sprite {
  private npcData: NPCData;
  private interactIndicator: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, data: NPCData) {
    super(scene, x, y, data.texture);
    this.npcData = data;

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body

    if (data.tint) {
      this.setTint(data.tint);
    }
    if (data.scale) {
      this.setScale(data.scale);
    }

    this.setDepth(5);

    // Add floating animation
    scene.tweens.add({
      targets: this,
      y: y - 3,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Add subtle glow
    const glow = scene.add.circle(x, y, TILE_SIZE * 0.6, data.tint || 0x8b5cf6, 0.2);
    glow.setDepth(4);
    scene.tweens.add({
      targets: glow,
      alpha: { from: 0.1, to: 0.3 },
      scale: { from: 0.9, to: 1.1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Add floating interaction indicator above NPC
    this.interactIndicator = scene.add.text(x, y - TILE_SIZE * 1.2, '!', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#fbbf24',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.interactIndicator.setOrigin(0.5);
    this.interactIndicator.setDepth(6);

    // Bounce animation for indicator
    scene.tweens.add({
      targets: this.interactIndicator,
      y: y - TILE_SIZE * 1.4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Pulse animation for indicator
    scene.tweens.add({
      targets: this.interactIndicator,
      scale: { from: 1, to: 1.2 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  hideIndicator(): void {
    if (this.interactIndicator) {
      this.interactIndicator.setVisible(false);
    }
  }

  showIndicator(): void {
    if (this.interactIndicator) {
      this.interactIndicator.setVisible(true);
    }
  }

  getData(): NPCData {
    return this.npcData;
  }

  getDialogue(): DialogueLine[] {
    return this.npcData.dialogue;
  }
}

// Helper to get random lore for a world
export function getRandomWorldLore(world: SinWorld): DialogueLine[] {
  const loreOptions = WORLD_LORE[world];
  const randomIndex = Math.floor(Math.random() * loreOptions.length);
  return loreOptions[randomIndex];
}

// Helper to create a Lost Soul NPC with world-specific lore
export function createLostSoulData(world: SinWorld): NPCData {
  const lore = getRandomWorldLore(world);
  return {
    type: NPCType.LOST_SOUL,
    name: lore[0].speaker,
    texture: 'player',
    tint: 0x6b7280,
    scale: 0.8,
    dialogue: lore,
  };
}

// Helper to create a Warning Spirit NPC
export function createWarningSpirit(world: SinWorld): NPCData {
  return {
    type: NPCType.WARNING_SPIRIT,
    name: 'Warning Spirit',
    texture: 'player',
    tint: 0xfbbf24,
    scale: 0.7,
    dialogue: BOSS_WARNINGS[world],
  };
}
