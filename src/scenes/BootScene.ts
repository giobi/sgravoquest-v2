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

    // Pokemon-style tileset (CC-BY 3.0 - Damian Gasinski aka Gassasin)
    this.load.spritesheet('tileset',
      '/sprites/PokemonLike.png',
      { frameWidth: 16, frameHeight: 16 }
    )

    // Player spritesheet with walk animations
    this.load.spritesheet('player',
      '/sprites/player-sheet.png',
      { frameWidth: 16, frameHeight: 16 }
    )
  }

  create() {
    // Create player walk animations
    // Frames: 0-3 down, 4-7 up, 8-11 left, 12-15 right
    this.anims.create({
      key: 'player-walk-down',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    })

    this.anims.create({
      key: 'player-walk-up',
      frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
      frameRate: 8,
      repeat: -1
    })

    this.anims.create({
      key: 'player-walk-left',
      frames: this.anims.generateFrameNumbers('player', { start: 8, end: 11 }),
      frameRate: 8,
      repeat: -1
    })

    this.anims.create({
      key: 'player-walk-right',
      frames: this.anims.generateFrameNumbers('player', { start: 12, end: 15 }),
      frameRate: 8,
      repeat: -1
    })

    this.anims.create({
      key: 'player-idle-down',
      frames: [{ key: 'player', frame: 0 }],
      frameRate: 1
    })

    this.anims.create({
      key: 'player-idle-up',
      frames: [{ key: 'player', frame: 4 }],
      frameRate: 1
    })

    this.anims.create({
      key: 'player-idle-left',
      frames: [{ key: 'player', frame: 8 }],
      frameRate: 1
    })

    this.anims.create({
      key: 'player-idle-right',
      frames: [{ key: 'player', frame: 12 }],
      frameRate: 1
    })

    // Create NPC sprites (different colors for different NPCs)
    this.createNPCSprites()

    this.scene.start('MenuScene')
  }

  createNPCSprites() {
    // Use tileset frame for NPCs or create colored versions
    const npcColors = [
      { name: 'npc_baker', color: 0xffab91 },     // Marco - orange
      { name: 'npc_librarian', color: 0xce93d8 }, // Sofia - purple
      { name: 'npc_elder', color: 0xbcaaa4 },     // Giovanni - brown
      { name: 'npc_healer', color: 0xa5d6a7 },    // Luna - green
      { name: 'npc_mayor', color: 0xfff176 },     // Tommaso - yellow
      { name: 'npc_innkeeper', color: 0xffcc80 }  // Rosa - orange
    ]

    npcColors.forEach(npc => {
      const g = this.add.graphics()

      // Simple villager sprite
      g.fillStyle(npc.color)
      g.fillRect(4, 4, 8, 10)  // Body
      g.fillStyle(0xfcd34d)
      g.fillRect(5, 1, 6, 4)   // Head
      g.fillStyle(0x1f2937)
      g.fillRect(6, 2, 1, 1)   // Eye
      g.fillRect(9, 2, 1, 1)   // Eye
      g.fillStyle(0x5d4037)
      g.fillRect(5, 14, 2, 2)  // Feet
      g.fillRect(9, 14, 2, 2)

      g.generateTexture(npc.name, 16, 16)
      g.destroy()
    })

    // Fallback generic NPC
    const g = this.add.graphics()
    g.fillStyle(0x8b5cf6)
    g.fillRect(4, 4, 8, 10)
    g.fillStyle(0xfcd34d)
    g.fillRect(5, 1, 6, 4)
    g.fillStyle(0x1f2937)
    g.fillRect(6, 2, 1, 1)
    g.fillRect(9, 2, 1, 1)
    g.fillStyle(0x5d4037)
    g.fillRect(5, 14, 2, 2)
    g.fillRect(9, 14, 2, 2)
    g.generateTexture('npc_sprite', 16, 16)
    g.destroy()
  }
}
