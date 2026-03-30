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
    });
  } catch (err) {
    res.status(500).send(err instanceof StaarkError ? err.message : 'Server error');
  }
}
