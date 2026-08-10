const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabaseQuery, json, error, JWT_SECRET } = require('./_helpers');

module.exports = async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);

  const { username, password } = req.body || {};
  if (!username || !password) return error(res, '用户名和密码不能为空');
  if (username.length < 2) return error(res, '用户名至少2个字符');
  if (password.length < 4) return error(res, '密码至少4个字符');

  try {
    // Check if user exists (using count + head)
    const existing = await supabaseQuery(
      `/users?username=eq.${encodeURIComponent(username)}&select=id`,
      { method: 'GET', prefer: 'count=exact' }
    );

    if (existing && existing.length > 0) {
      return error(res, '用户名已存在', 409);
    }

    // Create user
    const hashed = bcrypt.hashSync(password, 10);
    const created = await supabaseQuery('/users', {
      method: 'POST',
      body: { username, password: hashed },
      prefer: 'return=representation',
    });

    if (!created || !created[0]) {
      return error(res, '注册失败', 500);
    }

    const newUser = created[0];
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return json(res, { token, username: newUser.username, userId: newUser.id });
  } catch (e) {
    return error(res, '服务器错误: ' + e.message, 500);
  }
};