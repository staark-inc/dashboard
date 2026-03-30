import { StaarkError } from '@staark-inc/node';
import api from '../config/api.js';

export async function getOverview(req, res) {
  try {
    const [projectsRes, keysRes] = await Promise.all([
      api.projects.list({ workspace_id: req.user.workspaceId }),
      api.keys.list(req.user.id),
    ]);

    const projects = projectsRes.data ?? [];
    const keys     = keysRes.data    ?? [];

    // Fetch task counts for all projects in parallel
    const projectsWithTasks = await Promise.all(
      projects.map(async (p) => {
        const tasksRes = await api.tasks.list(p.id, {}).catch(() => ({ data: [] }));
        const tasks = tasksRes.data ?? [];
        return {
          ...p,
          taskCount: tasks.length,
          doneCount: tasks.filter(t => t.status === 'done').length,
        };
      })
    );

    const totalTasks = projectsWithTasks.reduce((s, p) => s + p.taskCount, 0);
    const doneTasks  = projectsWithTasks.reduce((s, p) => s + p.doneCount,  0);

    res.render('dashboard/overview', {
      layout: 'dashboard-layout',
      title: 'Dashboard',
      currentPage: 'dashboard',
      user: req.user,
      projects: projectsWithTasks,
      keys,
      totalTasks,
      doneTasks,
    });
  } catch (err) {
    res.status(500).send(err instanceof StaarkError ? err.message : 'Server error');
  }
}
