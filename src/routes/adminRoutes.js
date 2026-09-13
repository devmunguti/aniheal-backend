const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController');
const inventoryController = require('../controllers/inventoryController');
const productOrderController = require('../controllers/productOrderController');
const paymentController = require('../controllers/paymentController');
const insuranceController = require('../controllers/insuranceController');
const animalController = require('../controllers/animalController');
const ownerController = require('../controllers/ownerController');
const vetLogController = require('../controllers/vetLogController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Require authentication and at least editor/vet role for admin routes
router.use(authenticate);
router.use(authorize('superadmin', 'admin', 'editor', 'vet'));

// 1. Dashboard Stats
router.get('/dashboard/stats', adminController.getDashboardStats);

// 2. Products & Inventory Management
router.get('/products', productController.getAllProductsAdmin);
router.get('/products/:id', productController.getProductByIdAdmin);
router.post('/products', authorize('superadmin', 'admin'), productController.createProduct);
router.put('/products/:id', authorize('superadmin', 'admin'), productController.updateProduct);
router.patch('/products/:id/status', authorize('superadmin', 'admin'), productController.toggleProductStatus);
router.delete('/products/:id', authorize('superadmin', 'admin'), productController.deleteProduct);

// Inventory
router.post('/inventory/adjust', authorize('superadmin', 'admin'), inventoryController.adjustStock);
router.get('/inventory/history', inventoryController.getInventoryHistory);
router.get('/inventory/low-stock', inventoryController.getLowStockAlerts);

// Product Orders
router.get('/orders', productOrderController.getAllOrders);
router.get('/orders/:id', productOrderController.getOrderById);
router.patch('/orders/:id/status', authorize('superadmin', 'admin', 'editor'), productOrderController.updateOrderStatus);

// 3. Payments & Sales Revenue Recording
router.post('/payments', authorize('superadmin', 'admin', 'editor'), paymentController.recordPayment);
router.get('/payments', paymentController.getAllPayments);
router.get('/payments/analytics', paymentController.getPaymentAnalytics);
router.get('/payments/:id', paymentController.getPaymentById);

// 4. Animal Insurance & Subscription Management
router.get('/insurance/plans', insuranceController.getAllPlansAdmin);
router.post('/insurance/plans', authorize('superadmin', 'admin'), insuranceController.createPlan);
router.put('/insurance/plans/:id', authorize('superadmin', 'admin'), insuranceController.updatePlan);
router.patch('/insurance/plans/:id/status', authorize('superadmin', 'admin'), insuranceController.togglePlanStatus);
router.delete('/insurance/plans/:id', authorize('superadmin', 'admin'), insuranceController.deletePlan);

router.get('/insurance/subscriptions', insuranceController.getAllSubscriptions);
router.patch('/insurance/subscriptions/:id', authorize('superadmin', 'admin'), insuranceController.updateSubscriptionStatus);
router.post('/insurance/subscriptions/:id/convert', authorize('superadmin', 'admin'), insuranceController.convertSubscriptionToPolicy);
router.get('/insurance/policies', insuranceController.getAllPolicies);
router.get('/insurance/analytics', insuranceController.getInsuranceAnalytics);

// 5. Owners & Animals Health Management
router.get('/owners', ownerController.getAllOwners);
router.get('/owners/:id', ownerController.getOwnerById);
router.post('/owners', ownerController.createOwner);
router.put('/owners/:id', ownerController.updateOwner);

router.get('/animals', animalController.getAllAnimals);
router.get('/animals/:id', animalController.getAnimalById);
router.post('/animals', animalController.createAnimal);
router.put('/animals/:id', animalController.updateAnimal);

// 6. Vet Clinical Operations
router.get('/vet/logs', vetLogController.getVetLogs);
router.post('/vet/logs', vetLogController.logDailyActivity);
router.get('/vet/stats', vetLogController.getVetStats);

// 7. Clinical Services (CRUD)
router.get('/services', adminController.getAllServicesAdmin);
router.post('/services', authorize('superadmin', 'admin', 'editor'), adminController.createService);
router.put('/services/:id', authorize('superadmin', 'admin', 'editor'), adminController.updateService);
router.delete('/services/:id', authorize('superadmin', 'admin'), adminController.deleteService);

// 8. Team Members
router.get('/team', adminController.getAllTeamMembersAdmin);
router.post('/team', authorize('superadmin', 'admin', 'editor'), adminController.createTeamMember);
router.put('/team/:id', authorize('superadmin', 'admin', 'editor'), adminController.updateTeamMember);
router.delete('/team/:id', authorize('superadmin', 'admin'), adminController.deleteTeamMember);

// 9. Website Settings (SuperAdmin only)
router.get('/settings', authorize('superadmin'), adminController.getSettingsAdmin);
router.put('/settings', authorize('superadmin'), adminController.updateSettings);

// 10. Content Blocks
router.get('/content-blocks', adminController.getContentBlocks);
router.put('/content-blocks/:key', authorize('superadmin', 'admin', 'editor'), adminController.upsertContentBlock);
router.delete('/content-blocks/:id', authorize('superadmin'), adminController.deleteContentBlock);

// 11. FAQs
router.get('/faqs', adminController.getAllFAQsAdmin);
router.post('/faqs', authorize('superadmin', 'admin', 'editor'), adminController.createFAQ);
router.put('/faqs/:id', authorize('superadmin', 'admin', 'editor'), adminController.updateFAQ);
router.delete('/faqs/:id', authorize('superadmin', 'admin'), adminController.deleteFAQ);

// 12. Legacy Hubs & Pricing Plans (Preserved for backward compatibility)
router.get('/hubs', adminController.getAllHubsAdmin);
router.post('/hubs', authorize('superadmin', 'admin'), adminController.createHub);
router.put('/hubs/:id', authorize('superadmin', 'admin'), adminController.updateHub);
router.delete('/hubs/:id', authorize('superadmin'), adminController.deleteHub);

router.get('/pricing-plans', adminController.getAllPricingPlansAdmin);
router.post('/pricing-plans', authorize('superadmin', 'admin'), adminController.createPricingPlan);
router.put('/pricing-plans/:id', authorize('superadmin', 'admin'), adminController.updatePricingPlan);
router.delete('/pricing-plans/:id', authorize('superadmin'), adminController.deletePricingPlan);

// 13. Audit Logs (SuperAdmin & Admin)
router.get('/audit-logs', authorize('superadmin', 'admin'), adminController.getAuditLogs);

// 14. Admin User Management (SuperAdmin only)
router.get('/users', authorize('superadmin'), adminController.getAllUsersAdmin);
router.post('/users', authorize('superadmin'), adminController.createUserAdmin);
router.put('/users/:id', authorize('superadmin'), adminController.updateUserAdmin);
router.delete('/users/:id', authorize('superadmin'), adminController.deleteUserAdmin);

module.exports = router;
