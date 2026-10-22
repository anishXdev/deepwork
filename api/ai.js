// Vercel Serverless Function: Gemini AI & Jev router for Deepwork
export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, systemInstruction, history, apiKey: clientKey } = req.body || {};
    const apiKey = clientKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ 
        error: 'No Gemini API key available. Please provide an API key in Deepwork AI settings or configure GEMINI_API_KEY on the server.'
      });
    }

    const contents = [];
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        if (turn.text && turn.role) {
          contents.push({
            role: turn.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: turn.text }]
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const body = {
      contents,
      systemInstruction: systemInstruction ? {
        parts: [{ text: systemInstruction }]
      } : undefined,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 1200,
      }
    };

    // First attempt: gemini-3.8-flash
    let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    // Fallback: gemini-3.5-flash
    if (!response.ok) {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error?.message || 'Gemini API call failed' 
      });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Error in /api/ai:', error);
    return res.status(500).json({ error: error.message || 'Internal server error in AI proxy' });
  }
}
