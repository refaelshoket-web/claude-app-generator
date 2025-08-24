export default async function handler(req, res) {
    // הגדרת CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // טיפול ב-OPTIONS (CORS preflight)
    if (req.method === 'OPTIONS') {
        console.log('OPTIONS request - מחזיר CORS headers');
        return res.status(200).json({ message: 'CORS OK' });
    }

    // בדיקת GET request פשוטה
    if (req.method === 'GET') {
        console.log('GET request - Vercel Function פעילה!');
        return res.status(200).json({ 
            message: 'Claude API Function עובדת!',
            platform: 'Vercel',
            timestamp: new Date().toISOString()
        });
    }

    // בדיקת POST
    if (req.method !== 'POST') {
        console.log('Method לא נתמך:', req.method);
        return res.status(405).json({ 
            error: 'Method not allowed',
            allowedMethods: ['GET', 'POST', 'OPTIONS'],
            receivedMethod: req.method
        });
    }

    console.log('POST request - מתחיל לעבד...');

    try {
        const { apiKey, prompt } = req.body;
        
        console.log('API Key exists:', !!apiKey);
        console.log('Prompt exists:', !!prompt);
        console.log('Prompt length:', prompt ? prompt.length : 0);

        // בדיקת פרמטרים
        if (!apiKey || !prompt) {
            console.log('חסרים פרמטרים');
            return res.status(400).json({
                success: false,
                error: 'Missing apiKey or prompt',
                debug: { hasApiKey: !!apiKey, hasPrompt: !!prompt }
            });
        }

        // בדיקת API key format
        if (!apiKey.startsWith('sk-ant-')) {
            console.log('API key format invalid');
            return res.status(400).json({
                success: false,
                error: 'Invalid API key format',
                debug: 'API key should start with sk-ant-'
            });
        }

        console.log('מתחיל קריאה ל-Anthropic API...');

        // קריאה ל-Anthropic API
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 4000,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        console.log('Anthropic API response status:', anthropicResponse.status);

        if (!anthropicResponse.ok) {
            const errorData = await anthropicResponse.json().catch(e => {
                console.log('Error parsing Anthropic error response:', e.message);
                return { error: { message: 'Unknown error from Anthropic' } };
            });
            
            console.log('Anthropic API error:', JSON.stringify(errorData, null, 2));
            
            return res.status(anthropicResponse.status).json({
                success: false,
                error: errorData.error?.message || `HTTP ${anthropicResponse.status}`,
                debug: {
                    anthropicStatus: anthropicResponse.status,
                    anthropicError: errorData
                }
            });
        }

        const anthropicData = await anthropicResponse.json();
        console.log('Anthropic API success!');
        console.log('Response content length:', anthropicData.content?.[0]?.text?.length || 0);

        // החזרת התוצאה
        return res.status(200).json({
            success: true,
            content: anthropicData.content[0].text,
            debug: {
                platform: 'Vercel',
                timestamp: new Date().toISOString(),
                promptLength: prompt.length,
                responseLength: anthropicData.content[0].text.length
            }
        });

    } catch (error) {
        console.log('Unexpected error:', error.message);
        console.log('Error stack:', error.stack);
        
        return res.status(500).json({
            success: false,
            error: error.message,
            debug: {
                platform: 'Vercel',
                errorType: error.constructor.name,
                errorStack: error.stack,
                timestamp: new Date().toISOString()
            }
        });
    }
}
