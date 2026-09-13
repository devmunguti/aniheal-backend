const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const mediaController = require('../controllers/mediaController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(authorize('superadmin', 'editor'));

router.post('/upload', upload.single('file'), mediaController.uploadMedia);
router.get('/', mediaController.getAllMedia);
router.delete('/:id', mediaController.deleteMedia);

module.exports = router;
