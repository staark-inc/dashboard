const API = process.env.API_URL || 'https://api.staark-app.cloud';

export async function getSettings(req, res, next) {
  try {
    const token = req.cookies?.accessToken;
    const statusRes = await fetch(`${API}/v1/auth/totp/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const status = statusRes.ok ? await statusRes.json() : { totp_enabled: false };

    res.render('dashboard/settings', {
      layout: 'dashboard-layout',
      title: 'Settings',
      currentPage: 'settings',
      totp_enabled: !!status.totp_enabled,
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) { next(err); }
}

export async function setupTotp(req, res, next) {
  try {
    const token = req.cookies?.accessToken;
    const r = await fetch(`${API}/v1/auth/totp/setup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    if (!r.ok) return res.redirect(`/dashboard/settings?error=${encodeURIComponent(data.error?.message || 'Setup failed')}`);

    res.render('dashboard/settings-totp', {
      layout: 'dashboard-layout',
      title: 'Enable 2FA',
      currentPage: 'settings',
      qrSvg:      data.data.qrSvg,
      secret:     data.data.secret,
      error: null,
    });
  } catch (err) { next(err); }
}

export async function enableTotp(req, res, next) {
  try {
    const { code } = req.body;
    const token    = req.cookies?.accessToken;
    const r = await fetch(`${API}/v1/auth/totp/enable`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await r.json();
    if (!r.ok) {
      return res.render('dashboard/settings-totp', {
        layout: 'dashboard-layout', title: 'Enable 2FA', currentPage: 'settings',
        qrSvg: req.body.qrSvg, secret: req.body.secret,
        error: data.error?.message || 'Invalid code',
      });
    }
    res.redirect('/dashboard/settings?success=2FA+enabled+successfully');
  } catch (err) { next(err); }
}

export async function disableTotp(req, res, next) {
  try {
    const { code } = req.body;
    const token    = req.cookies?.accessToken;
    const r = await fetch(`${API}/v1/auth/totp/disable`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await r.json();
    if (!r.ok) return res.redirect(`/dashboard/settings?error=${encodeURIComponent(data.error?.message || 'Invalid code')}`);
    res.redirect('/dashboard/settings?success=2FA+disabled');
  } catch (err) { next(err); }
}
