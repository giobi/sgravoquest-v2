import Phaser from 'phaser'

interface UIData {
  quest?: { title: string; description: string } | null
  health?: number
  gameOver?: boolean
}

export class UIScene extends Phaser.Scene {
  private healthText!: Phaser.GameObjects.Text
  private killsText!: Phaser.GameObjects.Text
  private questText?: Phaser.GameObjects.Text
  private health = 100
  private kills = 0

  constructor() {
    super({ key: 'UIScene' })
  }

  init(data: UIData) {
    if (data.health !== undefined) this.health = data.health
    
    if (data.gameOver) {
      this.showGameOver()
      return
    }
  }

  create() {
    const { width } = this.cameras.main

    // Health bar background
    this.add.rectangle(80, 30, 120, 20, 0x1f2937).setOrigin(0, 0.5)
    
    // Health bar
    const healthBar = this.add.rectangle(82, 30, 116, 16, 0x22c55e).setOrigin(0, 0.5)
    
    this.healthText = this.add.text(80, 30, `HP: ${this.health}`, {
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0, 0.5)

    // Kills counter
    this.killsText = this.add.text(width - 20, 20, `Kills: ${this.kills}`, {
      fontSize: '14px',
      color: '#fbbf24'
    }).setOrigin(1, 0)

    // Quest title (if exists)
    const gameScene = this.scene.get('GameScene')
    const quest = (gameScene as any).quest
    
    if (quest) {
      this.questText = this.add.text(width / 2, 15, quest.title, {
        fontSize: '14px',
        color: '#8b5cf6'
      }).setOrigin(0.5, 0)
    }

    // Controls hint
    this.add.text(width / 2, this.cameras.main.height - 15, 'WASD: Move | SPACE: Attack | ESC: Menu', {
      fontSize: '10px',
      color: '#52525b'
    }).setOrigin(0.5, 1)

    // Listen to game events
    gameScene.events.on('healthChanged', (hp: number) => {
      this.health = hp
      this.healthText.setText(`HP: ${this.health}`)
      healthBar.setScale(Math.max(0, this.health / 100), 1)
      if (this.health < 30) healthBar.setFillStyle(0xef4444)
    })

    gameScene.events.on('enemyKilled', () => {
      this.kills++
      this.killsText.setText(`Kills: ${this.kills}`)
    })

    // ESC to return to menu
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.stop('GameScene')
      this.scene.stop('UIScene')
      this.scene.start('MenuScene')
    })
  }

  showGameOver() {
    const { width, height } = this.cameras.main

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)

    this.add.text(width / 2, height / 2 - 50, 'GAME OVER', {
      fontSize: '48px',
      color: '#ef4444'
    }).setOrigin(0.5)

    this.add.text(width / 2, height / 2 + 20, `Kills: ${this.kills}`, {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5)

    const restartBtn = this.add.text(width / 2, height / 2 + 80, '[ Press ENTER to Restart ]', {
      fontSize: '18px',
      color: '#22c55e'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    restartBtn.on('pointerdown', () => this.restartGame())
    this.input.keyboard?.on('keydown-ENTER', () => this.restartGame())
  }

  restartGame() {
    this.scene.stop('GameScene')
    this.scene.stop('UIScene')
    this.scene.start('MenuScene')
  }
}
