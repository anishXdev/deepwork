// Vercel Serverless Function to serve Google OAuth configuration from backend
export default function handler(req, res) {
  // Read from server environment variables (configured in Vercel or .env)
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
  
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).json({
    clientId,
    configured: Boolean(clientId),
    provider: 'Google Identity Services (GIS)',
    backendReady: true
  });
}
