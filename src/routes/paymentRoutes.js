const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(authorize('superadmin', 'admin', 'editor'));

// Payment records and revenue analytics
router.post('/', paymentController.recordPayment);
router.get('/', paymentController.getAllPayments);
router.get('/analytics', paymentController.getPaymentAnalytics);
router.get('/:id', paymentController.getPaymentById);

module.exports = router;
