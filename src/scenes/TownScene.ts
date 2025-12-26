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
  // Grass variants (row 38-39, green area at bottom)
  GRASS: [1520, 1521, 1522, 1560, 1561, 1562],
  GRASS_DARK: 1523,

  // Path/road (brown tiles)
  PATH_H: 564,  // horizontal path
  PATH_V: 604,  // vertical path
  PATH_CORNER_TL: 563,
  PATH_CORNER_TR: 565,
  PATH_CORNER_BL: 643,
  PATH_CORNER_BR: 645,

  // Trees (top rows)
  TREE_TOP: [0, 1, 2, 40, 41, 42],
  TREE_TRUNK: [80, 81, 82],

  // Houses - using the nice brown houses visible in tileset
  HOUSE_ROOF_L: 241,
  HOUSE_ROOF_M: 242,
  HOUSE_ROOF_R: 243,
  HOUSE_WALL_L: 281,
  HOUSE_WALL_M: 282,
  HOUSE_WALL_R: 283,
  HOUSE_DOOR: 322,
  HOUSE_WINDOW: 321,

  // Big house (4-wide)
  BIG_HOUSE_ROOF: [244, 245, 246, 247],
  BIG_HOUSE_WALL: [284, 285, 286, 287],

  // Water
  WATER: [180, 181, 220, 221],

  // Decorations
  FLOWER_RED: 45,
  FLOWER_YELLOW: 46,
  FLOWER_PURPLE: 47,
  BUSH: 83,
  ROCK: 163,
  FENCE_H: 484,
  FENCE_V: 524,

  // Fountain (center plaza)
  FOUNTAIN: [261, 262, 301, 302],

  // NPCs from tileset (row ~17-18, various characters)
  NPC_FRAMES: [697, 698, 699, 700, 701, 702, 737, 738, 739, 740]
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
  private readonly TILE_SIZE = 16
  private playerDirection = 'down'
  private messageText?: Phaser.GameObjects.Text
  private readonly MAP_WIDTH = 40
  private readonly MAP_HEIGHT = 30

  constructor() {
    super({ key: 'TownScene' })
  }

  create() {
    // Create collision group
    this.colliders = this.physics.add.staticGroup()

    // Build the map with real tiles
    this.createTileMap()

    // Create player
    this.createPlayer()

    // Create NPCs
    this.createNPCs()

    // Setup controls
    this.setupInput()

    // Setup camera
    this.setupCamera()

    // Create UI
    this.createUI()

    // Collisions
    this.physics.add.collider(this.player, this.colliders)
  }

  createTileMap() {
    // Layer 1: Ground (grass everywhere)
    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        const grassFrame = Phaser.Math.RND.pick(TILES.GRASS)
        this.addTile(x, y, grassFrame, 0)
      }
    }

    // Layer 2: Paths
    this.createPaths()

    // Layer 3: Buildings
    this.createBuildings()

    // Layer 4: Decorations (trees, flowers, etc)
    this.createDecorations()

    // Layer 5: Water/Fountain in plaza
    this.createFountain()
  }

  addTile(x: number, y: number, frame: number, depth: number): Phaser.GameObjects.Image {
    const tile = this.add.image(
      x * this.TILE_SIZE + this.TILE_SIZE / 2,
      y * this.TILE_SIZE + this.TILE_SIZE / 2,
      'tileset',
      frame
    )
    tile.setDepth(depth)
    return tile
  }

  addCollider(x: number, y: number, w: number = 1, h: number = 1) {
    const collider = this.add.rectangle(
      x * this.TILE_SIZE + (w * this.TILE_SIZE) / 2,
      y * this.TILE_SIZE + (h * this.TILE_SIZE) / 2,
      w * this.TILE_SIZE,
      h * this.TILE_SIZE
    )
    collider.setVisible(false)
    this.colliders.add(collider)
  }

  createPaths() {
    // Main horizontal path through village (y = 15)
    for (let x = 0; x < this.MAP_WIDTH; x++) {
      this.addTile(x, 14, TILES.PATH_H, 1)
      this.addTile(x, 15, TILES.PATH_H, 1)
      this.addTile(x, 16, TILES.PATH_H, 1)
    }

    // Vertical path to plaza (x = 19-21)
    for (let y = 8; y < 22; y++) {
      this.addTile(19, y, TILES.PATH_V, 1)
      this.addTile(20, y, TILES.PATH_V, 1)
      this.addTile(21, y, TILES.PATH_V, 1)
    }

    // Plaza area (center)
    for (let y = 12; y < 19; y++) {
      for (let x = 16; x < 25; x++) {
        this.addTile(x, y, TILES.PATH_H, 1)
      }
    }
  }

  createBuildings() {
    const buildings = [
      { x: 3, y: 8, name: 'Panetteria', desc: 'Profumo di pane fresco...' },
      { x: 3, y: 20, name: 'Casa Blu', desc: 'Una tranquilla dimora.' },
      { x: 32, y: 8, name: 'Municipio', desc: 'Il cuore del villaggio.' },
      { x: 32, y: 20, name: 'Erboristeria', desc: 'Erbe e pozioni misteriose.' },
      { x: 12, y: 4, name: 'Biblioteca', desc: 'Sapere antico.' },
      { x: 26, y: 4, name: 'Locanda', desc: 'Riposo e pettegolezzi!' },
    ]

    buildings.forEach((b, i) => {
      this.createHouse(b.x, b.y, i % 2 === 0 ? 3 : 4)

      // Add door zone
      this.doors.push({
        x: (b.x + 1.5) * this.TILE_SIZE,
        y: (b.y + 4) * this.TILE_SIZE,
        name: b.name,
        description: b.desc
      })

      // Building label
      this.add.text(
        (b.x + 1.5) * this.TILE_SIZE,
        (b.y - 0.5) * this.TILE_SIZE,
        b.name,
        { fontSize: '8px', color: '#ffffff', backgroundColor: '#333333aa', padding: { x: 2, y: 1 } }
      ).setOrigin(0.5).setDepth(10)
    })
  }

  createHouse(x: number, y: number, width: number) {
    // Roof row
    this.addTile(x, y, TILES.HOUSE_ROOF_L, 5)
    for (let i = 1; i < width - 1; i++) {
      this.addTile(x + i, y, TILES.HOUSE_ROOF_M, 5)
    }
    this.addTile(x + width - 1, y, TILES.HOUSE_ROOF_R, 5)

    // Wall row 1
    this.addTile(x, y + 1, TILES.HOUSE_WALL_L, 5)
    for (let i = 1; i < width - 1; i++) {
      this.addTile(x + i, y + 1, TILES.HOUSE_WINDOW, 5)
    }
    this.addTile(x + width - 1, y + 1, TILES.HOUSE_WALL_R, 5)

    // Wall row 2 with door
    this.addTile(x, y + 2, TILES.HOUSE_WALL_L, 5)
    const doorPos = Math.floor(width / 2)
    for (let i = 1; i < width - 1; i++) {
      if (i === doorPos) {
        this.addTile(x + i, y + 2, TILES.HOUSE_DOOR, 5)
      } else {
        this.addTile(x + i, y + 2, TILES.HOUSE_WALL_M, 5)
      }
    }
    this.addTile(x + width - 1, y + 2, TILES.HOUSE_WALL_R, 5)

    // Collision for entire building
    this.addCollider(x, y, width, 3)
  }

  createDecorations() {
    // Trees around edges
    const treePositions = [
      [1, 2], [1, 12], [1, 25],
      [38, 2], [38, 12], [38, 25],
      [8, 2], [14, 2], [25, 2], [31, 2],
      [8, 26], [14, 26], [25, 26], [31, 26],
      [6, 14], [10, 18], [29, 14], [33, 18],
    ]

    treePositions.forEach(([x, y]) => {
      this.createTree(x, y)
    })

    // Flowers scattered
    for (let i = 0; i < 25; i++) {
      const fx = Phaser.Math.Between(2, this.MAP_WIDTH - 3)
      const fy = Phaser.Math.Between(2, this.MAP_HEIGHT - 3)
      const flowerFrame = Phaser.Math.RND.pick([TILES.FLOWER_RED, TILES.FLOWER_YELLOW, TILES.FLOWER_PURPLE])
      this.addTile(fx, fy, flowerFrame, 2)
    }

    // Bushes
    for (let i = 0; i < 10; i++) {
      const bx = Phaser.Math.Between(2, this.MAP_WIDTH - 3)
      const by = Phaser.Math.Between(2, this.MAP_HEIGHT - 3)
      this.addTile(bx, by, TILES.BUSH, 2)
    }

    // Fences along some edges
    for (let x = 0; x < 6; x++) {
      this.addTile(x, 0, TILES.FENCE_H, 3)
      this.addTile(this.MAP_WIDTH - 1 - x, 0, TILES.FENCE_H, 3)
    }
  }

  createTree(x: number, y: number) {
    // Tree top (2x2)
    this.addTile(x, y, TILES.TREE_TOP[0], 6)
    this.addTile(x + 1, y, TILES.TREE_TOP[1], 6)
    this.addTile(x, y + 1, TILES.TREE_TOP[3], 6)
    this.addTile(x + 1, y + 1, TILES.TREE_TOP[4], 6)

    // Collision
    this.addCollider(x, y, 2, 2)
  }

  createFountain() {
    // Simple fountain in plaza center (4 tiles)
    const fx = 19
    const fy = 14

    // Water tiles
    this.addTile(fx, fy, TILES.WATER[0], 3)
    this.addTile(fx + 1, fy, TILES.WATER[1], 3)
    this.addTile(fx, fy + 1, TILES.WATER[2], 3)
    this.addTile(fx + 1, fy + 1, TILES.WATER[3], 3)

    // Collision
    this.addCollider(fx, fy, 2, 2)
  }

  createPlayer() {
    this.player = this.physics.add.sprite(20 * this.TILE_SIZE, 18 * this.TILE_SIZE, 'player', 0)
    this.player.setDepth(20)
    this.player.setCollideWorldBounds(true)
    this.player.setSize(10, 10)
    this.player.setOffset(3, 6)

    this.physics.world.setBounds(0, 0, this.MAP_WIDTH * this.TILE_SIZE, this.MAP_HEIGHT * this.TILE_SIZE)
  }

  createNPCs() {
    const npcData = [
      {
        x: 18, y: 13,
        name: 'Marco il Panettiere',
        personality: 'Sei Marco, un panettiere allegro di 45 anni. Ami parlare del tuo pane e della famiglia.',
        role: 'Panettiere',
        greeting: 'Buongiorno! Senti che profumo?',
        frame: TILES.NPC_FRAMES[0]
      },
      {
        x: 22, y: 15,
        name: 'Sofia la Bibliotecaria',
        personality: 'Sei Sofia, bibliotecaria timida di 32 anni. Ami i libri antichi e hai un gatto, Aristotele.',
        role: 'Bibliotecaria',
        greeting: 'Oh, ciao... stavo leggendo...',
        frame: TILES.NPC_FRAMES[1]
      },
      {
        x: 16, y: 17,
        name: 'Giovanni il Vecchio',
        personality: 'Sei Giovanni, anziano di 78 anni. Racconti storie del passato, a volte esagerando.',
        role: 'Saggio',
        greeting: 'Ah, i giovani... siediti, ti racconto...',
        frame: TILES.NPC_FRAMES[2]
      },
      {
        x: 24, y: 13,
        name: 'Luna la Guaritrice',
        personality: 'Sei Luna, erborista misteriosa di 25 anni. Parli per enigmi e credi nella magia.',
        role: 'Guaritrice',
        greeting: 'Le erbe sapevano che saresti venuto...',
        frame: TILES.NPC_FRAMES[3]
      },
      {
        x: 20, y: 11,
        name: 'Tommaso il Sindaco',
        personality: 'Sei Tommaso, sindaco pomposo di 55 anni. Ami sentirti importante.',
        role: 'Sindaco',
        greeting: 'Salve, cittadino! Sono il sindaco!',
        frame: TILES.NPC_FRAMES[4]
      },
      {
        x: 23, y: 17,
        name: 'Rosa la Locandiera',
        personality: 'Sei Rosa, locandiera pettegola di 40 anni. Sai tutto di tutti.',
        role: 'Locandiera',
        greeting: 'Benvenuto! Hai sentito l\'ultima?',
        frame: TILES.NPC_FRAMES[5]
      }
    ]

    npcData.forEach(data => {
      const sprite = this.physics.add.sprite(
        data.x * this.TILE_SIZE,
        data.y * this.TILE_SIZE,
        'tileset',
        data.frame
      )
      sprite.setDepth(15)
      sprite.setImmovable(true)

      // NPC wander
      this.time.addEvent({
        delay: Phaser.Math.Between(2000, 4000),
        callback: () => this.wanderNPC(sprite),
        loop: true
      })

      // Name tag
      const nameTag = this.add.text(
        data.x * this.TILE_SIZE,
        data.y * this.TILE_SIZE - 12,
        data.name.split(' ')[0],
        { fontSize: '7px', color: '#fff', backgroundColor: '#333a', padding: { x: 2, y: 1 } }
      ).setOrigin(0.5).setDepth(16)

      sprite.setData('nameTag', nameTag)

      this.npcs.push({
        sprite,
        name: data.name,
        personality: data.personality,
        role: data.role,
        greeting: data.greeting
      })
    })
  }

  wanderNPC(sprite: Phaser.Physics.Arcade.Sprite) {
    if (!sprite.active) return

    const dirs = [
      { x: 16, y: 0 }, { x: -16, y: 0 },
      { x: 0, y: 16 }, { x: 0, y: -16 },
      { x: 0, y: 0 }
    ]
    const dir = Phaser.Math.RND.pick(dirs)

    this.tweens.add({
      targets: sprite,
      x: sprite.x + dir.x,
      y: sprite.y + dir.y,
      duration: 400,
      ease: 'Linear',
      onUpdate: () => {
        const tag = sprite.getData('nameTag') as Phaser.GameObjects.Text
        if (tag) tag.setPosition(sprite.x, sprite.y - 12)
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
    this.cameras.main.setBounds(0, 0, this.MAP_WIDTH * this.TILE_SIZE, this.MAP_HEIGHT * this.TILE_SIZE)
  }

  createUI() {
    this.add.text(10, 10, '🏘️ Villaggio di Sgravo', {
      fontSize: '10px', color: '#fff', backgroundColor: '#333a', padding: { x: 6, y: 3 }
    }).setScrollFactor(0).setDepth(100)

    this.add.text(400, 290, '↑←↓→: Muovi | E: Interagisci | ESC: Menu', {
      fontSize: '8px', color: '#333', backgroundColor: '#fffa', padding: { x: 4, y: 2 }
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
      fontSize: '12px', color: '#fff', backgroundColor: '#1e293bdd', padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100)

    this.time.delayedCall(3000, () => {
      if (this.messageText) {
        this.messageText.destroy()
        this.messageText = undefined
      }
    })
  }

  update() {
    if (!this.player) return

    const speed = 80
    let vx = 0, vy = 0, moving = false

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      vx = -speed; this.playerDirection = 'left'; moving = true
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      vx = speed; this.playerDirection = 'right'; moving = true
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      vy = -speed; this.playerDirection = 'up'; moving = true
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      vy = speed; this.playerDirection = 'down'; moving = true
    }

    this.player.setVelocity(vx, vy)

    if (moving) {
      this.player.anims.play(`player-walk-${this.playerDirection}`, true)
    } else {
      this.player.anims.play(`player-idle-${this.playerDirection}`, true)
    }

    // Check nearby NPCs
    this.nearbyNPC = null
    this.nearbyDoor = null
    let closest = 30

    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.sprite.x, npc.sprite.y)
      if (d < closest) { closest = d; this.nearbyNPC = npc }
    }

    if (!this.nearbyNPC) {
      let closestDoor = 25
      for (const door of this.doors) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, door.x, door.y)
        if (d < closestDoor) { closestDoor = d; this.nearbyDoor = door }
      }
    }

    // Interaction hint
    if (!this.interactHint) {
      this.interactHint = this.add.text(400, 260, '', {
        fontSize: '9px', color: '#fff', backgroundColor: '#333d', padding: { x: 6, y: 3 }
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100)
    }

    if (this.nearbyNPC) {
      this.interactHint.setText(`E: Parla con ${this.nearbyNPC.name}`)
      this.interactHint.setVisible(true)
    } else if (this.nearbyDoor) {
      this.interactHint.setText(`E: ${this.nearbyDoor.name}`)
      this.interactHint.setVisible(true)
    } else {
      this.interactHint.setVisible(false)
    }
  }
}
