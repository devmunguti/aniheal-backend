const express = require('express');
const router = express.Router();
const insuranceController = require('../controllers/insuranceController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Public endpoints
router.get('/plans', insuranceController.getActivePlans);
router.get('/plans/:code', insuranceController.getPlanByCode);
router.post('/subscribe', insuranceController.submitSubscriptionApplication);

// Admin endpoints
router.get('/admin/plans', authenticate, authorize('superadmin', 'admin', 'editor'), insuranceController.getAllPlansAdmin);
router.post('/admin/plans', authenticate, authorize('superadmin', 'admin'), insuranceController.createPlan);
router.put('/admin/plans/:id', authenticate, authorize('superadmin', 'admin'), insuranceController.updatePlan);
router.patch('/admin/plans/:id/status', authenticate, authorize('superadmin', 'admin'), insuranceController.togglePlanStatus);
router.delete('/admin/plans/:id', authenticate, authorize('superadmin', 'admin'), insuranceController.deletePlan);

// Admin applications & policies
router.get('/admin/subscriptions', authenticate, authorize('superadmin', 'admin', 'editor'), insuranceController.getAllSubscriptions);
router.patch('/admin/subscriptions/:id', authenticate, authorize('superadmin', 'admin'), insuranceController.updateSubscriptionStatus);
router.post('/admin/subscriptions/:id/convert', authenticate, authorize('superadmin', 'admin'), insuranceController.convertSubscriptionToPolicy);
router.get('/admin/policies', authenticate, authorize('superadmin', 'admin', 'editor'), insuranceController.getAllPolicies);
router.get('/admin/analytics', authenticate, authorize('superadmin', 'admin', 'editor'), insuranceController.getInsuranceAnalytics);

module.exports = router;
