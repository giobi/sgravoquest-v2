import Phaser from 'phaser'

interface UIData {
  quest?: { title: string; description: string; objectives?: string[] } | null
  health?: number
  totalCoins?: number
  totalEnemies?: number
  gameOver?: boolean
  victory?: boolean
  kills?: number
  coins?: number
}

export class UIScene extends Phaser.Scene {
  private healthBar!: Phaser.GameObjects.Rectangle
  private healthText!: Phaser.GameObjects.Text
  private killsText!: Phaser.GameObjects.Text
  private coinsText!: Phaser.GameObjects.Text
  private questPanel?: Phaser.GameObjects.Container
  private interactHint?: Phaser.GameObjects.Text
  private portalHint?: Phaser.GameObjects.Text
  private health = 100
  private kills = 0
  private coins = 0
  private totalCoins = 0
  private quest: UIData['quest'] = null

  constructor() {
    super({ key: 'UIScene' })
  }

  init(data: UIData) {
    if (data.health !== undefined) this.health = data.health
    if (data.totalCoins !== undefined) this.totalCoins = data.totalCoins
    this.quest = data.quest

    if (data.gameOver) {
      this.showGameOver(data.kills || 0, data.coins || 0)
      return
    }

    if (data.victory) {
      this.showVictory(data.kills || 0, data.coins || 0)
      return
    }
  }

  create() {
    const { width, height } = this.cameras.main
    const gameScene = this.scene.get('GameScene')

    // === TOP BAR ===

    // Health bar background
    this.add.rectangle(15, 15, 104, 14, 0x1f2937).setOrigin(0, 0).setStrokeStyle(1, 0x4b5563)

    // Health bar fill
    this.healthBar = this.add.rectangle(17, 17, 100, 10, 0x22c55e).setOrigin(0, 0)

    // Health text
    this.healthText = this.add.text(67, 22, `${this.health}`, {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    // Heart icon
    this.add.text(5, 15, '❤️', { fontSize: '12px' })

    // Coins counter (top right)
    this.coinsText = this.add.text(width - 15, 15, `🪙 ${this.coins}/${this.totalCoins}`, {
      fontSize: '12px',
      color: '#fbbf24'
    }).setOrigin(1, 0)

    // Kills counter
    this.killsText = this.add.text(width - 15, 32, `💀 ${this.kills}`, {
      fontSize: '12px',
      color: '#ef4444'
    }).setOrigin(1, 0)

    // === QUEST PANEL (if quest exists) ===
    if (this.quest) {
      this.createQuestPanel()
    }

    // === CONTROLS HINT ===
    this.add.text(width / 2, height - 10, 'WASD: Muovi | SPACE: Attacca | E: Interagisci | ESC: Menu', {
      fontSize: '9px',
      color: '#6b7280'
    }).setOrigin(0.5, 1)

    // === EVENT LISTENERS ===
    gameScene.events.on('healthChanged', (hp: number) => {
      this.health = hp
      this.healthText.setText(`${this.health}`)
      this.healthBar.setScale(Math.max(0, this.health / 100), 1)

      if (this.health < 30) {
        this.healthBar.setFillStyle(0xef4444)
      } else if (this.health < 60) {
        this.healthBar.setFillStyle(0xfbbf24)
      } else {
        this.healthBar.setFillStyle(0x22c55e)
      }
    })

    gameScene.events.on('enemyKilled', () => {
      this.kills++
      this.killsText.setText(`💀 ${this.kills}`)

      // Flash effect
      this.killsText.setScale(1.3)
      this.tweens.add({
        targets: this.killsText,
        scale: 1,
        duration: 200
      })
    })

    gameScene.events.on('coinCollected', (collected: number, total: number) => {
      this.coins = collected
      this.coinsText.setText(`🪙 ${collected}/${total}`)

      // Flash effect
      this.coinsText.setScale(1.3)
      this.tweens.add({
        targets: this.coinsText,
        scale: 1,
        duration: 200
      })
    })

    gameScene.events.on('showInteractHint', (name: string) => {
      if (this.interactHint) this.interactHint.destroy()

      this.interactHint = this.add.text(width / 2, height - 50, `Premi [E] per parlare con ${name}`, {
        fontSize: '10px',
        color: '#8b5cf6',
        backgroundColor: '#1f2937',
        padding: { x: 8, y: 4 }
      }).setOrigin(0.5)

      this.time.delayedCall(2000, () => {
        if (this.interactHint) {
          this.interactHint.destroy()
          this.interactHint = undefined
        }
      })
    })

    gameScene.events.on('portalBlocked', (data: { enemiesLeft: number; coinsNeeded: number }) => {
      if (this.portalHint) this.portalHint.destroy()

      let msg = 'Portale bloccato! '
      if (data.enemiesLeft > 0) {
        msg += `Sconfiggi ${data.enemiesLeft} nemici `
      }
      if (data.coinsNeeded > 0) {
        msg += `o raccogli altre ${data.coinsNeeded} monete`
      }

      this.portalHint = this.add.text(width / 2, height / 2 - 80, msg, {
        fontSize: '11px',
        color: '#ef4444',
        backgroundColor: '#1f2937',
        padding: { x: 10, y: 6 }
      }).setOrigin(0.5)

      this.tweens.add({
        targets: this.portalHint,
        alpha: 0,
        duration: 500,
        delay: 2000,
        onComplete: () => {
          if (this.portalHint) {
            this.portalHint.destroy()
            this.portalHint = undefined
          }
        }
      })
    })

    gameScene.events.on('allEnemiesDefeated', () => {
      const msg = this.add.text(width / 2, height / 2 - 80, '✨ Tutti i nemici sconfitti! Trova il portale! ✨', {
        fontSize: '12px',
        color: '#22c55e',
        backgroundColor: '#1f2937',
        padding: { x: 10, y: 6 }
      }).setOrigin(0.5)

      this.tweens.add({
        targets: msg,
        alpha: 0,
        y: msg.y - 30,
        duration: 2000,
        delay: 1000,
        onComplete: () => msg.destroy()
      })
    })

    // ESC to return to menu
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.stop('GameScene')
      this.scene.stop('UIScene')
      this.scene.start('MenuScene')
    })
  }

  createQuestPanel() {
    if (!this.quest) return

    const { width } = this.cameras.main
    const panelWidth = 180
    const panelX = width - panelWidth - 10

    this.questPanel = this.add.container(panelX, 55)

    // Background
    const bg = this.add.rectangle(0, 0, panelWidth, 100, 0x1f2937, 0.9)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x8b5cf6)

    // Title
    const title = this.add.text(10, 8, this.quest.title, {
      fontSize: '11px',
      color: '#8b5cf6',
      fontStyle: 'bold',
      wordWrap: { width: panelWidth - 20 }
    })

    // Description
    const desc = this.add.text(10, 28, this.quest.description, {
      fontSize: '8px',
      color: '#9ca3af',
      wordWrap: { width: panelWidth - 20 }
    })

    // Objectives
    let objY = 60
    if (this.quest.objectives) {
      this.quest.objectives.slice(0, 2).forEach((obj) => {
        const objText = this.add.text(10, objY, `• ${obj}`, {
          fontSize: '8px',
          color: '#d1d5db',
          wordWrap: { width: panelWidth - 20 }
        })
        this.questPanel!.add(objText)
        objY += 14
      })
    }

    // Adjust background height
    bg.setSize(panelWidth, objY + 10)

    this.questPanel.add([bg, title, desc])
  }

  showGameOver(kills: number, coins: number) {
    const { width, height } = this.cameras.main

    // Darken background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)

    // Skull icon
    this.add.text(width / 2, height / 2 - 100, '💀', { fontSize: '64px' }).setOrigin(0.5)

    // Title
    this.add.text(width / 2, height / 2 - 30, 'SEI MORTO', {
      fontSize: '36px',
      color: '#ef4444',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    // Stats
    this.add.text(width / 2, height / 2 + 20, `Nemici sconfitti: ${kills}`, {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5)

    this.add.text(width / 2, height / 2 + 45, `Monete raccolte: ${coins}`, {
      fontSize: '16px',
      color: '#fbbf24'
    }).setOrigin(0.5)

    // Restart button
    const restartBtn = this.add.text(width / 2, height / 2 + 100, '[ RIPROVA - ENTER ]', {
      fontSize: '18px',
      color: '#22c55e',
      backgroundColor: '#1f2937',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    restartBtn.on('pointerover', () => restartBtn.setColor('#4ade80'))
    restartBtn.on('pointerout', () => restartBtn.setColor('#22c55e'))
    restartBtn.on('pointerdown', () => this.restartGame())

    this.input.keyboard?.on('keydown-ENTER', () => this.restartGame())
  }

  showVictory(kills: number, coins: number) {
    const { width, height } = this.cameras.main

    // Golden background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)

    // Trophy icon
    this.add.text(width / 2, height / 2 - 100, '🏆', { fontSize: '64px' }).setOrigin(0.5)

    // Title
    const title = this.add.text(width / 2, height / 2 - 30, 'VITTORIA!', {
      fontSize: '36px',
      color: '#fbbf24',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    // Pulsing effect
    this.tweens.add({
      targets: title,
      scale: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1
    })

    // Quest title if available
    if (this.quest) {
      this.add.text(width / 2, height / 2 + 10, `"${this.quest.title}" completata!`, {
        fontSize: '14px',
        color: '#8b5cf6'
      }).setOrigin(0.5)
    }

    // Stats
    this.add.text(width / 2, height / 2 + 40, `⚔️ Nemici sconfitti: ${kills}`, {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5)

    this.add.text(width / 2, height / 2 + 60, `🪙 Monete raccolte: ${coins}`, {
      fontSize: '14px',
      color: '#fbbf24'
    }).setOrigin(0.5)

    // Buttons
    const menuBtn = this.add.text(width / 2 - 80, height / 2 + 110, '[ MENU ]', {
      fontSize: '16px',
      color: '#6b7280',
      backgroundColor: '#1f2937',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    const playAgainBtn = this.add.text(width / 2 + 80, height / 2 + 110, '[ NUOVA PARTITA ]', {
      fontSize: '16px',
      color: '#22c55e',
      backgroundColor: '#1f2937',
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    menuBtn.on('pointerover', () => menuBtn.setColor('#9ca3af'))
    menuBtn.on('pointerout', () => menuBtn.setColor('#6b7280'))
    menuBtn.on('pointerdown', () => {
      this.scene.stop('GameScene')
      this.scene.stop('UIScene')
      this.scene.start('MenuScene')
    })

    playAgainBtn.on('pointerover', () => playAgainBtn.setColor('#4ade80'))
    playAgainBtn.on('pointerout', () => playAgainBtn.setColor('#22c55e'))
    playAgainBtn.on('pointerdown', () => this.restartGame())

    this.input.keyboard?.on('keydown-ENTER', () => this.restartGame())
  }

  restartGame() {
    this.scene.stop('GameScene')
    this.scene.stop('UIScene')
    this.scene.start('MenuScene')
  }
}
