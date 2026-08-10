module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  const config = {
    supabase_url: process.env.SUPABASE_URL ? '✅ configured' : '❌ MISSING',
    supabase_key: process.env.SUPABASE_KEY ? '✅ configured' : '❌ MISSING',
    jwt_secret: process.env.JWT_SECRET ? '✅ configured' : '⚠️ using default',
    node_version: process.version,
    timestamp: new Date().toISOString(),
  };

  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({ status: 'ok', config });
};