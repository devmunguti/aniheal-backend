const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/ownerController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(authorize('superadmin', 'admin', 'editor', 'vet'));

router.get('/', ownerController.getAllOwners);
router.get('/:id', ownerController.getOwnerById);
router.post('/', ownerController.createOwner);
router.put('/:id', ownerController.updateOwner);

module.exports = router;
