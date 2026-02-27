const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const MODEL = 'google/gemini-3-flash';

const SYSTEM_PROMPT = `You are helping a young child understand what's happening in Animal Crossing: New Leaf on the Nintendo 3DS.

Given a screenshot and the text extracted from it, explain what's happening in the scene in simple, friendly language.

RULES:
- Describe what the character is saying or what the menu/screen is about
- If a character is talking, mention who they are and what they want or are telling the player
- Use simple words a young child would understand
- Keep it to 1-2 short sentences
- Be warm and encouraging
- Use your knowledge of Animal Crossing: New Leaf characters, items, and game mechanics
- Focus on what the player should do or understand
- Do NOT just repeat the text — explain its meaning and context`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    console.error('AI_GATEWAY_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { image, text } = req.body || {};
  if (!image || typeof image !== 'string' || !text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing image or text data' });
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
              { type: 'text', text: `The text on screen says: "${text}"\n\nPlease explain what's happening in this Animal Crossing: New Leaf scene.` },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 256,
        temperature: 0.7,
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
    const content = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({ context: content.trim(), debug: { model: data.model } });
  } catch (err) {
    console.error('Context function error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      debug: { message: err.message }
    });
  }
};
