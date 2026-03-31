const API_BASE = 'https://api.staark-app.cloud';

export async function exportKeys(req, res) {
  try {
    const format = req.query.format || 'json';
    const url    = `${API_BASE}/v1/export/keys?user_id=${encodeURIComponent(req.user.id)}&format=${format}`;

    const resp = await fetch(url, {
      headers: { 'Authorization': `Bearer ${process.env.STAARK_API_KEY}` },
    });

    if (!resp.ok) throw new Error('Export failed');

    res.setHeader('Content-Type',        resp.headers.get('content-type')        || 'application/json');
    res.setHeader('Content-Disposition', resp.headers.get('content-disposition') || `attachment; filename="api-keys.${format}"`);

    const buffer = await resp.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).send('Export failed');
  }
}

export async function exportProjects(req, res) {
  try {
    const format = req.query.format || 'json';
    const url    = `${API_BASE}/v1/export/projects?workspace_id=${encodeURIComponent(req.user.workspaceId)}&format=${format}`;

    const resp = await fetch(url, {
      headers: { 'Authorization': `Bearer ${process.env.STAARK_API_KEY}` },
    });

    if (!resp.ok) throw new Error('Export failed');

    res.setHeader('Content-Type',        resp.headers.get('content-type')        || 'text/csv');
    res.setHeader('Content-Disposition', resp.headers.get('content-disposition') || `attachment; filename="projects.${format}"`);

    const buffer = await resp.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).send('Export failed');
  }
}
