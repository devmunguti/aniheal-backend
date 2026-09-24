const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Public route for farmer triage submission
router.post('/', appointmentController.createAppointment);

// Admin / Clinician routes
router.get('/', authenticate, authorize('superadmin', 'admin', 'editor', 'vet'), appointmentController.getAllAppointments);
router.get('/:id', authenticate, authorize('superadmin', 'admin', 'editor', 'vet'), appointmentController.getAppointmentById);
router.patch('/:id/status', authenticate, authorize('superadmin', 'admin', 'editor', 'vet'), appointmentController.updateAppointmentStatus);
router.delete('/:id', authenticate, authorize('superadmin', 'admin'), appointmentController.deleteAppointment);

module.exports = router;

