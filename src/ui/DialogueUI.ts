import Phaser from 'phaser';

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
  private scene: Phaser.Scene;
  private panel: Phaser.GameObjects.Container | null = null;
  private isVisible: boolean = false;
  private currentDialogue: DialogueData | null = null;
  private currentLineIndex: number = 0;
  private speakerText: Phaser.GameObjects.Text | null = null;
  private dialogueText: Phaser.GameObjects.Text | null = null;
  private continueHint: Phaser.GameObjects.Text | null = null;
  private continueIcon: Phaser.GameObjects.Text | null = null;
  private keyListener: ((event: KeyboardEvent) => void) | null = null;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private currentFullText: string = '';
  private isTyping: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
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
    const panelWidth = Math.min(520, cam.width - 40);
    const panelHeight = 130;
    const panelX = cam.width / 2;
    const panelY = cam.height - panelHeight / 2 - 25;

    // Create panel container
    this.panel = this.scene.add.container(panelX, panelY);
    this.panel.setScrollFactor(0);
    this.panel.setDepth(400);

    // Main background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a0a, 0.92);
    bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 6);
    bg.lineStyle(1, 0x444444, 0.7);
    bg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 6);
    this.panel.add(bg);

    // Corner accents
    const corners = this.scene.add.graphics();
    corners.lineStyle(2, 0xff6600, 0.8);
    const cornerSize = 12;
    const halfW = panelWidth / 2;
    const halfH = panelHeight / 2;

    // Top-left
    corners.beginPath();
    corners.moveTo(-halfW, -halfH + cornerSize);
    corners.lineTo(-halfW, -halfH);
    corners.lineTo(-halfW + cornerSize, -halfH);
    corners.strokePath();

    // Top-right
    corners.beginPath();
    corners.moveTo(halfW - cornerSize, -halfH);
    corners.lineTo(halfW, -halfH);
    corners.lineTo(halfW, -halfH + cornerSize);
    corners.strokePath();

    // Bottom-left
    corners.beginPath();
    corners.moveTo(-halfW, halfH - cornerSize);
    corners.lineTo(-halfW, halfH);
    corners.lineTo(-halfW + cornerSize, halfH);
    corners.strokePath();

    // Bottom-right
    corners.beginPath();
    corners.moveTo(halfW - cornerSize, halfH);
    corners.lineTo(halfW, halfH);
    corners.lineTo(halfW, halfH - cornerSize);
    corners.strokePath();

    this.panel.add(corners);

    // Speaker name container with accent
    const speakerBg = this.scene.add.graphics();
    speakerBg.fillStyle(0x1a1a1a, 0.8);
    speakerBg.fillRoundedRect(-halfW + 15, -halfH + 10, 160, 26, 3);
    this.panel.add(speakerBg);

    // Speaker diamond accent
    const speakerAccent = this.scene.add.text(-halfW + 22, -halfH + 23, '◆', {
      fontSize: '10px',
      color: '#ff6600',
    });
    speakerAccent.setOrigin(0, 0.5);
    this.panel.add(speakerAccent);

    // Speaker name
    this.speakerText = this.scene.add.text(
      -halfW + 36,
      -halfH + 23,
      '',
      {
        fontSize: '13px',
        fontFamily: 'Cinzel, Georgia, serif',
        color: '#ffffff',
      }
    );
    this.speakerText.setOrigin(0, 0.5);
    this.panel.add(this.speakerText);

    // Dialogue text
    this.dialogueText = this.scene.add.text(
      -halfW + 25,
      -halfH + 48,
      '',
      {
        fontSize: '13px',
        fontFamily: 'Roboto Mono, Courier New, monospace',
        color: '#cccccc',
        wordWrap: { width: panelWidth - 50 },
        lineSpacing: 6,
      }
    );
    this.panel.add(this.dialogueText);

    // Continue hint container
    const hintContainer = this.scene.add.container(halfW - 20, halfH - 18);

    // Continue icon (animated arrow)
    this.continueIcon = this.scene.add.text(0, 0, '▶', {
      fontSize: '12px',
      color: '#ff6600',
    });
    this.continueIcon.setOrigin(1, 0.5);
    hintContainer.add(this.continueIcon);

    // Continue text
    this.continueHint = this.scene.add.text(-18, 0, 'SPACE', {
      fontSize: '9px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#666666',
    });
    this.continueHint.setOrigin(1, 0.5);
    hintContainer.add(this.continueHint);

    this.panel.add(hintContainer);

    // Animate continue icon
    this.scene.tweens.add({
      targets: this.continueIcon,
      x: 3,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Pulse the hint
    this.scene.tweens.add({
      targets: [this.continueHint, this.continueIcon],
      alpha: { from: 0.5, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Animate panel in
    this.panel.setAlpha(0);
    this.panel.y += 30;
    this.scene.tweens.add({
      targets: this.panel,
      alpha: 1,
      y: panelY,
      duration: 250,
      ease: 'Back.easeOut',
    });
  }

  private displayCurrentLine(): void {
    if (!this.currentDialogue || !this.speakerText || !this.dialogueText) return;

    const line = this.currentDialogue.lines[this.currentLineIndex];
    if (!line) return;

    // Update speaker
    this.speakerText.setText(line.speaker.toUpperCase());
    if (line.speakerColor) {
      this.speakerText.setColor(line.speakerColor);
    } else {
      this.speakerText.setColor('#ffffff');
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
      delay: 22,
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
          this.continueIcon = null;
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
