const JWT_SECRET = process.env.JWT_SECRET || 'learning_notes_secret_2026';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function checkConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY in Vercel env vars.');
  }
}

// Use Node.js built-in fetch (available since Node 18) to call Supabase REST API
async function supabaseQuery(path, options = {}) {
  checkConfig();
  const url = `${SUPABASE_URL}/rest/v1${path}`;

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation',
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase error ${response.status}: ${errorText}`);
  }

  // Some endpoints return empty body (DELETE)
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function json(res, data, status = 200) {
  return res.status(status).json(data);
}

function error(res, message, status = 400) {
  return res.status(status).json({ error: message });
}

// Verify JWT and return user info
async function verifyToken(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, JWT_SECRET);
    return { userId: decoded.userId, username: decoded.username };
  } catch (e) {
    return null;
  }
}

async function authRequired(req, res) {
  const user = await verifyToken(req);
  if (!user) {
    error(res, '未登录或登录已过期', 401);
    return null;
  }
  return user;
}

module.exports = { supabaseQuery, corsHeaders, json, error, verifyToken, authRequired, JWT_SECRET };