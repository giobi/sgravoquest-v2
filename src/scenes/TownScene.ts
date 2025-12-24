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

export class TownScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private npcs: NPC[] = []
  private doors: Door[] = []
  private buildings!: Phaser.Physics.Arcade.StaticGroup
  private interactHint?: Phaser.GameObjects.Text
  private nearbyNPC: NPC | null = null
  private nearbyDoor: Door | null = null
  private readonly TILE_SIZE = 16
  private playerDirection = 'down'
  private messageText?: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'TownScene' })
  }

  create() {
    // Create the town map
    this.createTownMap()

    // Create buildings (collision)
    this.createBuildings()

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
    this.physics.add.collider(this.player, this.buildings)
  }

  createTownMap() {
    const mapWidth = 50
    const mapHeight = 40

    // Create ground layer with grass
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const grassColor = Phaser.Math.Between(0, 10) > 8 ? 0x7cb342 : 0x8bc34a
        const tile = this.add.rectangle(
          x * this.TILE_SIZE + this.TILE_SIZE / 2,
          y * this.TILE_SIZE + this.TILE_SIZE / 2,
          this.TILE_SIZE,
          this.TILE_SIZE,
          grassColor
        )
        tile.setDepth(0)
      }
    }

    // Create paths (stone/dirt)
    this.createPaths()

    // Create decorations (trees, flowers)
    this.createDecorations()
  }

  createPaths() {
    const pathColor = 0xd7ccc8
    const pathDark = 0xbcaaa4

    // Main horizontal path through town
    for (let x = 0; x < 50; x++) {
      for (let dy = 0; dy < 3; dy++) {
        const color = dy === 1 ? pathColor : pathDark
        this.add.rectangle(
          x * this.TILE_SIZE + this.TILE_SIZE / 2,
          (20 + dy) * this.TILE_SIZE + this.TILE_SIZE / 2,
          this.TILE_SIZE,
          this.TILE_SIZE,
          color
        ).setDepth(1)
      }
    }

    // Vertical path to plaza
    for (let y = 10; y < 30; y++) {
      for (let dx = 0; dx < 3; dx++) {
        const color = dx === 1 ? pathColor : pathDark
        this.add.rectangle(
          (25 + dx) * this.TILE_SIZE + this.TILE_SIZE / 2,
          y * this.TILE_SIZE + this.TILE_SIZE / 2,
          this.TILE_SIZE,
          this.TILE_SIZE,
          color
        ).setDepth(1)
      }
    }

    // Plaza in the center
    for (let y = 17; y < 25; y++) {
      for (let x = 22; x < 30; x++) {
        const isEdge = x === 22 || x === 29 || y === 17 || y === 24
        this.add.rectangle(
          x * this.TILE_SIZE + this.TILE_SIZE / 2,
          y * this.TILE_SIZE + this.TILE_SIZE / 2,
          this.TILE_SIZE,
          this.TILE_SIZE,
          isEdge ? pathDark : pathColor
        ).setDepth(1)
      }
    }

    // Fountain in plaza center
    const fountainX = 26 * this.TILE_SIZE
    const fountainY = 21 * this.TILE_SIZE

    this.add.circle(fountainX, fountainY, 20, 0x5d99c6).setDepth(2)
    this.add.circle(fountainX, fountainY, 12, 0x90caf9).setDepth(3)
    this.add.circle(fountainX, fountainY, 5, 0xbbdefb).setDepth(4)
  }

  createDecorations() {
    // Trees around the edges
    const treePositions = [
      [3, 3], [8, 5], [2, 15], [5, 28], [10, 35],
      [45, 5], [42, 12], [47, 25], [40, 32], [44, 38],
      [15, 5], [35, 8], [12, 32], [38, 35],
      [3, 35], [47, 3]
    ]

    treePositions.forEach(([x, y]) => {
      this.createTree(x * this.TILE_SIZE, y * this.TILE_SIZE)
    })

    // Flowers scattered around
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(2, 48) * this.TILE_SIZE
      const y = Phaser.Math.Between(2, 38) * this.TILE_SIZE
      const colors = [0xf06292, 0xba68c8, 0xffb74d, 0xfff176, 0xff8a65]
      const color = Phaser.Math.RND.pick(colors)
      this.add.circle(x, y, 3, color).setDepth(2)
    }
  }

  createTree(x: number, y: number) {
    // Trunk
    this.add.rectangle(x, y + 8, 8, 16, 0x795548).setDepth(3)

    // Leaves (multiple circles for a fuller look)
    this.add.circle(x, y - 8, 14, 0x388e3c).setDepth(4)
    this.add.circle(x - 8, y - 4, 10, 0x43a047).setDepth(4)
    this.add.circle(x + 8, y - 4, 10, 0x43a047).setDepth(4)
    this.add.circle(x, y - 14, 10, 0x4caf50).setDepth(5)
  }

  createBuildings() {
    this.buildings = this.physics.add.staticGroup()

    const buildingData = [
      { x: 8, y: 12, w: 5, h: 4, color: 0xe57373, name: 'Panetteria', roofColor: 0xc62828, desc: 'Profumo di pane appena sfornato...' },
      { x: 8, y: 26, w: 5, h: 4, color: 0x64b5f6, name: 'Casa Blu', roofColor: 0x1976d2, desc: 'Una tranquilla casa di campagna.' },
      { x: 38, y: 12, w: 6, h: 5, color: 0xfff176, name: 'Municipio', roofColor: 0xf9a825, desc: 'Il cuore amministrativo del villaggio.' },
      { x: 38, y: 27, w: 5, h: 4, color: 0xa5d6a7, name: 'Erboristeria', roofColor: 0x388e3c, desc: 'Erbe misteriose e pozioni curative.' },
      { x: 20, y: 8, w: 4, h: 3, color: 0xce93d8, name: 'Biblioteca', roofColor: 0x7b1fa2, desc: 'Migliaia di libri antichi ti aspettano.' },
      { x: 30, y: 8, w: 4, h: 3, color: 0xffcc80, name: 'Locanda', roofColor: 0xe65100, desc: 'Birra fresca e pettegolezzi caldi!' },
    ]

    buildingData.forEach(b => {
      // Building body
      const bx = b.x * this.TILE_SIZE
      const by = b.y * this.TILE_SIZE
      const bw = b.w * this.TILE_SIZE
      const bh = b.h * this.TILE_SIZE

      // Main building rectangle
      const building = this.add.rectangle(bx + bw/2, by + bh/2, bw, bh, b.color)
      building.setDepth(6)
      building.setStrokeStyle(2, 0x5d4037)

      // Roof
      const roof = this.add.rectangle(bx + bw/2, by - 8, bw + 8, 16, b.roofColor)
      roof.setDepth(7)

      // Door
      this.add.rectangle(bx + bw/2, by + bh - 8, 12, 16, 0x5d4037).setDepth(7)

      // Door zone (for interaction) - just below the building
      this.doors.push({
        x: bx + bw/2,
        y: by + bh + 12,
        name: b.name,
        description: b.desc
      })

      // Windows
      if (b.w >= 5) {
        this.add.rectangle(bx + 16, by + bh/2 - 8, 10, 10, 0x90caf9).setDepth(7).setStrokeStyle(1, 0x5d4037)
        this.add.rectangle(bx + bw - 16, by + bh/2 - 8, 10, 10, 0x90caf9).setDepth(7).setStrokeStyle(1, 0x5d4037)
      }

      // Building name
      this.add.text(bx + bw/2, by - 20, b.name, {
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(10)

      // Collision box
      const collider = this.add.rectangle(bx + bw/2, by + bh/2, bw, bh)
      this.buildings.add(collider)
    })
  }

  createPlayer() {
    // Player starts in the plaza
    this.player = this.physics.add.sprite(26 * this.TILE_SIZE, 24 * this.TILE_SIZE, 'player_sprite')
    this.player.setDepth(20)
    this.player.setCollideWorldBounds(true)
    this.player.setSize(14, 14)

    // Set world bounds
    this.physics.world.setBounds(0, 0, 50 * this.TILE_SIZE, 40 * this.TILE_SIZE)
  }

  createNPCs() {
    const npcData = [
      {
        x: 24, y: 20,
        name: 'Marco il Panettiere',
        personality: 'Sei Marco, un panettiere allegro e chiacchierone di 45 anni. Ami parlare del tuo pane e della tua famiglia. Hai 3 figli e una moglie che ti aiuta in negozio. Sei sempre di buon umore tranne quando piove perché la gente non esce a comprare il pane.',
        role: 'Panettiere del villaggio',
        greeting: 'Buongiorno! Senti che profumo di pane appena sfornato?',
        color: 0xffab91
      },
      {
        x: 28, y: 22,
        name: 'Sofia la Bibliotecaria',
        personality: 'Sei Sofia, una bibliotecaria introversa e intellettuale di 32 anni. Ami i libri antichi e le storie di avventura. Sei timida ma quando si parla di libri ti illumini. Hai un gatto che vive nella biblioteca di nome Aristotele.',
        role: 'Bibliotecaria del villaggio',
        greeting: 'Oh, ciao... stavo proprio leggendo un libro affascinante sui draghi...',
        color: 0xce93d8
      },
      {
        x: 15, y: 21,
        name: 'Giovanni il Vecchio',
        personality: 'Sei Giovanni, un anziano di 78 anni che ha vissuto nel villaggio tutta la vita. Ami raccontare storie del passato, a volte esagerando un po. Sei saggio ma anche un po brontolone. Conosci tutti i segreti del villaggio.',
        role: 'Anziano del villaggio',
        greeting: 'Ah, i giovani di oggi... vieni, siediti, ti racconto di quando ero giovane io...',
        color: 0xbcaaa4
      },
      {
        x: 35, y: 21,
        name: 'Luna la Guaritrice',
        personality: 'Sei Luna, una giovane erborista di 25 anni. Sei misteriosa e parli spesso per enigmi. Credi nella magia delle piante e della natura. Sei gentile ma a volte sembri distratta, persa nei tuoi pensieri.',
        role: 'Erborista del villaggio',
        greeting: 'Le erbe mi hanno detto che saresti venuto... come posso aiutarti?',
        color: 0xa5d6a7
      },
      {
        x: 26, y: 18,
        name: 'Tommaso il Sindaco',
        personality: 'Sei Tommaso, il sindaco del villaggio. Hai 55 anni e sei molto formale e pomposo. Ti piace sentirti importante e usi spesso parole difficili. Sei però genuinamente preoccupato per il benessere del villaggio.',
        role: 'Sindaco del villaggio',
        greeting: 'Salve, cittadino! Sono Tommaso, il sindaco di questo glorioso villaggio!',
        color: 0xfff176
      },
      {
        x: 32, y: 15,
        name: 'Rosa la Locandiera',
        personality: 'Sei Rosa, la locandiera. Hai 40 anni e sei una donna pratica e diretta. Ami i pettegolezzi e sai tutto di tutti nel villaggio. Sei accogliente ma anche un po ficcanaso.',
        role: 'Locandiera del villaggio',
        greeting: 'Benvenuto alla Locanda del Gallo! Hai sentito l\'ultima novità?',
        color: 0xffcc80
      }
    ]

    npcData.forEach(data => {
      const sprite = this.physics.add.sprite(
        data.x * this.TILE_SIZE,
        data.y * this.TILE_SIZE,
        'npc_sprite'
      )
      sprite.setDepth(15)
      sprite.setTint(data.color)
      sprite.setImmovable(true)

      // NPC wander behavior
      this.time.addEvent({
        delay: Phaser.Math.Between(2000, 5000),
        callback: () => this.wanderNPC(sprite),
        loop: true
      })

      // Name tag above NPC
      const nameTag = this.add.text(data.x * this.TILE_SIZE, data.y * this.TILE_SIZE - 20, data.name.split(' ')[0], {
        fontSize: '8px',
        color: '#ffffff',
        backgroundColor: '#333333aa',
        padding: { x: 2, y: 1 }
      }).setOrigin(0.5).setDepth(16)

      // Make name tag follow NPC
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

    const directions = [
      { x: 20, y: 0 },
      { x: -20, y: 0 },
      { x: 0, y: 20 },
      { x: 0, y: -20 },
      { x: 0, y: 0 } // Stand still
    ]

    const dir = Phaser.Math.RND.pick(directions)

    this.tweens.add({
      targets: sprite,
      x: sprite.x + dir.x,
      y: sprite.y + dir.y,
      duration: 500,
      ease: 'Linear',
      onUpdate: () => {
        const nameTag = sprite.getData('nameTag') as Phaser.GameObjects.Text
        if (nameTag) {
          nameTag.setPosition(sprite.x, sprite.y - 20)
        }
      }
    })
  }

  setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys()

    // Prevent browser from capturing WASD keys
    this.input.keyboard!.addCapture(['W', 'A', 'S', 'D', 'E', 'ENTER', 'ESC'])

    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    }

    this.input.keyboard!.on('keydown-E', () => this.interact())
    this.input.keyboard!.on('keydown-ENTER', () => this.interact())
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.start('MenuScene')
    })
  }

  setupCamera() {
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setZoom(2)
    this.cameras.main.setBounds(0, 0, 50 * this.TILE_SIZE, 40 * this.TILE_SIZE)
  }

  createUI() {
    // Location indicator
    this.add.text(10, 10, '🏘️ Villaggio di Sgravo', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#333333aa',
      padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(100)

    // Controls hint
    this.add.text(400, 290, '↑←↓→ o WASD: Muovi | E: Parla | ESC: Menu', {
      fontSize: '10px',
      color: '#333333',
      backgroundColor: '#ffffffaa',
      padding: { x: 6, y: 3 }
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(100)
  }

  interact() {
    if (this.nearbyNPC) {
      // Start dialogue with this NPC
      this.scene.launch('DialogueScene', {
        npc: this.nearbyNPC,
        playerScene: this
      })
      this.scene.pause()
    } else if (this.nearbyDoor) {
      // Show building description
      this.showMessage(`${this.nearbyDoor.name}: ${this.nearbyDoor.description}`)
    }
  }

  showMessage(text: string) {
    // Remove existing message
    if (this.messageText) {
      this.messageText.destroy()
    }

    this.messageText = this.add.text(400, 50, text, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#1e293bdd',
      padding: { x: 16, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100)

    // Auto-hide after 3 seconds
    this.time.delayedCall(3000, () => {
      if (this.messageText) {
        this.messageText.destroy()
        this.messageText = undefined
      }
    })
  }

  update() {
    if (!this.player) return

    const speed = 100
    let vx = 0
    let vy = 0

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      vx = -speed
      this.playerDirection = 'left'
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      vx = speed
      this.playerDirection = 'right'
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      vy = -speed
      this.playerDirection = 'up'
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      vy = speed
      this.playerDirection = 'down'
    }

    this.player.setVelocity(vx, vy)

    // Check for nearby NPCs
    this.nearbyNPC = null
    this.nearbyDoor = null
    let closestDist = 40

    for (const npc of this.npcs) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        npc.sprite.x, npc.sprite.y
      )

      if (dist < closestDist) {
        closestDist = dist
        this.nearbyNPC = npc
      }
    }

    // Check for nearby doors (only if no NPC nearby)
    if (!this.nearbyNPC) {
      let closestDoorDist = 30
      for (const door of this.doors) {
        const dist = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          door.x, door.y
        )

        if (dist < closestDoorDist) {
          closestDoorDist = dist
          this.nearbyDoor = door
        }
      }
    }

    // Show/hide interact hint
    const currentNPC = this.nearbyNPC
    const currentDoor = this.nearbyDoor

    if (!this.interactHint) {
      this.interactHint = this.add.text(400, 260, '', {
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#333333dd',
        padding: { x: 8, y: 4 }
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100)
    }

    if (currentNPC) {
      this.interactHint.setText(`Premi E per parlare con ${currentNPC.name}`)
      this.interactHint.setVisible(true)
    } else if (currentDoor) {
      this.interactHint.setText(`Premi E per entrare: ${currentDoor.name}`)
      this.interactHint.setVisible(true)
    } else {
      this.interactHint.setVisible(false)
    }
  }
}
