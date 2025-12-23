import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  private questPrompts = [
    'Un ladro si infiltra in una cripta antica',
    'Un mago esplora una torre abbandonata',
    'Un cavaliere cerca il graal in un tempio sommerso',
    'Un assassino elimina il capo dei necromanti',
    'Un esploratore trova rovine nella giungla',
    'Un cacciatore affronta un vampiro nel castello',
    'Un alchimista cerca ingredienti in una miniera',
    'Un paladino purifica un santuario corrotto',
    'Un bardo raccoglie storie in una taverna maledetta',
    'Un druido protegge una foresta da cultisti'
  ]

  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.cameras.main

    // Title
    this.add.text(width / 2, 100, 'SgravoQuest', {
      fontSize: '48px',
      color: '#8b5cf6',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    this.add.text(width / 2, 150, 'AI-Powered Dungeon Crawler', {
      fontSize: '16px',
      color: '#a1a1aa'
    }).setOrigin(0.5)

    // Start button
    const startBtn = this.add.text(width / 2, height / 2, '[ Genera Dungeon AI ]', {
      fontSize: '24px',
      color: '#22c55e',
      backgroundColor: '#1a1a2e',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    startBtn.on('pointerover', () => startBtn.setColor('#4ade80'))
    startBtn.on('pointerout', () => startBtn.setColor('#22c55e'))
    startBtn.on('pointerdown', () => this.generateAndStart())

    // Instructions
    this.add.text(width / 2, height - 100, 'WASD/Arrows: Move | Space: Attack | E: Interact', {
      fontSize: '14px',
      color: '#71717a'
    }).setOrigin(0.5)

    this.add.text(width / 2, height - 60, 'Powered by Claude AI', {
      fontSize: '12px',
      color: '#52525b'
    }).setOrigin(0.5)

    // Enter to start
    this.input.keyboard?.on('keydown-ENTER', () => this.generateAndStart())
    this.input.keyboard?.on('keydown-SPACE', () => this.generateAndStart())
  }

  async generateAndStart() {
    const prompt = Phaser.Math.RND.pick(this.questPrompts)
    
    // Show loading
    const { width, height } = this.cameras.main
    const loadingText = this.add.text(width / 2, height / 2 + 80, 'Generating dungeon...', {
      fontSize: '16px',
      color: '#fbbf24'
    }).setOrigin(0.5)

    try {
      // Call API to generate quest
      const response = await fetch('/api/generate-quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })

      if (!response.ok) throw new Error('API error')
      
      const quest = await response.json()
      this.scene.start('GameScene', { quest })
    } catch (error) {
      console.error('Quest generation failed:', error)
      loadingText.setText('Errore! Usando dungeon procedurale...')
      
      // Fallback to procedural dungeon
      setTimeout(() => {
        this.scene.start('GameScene', { quest: null })
      }, 1000)
    }
  }
}
