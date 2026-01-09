// Vercel Serverless Function - Proxy for thumbnail generation
// Proxies requests to Cloud Run backend to avoid CORS issues
// Access at: /api/thumbnails/generate

module.exports = async (req, res) => {
  // Set CORS headers - allow requests from any origin (like OpenAI/Gemini APIs)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  // Get backend URL from environment
  const backendUrl = process.env.API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || '';
  
  if (!backendUrl) {
    res.status(500).json({ error: 'API_BASE_URL not configured' });
    return;
  }
  
  try {
    // Forward the request to Cloud Run backend
    const backendResponse = await fetch(`${backendUrl}/thumbnails/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward Authorization header if present
        ...(req.headers.authorization && { Authorization: req.headers.authorization })
      },
      body: JSON.stringify(req.body)
      // Note: Vercel Pro allows up to 300s timeout, but analysis may take longer
      // The fetch itself can take longer, but Vercel function execution is limited
    });
    
    // Get response data
    const data = await backendResponse.text();
    
    // Forward status and headers
    res.status(backendResponse.status);
    
    // Try to parse as JSON, otherwise send as text
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch {
      res.send(data);
    }
    
  } catch (error) {
    console.error('Proxy error:', error);
    
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      res.status(504).json({ error: 'Request timeout - analysis took too long' });
    } else {
      res.status(500).json({ 
        error: 'Proxy error', 
        message: error.message 
      });
    }
  }
};


