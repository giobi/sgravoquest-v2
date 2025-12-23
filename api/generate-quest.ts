import type { VercelRequest, VercelResponse } from '@vercel/node';

interface QuestRequest {
  prompt: string;
}

interface Quest {
  title: string;
  description: string;
  objectives: string[];
  map: {
    width: number;
    height: number;
    tiles: number[][];
  };
  entities: Array<{
    type: string;
    x: number;
    y: number;
    name?: string;
  }>;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body as QuestRequest;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (!openrouterKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const systemPrompt = `Generate an RPG dungeon quest based on: "${prompt}"

CRITICAL: Return ONLY valid JSON in Italian. NO markdown, NO explanations.

MAP SIZE: EXACTLY 30 columns x 20 rows. Each row must have 30 numbers. The tiles array must have 20 rows.

TILE VALUES from tiny-dungeon tileset:
- 0 = floor (light stone - WALKABLE)
- 1 = floor variant (dark stone - WALKABLE)
- 12 = wall (gray brick - SOLID, use for borders and obstacles)
- 24 = floor variant (orange - WALKABLE)
- 36 = decoration (barrel/crate - for visual interest)

DESIGN GUIDELINES:
- Create INTERESTING layouts with multiple rooms connected by corridors
- Border the entire map with walls (12)
- Add interior walls to create rooms and passages
- Scatter decorations (36) for visual variety
- Place player start position away from enemies
- Place 2-4 enemies in different areas

JSON FORMAT:
{
  "title": "Creative Italian Title",
  "description": "Atmospheric description in Italian (2-3 sentences)",
  "objectives": ["Objective 1", "Objective 2", "Objective 3"],
  "map": {
    "width": 30,
    "height": 20,
    "tiles": [
      [12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12],
      [12,0,0,0,0,0,0,0,0,0,12,12,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12],
      ... (20 rows total, each with 30 elements)
    ],
    "startPosition": {"x": 2, "y": 2}
  },
  "entities": [
    {"type": "player", "x": 2, "y": 2},
    {"type": "npc", "x": 10, "y": 5, "name": "NPC Name"},
    {"type": "enemy", "x": 20, "y": 10, "name": "Enemy Name"},
    {"type": "enemy", "x": 25, "y": 15, "name": "Another Enemy"}
  ]
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sgravoquest.vercel.app',
        'X-Title': 'SgravoQuest'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',  // Upgraded for larger maps
        messages: [{ role: 'user', content: systemPrompt }],
        temperature: 0.7,
        max_tokens: 8000  // 30x20 map needs more tokens
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter error:', errorData);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]) {
      console.error('No choices in response:', JSON.stringify(data));
      throw new Error('API returned no choices');
    }

    const questText = data.choices[0].message.content;

    // Parse JSON from response
    let quest: Quest;
    try {
      quest = JSON.parse(questText);
    } catch (parseError) {
      const jsonMatch = questText.match(/```json\n?([\s\S]*?)\n?```/) ||
                       questText.match(/```\n?([\s\S]*?)\n?```/) ||
                       questText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        let jsonText = jsonMatch[1] || jsonMatch[0];
        quest = JSON.parse(jsonText);
      } else {
        console.error('Failed to parse:', questText.substring(0, 500));
        throw new Error('Invalid JSON from AI');
      }
    }

    if (!quest.title || !quest.map || !quest.entities) {
      throw new Error('Invalid quest structure');
    }

    // Extract player position from entities for startPosition
    const playerEntity = quest.entities.find((e: any) => e.type === 'player');
    const startPosition = playerEntity
      ? { x: playerEntity.x, y: playerEntity.y }
      : { x: 2, y: 2 }; // fallback

    // Transform map to maps array for frontend with startPosition
    const { map, ...questData } = quest;
    const mapWithStart = { ...map, startPosition };
    return res.status(200).json({ ...questData, maps: [mapWithStart] });

  } catch (error) {
    console.error('Quest generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate quest',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
