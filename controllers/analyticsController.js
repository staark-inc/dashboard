import { StaarkError } from '@staark-inc/node';
import api from '../config/api.js';

export async function getAnalytics(req, res) {
  try {
    const projectsRes = await api.projects.list({ workspace_id: req.user.workspaceId });
    const projects    = projectsRes.data ?? [];

    const tasksArrays = await Promise.all(
      projects.map(p =>
        api.tasks.list(p.id, {})
          .then(r => (r.data ?? []).map(t => ({ ...t, projectId: p.id })))
          .catch(() => [])
      )
    );
    const tasks = tasksArrays.flat();

    res.render('dashboard/analytics', {
      layout: 'dashboard-layout',
      title: 'Analytics',
      currentPage: 'analytics',
      user: req.user,
      projects,
      tasks,
      topbarActions: `<a href="/dashboard/export/projects?format=csv" style="display:inline-flex;align-items:center;gap:5px;font-size:0.72rem;padding:0.32rem 0.75rem;border-radius:6px;border:1px solid var(--border);color:var(--text-dim);text-decoration:none;font-weight:600;" onmouseover="this.style.color='var(--violet)';this.style.borderColor='var(--violet)'" onmouseout="this.style.color='var(--text-dim)';this.style.borderColor='var(--border)'"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export CSV</a>`,
    });
  } catch (err) {
    res.status(500).send(err instanceof StaarkError ? err.message : 'Server error');
  }
}
