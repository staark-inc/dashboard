const API_BASE = 'https://api.staark-app.cloud';

export async function getActivity(req, res) {
  try {
    const limit  = Number(req.query.limit)  || 50;
    const offset = Number(req.query.offset) || 0;

    const resp = await fetch(
      `${API_BASE}/v1/audit?user_id=${encodeURIComponent(req.user.id)}&limit=${limit}&offset=${offset}`,
      { headers: { 'Authorization': `Bearer ${process.env.STAARK_API_KEY}` } }
    );

    if (!resp.ok) throw new Error('Failed to load activity');

    const result = await resp.json();

    res.render('dashboard/activity', {
      layout:      'dashboard-layout',
      title:       'Activity',
      currentPage: 'activity',
      user:        req.user,
      logs:        result.data ?? [],
      meta:        result.meta ?? { total: 0, limit, offset },
    });
  } catch (err) {
    res.status(500).send(err.message ?? 'Server error');
  }
}
