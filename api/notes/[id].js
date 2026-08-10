const { getSupabase, json, error, authRequired } = require('./_helpers');

// DELETE /api/notes/[id] - delete a note
// PUT /api/notes/[id] - update a note
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = authRequired(req, res);
  if (!user) return;

  // Vercel provides the id in req.query
  const id = req.query.id;
  if (!id) return error(res, '缺少笔记ID');

  try {
    const supabase = getSupabase();

    if (req.method === 'DELETE') {
      const { error: dbError } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.userId);

      if (dbError) return error(res, dbError.message, 500);
      return json(res, { success: true });
    }

    if (req.method === 'PUT') {
      const { title, content, tags, updatedAt } = req.body || {};
      const tagsJson = JSON.stringify(tags || []);
      const wordCount = (content || '').length;

      const { data: existing, error: checkError } = await supabase
        .from('notes')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.userId)
        .single();

      if (!existing) return error(res, '笔记不存在', 404);

      const { error: dbError } = await supabase
        .from('notes')
        .update({
          title: title || existing.title,
          content: content || '',
          tags: tagsJson,
          updated_at: updatedAt || new Date().toISOString(),
          word_count: wordCount,
        })
        .eq('id', id)
        .eq('user_id', user.userId);

      if (dbError) return error(res, dbError.message, 500);
      return json(res, { success: true });
    }

    return error(res, 'Method not allowed', 405);
  } catch (e) {
    return error(res, '服务器错误: ' + e.message, 500);
  }
};
