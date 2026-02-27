const AI_GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const MODEL = 'google/gemini-3-flash';

const SYSTEM_PROMPT = `You are a simple text detector. Look at the image and determine if there is readable text from a video game dialogue box, menu, or UI element visible on screen. Reply with exactly YES or NO and nothing else.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
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
              { type: 'text', text: 'Is there readable video game text visible in this image?' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 5,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Detect-text error:', response.status, errorText);
      return res.status(502).json({ error: 'AI service unavailable' });
    }

    const data = await response.json();
    const answer = (data.choices?.[0]?.message?.content || '').trim().toUpperCase();
    const detected = answer.startsWith('YES');

    return res.status(200).json({ detected });
  } catch (err) {
    console.error('Detect-text error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
