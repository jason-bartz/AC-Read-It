const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const MODEL = 'google/gemini-3-flash';

const SYSTEM_PROMPT = `You are helping a 4-year-old child play Animal Crossing: New Leaf on the Nintendo 3DS. The child cannot read yet.

Given a screenshot and the text extracted from it, tell the child exactly what to DO next.

RULES:
- Tell them which button to press (A, B, etc.) or where to move their character
- If there are menu options or choices visible, explain EACH option simply and tell them which one to pick
- For Yes/No questions, explain what each choice means and suggest one
- Use very simple words a 4-year-old would understand
- Keep it to 1-3 short sentences
- Be encouraging and friendly
- Reference specific actions: "Press A", "Press B to go back", "Pick the top one", "Move down to pick the second one"
- If a character is asking a question, explain what they're asking and what to answer
- If it's a shop menu, explain what each item is for and how much it costs in simple terms
- Do NOT just describe what's on screen — tell them what to DO next
- Do NOT repeat the text — give actionable guidance`;

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
              { type: 'text', text: `The text on screen says: "${text}"\n\nTell this young child what they should do next. If there are menu choices, explain each one.` },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 500,
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
    const finishReason = data.choices?.[0]?.finish_reason || 'unknown';

    console.log('Guide response:', { finishReason, contentLength: content.length, content: content.substring(0, 200) });

    return res.status(200).json({ guide: content.trim(), finish_reason: finishReason, debug: { model: data.model } });
  } catch (err) {
    console.error('Guide function error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      debug: { message: err.message }
    });
  }
};
