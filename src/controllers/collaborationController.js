const Collaboration = require('../models/Collaboration');
const AuditLog = require('../models/AuditLog');

/**
 * Public: Get published collaborations (blog stories & partnerships)
 */
exports.getCollaborations = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const query = { status: 'published' };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { header: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { partnerName: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [collaborations, total] = await Promise.all([
      Collaboration.find(query)
        .sort({ featured: -1, publishedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Collaboration.countDocuments(query),
    ]);

    // Filter comments to only approved ones for public
    const sanitized = collaborations.map((item) => ({
      ...item,
      comments: (item.comments || []).filter((c) => c.approved !== false),
      commentsCount: (item.comments || []).filter((c) => c.approved !== false).length,
    }));

    res.json({
      success: true,
      data: sanitized,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Public: Get single collaboration by slug
 */
exports.getCollaborationBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const collaboration = await Collaboration.findOne({
      $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
    }).lean();

    if (!collaboration) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration story not found',
      });
    }

    // Filter comments to approved
    collaboration.comments = (collaboration.comments || []).filter((c) => c.approved !== false);

    res.json({
      success: true,
      data: collaboration,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Public: Add comment to a collaboration story
 */
exports.addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, comment } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Your name is required to post a comment' });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text cannot be empty' });
    }

    const collaboration = await Collaboration.findById(id);
    if (!collaboration) {
      return res.status(404).json({ success: false, message: 'Collaboration story not found' });
    }

    const newComment = {
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : '',
      comment: comment.trim(),
      approved: true, // Auto-approve by default, admin can moderate
      isStaff: false,
      createdAt: new Date(),
    };

    collaboration.comments.push(newComment);
    await collaboration.save();

    res.status(201).json({
      success: true,
      message: 'Comment posted successfully',
      data: collaboration.comments[collaboration.comments.length - 1],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: List all collaborations with full comment & status metadata
 */
exports.getAdminCollaborations = async (req, res, next) => {
  try {
    const { search, category, status } = req.query;
    const query = {};

    if (category && category !== 'All') {
      query.category = category;
    }
    if (status && status !== 'All') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { header: { $regex: search, $options: 'i' } },
        { partnerName: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
      ];
    }

    const collaborations = await Collaboration.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Summary statistics
    const totalCount = await Collaboration.countDocuments();
    const publishedCount = await Collaboration.countDocuments({ status: 'published' });
    const allCommentsCount = collaborations.reduce(
      (acc, curr) => acc + (curr.comments ? curr.comments.length : 0),
      0
    );

    res.json({
      success: true,
      data: collaborations,
      metrics: {
        total: totalCount,
        published: publishedCount,
        totalComments: allCommentsCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Create new collaboration
 */
exports.createCollaboration = async (req, res, next) => {
  try {
    const {
      header,
      slug,
      partnerName,
      partnerLogo,
      category,
      imageUrl,
      summary,
      content,
      externalUrl,
      status = 'published',
      featured = false,
      tags,
    } = req.body;

    if (!header || !header.trim()) {
      return res.status(400).json({ success: false, message: 'Header/title is required' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content/story body is required' });
    }

    let finalSlug = slug
      ? slug.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
      : header.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

    // Ensure unique slug
    let existing = await Collaboration.findOne({ slug: finalSlug });
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    const collaboration = await Collaboration.create({
      header: header.trim(),
      slug: finalSlug,
      partnerName: partnerName ? partnerName.trim() : '',
      partnerLogo: partnerLogo ? partnerLogo.trim() : '',
      category: category || 'General Partnership',
      imageUrl:
        imageUrl && imageUrl.trim()
          ? imageUrl.trim()
          : 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&q=80',
      summary: summary ? summary.trim() : '',
      content: content.trim(),
      externalUrl: externalUrl ? externalUrl.trim() : '',
      status,
      featured: !!featured,
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : [],
      createdBy: req.user?._id,
    });

    if (AuditLog) {
      await AuditLog.create({
        action: 'CREATE_COLLABORATION',
        user: req.user?._id,
        details: { collaborationId: collaboration._id, header: collaboration.header },
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'Collaboration created successfully',
      data: collaboration,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Update collaboration
 */
exports.updateCollaboration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      header,
      slug,
      partnerName,
      partnerLogo,
      category,
      imageUrl,
      summary,
      content,
      externalUrl,
      status,
      featured,
      tags,
    } = req.body;

    const collaboration = await Collaboration.findById(id);
    if (!collaboration) {
      return res.status(404).json({ success: false, message: 'Collaboration not found' });
    }

    if (header) collaboration.header = header.trim();
    if (slug) collaboration.slug = slug.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    if (partnerName !== undefined) collaboration.partnerName = partnerName.trim();
    if (partnerLogo !== undefined) collaboration.partnerLogo = partnerLogo.trim();
    if (category) collaboration.category = category;
    if (imageUrl !== undefined) collaboration.imageUrl = imageUrl.trim();
    if (summary !== undefined) collaboration.summary = summary.trim();
    if (content !== undefined) collaboration.content = content.trim();
    if (externalUrl !== undefined) collaboration.externalUrl = externalUrl.trim();
    if (status) collaboration.status = status;
    if (featured !== undefined) collaboration.featured = !!featured;
    if (tags !== undefined) {
      collaboration.tags = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
        ? tags.split(',').map((t) => t.trim())
        : collaboration.tags;
    }

    await collaboration.save();

    if (AuditLog) {
      await AuditLog.create({
        action: 'UPDATE_COLLABORATION',
        user: req.user?._id,
        details: { collaborationId: collaboration._id, header: collaboration.header },
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Collaboration updated successfully',
      data: collaboration,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Delete collaboration
 */
exports.deleteCollaboration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const collaboration = await Collaboration.findByIdAndDelete(id);

    if (!collaboration) {
      return res.status(404).json({ success: false, message: 'Collaboration not found' });
    }

    if (AuditLog) {
      await AuditLog.create({
        action: 'DELETE_COLLABORATION',
        user: req.user?._id,
        details: { collaborationId: id, header: collaboration.header },
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Collaboration deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Delete a comment from collaboration
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const { id, commentId } = req.params;
    const collaboration = await Collaboration.findById(id);

    if (!collaboration) {
      return res.status(404).json({ success: false, message: 'Collaboration not found' });
    }

    collaboration.comments = collaboration.comments.filter(
      (c) => c._id.toString() !== commentId
    );

    await collaboration.save();

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin: Toggle comment approval
 */
exports.toggleCommentApproval = async (req, res, next) => {
  try {
    const { id, commentId } = req.params;
    const collaboration = await Collaboration.findById(id);

    if (!collaboration) {
      return res.status(404).json({ success: false, message: 'Collaboration not found' });
    }

    const comment = collaboration.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    comment.approved = !comment.approved;
    await collaboration.save();

    res.json({
      success: true,
      message: `Comment ${comment.approved ? 'approved' : 'hidden'}`,
      data: comment,
    });
  } catch (err) {
    next(err);
  }
};
