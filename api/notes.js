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

  try {
    if (req.method === 'GET') {
      const data = await supabaseQuery(
        `/notes?user_id=eq.${user.userId}&order=updated_at.desc&select=*`,
        { method: 'GET' }
      );

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

      // Use upsert via PATCH with Prefer: resolution=merge-duplicates
      await supabaseQuery('/notes', {
        method: 'POST',
        body: {
          id,
          user_id: user.userId,
          title,
          content: content || '',
          tags: tagsJson,
          created_at: createdAt || new Date().toISOString(),
          updated_at: updatedAt || new Date().toISOString(),
          word_count: wordCount,
        },
        prefer: 'resolution=merge-duplicates',
      });

      return json(res, { success: true });
    }

    return error(res, 'Method not allowed', 405);
  } catch (e) {
    return error(res, '服务器错误: ' + e.message, 500);
  }
};