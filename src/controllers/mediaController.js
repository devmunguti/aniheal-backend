const path = require('path');
const fs = require('fs');
const Media = require('../models/Media');
const cloudinary = require('../config/cloudinary');
const { cloudinary: cloudinaryConfig } = require('../config/environment');
const { sendSuccess, sendError } = require('../utils/response');
const { logAction } = require('../services/auditService');

const isAllowedImageSignature = (buffer, ext) => {
  if (!buffer || buffer.length < 4) return false;

  // Check executable / script signatures to reject immediately
  const isExeMZ = buffer[0] === 0x4d && buffer[1] === 0x5a; // MZ header (.exe, .dll)
  const isElf = buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46; // ELF binary
  if (isExeMZ || isElf) return false;

  switch (ext) {
    case '.png':
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case '.jpg':
    case '.jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case '.gif':
      return (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38
      );
    case '.webp':
      return (
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
      );
    case '.svg': {
      const text = buffer.toString('utf8').trim();
      return (text.includes('<svg') || text.includes('<?xml')) && !text.includes('<script');
    }
    default:
      return false;
  }
};

const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    // Validate magic bytes against claimed extension
    const buffer = fs.readFileSync(filePath);
    if (!isAllowedImageSignature(buffer, ext)) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return sendError(res, 'Upload rejected: extension/MIME mismatch or disallowed file type', 400);
    }

    let fileUrl = '';
    let publicId = '';
    let provider = 'local';

    if (cloudinaryConfig.isConfigured) {
      try {
        const uploadResult = await cloudinary.uploader.upload(filePath, {
          folder: 'aniheal',
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
        });

        fileUrl = uploadResult.secure_url;
        publicId = uploadResult.public_id;
        provider = 'cloudinary';

        // Clean up temporary local file after successful Cloudinary upload
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cloudErr) {
        console.error('Cloudinary upload error, falling back to local URL:', cloudErr.message);
        const host = req.get('host');
        const protocol = req.protocol;
        fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
      }
    } else {
      const host = req.get('host');
      const protocol = req.protocol;
      fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    }

    const media = await Media.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
      publicId,
      provider,
      altText: req.body.altText || req.file.originalname,
      uploadedBy: req.user?._id,
    });

    await logAction({
      req,
      action: 'UPLOAD_MEDIA',
      resource: 'media',
      resourceId: media._id,
      details: { filename: media.filename, size: media.size, provider, url: fileUrl },
    });

    return sendSuccess(res, media, 'File uploaded successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getAllMedia = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const total = await Media.countDocuments();
    const media = await Media.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(
      res,
      { media, total, page: Number(page), pages: Math.ceil(total / limit) },
      'Media files retrieved'
    );
  } catch (err) {
    next(err);
  }
};

const deleteMedia = async (req, res, next) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return sendError(res, 'Media file not found', 404);

    // If stored on Cloudinary, delete from Cloudinary CDN
    if (media.publicId && cloudinaryConfig.isConfigured) {
      try {
        await cloudinary.uploader.destroy(media.publicId);
      } catch (cErr) {
        console.error('Failed to delete from Cloudinary:', cErr.message);
      }
    }

    // If local file exists, remove from disk
    const filePath = path.join(__dirname, '../../uploads', media.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to delete physical file:', e.message);
      }
    }

    await Media.findByIdAndDelete(req.params.id);

    await logAction({
      req,
      action: 'DELETE_MEDIA',
      resource: 'media',
      resourceId: req.params.id,
      details: { filename: media.filename, publicId: media.publicId },
    });

    return sendSuccess(res, { id: req.params.id }, 'Media file deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadMedia,
  getAllMedia,
  deleteMedia,
};
