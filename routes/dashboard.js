import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as overview  from '../controllers/overviewController.js';
import * as projects  from '../controllers/projectController.js';
import * as keys      from '../controllers/keyController.js';
import * as analytics from '../controllers/analyticsController.js';
import * as activity     from '../controllers/activityController.js';
import * as exportCtrl   from '../controllers/exportController.js';
import * as settings     from '../controllers/settingsController.js';
import * as webhooksCtrl from '../controllers/webhooksController.js';

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

router.get('/activity',          activity.getActivity);
router.get('/export/keys',       exportCtrl.exportKeys);
router.get('/export/projects',   exportCtrl.exportProjects);

router.get('/settings',                settings.getSettings);
router.post('/settings/totp/setup',    settings.setupTotp);
router.post('/settings/totp/enable',   settings.enableTotp);
router.post('/settings/totp/disable',  settings.disableTotp);

router.get('/webhooks',                              webhooksCtrl.listWebhooks);
router.post('/webhooks',                             webhooksCtrl.createWebhook);
router.post('/webhooks/:id/delete',                  webhooksCtrl.deleteWebhook);
router.get('/webhooks/:id/deliveries',               webhooksCtrl.listDeliveries);
router.post('/webhooks/:id/deliveries/:deliveryId/redeliver', webhooksCtrl.redeliverWebhook);

export default router;
