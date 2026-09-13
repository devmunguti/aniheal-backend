const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const productOrderController = require('../controllers/productOrderController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Public Product Catalog Endpoints
router.get('/', productController.getAllProducts);
router.get('/:slug', productController.getProductBySlug);

// Public Order Submission Endpoint
router.post('/orders', productOrderController.createOrder);

module.exports = router;
