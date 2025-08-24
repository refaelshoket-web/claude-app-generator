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
        status: "active"
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

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', errorData);
        return res.status(response.status).json({ 
          error: 'Claude API request failed',
          details: errorData,
          status: response.status
        });
      }

      const data = await response.json();
      
      return res.status(200).json({
        success: true,
        content: data.content[0].text,
        usage: data.usage
      });
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
