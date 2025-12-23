import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    const progressBar = this.add.graphics()
    const progressBox = this.add.graphics()
    progressBox.fillStyle(0x222222, 0.8)
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50)

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Caricamento...', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5)

    this.load.on('progress', (value: number) => {
      progressBar.clear()
      progressBar.fillStyle(0x8b5cf6, 1)
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30)
    })

    this.load.on('complete', () => {
      progressBar.destroy()
      progressBox.destroy()
      loadingText.destroy()
    })

    // 0x72 Dungeon Tileset II - Classic 16x16 pixel art (public domain)
    // https://0x72.itch.io/dungeontileset-ii
    this.load.spritesheet('dungeon_tiles',
      'https://i.imgur.com/ejYSWdl.png', // 0x72 tileset hosted
      { frameWidth: 16, frameHeight: 16 }
    )

    // 0x72 Characters
    this.load.spritesheet('characters',
      'https://i.imgur.com/4LxXBnU.png', // characters spritesheet
      { frameWidth: 16, frameHeight: 16 }
    )
  }

  create() {
    // Create all sprites programmatically - reliable and always works
    this.createPlayerSprite()
    this.createEnemySprite()
    this.createNpcSprite()
    this.createCoinSprite()
    this.createPortalSprite()

    this.scene.start('MenuScene')
  }

  createPlayerSprite() {
    const g = this.add.graphics()

    // Knight character (16x16) - retro style
    g.fillStyle(0x3b82f6)
    g.fillRect(4, 6, 8, 8)
    g.fillStyle(0xfcd34d)
    g.fillRect(5, 2, 6, 5)
    g.fillStyle(0x92400e)
    g.fillRect(5, 1, 6, 2)
    g.fillStyle(0x1f2937)
    g.fillRect(6, 4, 1, 1)
    g.fillRect(9, 4, 1, 1)
    g.fillStyle(0x4b5563)
    g.fillRect(5, 14, 2, 2)
    g.fillRect(9, 14, 2, 2)
    g.fillStyle(0xd1d5db)
    g.fillRect(12, 5, 2, 8)

    g.generateTexture('player_sprite', 16, 16)
    g.destroy()
  }

  createEnemySprite() {
    const g = this.add.graphics()

    // Slime blob
    g.fillStyle(0x22c55e)
    g.fillRect(3, 8, 10, 6)
    g.fillRect(4, 6, 8, 2)
    g.fillRect(5, 5, 6, 1)
    g.fillStyle(0x16a34a)
    g.fillRect(4, 12, 8, 2)
    g.fillStyle(0x1f2937)
    g.fillRect(5, 8, 2, 2)
    g.fillRect(9, 8, 2, 2)
    g.fillStyle(0x86efac)
    g.fillRect(6, 6, 1, 1)

    g.generateTexture('enemy_sprite', 16, 16)
    g.destroy()
  }

  createNpcSprite() {
    const g = this.add.graphics()

    // Wizard
    g.fillStyle(0x8b5cf6)
    g.fillRect(4, 6, 8, 9)
    g.fillStyle(0xfcd34d)
    g.fillRect(5, 2, 6, 5)
    g.fillStyle(0x9ca3af)
    g.fillRect(6, 6, 4, 3)
    g.fillStyle(0x6d28d9)
    g.fillRect(4, 0, 8, 3)
    g.fillStyle(0x1f2937)
    g.fillRect(6, 4, 1, 1)
    g.fillRect(9, 4, 1, 1)
    g.fillStyle(0x92400e)
    g.fillRect(13, 2, 2, 12)

    g.generateTexture('npc_sprite', 16, 16)
    g.destroy()
  }

  createCoinSprite() {
    const g = this.add.graphics()

    g.fillStyle(0xfbbf24)
    g.fillCircle(8, 8, 5)
    g.fillStyle(0xf59e0b)
    g.fillCircle(8, 8, 3)

    g.generateTexture('coin_sprite', 16, 16)
    g.destroy()
  }

  createPortalSprite() {
    const g = this.add.graphics()

    g.lineStyle(2, 0x8b5cf6)
    g.strokeCircle(8, 8, 6)
    g.fillStyle(0xc4b5fd, 0.5)
    g.fillCircle(8, 8, 4)
    g.fillStyle(0x7c3aed)
    g.fillCircle(8, 8, 2)

    g.generateTexture('portal_sprite', 16, 16)
    g.destroy()
  }
}
