const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSupabase, json, error } = require('./_helpers');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);

  const { username, password } = req.body || {};
  if (!username || !password) return error(res, '用户名和密码不能为空');
  if (username.length < 2) return error(res, '用户名至少2个字符');
  if (password.length < 4) return error(res, '密码至少4个字符');

  try {
    const supabase = getSupabase();

    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) return error(res, '用户名已存在', 409);

    // Create user
    const hashed = bcrypt.hashSync(password, 10);
    const { data, error: dbError } = await supabase
      .from('users')
      .insert({ username, password: hashed })
      .select('id, username')
      .single();

    if (dbError) return error(res, '注册失败: ' + dbError.message, 500);

    const token = jwt.sign(
      { userId: data.id, username: data.username },
      process.env.JWT_SECRET || 'learning_notes_secret_2026',
      { expiresIn: '30d' }
    );

    return json(res, { token, username: data.username, userId: data.id });
  } catch (e) {
    return error(res, '服务器错误: ' + e.message, 500);
  }
};
