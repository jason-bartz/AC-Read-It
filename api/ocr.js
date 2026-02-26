const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const MODEL = 'google/gemini-3-flash';

const SYSTEM_PROMPT = `You are a text extraction tool for Animal Crossing games. The user will send photos taken with a phone camera pointed at a Nintendo 3DS or Switch screen.

RULES:
- Read and output ALL visible text from dialogue boxes, menus, and UI elements
- If a character name label is visible, put it first followed by a colon, then the dialogue
- Output ONLY the text — do not describe the image or add commentary
- The image may have glare, moire patterns, or be at an angle — do your best to read through these
- Use your knowledge of Animal Crossing to correct ambiguous characters or words
- If you truly cannot see any readable text, respond with exactly: NO_TEXT_FOUND`;

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
              { type: 'text', text: 'Read all text visible in this photo of an Animal Crossing game screen. Include dialogue, menus, labels, and any other text you can see.' },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 1024,
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
    const text = rawContent.trim();

    if (text === 'NO_TEXT_FOUND' || !text) {
      return res.status(200).json({ text: '', debug: { rawContent, model: data.model } });
    }

    return res.status(200).json({ text, debug: { rawContent, model: data.model } });
  } catch (err) {
    console.error('OCR function error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      debug: { message: err.message }
    });
  }
};
