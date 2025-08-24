const CLAUDE_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307'
];

async function tryModelRequest(apiKey, prompt, modelIndex = 0) {
  if (modelIndex >= CLAUDE_MODELS.length) {
    throw new Error('כל המודלים זמינים נכשלו - ייתכן שיש בעיה עם המפתח או השירות');
  }
  
  const model = CLAUDE_MODELS[modelIndex];
  
  try {
    console.log(`מנסה מודל: ${model}`);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // אם המודל לא נמצא, נסה את הבא
      if (data.error?.type === 'not_found_error') {
        console.log(`מודל ${model} לא זמין, מנסה הבא...`);
        return await tryModelRequest(apiKey, prompt, modelIndex + 1);
      }
      
      // שגיאות אחרות
      throw new Error(data.error?.message || `HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    console.log(`הצלחה עם מודל: ${model}`);
    return {
      success: true,
      content: data.content[0].text,
      usage: data.usage,
      model_used: model
    };

  } catch (error) {
    console.error(`שגיאה במודל ${model}:`, error.message);
    
    // אם זה שגיאת מודל לא נמצא, נסה הבא
    if (error.message.includes('not_found') || error.message.includes('model')) {
      return await tryModelRequest(apiKey, prompt, modelIndex + 1);
    }
    
    // שגיאות אחרות - זרוק הלאה
    throw error;
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        message: "Claude API Function עובדת!",
        platform: "Vercel",
        timestamp: new Date().toISOString(),
        status: "active",
        available_models: CLAUDE_MODELS
      });
    }

    if (req.method === 'POST') {
      const { apiKey, prompt } = req.body;
      
      // Use apiKey from request or environment
      const API_KEY = apiKey || process.env.ANTHROPIC_API_KEY;
      
      if (!API_KEY) {
        return res.status(500).json({ 
          error: 'API key not configured',
          details: 'Neither request apiKey nor environment ANTHROPIC_API_KEY found'
        });
      }

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // נסה את המודלים עם fallback
      const result = await tryModelRequest(API_KEY, prompt);
      
      return res.status(200).json(result);
    }

    res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
