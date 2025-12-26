// Minimal API route to serve environment variables
// Vercel serverless function format
module.exports = function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache');
  
  const config = `window.SUPABASE_URL = ${JSON.stringify(process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '')};
window.SUPABASE_ANON_KEY = ${JSON.stringify(process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY || '')};
window.API_BASE_URL = ${JSON.stringify(process.env.API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || '')};`;
  
  res.status(200).send(config);
};

