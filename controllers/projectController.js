import { StaarkError } from '@staark-inc/node';
import api from '../config/api.js';

export async function listProjects(req, res) {
  try {
    const projectsRes = await api.projects.list({ workspace_id: req.user.workspaceId });
    const projects    = projectsRes.data ?? [];

    // Fetch task counts for all projects
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

    const selectedId = req.query.project || projects[0]?.id;
    let tasks = [];
    if (selectedId) {
      const tasksRes = await api.tasks.list(selectedId, {});
      tasks = tasksRes.data ?? [];
    }

    res.render('dashboard/projects', {
      layout: 'dashboard-layout',
      title: 'Projects & Tasks',
      currentPage: 'projects',
      user: req.user,
      projects: projectsWithTasks,
      tasks,
      selectedProjectId: selectedId,
    });
  } catch (err) {
    res.status(500).send(err instanceof StaarkError ? err.message : 'Server error');
  }
}

export function getNewProject(req, res) {
  res.render('dashboard/projects-new', {
    layout: 'dashboard-layout',
    title: 'New Project',
    currentPage: 'projects',
    user: req.user,
  });
}

export async function createProject(req, res) {
  const { name, description, color, visibility } = req.body;
  try {
    await api.projects.create({
      workspace_id: req.user.workspaceId,
      name,
      description:  description || undefined,
      color:        color       || undefined,
      visibility:   visibility  || 'private',
    });
    res.redirect('/dashboard/projects');
  } catch (err) {
    const message = err instanceof StaarkError ? err.message : 'Eroare la creare.';
    res.render('dashboard/projects-new', {
      layout: 'dashboard-layout',
      title: 'New Project',
      currentPage: 'projects',
      user: req.user,
      error: message,
      fields: { name, description },
    });
  }
}

export async function getProjectDetail(req, res) {
  try {
    const [projectRes, tasksRes] = await Promise.all([
      api.projects.get(req.params.id),
      api.tasks.list(req.params.id, {
        status: req.query.filter || undefined,
      }),
    ]);
    res.render('dashboard/project-detail', {
      layout: 'dashboard-layout',
      title: projectRes.data.name,
      currentPage: 'projects',
      user: req.user,
      project: projectRes.data,
      tasks: tasksRes.data ?? [],
      currentFilter: req.query.filter || 'all',
    });
  } catch (err) {
    res.status(404).send(err instanceof StaarkError ? err.message : 'Proiect negăsit.');
  }
}

export async function getEditProject(req, res) {
  try {
    const projectRes = await api.projects.get(req.params.id);
    res.render('dashboard/project-edit', {
      layout: 'dashboard-layout',
      title: 'Edit Project',
      currentPage: 'projects',
      user: req.user,
      project: projectRes.data,
    });
  } catch (err) {
    res.redirect('/dashboard/projects');
  }
}

export async function updateProject(req, res) {
  const { name, description, color, visibility, status } = req.body;
  try {
    await api.projects.update(req.params.id, {
      name,
      description: description || undefined,
      color:       color       || undefined,
      visibility:  visibility  || undefined,
      status:      status      || undefined,
    });
    res.redirect(`/dashboard/projects/${req.params.id}`);
  } catch (err) {
    const message = err instanceof StaarkError ? err.message : 'Eroare la salvare.';
    const projectRes = await api.projects.get(req.params.id)
      .catch(() => ({ data: { id: req.params.id, name } }));
    res.render('dashboard/project-edit', {
      layout: 'dashboard-layout',
      title: 'Edit Project',
      currentPage: 'projects',
      user: req.user,
      project: projectRes.data,
      error: message,
    });
  }
}

export async function deleteProject(req, res) {
  try { await api.projects.delete(req.params.id); } catch (_) {}
  res.redirect('/dashboard/projects');
}

export async function getNewTask(req, res) {
  try {
    const projectRes = await api.projects.get(req.params.id);
    res.render('dashboard/task-new', {
      layout: 'dashboard-layout',
      title: 'New Task',
      currentPage: 'projects',
      user: req.user,
      project: projectRes.data,
    });
  } catch (err) {
    res.redirect('/dashboard/projects');
  }
}

export async function createTask(req, res) {
  const { title, description, priority, due_date, tags } = req.body;
  let parsedTags = [];
  try { parsedTags = JSON.parse(tags || '[]'); } catch (_) {}

  try {
    await api.tasks.create(req.params.id, {
      title,
      description: description || undefined,
      priority:    priority    || 'medium',
      due_date:    due_date    || undefined,
      tags:        parsedTags,
    });
    res.redirect(`/dashboard/projects/${req.params.id}`);
  } catch (err) {
    const message = err instanceof StaarkError ? err.message : 'Eroare la creare.';
    const projectRes = await api.projects.get(req.params.id)
      .catch(() => ({ data: { id: req.params.id, name: 'Project' } }));
    res.render('dashboard/task-new', {
      layout: 'dashboard-layout',
      title: 'New Task',
      currentPage: 'projects',
      user: req.user,
      project: projectRes.data,
      error: message,
      fields: { title, description, priority, due_date },
    });
  }
}

export async function getEditTask(req, res) {
  try {
    const [projectRes, taskRes] = await Promise.all([
      api.projects.get(req.params.id),
      api.tasks.get(req.params.taskId),
    ]);
    res.render('dashboard/task-edit', {
      layout: 'dashboard-layout',
      title: 'Edit Task',
      currentPage: 'projects',
      user: req.user,
      project: projectRes.data,
      task: taskRes.data,
    });
  } catch (err) {
    res.redirect(`/dashboard/projects/${req.params.id}`);
  }
}

export async function updateTask(req, res) {
  const { title, description, priority, status, due_date, tags } = req.body;
  let parsedTags = [];
  try { parsedTags = JSON.parse(tags || '[]'); } catch (_) {}

  try {
    await api.tasks.update(req.params.taskId, {
      title,
      description: description || undefined,
      priority:    priority    || undefined,
      status:      status      || undefined,
      due_date:    due_date    || undefined,
      tags:        parsedTags,
    });
    res.redirect(`/dashboard/projects/${req.params.id}`);
  } catch (err) {
    const message = err instanceof StaarkError ? err.message : 'Eroare la salvare.';
    const [projectRes, taskRes] = await Promise.all([
      api.projects.get(req.params.id).catch(() => ({ data: { id: req.params.id, name: 'Project' } })),
      api.tasks.get(req.params.taskId).catch(() => ({ data: { id: req.params.taskId, title } })),
    ]);
    res.render('dashboard/task-edit', {
      layout: 'dashboard-layout',
      title: 'Edit Task',
      currentPage: 'projects',
      user: req.user,
      project: projectRes.data,
      task: taskRes.data,
      error: message,
    });
  }
}

export async function deleteTask(req, res) {
  try { await api.tasks.delete(req.params.taskId); } catch (_) {}
  res.redirect(`/dashboard/projects/${req.params.id}`);
}
