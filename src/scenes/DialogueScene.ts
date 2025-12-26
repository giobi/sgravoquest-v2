import Phaser from 'phaser'

interface NPCData {
  name: string
  personality: string
}

interface Message {
  role: 'user' | 'npc'
  content: string
}

export class DialogueScene extends Phaser.Scene {
  private npc!: NPCData
  private messages: Message[] = []
  private messagesContainer!: Phaser.GameObjects.Container
  private isLoading: boolean = false
  private inputElement!: HTMLInputElement
  private loadingText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'DialogueScene' })
  }

  init(data: { npc: NPCData }) {
    this.npc = data.npc
    this.messages = []
    this.isLoading = false
  }

  create() {
    const { width, height } = this.cameras.main

    // Semi-transparent background
    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.8)
    bg.setOrigin(0)
    bg.setInteractive()

    // Main dialogue box
    const boxWidth = 600
    const boxHeight = 400
    const boxX = (width - boxWidth) / 2
    const boxY = (height - boxHeight) / 2

    // Box background
    const boxBg = this.add.rectangle(width / 2, height / 2, boxWidth, boxHeight, 0x1e293b)
    boxBg.setStrokeStyle(3, 0x8b5cf6)

    // NPC header
    this.add.rectangle(width / 2, boxY + 30, boxWidth - 20, 50, 0x334155)
    this.add.text(width / 2, boxY + 30, this.npc.name, {
      fontSize: '22px',
      color: '#fbbf24',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    // Messages area (scrollable container)
    this.messagesContainer = this.add.container(boxX + 20, boxY + 70)

    // Loading indicator
    this.loadingText = this.add.text(width / 2, boxY + boxHeight - 100, '', {
      fontSize: '14px',
      color: '#94a3b8'
    }).setOrigin(0.5)

    // Create real HTML input
    this.createHTMLInput(boxX, boxY + boxHeight - 50, boxWidth)

    // Close button
    const closeBtn = this.add.text(boxX + boxWidth - 30, boxY + 10, '✕', {
      fontSize: '20px',
      color: '#ef4444'
    }).setInteractive({ useHandCursor: true })
    closeBtn.on('pointerdown', () => this.closeDialogue())

    // ESC to close
    this.input.keyboard?.on('keydown-ESC', () => this.closeDialogue())

    // Help text
    this.add.text(width / 2, boxY + boxHeight + 20, 'INVIO per inviare | ESC per uscire', {
      fontSize: '12px',
      color: '#64748b'
    }).setOrigin(0.5)

    // Initial greeting
    this.addNPCGreeting()
  }

  private createHTMLInput(x: number, y: number, boxWidth: number) {
    // Get canvas position
    const canvas = this.game.canvas
    const rect = canvas.getBoundingClientRect()
    const scaleX = rect.width / canvas.width
    const scaleY = rect.height / canvas.height

    // Create input element
    this.inputElement = document.createElement('input')
    this.inputElement.type = 'text'
    this.inputElement.placeholder = 'Scrivi qualcosa...'
    this.inputElement.maxLength = 150
    this.inputElement.autocomplete = 'off'
    this.inputElement.spellcheck = false

    // Style it
    Object.assign(this.inputElement.style, {
      position: 'absolute',
      left: `${rect.left + (x + 10) * scaleX}px`,
      top: `${rect.top + y * scaleY}px`,
      width: `${(boxWidth - 40) * scaleX}px`,
      height: '36px',
      fontSize: '16px',
      padding: '8px 12px',
      border: '2px solid #475569',
      borderRadius: '8px',
      backgroundColor: '#0f172a',
      color: '#f1f5f9',
      outline: 'none',
      fontFamily: 'inherit',
      zIndex: '1000'
    })

    // Focus styling
    this.inputElement.addEventListener('focus', () => {
      this.inputElement.style.borderColor = '#8b5cf6'
    })
    this.inputElement.addEventListener('blur', () => {
      this.inputElement.style.borderColor = '#475569'
    })

    // Handle keyboard - stop propagation so game doesn't capture WASD/Space
    this.inputElement.addEventListener('keydown', (e) => {
      // Allow typing - stop game from capturing these keys
      e.stopPropagation()

      if (e.key === 'Enter' && !this.isLoading) {
        e.preventDefault()
        this.sendMessage()
      }
      if (e.key === 'Escape') {
        this.closeDialogue()
      }
    })

    document.body.appendChild(this.inputElement)

    // Focus after a brief delay
    setTimeout(() => this.inputElement.focus(), 100)
  }

  private async addNPCGreeting() {
    this.setLoading(true)

    try {
      const greeting = await this.callAI('Saluta il visitatore. Presentati in modo caratteristico.')
      this.addMessage('npc', greeting)
    } catch {
      this.addMessage('npc', `Ciao! Sono ${this.npc.name}. Come posso aiutarti?`)
    }

    this.setLoading(false)
  }

  private setLoading(loading: boolean) {
    this.isLoading = loading
    this.inputElement.disabled = loading
    this.loadingText.setText(loading ? '💭 Sta pensando...' : '')

    if (loading) {
      this.inputElement.style.opacity = '0.5'
    } else {
      this.inputElement.style.opacity = '1'
      this.inputElement.focus()
    }
  }

  private async sendMessage() {
    const text = this.inputElement.value.trim()
    if (!text) return

    this.inputElement.value = ''
    this.addMessage('user', text)

    this.setLoading(true)

    try {
      const response = await this.callAI(text)
      this.addMessage('npc', response)
    } catch {
      this.addMessage('npc', 'Scusa, mi sono perso... cosa dicevi?')
    }

    this.setLoading(false)
  }

  private addMessage(role: 'user' | 'npc', content: string) {
    this.messages.push({ role, content })
    this.renderMessages()
  }

  private renderMessages() {
    this.messagesContainer.removeAll(true)

    const maxVisible = 5
    const visibleMessages = this.messages.slice(-maxVisible)
    let yOffset = 0

    visibleMessages.forEach((msg) => {
      const isNPC = msg.role === 'npc'
      const bgColor = isNPC ? 0x374151 : 0x4f46e5
      const textColor = '#f1f5f9'
      const prefix = isNPC ? '' : ''
      const align = isNPC ? 0 : 560

      // Message bubble background
      const text = this.add.text(0, 0, msg.content, {
        fontSize: '14px',
        color: textColor,
        wordWrap: { width: 400 }
      })

      const bubbleWidth = Math.min(text.width + 24, 420)
      const bubbleHeight = text.height + 16
      const bubbleX = isNPC ? bubbleWidth / 2 : 560 - bubbleWidth / 2

      const bubble = this.add.rectangle(bubbleX, yOffset + bubbleHeight / 2, bubbleWidth, bubbleHeight, bgColor)
      bubble.setStrokeStyle(1, isNPC ? 0x4b5563 : 0x6366f1)

      text.setPosition(bubbleX - text.width / 2, yOffset + 8)

      // Name label for NPC
      if (isNPC && this.messages.filter(m => m.role === 'npc').length <= this.messages.indexOf(msg) + 1) {
        const nameLabel = this.add.text(12, yOffset - 16, this.npc.name.split(' ')[0], {
          fontSize: '11px',
          color: '#fbbf24'
        })
        this.messagesContainer.add(nameLabel)
      }

      this.messagesContainer.add(bubble)
      this.messagesContainer.add(text)

      yOffset += bubbleHeight + 12
    })
  }

  private async callAI(userMessage: string): Promise<string> {
    const history = this.messages.slice(-6).map(m =>
      m.role === 'user' ? `Visitatore: ${m.content}` : `${this.npc.name}: ${m.content}`
    ).join('\n')

    const prompt = `Sei ${this.npc.name} in un villaggio italiano fantasy.
${this.npc.personality}

REGOLE:
- Rispondi SOLO in italiano
- MAX 2 frasi brevi (40 parole)
- Rimani nel personaggio
- Mai dire che sei un'AI

${history ? `Dialogo:\n${history}\n\n` : ''}Visitatore: ${userMessage}

Rispondi come ${this.npc.name.split(' ')[0]}:`

    const response = await fetch('/api/generate-dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    })

    if (!response.ok) throw new Error('API error')

    const data = await response.json()
    return (data.response || 'Non ho capito...').trim()
  }

  private closeDialogue() {
    // Remove HTML input
    if (this.inputElement && this.inputElement.parentNode) {
      this.inputElement.parentNode.removeChild(this.inputElement)
    }

    this.input.keyboard?.off('keydown-ESC')
    this.scene.stop()
    this.scene.resume('TownScene')
  }

  // Clean up on scene shutdown
  shutdown() {
    if (this.inputElement && this.inputElement.parentNode) {
      this.inputElement.parentNode.removeChild(this.inputElement)
    }
  }
}
