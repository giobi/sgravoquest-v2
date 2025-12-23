import Phaser from 'phaser'
import Dungeon from '@mikewesthad/dungeon'

interface Quest {
  title: string
  description: string
  objectives?: string[]
  maps: Array<{
    width: number
    height: number
    tiles: number[][]
    startPosition?: { x: number; y: number }
  }>
  entities?: Array<{
    type: string
    x: number
    y: number
    name?: string
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
  private coins!: Phaser.Physics.Arcade.Group
  private npcs!: Phaser.Physics.Arcade.Group
  private exitPortal!: Phaser.Physics.Arcade.Sprite
  private playerHealth = 100
  private isAttacking = false
  private quest: Quest | null = null
  private readonly TILE_SIZE = 16
  private coinsCollected = 0
  private totalCoins = 0
  private totalEnemies = 0
  private dialogueActive = false
  private currentDialogue: Phaser.GameObjects.Container | null = null
  private playerDirection = 'down'
  private attackCooldown = false

  constructor() {
    super({ key: 'GameScene' })
  }

  init(data: { quest: Quest | null }) {
    this.quest = data.quest
    this.playerHealth = 100
    this.coinsCollected = 0
    this.dialogueActive = false
  }

  create() {
    // Sprites are created in BootScene, just use them

    if (this.quest && this.quest.maps && this.quest.maps[0]) {
      this.createMapFromQuest(this.quest.maps[0])
    } else {
      this.createProceduralDungeon()
    }

    this.createPlayer()
    this.createEnemies()
    this.createCoins()
    this.createNPCs()
    this.createExitPortal()
    this.setupInput()
    this.setupCamera()

    // Start UI scene with quest info
    this.scene.launch('UIScene', {
      quest: this.quest,
      health: this.playerHealth,
      totalCoins: this.totalCoins,
      totalEnemies: this.totalEnemies
    })

    // Collisions
    if (this.wallsLayer) {
      this.physics.add.collider(this.player, this.wallsLayer)
      this.physics.add.collider(this.enemies, this.wallsLayer)
      this.physics.add.collider(this.npcs, this.wallsLayer)
    }

    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, undefined, this)
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, undefined, this)
    this.physics.add.overlap(this.player, this.npcs, this.interactNPC, undefined, this)
    this.physics.add.overlap(this.player, this.exitPortal, this.checkVictory, undefined, this)
  }

  createMapFromQuest(mapData: Quest['maps'][0]) {
    const { width, height, tiles } = mapData

    this.map = this.make.tilemap({
      tileWidth: this.TILE_SIZE,
      tileHeight: this.TILE_SIZE,
      width,
      height
    })

    const tileset = this.map.addTilesetImage('tiles', 'tiles', this.TILE_SIZE, this.TILE_SIZE, 0, 0)
    if (!tileset) return

    this.groundLayer = this.map.createBlankLayer('ground', tileset, 0, 0)!
    this.wallsLayer = this.map.createBlankLayer('walls', tileset, 0, 0)!

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileIndex = tiles[y]?.[x] ?? 0
        if (tileIndex === 12 || tileIndex === 13) {
          this.wallsLayer.putTileAt(tileIndex, x, y)
        } else {
          this.groundLayer.putTileAt(tileIndex, x, y)
        }
      }
    }

    this.wallsLayer.setCollisionByExclusion([-1])
  }

  createProceduralDungeon() {
    const dungeon = new Dungeon({
      width: 50,
      height: 40,
      rooms: {
        width: { min: 6, max: 12 },
        height: { min: 6, max: 12 },
        maxRooms: 10
      }
    })

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

    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        const tile = dungeon.tiles[y][x]
        if (tile === 1) {
          this.groundLayer.putTileAt(Phaser.Math.RND.pick([0, 1, 24]), x, y)
        } else if (tile === 2) {
          this.groundLayer.putTileAt(24, x, y)
        } else {
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

    this.player = this.physics.add.sprite(
      startX * this.TILE_SIZE + this.TILE_SIZE / 2,
      startY * this.TILE_SIZE + this.TILE_SIZE / 2,
      'player_sprite'
    )
    this.player.setCollideWorldBounds(true)
    this.player.setDepth(10)
    this.player.setSize(12, 12)
  }

  createEnemies() {
    this.enemies = this.physics.add.group()

    // Check for quest-defined enemies
    if (this.quest?.entities) {
      const enemyEntities = this.quest.entities.filter(e => e.type === 'enemy')
      enemyEntities.forEach(ent => {
        const enemy = this.enemies.create(
          ent.x * this.TILE_SIZE + this.TILE_SIZE / 2,
          ent.y * this.TILE_SIZE + this.TILE_SIZE / 2,
          'enemy_sprite'
        ) as Phaser.Physics.Arcade.Sprite
        enemy.setData('health', 30)
        enemy.setData('name', ent.name || 'Nemico')
        enemy.setCollideWorldBounds(true)
        enemy.setSize(12, 12)
      })
    } else {
      // Procedural enemies
      const numEnemies = Phaser.Math.Between(4, 8)
      const enemyNames = ['Goblin', 'Scheletro', 'Slime', 'Pipistrello', 'Ratto Gigante', 'Zombie']

      for (let i = 0; i < numEnemies; i++) {
        const x = Phaser.Math.Between(10, 40) * this.TILE_SIZE
        const y = Phaser.Math.Between(10, 30) * this.TILE_SIZE

        const enemy = this.enemies.create(x, y, 'enemy_sprite') as Phaser.Physics.Arcade.Sprite
        enemy.setData('health', 30)
        enemy.setData('name', Phaser.Math.RND.pick(enemyNames))
        enemy.setCollideWorldBounds(true)
        enemy.setSize(12, 12)
      }
    }

    this.totalEnemies = this.enemies.getLength()
  }

  createCoins() {
    this.coins = this.physics.add.group()

    // Scatter coins around the dungeon
    const numCoins = Phaser.Math.Between(8, 15)
    for (let i = 0; i < numCoins; i++) {
      const x = Phaser.Math.Between(8, 42) * this.TILE_SIZE
      const y = Phaser.Math.Between(8, 32) * this.TILE_SIZE

      const coin = this.coins.create(x, y, 'coin_sprite') as Phaser.Physics.Arcade.Sprite
      coin.setDepth(5)

      // Coin bobbing animation
      this.tweens.add({
        targets: coin,
        y: coin.y - 3,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    }

    this.totalCoins = numCoins
  }

  createNPCs() {
    this.npcs = this.physics.add.group()

    // Check for quest-defined NPCs
    if (this.quest?.entities) {
      const npcEntities = this.quest.entities.filter(e => e.type === 'npc')
      npcEntities.forEach(ent => {
        const npc = this.npcs.create(
          ent.x * this.TILE_SIZE + this.TILE_SIZE / 2,
          ent.y * this.TILE_SIZE + this.TILE_SIZE / 2,
          'npc_sprite'
        ) as Phaser.Physics.Arcade.Sprite
        npc.setData('name', ent.name || 'Straniero')
        npc.setData('dialogue', this.generateDialogue(ent.name || 'Straniero'))
        npc.setImmovable(true)
        npc.setDepth(8)
      })
    } else {
      // Add 1-2 procedural NPCs
      const npcData = [
        { name: 'Vecchio Saggio', dialogue: 'Attento, avventuriero! Questo dungeon nasconde pericoli mortali. Raccogli le monete e sconfiggi i nemici per guadagnare la libertà!' },
        { name: 'Mercante Misterioso', dialogue: 'Psst... cerca il portale nascosto. Ti porterà alla salvezza... se sopravvivi abbastanza a lungo.' }
      ]

      npcData.forEach((data, i) => {
        const x = Phaser.Math.Between(12, 20) * this.TILE_SIZE
        const y = (10 + i * 8) * this.TILE_SIZE

        const npc = this.npcs.create(x, y, 'npc_sprite') as Phaser.Physics.Arcade.Sprite
        npc.setData('name', data.name)
        npc.setData('dialogue', data.dialogue)
        npc.setImmovable(true)
        npc.setDepth(8)
      })
    }
  }

  generateDialogue(npcName: string): string {
    const dialogues: Record<string, string[]> = {
      default: [
        'Il portale si aprirà solo quando avrai dimostrato il tuo valore!',
        'Molti sono entrati qui... pochi sono usciti.',
        'Le monete che trovi appartenevano ad avventurieri meno fortunati di te.',
        'I nemici in questo dungeon non conoscono pietà. Preparati!'
      ]
    }

    const options = dialogues[npcName] || dialogues.default
    return Phaser.Math.RND.pick(options)
  }

  createExitPortal() {
    // Place portal in a far corner
    const x = Phaser.Math.Between(35, 45) * this.TILE_SIZE
    const y = Phaser.Math.Between(25, 35) * this.TILE_SIZE

    this.exitPortal = this.physics.add.sprite(x, y, 'portal_sprite')
    this.exitPortal.setDepth(5)

    // Portal pulsing effect
    this.tweens.add({
      targets: this.exitPortal,
      scale: 1.2,
      alpha: 0.7,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }

  setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    }

    this.input.keyboard!.on('keydown-SPACE', () => this.attack())
    this.input.keyboard!.on('keydown-E', () => this.tryInteract())
  }

  setupCamera() {
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setZoom(2.5)

    if (this.map) {
      this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
      this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
    }
  }

  attack() {
    if (this.isAttacking || this.attackCooldown || this.dialogueActive) return
    this.isAttacking = true
    this.attackCooldown = true

    // Visual feedback
    this.player.setTint(0xffffff)

    // Create visible attack arc
    const attackArc = this.add.graphics()
    attackArc.fillStyle(0xffffff, 0.3)
    attackArc.fillCircle(this.player.x, this.player.y, 25)
    attackArc.setDepth(15)

    this.time.delayedCall(150, () => attackArc.destroy())

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

        // Show damage number
        const dmgText = this.add.text(e.x, e.y - 10, '-15', {
          fontSize: '10px',
          color: '#ef4444',
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(20)

        this.tweens.add({
          targets: dmgText,
          y: dmgText.y - 20,
          alpha: 0,
          duration: 600,
          onComplete: () => dmgText.destroy()
        })

        // Knockback
        const angle = Phaser.Math.Angle.Between(playerX, playerY, e.x, e.y)
        e.setVelocity(Math.cos(angle) * 120, Math.sin(angle) * 120)

        this.time.delayedCall(200, () => {
          if (e.active) {
            e.setVelocity(0, 0)
            e.clearTint()
          }
        })

        if (health <= 0) {
          // Death effect
          const deathEffect = this.add.circle(e.x, e.y, 10, 0xff0000, 0.5)
          this.tweens.add({
            targets: deathEffect,
            scale: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => deathEffect.destroy()
          })

          e.destroy()
          this.events.emit('enemyKilled')

          // Check victory condition
          if (this.enemies.getLength() === 0) {
            this.events.emit('allEnemiesDefeated')
          }
        }
      }
    })

    this.time.delayedCall(200, () => {
      this.player.clearTint()
      this.isAttacking = false
    })

    this.time.delayedCall(400, () => {
      this.attackCooldown = false
    })
  }

  tryInteract() {
    if (this.dialogueActive) {
      this.closeDialogue()
      return
    }

    // Check for nearby NPCs
    this.npcs.getChildren().forEach((npc) => {
      const n = npc as Phaser.Physics.Arcade.Sprite
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y)

      if (dist < 40) {
        this.showDialogue(n.getData('name'), n.getData('dialogue'))
      }
    })
  }

  showDialogue(name: string, text: string) {
    if (this.dialogueActive) return
    this.dialogueActive = true

    const { width, height } = this.cameras.main
    const boxWidth = 280
    const boxHeight = 80

    // Create dialogue container (fixed to camera)
    this.currentDialogue = this.add.container(width / 2, height - 60)
    this.currentDialogue.setScrollFactor(0)
    this.currentDialogue.setDepth(100)

    // Background
    const bg = this.add.rectangle(0, 0, boxWidth, boxHeight, 0x1f2937, 0.95)
    bg.setStrokeStyle(2, 0x8b5cf6)

    // Name
    const nameText = this.add.text(-boxWidth/2 + 10, -boxHeight/2 + 8, name, {
      fontSize: '11px',
      color: '#8b5cf6',
      fontStyle: 'bold'
    })

    // Dialogue text
    const dialogueText = this.add.text(-boxWidth/2 + 10, -boxHeight/2 + 24, text, {
      fontSize: '9px',
      color: '#ffffff',
      wordWrap: { width: boxWidth - 20 }
    })

    // Hint
    const hint = this.add.text(boxWidth/2 - 10, boxHeight/2 - 12, '[E] Chiudi', {
      fontSize: '8px',
      color: '#6b7280'
    }).setOrigin(1, 1)

    this.currentDialogue.add([bg, nameText, dialogueText, hint])
  }

  closeDialogue() {
    if (this.currentDialogue) {
      this.currentDialogue.destroy()
      this.currentDialogue = null
    }
    this.dialogueActive = false
  }

  collectCoin(_player: any, coin: any) {
    const coinSprite = coin as Phaser.Physics.Arcade.Sprite

    // Collect effect
    this.tweens.add({
      targets: coinSprite,
      y: coinSprite.y - 20,
      alpha: 0,
      scale: 1.5,
      duration: 200,
      onComplete: () => coinSprite.destroy()
    })

    this.coinsCollected++
    this.events.emit('coinCollected', this.coinsCollected, this.totalCoins)

    // Sound substitute: screen flash
    this.cameras.main.flash(100, 251, 191, 36, false)
  }

  interactNPC(_player: any, npc: any) {
    // Show interaction hint
    if (!this.dialogueActive) {
      this.events.emit('showInteractHint', npc.getData('name'))
    }
  }

  checkVictory() {
    const enemiesDefeated = this.enemies.getLength() === 0
    const coinsCollected = this.coinsCollected >= Math.floor(this.totalCoins * 0.5) // Need 50% of coins

    if (enemiesDefeated || coinsCollected) {
      this.victory()
    } else {
      // Show what's needed
      this.events.emit('portalBlocked', {
        enemiesLeft: this.enemies.getLength(),
        coinsNeeded: Math.floor(this.totalCoins * 0.5) - this.coinsCollected
      })
    }
  }

  victory() {
    this.scene.pause()
    this.scene.launch('UIScene', {
      victory: true,
      kills: this.totalEnemies - this.enemies.getLength(),
      coins: this.coinsCollected,
      quest: this.quest
    })
  }

  handleEnemyCollision(_player: any, enemy: any) {
    if (this.isAttacking || this.dialogueActive) return

    this.playerHealth -= 10
    this.events.emit('healthChanged', this.playerHealth)

    // Damage effect
    this.cameras.main.shake(100, 0.01)

    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y)
    this.player.setVelocity(Math.cos(angle) * 150, Math.sin(angle) * 150)
    this.player.setTint(0xff0000)

    // Show damage
    const dmgText = this.add.text(this.player.x, this.player.y - 15, '-10', {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(20)

    this.tweens.add({
      targets: dmgText,
      y: dmgText.y - 20,
      alpha: 0,
      duration: 600,
      onComplete: () => dmgText.destroy()
    })

    this.time.delayedCall(200, () => {
      this.player.clearTint()
    })

    if (this.playerHealth <= 0) {
      this.gameOver()
    }
  }

  gameOver() {
    this.scene.pause()
    this.scene.launch('UIScene', {
      gameOver: true,
      kills: this.totalEnemies - this.enemies.getLength(),
      coins: this.coinsCollected
    })
  }

  update() {
    if (!this.player || this.dialogueActive) return

    const speed = 80
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

    // Enemy AI with varied behavior
    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as Phaser.Physics.Arcade.Sprite
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y)

      if (dist < 180 && dist > 25) {
        // Chase player
        const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y)
        const speed = 35 + Phaser.Math.Between(-10, 10)
        e.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)
      } else if (dist <= 25) {
        // Stop when very close
        e.setVelocity(0, 0)
      } else {
        // Wander
        if (Phaser.Math.Between(0, 100) < 2) {
          const wanderAngle = Phaser.Math.FloatBetween(0, Math.PI * 2)
          e.setVelocity(Math.cos(wanderAngle) * 20, Math.sin(wanderAngle) * 20)
        }
      }
    })
  }
}
