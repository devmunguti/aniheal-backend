const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateBody } = require('../middleware/validationMiddleware');

router.post('/', authenticate, validateBody(['items', 'totalAmount']), orderController.createOrder);
router.get('/my-orders', authenticate, orderController.getUserOrders);
router.get('/:id', authenticate, orderController.getOrderById);

module.exports = router;
