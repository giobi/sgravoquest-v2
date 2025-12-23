import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload() {
    // Progress bar
    const width = this.cameras.main.width
    const height = this.cameras.main.height
    
    const progressBar = this.add.graphics()
    const progressBox = this.add.graphics()
    progressBox.fillStyle(0x222222, 0.8)
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50)

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
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

    // Load tileset from CDN (same as SgravoQuest v1)
    this.load.image('tiles', 'https://cdn.jsdelivr.net/gh/giobi/sgravoquest-assets@main/tilesets/tiny-dungeon.png')
    
    // Load hero sprite
    this.load.image('hero', 'https://cdn.jsdelivr.net/gh/giobi/sgravoquest-assets@main/sprites/hero.png')
    
    // Load enemy sprite
    this.load.image('slime', 'https://cdn.jsdelivr.net/gh/giobi/sgravoquest-assets@main/sprites/slime.png')
  }

  create() {
    this.scene.start('MenuScene')
  }
}
