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

  try {
    const users = await supabaseQuery(
      `/users?username=eq.${encodeURIComponent(username)}&select=id,username,password`,
      { method: 'GET' }
    );

    if (!users || users.length === 0) {
      return error(res, '用户名或密码错误', 401);
    }

    const user = users[0];
    if (!bcrypt.compareSync(password, user.password)) {
      return error(res, '用户名或密码错误', 401);
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return json(res, { token, username: user.username, userId: user.id });
  } catch (e) {
    return error(res, '服务器错误: ' + e.message, 500);
  }
};