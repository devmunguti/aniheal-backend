const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Public route for farmer triage submission
router.post('/', appointmentController.createAppointment);

// Admin-only routes
router.get('/', authenticate, authorize('superadmin', 'editor'), appointmentController.getAllAppointments);
router.get('/:id', authenticate, authorize('superadmin', 'editor'), appointmentController.getAppointmentById);
router.patch('/:id/status', authenticate, authorize('superadmin', 'editor'), appointmentController.updateAppointmentStatus);
router.delete('/:id', authenticate, authorize('superadmin'), appointmentController.deleteAppointment);

module.exports = router;
