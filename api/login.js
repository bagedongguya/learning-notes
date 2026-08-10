const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSupabase, json, error } = require('./_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);

  const { username, password } = req.body || {};
  if (!username || !password) return error(res, '用户名和密码不能为空');

  try {
    const supabase = getSupabase();

    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('id, username, password')
      .eq('username', username)
      .single();

    if (dbError || !user) return error(res, '用户名或密码错误', 401);

    if (!bcrypt.compareSync(password, user.password)) {
      return error(res, '用户名或密码错误', 401);
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'learning_notes_secret_2026',
      { expiresIn: '30d' }
    );

    return json(res, { token, username: user.username, userId: user.id });
  } catch (e) {
    return error(res, '服务器错误: ' + e.message, 500);
  }
};
