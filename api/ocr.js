const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const MODEL = 'google/gemini-3-flash';

const SYSTEM_PROMPT = `You are a text extraction tool for Animal Crossing games. The user will send photos taken with a phone camera pointed at a Nintendo 3DS or Switch screen.

You must respond with valid JSON in this exact format:
{"dialogue":"<speaker and their dialogue only>","scene":"<everything visible on screen>"}

RULES FOR "dialogue":
- PRIORITY 1: If a character dialogue box is visible, extract the speaker name followed by a colon and their dialogue (e.g. "Tom Nook: Welcome!")
- PRIORITY 2: If NO character dialogue is visible but an item name or label is shown (e.g. selected inventory item, focused object, item description), extract JUST the item name (e.g. "fishing rod", "shovel", "Fire Flower")
- Do NOT include bell counts, button labels, menu options (Wear, Hold, Quit, Display, etc.), or HUD elements in dialogue
- If truly no primary text or item label is visible, use an empty string

RULES FOR "scene":
- Include ALL visible text: dialogue, bell counts, button labels (Done, Sell, Cancel, etc.), menu options, item names, HUD elements, inventory counts, and any other on-screen text
- This gives full context about what the player is looking at

GENERAL RULES:
- The image may have glare, moire patterns, or be at an angle — do your best to read through these
- Use your knowledge of Animal Crossing to correct ambiguous characters or words
- If you truly cannot see any readable text, respond with: {"dialogue":"","scene":""}
- Output ONLY the JSON — no commentary, no markdown, no code fences`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    console.error('AI_GATEWAY_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { image } = req.body || {};
  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'Missing image data' });
  }

  const imageUrl = image.startsWith('data:')
    ? image
    : `data:image/jpeg;base64,${image}`;

  try {
    const response = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract text from this Animal Crossing game screen. Return JSON with "dialogue" (character dialogue, OR the item/label name if no dialogue is visible) and "scene" (all visible text including buttons, bells, menus, etc.).' },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return res.status(502).json({
        error: 'AI service unavailable',
        debug: { status: response.status, detail: errorText.substring(0, 500) }
      });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    // Strip markdown code fences if present
    let cleaned = rawContent.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    // Parse the JSON response
    let dialogue = '';
    let scene = '';
    try {
      const parsed = JSON.parse(cleaned);
      dialogue = (parsed.dialogue || '').trim();
      scene = (parsed.scene || '').trim();
    } catch (parseErr) {
      // JSON may be truncated by token limit -- try to extract fields from partial JSON
      const dialogueMatch = cleaned.match(/"dialogue"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);
      const sceneMatch = cleaned.match(/"scene"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);
      if (dialogueMatch) {
        dialogue = dialogueMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
      }
      if (sceneMatch) {
        scene = sceneMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
      }
      // Final fallback: treat the whole response as dialogue (old format)
      if (!dialogue && !scene) {
        const fallback = rawContent.trim();
        if (fallback && fallback !== 'NO_TEXT_FOUND') {
          dialogue = fallback;
          scene = fallback;
        }
      }
    }

    if (!dialogue && !scene) {
      return res.status(200).json({ text: '', scene: '', debug: { rawContent, model: data.model } });
    }

    return res.status(200).json({ text: dialogue, scene: scene || dialogue, debug: { rawContent, model: data.model } });
  } catch (err) {
    console.error('OCR function error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      debug: { message: err.message }
    });
  }
};
