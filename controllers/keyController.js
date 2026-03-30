import { StaarkError } from '@staark-inc/node';
import api from '../config/api.js';

export async function listKeys(req, res) {
  try {
    const keysRes = await api.keys.list(req.user.id);
    const keys    = keysRes.data ?? [];

    res.render('dashboard/keys', {
      layout: 'dashboard-layout',
      title: 'API Keys',
      currentPage: 'keys',
      user: req.user,
      keys,
      newKey: req.query.newKey ? decodeURIComponent(req.query.newKey) : null,
      error:  req.query.error  ? decodeURIComponent(req.query.error)  : null,
    });
  } catch (err) {
    res.status(500).send(err instanceof StaarkError ? err.message : 'Server error');
  }
}

export async function generateKey(req, res) {
  const { name, plan, ttl_days } = req.body;
  try {
    const result = await api.keys.generate({
      user_id:  req.user.id,
      name:     name     || 'My API Key',
      plan:     plan     || 'free',
      ttl_days: ttl_days ? Number(ttl_days) : undefined,
    });
    res.redirect(`/dashboard/keys?newKey=${encodeURIComponent(result.data.key)}`);
  } catch (err) {
    const message = err instanceof StaarkError ? err.message : 'Eroare la generare.';
    res.redirect(`/dashboard/keys?error=${encodeURIComponent(message)}`);
  }
}

export async function revokeKey(req, res) {
  try { await api.keys.revoke(Number(req.params.id), req.user.id); } catch (_) {}
  res.redirect('/dashboard/keys');
}
