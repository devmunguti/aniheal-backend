const express = require('express');
const router = express.Router();
const vetLogController = require('../controllers/vetLogController');
const clinicalRecordController = require('../controllers/clinicalRecordController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(authorize('superadmin', 'admin', 'editor', 'vet'));

// Daily logs
router.post('/logs', vetLogController.logDailyActivity);
router.get('/logs', vetLogController.getVetLogs);
router.get('/stats', vetLogController.getVetStats);

// Clinical records & vaccinations
router.post('/clinical-records', clinicalRecordController.createClinicalRecord);
router.get('/clinical-records/animal/:animalId', clinicalRecordController.getClinicalRecordsByAnimal);
router.post('/vaccinations', clinicalRecordController.createVaccination);
router.get('/vaccinations/upcoming', clinicalRecordController.getUpcomingVaccinations);

module.exports = router;
