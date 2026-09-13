const Owner = require('../models/Owner');
const Animal = require('../models/Animal');
const { sendSuccess, sendError } = require('../utils/response');
const { logAction } = require('../services/auditService');

const getAllOwners = async (req, res, next) => {
  try {
    const { search, county, page = 1, limit = 50 } = req.query;
    const query = {};

    if (county && county !== 'all') {
      query.county = county;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { farmName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Owner.countDocuments(query);
    const owners = await Owner.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(
      res,
      { owners, total, page: Number(page), pages: Math.ceil(total / limit) },
      'Owners retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
};

const getOwnerById = async (req, res, next) => {
  try {
    const owner = await Owner.findById(req.params.id);
    if (!owner) {
      return sendError(res, 'Owner not found', 404);
    }
    const animals = await Animal.find({ owner: owner._id, isActive: true });
    return sendSuccess(res, { owner, animals }, 'Owner details retrieved');
  } catch (err) {
    next(err);
  }
};

const createOwner = async (req, res, next) => {
  try {
    const { name, phone, email, county, subCounty, location, farmName, address, notes } = req.body;

    if (!name || !phone || !county) {
      return sendError(res, 'Name, phone, and county are required', 400);
    }

    const owner = await Owner.create({
      name: name.trim(),
      phone: phone.trim(),
      email: (email || '').trim().toLowerCase(),
      county: county.trim(),
      subCounty: (subCounty || '').trim(),
      location: (location || '').trim(),
      farmName: (farmName || '').trim(),
      address: (address || '').trim(),
      notes: (notes || '').trim(),
      createdBy: req.user?._id,
    });

    await logAction({
      req,
      action: 'OWNER_CREATED',
      resource: 'owners',
      resourceId: owner._id,
      details: { name: owner.name, phone: owner.phone, county: owner.county },
    });

    return sendSuccess(res, owner, 'Owner registered successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateOwner = async (req, res, next) => {
  try {
    const owner = await Owner.findById(req.params.id);
    if (!owner) {
      return sendError(res, 'Owner not found', 404);
    }

    const { name, phone, email, county, subCounty, location, farmName, address, notes } = req.body;

    if (name) owner.name = name.trim();
    if (phone) owner.phone = phone.trim();
    if (email !== undefined) owner.email = (email || '').trim().toLowerCase();
    if (county) owner.county = county.trim();
    if (subCounty !== undefined) owner.subCounty = subCounty.trim();
    if (location !== undefined) owner.location = location.trim();
    if (farmName !== undefined) owner.farmName = farmName.trim();
    if (address !== undefined) owner.address = address.trim();
    if (notes !== undefined) owner.notes = notes.trim();
    owner.updatedBy = req.user?._id;

    await owner.save();

    await logAction({
      req,
      action: 'OWNER_UPDATED',
      resource: 'owners',
      resourceId: owner._id,
      details: { name: owner.name, phone: owner.phone },
    });

    return sendSuccess(res, owner, 'Owner updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllOwners,
  getOwnerById,
  createOwner,
  updateOwner,
};
