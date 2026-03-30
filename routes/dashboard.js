import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as overview  from '../controllers/overviewController.js';
import * as projects  from '../controllers/projectController.js';
import * as keys      from '../controllers/keyController.js';
import * as analytics from '../controllers/analyticsController.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', overview.getOverview);

router.get('/projects',                              projects.listProjects);
router.get('/projects/new',                          projects.getNewProject);
router.post('/projects/new',                         projects.createProject);
router.get('/projects/:id/tasks/new',                projects.getNewTask);
router.post('/projects/:id/tasks/new',               projects.createTask);
router.get('/projects/:id/tasks/:taskId/edit',       projects.getEditTask);
router.post('/projects/:id/tasks/:taskId/edit',      projects.updateTask);
router.post('/projects/:id/tasks/:taskId/delete',    projects.deleteTask);
router.get('/projects/:id',                          projects.getProjectDetail);
router.get('/projects/:id/edit',                     projects.getEditProject);
router.post('/projects/:id/edit',                    projects.updateProject);
router.post('/projects/:id/delete',                  projects.deleteProject);

router.get('/keys',               keys.listKeys);
router.post('/keys/generate',     keys.generateKey);
router.post('/keys/:id/revoke',   keys.revokeKey);

router.get('/analytics', analytics.getAnalytics);

export default router;
