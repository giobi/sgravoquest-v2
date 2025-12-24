import Phaser from 'phaser'

interface NPCData {
  name: string
  personality: string
  sprite: string
}

interface Message {
  role: 'user' | 'npc'
  content: string
}

export class DialogueScene extends Phaser.Scene {
  private npc!: NPCData
  private messages: Message[] = []
  private inputText: string = ''
  private dialogueBox!: Phaser.GameObjects.Container
  private messagesContainer!: Phaser.GameObjects.Container
  private inputDisplay!: Phaser.GameObjects.Text
  private isLoading: boolean = false
  private cursor!: Phaser.GameObjects.Text
  private cursorTimer!: Phaser.Time.TimerEvent

  constructor() {
    super({ key: 'DialogueScene' })
  }

  init(data: { npc: NPCData }) {
    this.npc = data.npc
    this.messages = []
    this.inputText = ''
    this.isLoading = false
  }

  create() {
    const { width, height } = this.cameras.main

    // Semi-transparent background
    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
    bg.setOrigin(0)

    // Main dialogue container
    this.dialogueBox = this.add.container(width / 2, height / 2)

    // Dialogue box background
    const boxBg = this.add.rectangle(0, 0, 700, 450, 0x2d3748)
    boxBg.setStrokeStyle(4, 0x8b5cf6)
    this.dialogueBox.add(boxBg)

    // NPC header
    const headerBg = this.add.rectangle(0, -200, 700, 50, 0x1a202c)
    this.dialogueBox.add(headerBg)

    const npcName = this.add.text(0, -200, this.npc.name, {
      fontSize: '24px',
      color: '#fbbf24',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    this.dialogueBox.add(npcName)

    // Messages area
    this.messagesContainer = this.add.container(-320, -150)
    this.dialogueBox.add(this.messagesContainer)

    // Input area background
    const inputBg = this.add.rectangle(0, 180, 660, 50, 0x1a202c)
    inputBg.setStrokeStyle(2, 0x4a5568)
    this.dialogueBox.add(inputBg)

    // Input text display
    this.inputDisplay = this.add.text(-310, 180, '', {
      fontSize: '18px',
      color: '#ffffff',
      wordWrap: { width: 600 }
    }).setOrigin(0, 0.5)
    this.dialogueBox.add(this.inputDisplay)

    // Blinking cursor
    this.cursor = this.add.text(-310, 180, '|', {
      fontSize: '18px',
      color: '#8b5cf6'
    }).setOrigin(0, 0.5)
    this.dialogueBox.add(this.cursor)

    this.cursorTimer = this.time.addEvent({
      delay: 500,
      callback: () => {
        this.cursor.setVisible(!this.cursor.visible)
      },
      loop: true
    })

    // Help text
    const helpText = this.add.text(0, 230, 'Scrivi e premi INVIO | ESC per uscire', {
      fontSize: '14px',
      color: '#9ca3af'
    }).setOrigin(0.5)
    this.dialogueBox.add(helpText)

    // Keyboard input
    this.input.keyboard?.on('keydown', this.handleKeyDown, this)

    // Initial greeting from NPC
    this.addNPCGreeting()
  }

  private async addNPCGreeting() {
    this.isLoading = true
    this.updateLoadingState()

    try {
      const greeting = await this.callAI('Saluta il visitatore che si è appena avvicinato. Presentati brevemente.')
      this.addMessage('npc', greeting)
    } catch (error) {
      this.addMessage('npc', `Ciao, sono ${this.npc.name}. Come posso aiutarti?`)
    }

    this.isLoading = false
    this.updateLoadingState()
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (this.isLoading) return

    if (event.key === 'Escape') {
      this.closeDialogue()
      return
    }

    if (event.key === 'Enter' && this.inputText.trim()) {
      this.sendMessage()
      return
    }

    if (event.key === 'Backspace') {
      this.inputText = this.inputText.slice(0, -1)
      this.updateInputDisplay()
      return
    }

    // Only allow printable characters
    if (event.key.length === 1) {
      if (this.inputText.length < 100) {
        this.inputText += event.key
        this.updateInputDisplay()
      }
    }
  }

  private updateInputDisplay() {
    this.inputDisplay.setText(this.inputText)
    // Move cursor to end of text
    this.cursor.setX(-310 + this.inputDisplay.width + 2)
  }

  private updateLoadingState() {
    if (this.isLoading) {
      this.inputDisplay.setText('...')
      this.cursor.setVisible(false)
    } else {
      this.inputDisplay.setText(this.inputText)
      this.cursor.setVisible(true)
    }
  }

  private async sendMessage() {
    const userMessage = this.inputText.trim()
    this.inputText = ''
    this.updateInputDisplay()

    // Add user message
    this.addMessage('user', userMessage)

    // Get AI response
    this.isLoading = true
    this.updateLoadingState()

    try {
      const response = await this.callAI(userMessage)
      this.addMessage('npc', response)
    } catch (error) {
      this.addMessage('npc', 'Hmm... scusa, mi sono distratto. Cosa dicevi?')
    }

    this.isLoading = false
    this.updateLoadingState()
  }

  private addMessage(role: 'user' | 'npc', content: string) {
    this.messages.push({ role, content })
    this.renderMessages()
  }

  private renderMessages() {
    // Clear existing messages
    this.messagesContainer.removeAll(true)

    // Show last 4 messages
    const visibleMessages = this.messages.slice(-4)
    let yOffset = 0

    visibleMessages.forEach((msg) => {
      const isNPC = msg.role === 'npc'
      const color = isNPC ? '#fbbf24' : '#60a5fa'
      const prefix = isNPC ? `${this.npc.name}: ` : 'Tu: '

      const text = this.add.text(0, yOffset, prefix + msg.content, {
        fontSize: '16px',
        color: color,
        wordWrap: { width: 640 }
      })

      this.messagesContainer.add(text)
      yOffset += text.height + 10
    })
  }

  private async callAI(userMessage: string): Promise<string> {
    // Build conversation history
    const history = this.messages.map(m =>
      m.role === 'user' ? `Visitatore: ${m.content}` : `${this.npc.name}: ${m.content}`
    ).join('\n')

    const prompt = `Sei ${this.npc.name} in un piccolo villaggio italiano fantasy.
Personalità: ${this.npc.personality}

REGOLE IMPORTANTI:
- Rispondi SEMPRE in italiano
- Rispondi in 1-2 frasi brevi (massimo 50 parole)
- Rimani nel personaggio
- Non rompere mai l'immersione
- Non menzionare che sei un'AI

${history ? `Conversazione finora:\n${history}\n\n` : ''}Visitatore: ${userMessage}

${this.npc.name}:`

    const response = await fetch('/api/generate-dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    })

    if (!response.ok) {
      throw new Error('API call failed')
    }

    const data = await response.json()
    return data.response || 'Non ho capito...'
  }

  private closeDialogue() {
    this.cursorTimer.destroy()
    this.input.keyboard?.off('keydown', this.handleKeyDown, this)
    this.scene.stop()
    this.scene.resume('TownScene')
  }
}
