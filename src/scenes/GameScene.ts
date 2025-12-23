import Phaser from 'phaser'
import Dungeon from '@mikewesthad/dungeon'

interface Quest {
  title: string
  description: string
  maps: Array<{
    width: number
    height: number
    tiles: number[][]
    startPosition?: { x: number; y: number }
  }>
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private map!: Phaser.Tilemaps.Tilemap
  private groundLayer!: Phaser.Tilemaps.TilemapLayer
  private wallsLayer!: Phaser.Tilemaps.TilemapLayer
  private enemies!: Phaser.Physics.Arcade.Group
  private playerHealth = 100
  private isAttacking = false
  private quest: Quest | null = null
  private readonly TILE_SIZE = 16

  constructor() {
    super({ key: 'GameScene' })
  }

  init(data: { quest: Quest | null }) {
    this.quest = data.quest
  }

  create() {
    // Create tileset from loaded image
    const _tilesetImage = this.textures.get('tiles')
    
    if (this.quest && this.quest.maps && this.quest.maps[0]) {
      this.createMapFromQuest(this.quest.maps[0])
    } else {
      this.createProceduralDungeon()
    }

    this.createPlayer()
    this.createEnemies()
    this.setupInput()
    this.setupCamera()
    
    // Start UI scene
    this.scene.launch('UIScene', { 
      quest: this.quest,
      health: this.playerHealth 
    })

    // Collisions
    if (this.wallsLayer) {
      this.physics.add.collider(this.player, this.wallsLayer)
      this.physics.add.collider(this.enemies, this.wallsLayer)
    }
    
    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, undefined, this)
  }

  createMapFromQuest(mapData: Quest['maps'][0]) {
    const { width, height, tiles } = mapData
    
    // Create tilemap
    this.map = this.make.tilemap({
      tileWidth: this.TILE_SIZE,
      tileHeight: this.TILE_SIZE,
      width,
      height
    })

    // Add tileset - tiny dungeon has 12 columns
    const tileset = this.map.addTilesetImage('tiles', 'tiles', this.TILE_SIZE, this.TILE_SIZE, 0, 0)
    if (!tileset) return

    // Create layers
    this.groundLayer = this.map.createBlankLayer('ground', tileset, 0, 0)!
    this.wallsLayer = this.map.createBlankLayer('walls', tileset, 0, 0)!

    // Fill tiles from AI data
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileIndex = tiles[y]?.[x] ?? 0
        if (tileIndex === 12 || tileIndex === 13) {
          // Wall tiles
          this.wallsLayer.putTileAt(tileIndex, x, y)
        } else {
          // Floor tiles
          this.groundLayer.putTileAt(tileIndex, x, y)
        }
      }
    }

    this.wallsLayer.setCollisionByExclusion([-1])
  }

  createProceduralDungeon() {
    // Generate dungeon using library
    const dungeon = new Dungeon({
      width: 40,
      height: 30,
      rooms: {
        width: { min: 5, max: 10 },
        height: { min: 5, max: 10 },
        maxRooms: 8
      }
    })

    // Create tilemap
    this.map = this.make.tilemap({
      tileWidth: this.TILE_SIZE,
      tileHeight: this.TILE_SIZE,
      width: dungeon.width,
      height: dungeon.height
    })

    const tileset = this.map.addTilesetImage('tiles', 'tiles', this.TILE_SIZE, this.TILE_SIZE, 0, 0)
    if (!tileset) return

    this.groundLayer = this.map.createBlankLayer('ground', tileset, 0, 0)!
    this.wallsLayer = this.map.createBlankLayer('walls', tileset, 0, 0)!

    // Fill based on dungeon
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        const tile = dungeon.tiles[y][x]
        if (tile === 1) { // FLOOR
          this.groundLayer.putTileAt(Phaser.Math.RND.pick([0, 1, 24]), x, y)
        } else if (tile === 2) { // DOOR
          this.groundLayer.putTileAt(24, x, y)
        } else { // WALL
          this.wallsLayer.putTileAt(12, x, y)
        }
      }
    }

    this.wallsLayer.setCollisionByExclusion([-1])
  }

  createPlayer() {
    let startX = 5, startY = 5

    if (this.quest?.maps?.[0]?.startPosition) {
      startX = this.quest.maps[0].startPosition.x
      startY = this.quest.maps[0].startPosition.y
    }

    // Simple colored rectangle as player (since we might not have sprite)
    const graphics = this.add.graphics()
    graphics.fillStyle(0x22c55e, 1)
    graphics.fillRect(0, 0, 14, 14)
    graphics.generateTexture('player_tex', 14, 14)
    graphics.destroy()

    this.player = this.physics.add.sprite(
      startX * this.TILE_SIZE + this.TILE_SIZE / 2,
      startY * this.TILE_SIZE + this.TILE_SIZE / 2,
      'player_tex'
    )
    this.player.setCollideWorldBounds(true)
    this.player.setDepth(10)
  }

  createEnemies() {
    this.enemies = this.physics.add.group()

    // Simple red squares as enemies
    const graphics = this.add.graphics()
    graphics.fillStyle(0xef4444, 1)
    graphics.fillRect(0, 0, 12, 12)
    graphics.generateTexture('enemy_tex', 12, 12)
    graphics.destroy()

    // Spawn a few enemies
    const numEnemies = Phaser.Math.Between(3, 6)
    for (let i = 0; i < numEnemies; i++) {
      const x = Phaser.Math.Between(8, 35) * this.TILE_SIZE
      const y = Phaser.Math.Between(8, 25) * this.TILE_SIZE
      
      const enemy = this.enemies.create(x, y, 'enemy_tex') as Phaser.Physics.Arcade.Sprite
      enemy.setData('health', 30)
      enemy.setCollideWorldBounds(true)
    }
  }

  setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    }

    // Attack on space
    this.input.keyboard!.on('keydown-SPACE', () => this.attack())
  }

  setupCamera() {
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setZoom(2)
    
    if (this.map) {
      this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
      this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
    }
  }

  attack() {
    if (this.isAttacking) return
    this.isAttacking = true

    // Visual feedback - flash player
    this.player.setTint(0xffffff)
    
    // Create attack hitbox
    const attackRadius = 30
    const playerX = this.player.x
    const playerY = this.player.y

    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as Phaser.Physics.Arcade.Sprite
      const dist = Phaser.Math.Distance.Between(playerX, playerY, e.x, e.y)
      
      if (dist < attackRadius) {
        const health = e.getData('health') - 15
        e.setData('health', health)
        e.setTint(0xff0000)
        
        // Knockback
        const angle = Phaser.Math.Angle.Between(playerX, playerY, e.x, e.y)
        e.setVelocity(Math.cos(angle) * 100, Math.sin(angle) * 100)
        
        this.time.delayedCall(200, () => {
          e.setVelocity(0, 0)
          e.clearTint()
        })

        if (health <= 0) {
          e.destroy()
          // Update score in UI
          this.events.emit('enemyKilled')
        }
      }
    })

    this.time.delayedCall(200, () => {
      this.player.clearTint()
      this.isAttacking = false
    })
  }

  handleEnemyCollision(_player: any, enemy: any) {
    if (this.isAttacking) return
    
    this.playerHealth -= 5
    this.events.emit('healthChanged', this.playerHealth)
    
    // Knockback player
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y)
    this.player.setVelocity(Math.cos(angle) * 150, Math.sin(angle) * 150)
    this.player.setTint(0xff0000)
    
    this.time.delayedCall(200, () => {
      this.player.clearTint()
    })

    if (this.playerHealth <= 0) {
      this.gameOver()
    }
  }

  gameOver() {
    this.scene.pause()
    this.scene.launch('UIScene', { gameOver: true })
  }

  update() {
    if (!this.player) return

    const speed = 100
    let vx = 0
    let vy = 0

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -speed
    else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = speed

    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -speed
    else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = speed

    this.player.setVelocity(vx, vy)

    // Simple enemy AI - move toward player
    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as Phaser.Physics.Arcade.Sprite
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y)
      
      if (dist < 150 && dist > 20) {
        const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y)
        e.setVelocity(Math.cos(angle) * 40, Math.sin(angle) * 40)
      } else if (dist <= 20) {
        e.setVelocity(0, 0)
      }
    })
  }
}
