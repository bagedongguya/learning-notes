const { supabaseQuery, json, error, authRequired } = require('./_helpers');

module.exports = async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  const user = await authRequired(req, res);
  if (!user) return;

  // Vercel dynamic route: api/notes/[id].js → req.query.id
  const id = req.query.id;
  if (!id) return error(res, '缺少笔记ID');

  try {
    if (req.method === 'DELETE') {
      await supabaseQuery(`/notes?id=eq.${encodeURIComponent(id)}&user_id=eq.${user.userId}`, {
        method: 'DELETE',
        prefer: 'return=representation',
      });
      return json(res, { success: true });
    }

    if (req.method === 'PUT') {
      const { title, content, tags, updatedAt } = req.body || {};
      const tagsJson = JSON.stringify(tags || []);
      const wordCount = (content || '').length;

      // Check if note exists and belongs to user
      const existing = await supabaseQuery(
        `/notes?id=eq.${encodeURIComponent(id)}&user_id=eq.${user.userId}&select=id,title`,
        { method: 'GET' }
      );

      if (!existing || existing.length === 0) {
        return error(res, '笔记不存在', 404);
      }

      await supabaseQuery(
        `/notes?id=eq.${encodeURIComponent(id)}&user_id=eq.${user.userId}`,
        {
          method: 'PATCH',
          body: {
            title: title || existing[0].title,
            content: content || '',
            tags: tagsJson,
            updated_at: updatedAt || new Date().toISOString(),
            word_count: wordCount,
          },
        }
      );

      return json(res, { success: true });
    }

    return error(res, 'Method not allowed', 405);
  } catch (e) {
    return error(res, '服务器错误: ' + e.message, 500);
  }
};