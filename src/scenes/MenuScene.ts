import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    // Background gradient effect
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d1b4e, 0x2d1b4e, 1)
    bg.fillRect(0, 0, width, height)

    // Decorative elements
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width)
      const y = Phaser.Math.Between(0, height)
      const size = Phaser.Math.Between(1, 3)
      this.add.circle(x, y, size, 0xffffff, 0.3)
    }

    // Title
    this.add.text(width / 2, 100, '🏘️ SgravoQuest', {
      fontSize: '48px',
      color: '#8b5cf6',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    this.add.text(width / 2, 155, 'Un villaggio, tante storie...', {
      fontSize: '18px',
      color: '#c4b5fd'
    }).setOrigin(0.5)

    // Description
    this.add.text(width / 2, 220, 'Esplora il Villaggio di Sgravo e parla con i suoi abitanti.\nOgni personaggio ha una personalità unica, powered by AI.', {
      fontSize: '14px',
      color: '#a1a1aa',
      align: 'center'
    }).setOrigin(0.5)

    // Start button
    const startBtn = this.add.text(width / 2, height / 2 + 30, '[ Entra nel Villaggio ]', {
      fontSize: '24px',
      color: '#22c55e',
      backgroundColor: '#1a1a2e',
      padding: { x: 20, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    startBtn.on('pointerover', () => startBtn.setColor('#4ade80'))
    startBtn.on('pointerout', () => startBtn.setColor('#22c55e'))
    startBtn.on('pointerdown', () => this.startGame())

    // Characters preview
    const characters = [
      { name: 'Marco', emoji: '🥖', desc: 'Il Panettiere' },
      { name: 'Sofia', emoji: '📚', desc: 'La Bibliotecaria' },
      { name: 'Giovanni', emoji: '👴', desc: 'Il Saggio' },
      { name: 'Luna', emoji: '🌿', desc: 'La Guaritrice' },
      { name: 'Tommaso', emoji: '🎩', desc: 'Il Sindaco' },
      { name: 'Rosa', emoji: '🍺', desc: 'La Locandiera' }
    ]

    const startX = width / 2 - ((characters.length - 1) * 55)
    characters.forEach((char, i) => {
      const x = startX + i * 110
      this.add.text(x, height - 140, char.emoji, {
        fontSize: '28px'
      }).setOrigin(0.5)
      this.add.text(x, height - 110, char.name, {
        fontSize: '11px',
        color: '#fbbf24'
      }).setOrigin(0.5)
      this.add.text(x, height - 95, char.desc, {
        fontSize: '9px',
        color: '#71717a'
      }).setOrigin(0.5)
    })

    // Instructions
    this.add.text(width / 2, height - 45, 'WASD: Muovi | E: Parla con NPC | ESC: Menu', {
      fontSize: '12px',
      color: '#71717a'
    }).setOrigin(0.5)

    this.add.text(width / 2, height - 20, 'Powered by Gemini AI 🤖', {
      fontSize: '10px',
      color: '#52525b'
    }).setOrigin(0.5)

    // Enter to start
    this.input.keyboard?.on('keydown-ENTER', () => this.startGame())
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame())
  }

  startGame() {
    this.scene.start('TownScene')
  }
}
