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
      topbarActions: `<a href="/dashboard/export/keys?format=json" style="display:inline-flex;align-items:center;gap:5px;font-size:0.72rem;padding:0.32rem 0.75rem;border-radius:6px;border:1px solid var(--border);color:var(--text-dim);text-decoration:none;font-weight:600;" onmouseover="this.style.color='var(--violet)';this.style.borderColor='var(--violet)'" onmouseout="this.style.color='var(--text-dim)';this.style.borderColor='var(--border)'"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export JSON</a>`,
    });
  } catch (err) {
    res.status(500).send(err instanceof StaarkError ? err.message : 'Server error');
  }
}

export async function generateKey(req, res) {
  const { name, plan, label, ttl_days } = req.body;
  try {
    const result = await api.keys.generate({
      user_id:  req.user.id,
      name:     name     || 'My API Key',
      plan:     plan     || 'free',
      label:    label    || 'development',
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
