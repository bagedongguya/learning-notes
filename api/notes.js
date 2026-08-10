const { getSupabase, json, error, authRequired } = require('./_helpers');

// GET /api/notes - list all notes for current user
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = authRequired(req, res);
  if (!user) return;

  try {
    const supabase = getSupabase();

    if (req.method === 'GET') {
      const { data, error: dbError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.userId)
        .order('updated_at', { ascending: false });

      if (dbError) return error(res, dbError.message, 500);

      const parsed = (data || []).map(n => ({
        ...n,
        tags: n.tags ? (typeof n.tags === 'string' ? JSON.parse(n.tags) : n.tags) : []
      }));

      return json(res, parsed);
    }

    if (req.method === 'POST') {
      const { id, title, content, tags, createdAt, updatedAt } = req.body || {};
      if (!id || !title) return error(res, '缺少必填字段');

      const tagsJson = JSON.stringify(tags || []);
      const wordCount = (content || '').length;

      const { error: dbError } = await supabase
        .from('notes')
        .upsert({
          id,
          user_id: user.userId,
          title,
          content: content || '',
          tags: tagsJson,
          created_at: createdAt || new Date().toISOString(),
          updated_at: updatedAt || new Date().toISOString(),
          word_count: wordCount,
        });

      if (dbError) return error(res, dbError.message, 500);

      return json(res, { success: true });
    }

    return error(res, 'Method not allowed', 405);
  } catch (e) {
    return error(res, '服务器错误: ' + e.message, 500);
  }
};
