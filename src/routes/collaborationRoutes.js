const express = require('express');
const router = express.Router();
const collaborationController = require('../controllers/collaborationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/', collaborationController.getCollaborations);
router.get('/public', collaborationController.getCollaborations);
router.get('/:slug', collaborationController.getCollaborationBySlug);
router.post('/:id/comments', collaborationController.addComment);

// Admin routes (Protected for Admin, Superadmin, Editor)
router.get(
  '/admin/all',
  authenticate,
  authorize('admin', 'superadmin', 'editor'),
  collaborationController.getAdminCollaborations
);

router.post(
  '/',
  authenticate,
  authorize('admin', 'superadmin', 'editor'),
  collaborationController.createCollaboration
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'superadmin', 'editor'),
  collaborationController.updateCollaboration
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'superadmin', 'editor'),
  collaborationController.deleteCollaboration
);

router.delete(
  '/:id/comments/:commentId',
  authenticate,
  authorize('admin', 'superadmin', 'editor'),
  collaborationController.deleteComment
);

router.patch(
  '/:id/comments/:commentId/toggle',
  authenticate,
  authorize('admin', 'superadmin', 'editor'),
  collaborationController.toggleCommentApproval
);

module.exports = router;
