import Phaser from 'phaser'

interface NPC {
  sprite: Phaser.Physics.Arcade.Sprite
  name: string
  personality: string
  role: string
  greeting: string
}

interface Door {
  x: number
  y: number
  name: string
  description: string
}

// Tileset is 40x40 tiles (640x640 px, 16x16 each)
// Frame = col + (row * 40)
const TILES = {
  // Grass - plain green (row 0-2)
  GRASS: [0, 1, 2, 40, 41],

  // Water - TRUE blue/cyan (row 7, 9)
  WATER: 284,
  WATER_ALT: 364,

  // Path - tan/sandy (row 4-5)
  PATH: 168,
  PATH_H: 169,
  PATH_V: 208,
  PATH_ALT: 209,

  // Bridge - wooden planks (row 5)
  BRIDGE: 204,

  // Trees (row 0-1, 2x2)
  TREE_TL: 6,
  TREE_TR: 7,
  TREE_BL: 46,
  TREE_BR: 47,

  // Houses - brown wooden (row 12-13)
  ROOF: 485,
  WALL: 525,
  WALL_WINDOW: 567,
  WALL_DOOR: 565,

  // Church
  CHURCH_ROOF: 484,
  CHURCH_WALL: 524,

  // NPCs (row 19)
  NPC: 774
}

export class TownScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private npcs: NPC[] = []
  private doors: Door[] = []
  private colliders!: Phaser.Physics.Arcade.StaticGroup
  private interactHint?: Phaser.GameObjects.Text
  private nearbyNPC: NPC | null = null
  private nearbyDoor: Door | null = null
  private readonly TILE = 16
  private playerDirection = 'down'
  private messageText?: Phaser.GameObjects.Text

  // Map size
  private readonly W = 30  // width in tiles
  private readonly H = 24  // height in tiles

  constructor() {
    super({ key: 'TownScene' })
  }

  create() {
    this.colliders = this.physics.add.staticGroup()

    // Build Verbania-inspired map
    this.createMap()
    this.createPlayer()
    this.createNPCs()
    this.setupInput()
    this.setupCamera()
    this.createUI()

    this.physics.add.collider(this.player, this.colliders)
  }

  tile(x: number, y: number, frame: number, depth: number = 1) {
    return this.add.image(x * this.TILE + 8, y * this.TILE + 8, 'tileset', frame).setDepth(depth)
  }

  block(x: number, y: number, w: number = 1, h: number = 1) {
    const rect = this.add.rectangle(
      x * this.TILE + (w * this.TILE) / 2,
      y * this.TILE + (h * this.TILE) / 2,
      w * this.TILE, h * this.TILE
    ).setVisible(false)
    this.colliders.add(rect)
  }

  createMap() {
    // === LAYER 0: Base grass everywhere ===
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        this.tile(x, y, Phaser.Math.RND.pick(TILES.GRASS), 0)
      }
    }

    // === LAYER 1: Lake at bottom (rows 20-23) ===
    for (let y = 20; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        // Alternate water tiles for variety
        this.tile(x, y, (x + y) % 2 === 0 ? TILES.WATER : TILES.WATER_ALT, 1)
      }
    }
    // Lake collision
    this.block(0, 20, this.W, 4)

    // === LAYER 2: Rivers on sides (cols 3-4 left, 25-26 right) ===
    // Left river (San Bernardino)
    for (let y = 0; y < 20; y++) {
      this.tile(3, y, TILES.WATER, 1)
      this.tile(4, y, TILES.WATER, 1)
    }
    this.block(3, 0, 2, 18) // Collision except at bridge

    // Right river (San Giovanni)
    for (let y = 0; y < 20; y++) {
      this.tile(25, y, TILES.WATER, 1)
      this.tile(26, y, TILES.WATER, 1)
    }
    this.block(25, 0, 2, 18)

    // === LAYER 3: Lungolago (row 18-19) ===
    for (let x = 0; x < this.W; x++) {
      this.tile(x, 18, TILES.PATH_H, 2)
      this.tile(x, 19, TILES.PATH_H, 2)
    }

    // === LAYER 4: Bridges over rivers ===
    // Left bridge
    for (let i = 0; i < 2; i++) {
      this.tile(3, 18 + i, TILES.BRIDGE, 3)
      this.tile(4, 18 + i, TILES.BRIDGE, 3)
    }
    // Right bridge
    for (let i = 0; i < 2; i++) {
      this.tile(25, 18 + i, TILES.BRIDGE, 3)
      this.tile(26, 18 + i, TILES.BRIDGE, 3)
    }

    // === LAYER 5: Piazza centrale (cols 12-17, rows 14-17) ===
    for (let y = 14; y < 18; y++) {
      for (let x = 12; x < 18; x++) {
        this.tile(x, y, TILES.PATH, 2)
      }
    }

    // === LAYER 6: Two streets going up from piazza ===
    // Left street (Via principale sx)
    for (let y = 4; y < 14; y++) {
      this.tile(13, y, TILES.PATH_V, 2)
      this.tile(14, y, TILES.PATH_V, 2)
    }
    // Right street (Via principale dx)
    for (let y = 4; y < 14; y++) {
      this.tile(15, y, TILES.PATH_V, 2)
      this.tile(16, y, TILES.PATH_V, 2)
    }

    // === LAYER 7: Chiesa at top center ===
    this.createChurch(13, 1)

    // === LAYER 8: Houses in centro storico ===
    // Left side houses
    this.createHouse(6, 6, 'Panetteria', 'Profumo di pane fresco')
    this.createHouse(6, 11, 'Biblioteca', 'Sapere antico')

    // Right side houses
    this.createHouse(20, 6, 'Erboristeria', 'Erbe e pozioni')
    this.createHouse(20, 11, 'Locanda', 'Riposo e storie')

    // === LAYER 9: Trees scattered in green areas ===
    const treeSpots = [
      [1, 2], [1, 8], [1, 14],
      [8, 3], [8, 9], [10, 15],
      [19, 15], [21, 3], [21, 9],
      [28, 2], [28, 8], [28, 14]
    ]
    treeSpots.forEach(([x, y]) => this.createTree(x, y))

    // === LAYER 10: Vigili (guards) at edges ===
    this.createGuard(1, 18, 'Vigile', 'Di là si va a Pallanza... meglio restare qui!')
    this.createGuard(28, 18, 'Vigile', 'La Svizzera? Non oggi, mi spiace!')
  }

  createChurch(x: number, y: number) {
    // 4x3 church
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 4; dx++) {
        if (dy === 0) {
          this.tile(x + dx, y + dy, TILES.CHURCH_ROOF, 5)
        } else {
          this.tile(x + dx, y + dy, TILES.CHURCH_WALL, 5)
        }
      }
    }
    // Door in center
    this.tile(x + 1, y + 2, TILES.WALL_DOOR, 5)
    this.tile(x + 2, y + 2, TILES.WALL_DOOR, 5)

    this.block(x, y, 4, 3)

    this.add.text((x + 2) * this.TILE, (y - 0.5) * this.TILE, '⛪ Chiesa', {
      fontSize: '8px', color: '#fff', backgroundColor: '#333a', padding: { x: 2, y: 1 }
    }).setOrigin(0.5).setDepth(10)

    this.doors.push({
      x: (x + 2) * this.TILE,
      y: (y + 3) * this.TILE,
      name: 'Chiesa',
      description: 'La chiesa del villaggio. Pace e silenzio.'
    })
  }

  createHouse(x: number, y: number, name: string, desc: string) {
    // 3x3 house
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        if (dy === 0) {
          this.tile(x + dx, y + dy, TILES.ROOF, 5)
        } else if (dy === 1) {
          this.tile(x + dx, y + dy, dx === 1 ? TILES.WALL_WINDOW : TILES.WALL, 5)
        } else {
          this.tile(x + dx, y + dy, dx === 1 ? TILES.WALL_DOOR : TILES.WALL, 5)
        }
      }
    }

    this.block(x, y, 3, 3)

    this.add.text((x + 1.5) * this.TILE, (y - 0.5) * this.TILE, name, {
      fontSize: '7px', color: '#fbbf24', backgroundColor: '#333a', padding: { x: 2, y: 1 }
    }).setOrigin(0.5).setDepth(10)

    this.doors.push({
      x: (x + 1.5) * this.TILE,
      y: (y + 3.5) * this.TILE,
      name,
      description: desc
    })
  }

  createTree(x: number, y: number) {
    this.tile(x, y, TILES.TREE_TL, 6)
    this.tile(x + 1, y, TILES.TREE_TR, 6)
    this.tile(x, y + 1, TILES.TREE_BL, 6)
    this.tile(x + 1, y + 1, TILES.TREE_BR, 6)
    this.block(x, y, 2, 2)
  }

  createGuard(x: number, y: number, name: string, message: string) {
    const sprite = this.physics.add.sprite(x * this.TILE, y * this.TILE, 'tileset', TILES.NPC)
    sprite.setDepth(15).setImmovable(true)

    this.add.text(x * this.TILE, (y - 1) * this.TILE, '👮', {
      fontSize: '12px'
    }).setOrigin(0.5).setDepth(16)

    this.npcs.push({
      sprite,
      name,
      personality: `Sei un vigile urbano. Sei gentile ma fermo. Rispondi sempre: "${message}"`,
      role: 'Vigile',
      greeting: message
    })
  }

  createPlayer() {
    // Start in piazza
    this.player = this.physics.add.sprite(15 * this.TILE, 16 * this.TILE, 'player', 0)
    this.player.setDepth(20)
    this.player.setCollideWorldBounds(true)
    this.player.setSize(10, 10).setOffset(3, 6)
    this.physics.world.setBounds(0, 0, this.W * this.TILE, this.H * this.TILE)
  }

  createNPCs() {
    const npcData = [
      { x: 14, y: 15, name: 'Marco il Panettiere', personality: 'Panettiere allegro, ami il pane e la famiglia.', role: 'Panettiere' },
      { x: 16, y: 15, name: 'Sofia la Bibliotecaria', personality: 'Bibliotecaria timida, ami i libri antichi.', role: 'Bibliotecaria' },
      { x: 13, y: 17, name: 'Giovanni il Vecchio', personality: 'Anziano saggio, racconti storie del passato.', role: 'Saggio' },
      { x: 17, y: 17, name: 'Rosa la Locandiera', personality: 'Locandiera pettegola, sai tutto di tutti.', role: 'Locandiera' },
    ]

    npcData.forEach(data => {
      const sprite = this.physics.add.sprite(data.x * this.TILE, data.y * this.TILE, 'tileset', TILES.NPC)
      sprite.setDepth(15).setImmovable(true)

      const nameTag = this.add.text(data.x * this.TILE, data.y * this.TILE - 10, data.name.split(' ')[0], {
        fontSize: '6px', color: '#fff', backgroundColor: '#333a', padding: { x: 1, y: 1 }
      }).setOrigin(0.5).setDepth(16)

      sprite.setData('nameTag', nameTag)

      // Gentle wandering
      this.time.addEvent({
        delay: Phaser.Math.Between(3000, 5000),
        callback: () => this.wanderNPC(sprite),
        loop: true
      })

      this.npcs.push({
        sprite,
        name: data.name,
        personality: data.personality,
        role: data.role,
        greeting: `Ciao! Sono ${data.name.split(' ')[0]}.`
      })
    })
  }

  wanderNPC(sprite: Phaser.Physics.Arcade.Sprite) {
    if (!sprite.active) return
    const dir = Phaser.Math.RND.pick([
      { x: 8, y: 0 }, { x: -8, y: 0 }, { x: 0, y: 8 }, { x: 0, y: -8 }, { x: 0, y: 0 }
    ])
    this.tweens.add({
      targets: sprite,
      x: sprite.x + dir.x,
      y: sprite.y + dir.y,
      duration: 500,
      onUpdate: () => {
        const tag = sprite.getData('nameTag') as Phaser.GameObjects.Text
        if (tag) tag.setPosition(sprite.x, sprite.y - 10)
      }
    })
  }

  setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.input.keyboard!.addCapture(['W', 'A', 'S', 'D', 'E', 'ENTER', 'ESC'])
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    }
    this.input.keyboard!.on('keydown-E', () => this.interact())
    this.input.keyboard!.on('keydown-ENTER', () => this.interact())
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('MenuScene'))
  }

  setupCamera() {
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setZoom(2.5)
    this.cameras.main.setBounds(0, 0, this.W * this.TILE, this.H * this.TILE)
  }

  createUI() {
    this.add.text(10, 10, '🏘️ Verbania', {
      fontSize: '10px', color: '#fff', backgroundColor: '#333a', padding: { x: 4, y: 2 }
    }).setScrollFactor(0).setDepth(100)

    this.add.text(400, 290, '↑←↓→: Muovi | E: Parla | ESC: Menu', {
      fontSize: '7px', color: '#333', backgroundColor: '#fffa', padding: { x: 3, y: 2 }
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(100)
  }

  interact() {
    if (this.nearbyNPC) {
      this.scene.launch('DialogueScene', { npc: this.nearbyNPC })
      this.scene.pause()
    } else if (this.nearbyDoor) {
      this.showMessage(`${this.nearbyDoor.name}: ${this.nearbyDoor.description}`)
    }
  }

  showMessage(text: string) {
    if (this.messageText) this.messageText.destroy()
    this.messageText = this.add.text(400, 40, text, {
      fontSize: '10px', color: '#fff', backgroundColor: '#1e293bdd', padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100)
    this.time.delayedCall(3000, () => {
      if (this.messageText) { this.messageText.destroy(); this.messageText = undefined }
    })
  }

  update() {
    if (!this.player) return

    const speed = 80
    let vx = 0, vy = 0, moving = false

    if (this.cursors.left.isDown || this.wasd.A.isDown) { vx = -speed; this.playerDirection = 'left'; moving = true }
    else if (this.cursors.right.isDown || this.wasd.D.isDown) { vx = speed; this.playerDirection = 'right'; moving = true }
    if (this.cursors.up.isDown || this.wasd.W.isDown) { vy = -speed; this.playerDirection = 'up'; moving = true }
    else if (this.cursors.down.isDown || this.wasd.S.isDown) { vy = speed; this.playerDirection = 'down'; moving = true }

    this.player.setVelocity(vx, vy)
    this.player.anims.play(moving ? `player-walk-${this.playerDirection}` : `player-idle-${this.playerDirection}`, true)

    // Check nearby
    this.nearbyNPC = null
    this.nearbyDoor = null

    for (const npc of this.npcs) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.sprite.x, npc.sprite.y) < 25) {
        this.nearbyNPC = npc
        break
      }
    }

    if (!this.nearbyNPC) {
      for (const door of this.doors) {
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, door.x, door.y) < 20) {
          this.nearbyDoor = door
          break
        }
      }
    }

    // Hint
    if (!this.interactHint) {
      this.interactHint = this.add.text(400, 260, '', {
        fontSize: '8px', color: '#fff', backgroundColor: '#333d', padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100)
    }

    if (this.nearbyNPC) {
      this.interactHint.setText(`E: Parla con ${this.nearbyNPC.name.split(' ')[0]}`)
      this.interactHint.setVisible(true)
    } else if (this.nearbyDoor) {
      this.interactHint.setText(`E: ${this.nearbyDoor.name}`)
      this.interactHint.setVisible(true)
    } else {
      this.interactHint.setVisible(false)
    }
  }
}
