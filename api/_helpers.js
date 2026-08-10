const { createClient } = require('@supabase/supabase-js');

const JWT_SECRET = process.env.JWT_SECRET || 'learning_notes_secret_2026';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase not configured');
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY);
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
function verifyToken(req) {
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

function authRequired(req, res) {
  const user = verifyToken(req);
  if (!user) {
    error(res, '未登录或登录已过期', 401);
    return null;
  }
  return user;
}

module.exports = { getSupabase, corsHeaders, json, error, verifyToken, authRequired, JWT_SECRET };
