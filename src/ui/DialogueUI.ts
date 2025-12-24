import Phaser from 'phaser';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

interface RexUIScene extends Phaser.Scene {
  rexUI: UIPlugin;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  speakerColor?: string;
}

export interface DialogueData {
  lines: DialogueLine[];
  onComplete?: () => void;
}

export class DialogueUI {
  private scene: RexUIScene;
  private panel: any | null = null;
  private isVisible: boolean = false;
  private currentDialogue: DialogueData | null = null;
  private currentLineIndex: number = 0;
  private speakerText: Phaser.GameObjects.Text | null = null;
  private dialogueText: Phaser.GameObjects.Text | null = null;
  private continueHint: Phaser.GameObjects.Text | null = null;
  private keyListener: ((event: KeyboardEvent) => void) | null = null;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private currentFullText: string = '';
  private isTyping: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene as RexUIScene;
  }

  show(dialogue: DialogueData): void {
    if (this.isVisible) {
      this.hide();
    }

    this.currentDialogue = dialogue;
    this.currentLineIndex = 0;
    this.isVisible = true;

    this.createPanel();
    this.displayCurrentLine();
    this.setupInput();
  }

  private createPanel(): void {
    const cam = this.scene.cameras.main;
    const panelWidth = Math.min(500, cam.width - 40);
    const panelHeight = 140;
    const panelX = cam.width / 2;
    const panelY = cam.height - panelHeight / 2 - 20;

    // Create panel container
    this.panel = this.scene.add.container(panelX, panelY);
    this.panel.setScrollFactor(0);
    this.panel.setDepth(400);

    // Background
    const bg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a2e, 0.95);
    bg.setStrokeStyle(2, 0x8b5cf6);
    this.panel.add(bg);

    // Speaker name
    this.speakerText = this.scene.add.text(
      -panelWidth / 2 + 20,
      -panelHeight / 2 + 15,
      '',
      {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#fbbf24',
        fontStyle: 'bold',
      }
    );
    this.panel.add(this.speakerText);

    // Dialogue text
    this.dialogueText = this.scene.add.text(
      -panelWidth / 2 + 20,
      -panelHeight / 2 + 45,
      '',
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#e5e7eb',
        wordWrap: { width: panelWidth - 40 },
        lineSpacing: 4,
      }
    );
    this.panel.add(this.dialogueText);

    // Continue hint
    this.continueHint = this.scene.add.text(
      panelWidth / 2 - 20,
      panelHeight / 2 - 20,
      '[SPACE/ENTER]',
      {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#6b7280',
      }
    );
    this.continueHint.setOrigin(1, 1);
    this.panel.add(this.continueHint);

    // Animate hint
    this.scene.tweens.add({
      targets: this.continueHint,
      alpha: { from: 0.5, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Animate panel in
    this.panel.setAlpha(0);
    this.panel.y += 20;
    this.scene.tweens.add({
      targets: this.panel,
      alpha: 1,
      y: panelY,
      duration: 200,
      ease: 'Power2',
    });
  }

  private displayCurrentLine(): void {
    if (!this.currentDialogue || !this.speakerText || !this.dialogueText) return;

    const line = this.currentDialogue.lines[this.currentLineIndex];
    if (!line) return;

    // Update speaker
    this.speakerText.setText(line.speaker);
    if (line.speakerColor) {
      this.speakerText.setColor(line.speakerColor);
    } else {
      this.speakerText.setColor('#fbbf24');
    }

    // Typewriter effect for dialogue
    this.typewriterEffect(line.text);
  }

  private typewriterEffect(text: string): void {
    if (!this.dialogueText) return;

    // Stop any existing typewriter
    this.stopTypewriter();

    this.currentFullText = text;
    this.isTyping = true;
    this.dialogueText.setText('');
    let charIndex = 0;

    this.typewriterTimer = this.scene.time.addEvent({
      delay: 25,
      callback: () => {
        if (!this.dialogueText || !this.isVisible) {
          this.stopTypewriter();
          return;
        }
        this.dialogueText.setText(text.substring(0, charIndex + 1));
        charIndex++;
        if (charIndex >= text.length) {
          this.stopTypewriter();
        }
      },
      repeat: text.length - 1,
    });
  }

  private stopTypewriter(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
    this.isTyping = false;
  }

  private completeCurrentLine(): void {
    this.stopTypewriter();
    if (this.dialogueText && this.currentFullText) {
      this.dialogueText.setText(this.currentFullText);
    }
  }

  private setupInput(): void {
    this.keyListener = (event: KeyboardEvent) => {
      if (!this.isVisible) return;

      if (event.code === 'Space' || event.code === 'Enter' || event.code === 'KeyE') {
        event.preventDefault();
        this.advanceDialogue();
      } else if (event.code === 'Escape') {
        event.preventDefault();
        this.hide();
      }
    };

    this.scene.input.keyboard?.on('keydown', this.keyListener);
  }

  private advanceDialogue(): void {
    if (!this.currentDialogue) return;

    // If still typing, complete the current line first
    if (this.isTyping) {
      this.completeCurrentLine();
      return;
    }

    // Otherwise, advance to next line
    this.currentLineIndex++;

    if (this.currentLineIndex >= this.currentDialogue.lines.length) {
      // Dialogue complete
      const onComplete = this.currentDialogue.onComplete;
      this.hide();
      if (onComplete) {
        onComplete();
      }
    } else {
      this.displayCurrentLine();
    }
  }

  hide(): void {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.stopTypewriter();

    if (this.keyListener) {
      this.scene.input.keyboard?.off('keydown', this.keyListener);
      this.keyListener = null;
    }

    if (this.panel) {
      this.scene.tweens.add({
        targets: this.panel,
        alpha: 0,
        y: this.panel.y + 20,
        duration: 150,
        onComplete: () => {
          this.panel?.destroy();
          this.panel = null;
          this.speakerText = null;
          this.dialogueText = null;
          this.continueHint = null;
        },
      });
    }

    this.currentDialogue = null;
    this.currentLineIndex = 0;
    this.currentFullText = '';
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }
}
