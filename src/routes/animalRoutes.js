const express = require('express');
const router = express.Router();
const animalController = require('../controllers/animalController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(authorize('superadmin', 'admin', 'editor', 'vet'));

router.get('/', animalController.getAllAnimals);
router.get('/:id', animalController.getAnimalById);
router.post('/', animalController.createAnimal);
router.put('/:id', animalController.updateAnimal);

module.exports = router;
