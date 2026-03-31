const API = process.env.API_URL || 'https://api.staark-app.cloud';

export async function listWebhooks(req, res, next) {
  try {
    const token = req.cookies?.accessToken;
    const r = await fetch(`${API}/v1/webhooks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = r.ok ? await r.json() : { data: [] };

    const eventsR = await fetch(`${API}/v1/webhooks/events`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const eventsData = eventsR.ok ? await eventsR.json() : { data: [] };

    res.render('dashboard/webhooks', {
      layout: 'dashboard-layout',
      title: 'Webhooks',
      currentPage: 'webhooks',
      hooks: data.data || [],
      validEvents: eventsData.data || [],
      error:   req.query.error   || null,
      success: req.query.success || null,
    });
  } catch (err) { next(err); }
}

export async function createWebhook(req, res, next) {
  try {
    const { url, secret, events } = req.body;
    const token = req.cookies?.accessToken;

    // events can be array or single string from form checkboxes
    const eventsArr = Array.isArray(events) ? events : events ? [events] : [];

    const r = await fetch(`${API}/v1/webhooks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, secret: secret || undefined, events: eventsArr }),
    });
    const data = await r.json();
    if (!r.ok) return res.redirect(`/dashboard/webhooks?error=${encodeURIComponent(data.error?.message || 'Failed to create webhook')}`);
    res.redirect('/dashboard/webhooks?success=Webhook+created');
  } catch (err) { next(err); }
}

export async function deleteWebhook(req, res, next) {
  try {
    const token = req.cookies?.accessToken;
    await fetch(`${API}/v1/webhooks/${req.params.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    res.redirect('/dashboard/webhooks?success=Webhook+deleted');
  } catch (err) { next(err); }
}

export async function listDeliveries(req, res, next) {
  try {
    const token  = req.cookies?.accessToken;
    const hookId = req.params.id;
    const offset = parseInt(req.query.offset ?? '0', 10);
    const limit  = 25;

    const [hooksR, delivR] = await Promise.all([
      fetch(`${API}/v1/webhooks`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/v1/webhooks/${hookId}/deliveries?limit=${limit}&offset=${offset}`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const hooksData = hooksR.ok ? await hooksR.json() : { data: [] };
    const delivData = delivR.ok ? await delivR.json() : { data: [], meta: { total: 0, limit, offset } };

    const hook = (hooksData.data || []).find(h => String(h.id) === String(hookId));
    if (!hook) return res.redirect('/dashboard/webhooks');

    res.render('dashboard/webhook-deliveries', {
      layout: 'dashboard-layout',
      title:  `Deliveries — ${hook.url}`,
      currentPage: 'webhooks',
      hook,
      deliveries: delivData.data || [],
      meta: delivData.meta || { total: 0, limit, offset },
    });
  } catch (err) { next(err); }
}

export async function redeliverWebhook(req, res, next) {
  try {
    const token = req.cookies?.accessToken;
    await fetch(`${API}/v1/webhooks/${req.params.id}/deliveries/${req.params.deliveryId}/redeliver`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    res.redirect(`/dashboard/webhooks/${req.params.id}/deliveries?success=Redelivery+queued`);
  } catch (err) { next(err); }
}
