const Animal = require('../models/Animal');
const Owner = require('../models/Owner');
const InsurancePolicy = require('../models/InsurancePolicy');
const ClinicalRecord = require('../models/ClinicalRecord');
const VaccinationRecord = require('../models/VaccinationRecord');
const { sendSuccess, sendError } = require('../utils/response');
const { logAction } = require('../services/auditService');

const getAllAnimals = async (req, res, next) => {
  try {
    const { species, healthStatus, search, ownerId, page = 1, limit = 50 } = req.query;
    const query = { isActive: true };

    if (species && species !== 'all') {
      query.species = species;
    }
    if (healthStatus && healthStatus !== 'all') {
      query.healthStatus = healthStatus;
    }
    if (ownerId) {
      query.owner = ownerId;
    }
    if (search) {
      query.$or = [
        { tagOrChipId: { $regex: search, $options: 'i' } },
        { animalName: { $regex: search, $options: 'i' } },
        { breed: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Animal.countDocuments(query);
    const animals = await Animal.find(query)
      .populate('owner', 'name phone county farmName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(
      res,
      { animals, total, page: Number(page), pages: Math.ceil(total / limit) },
      'Animals retrieved'
    );
  } catch (err) {
    next(err);
  }
};

const getAnimalById = async (req, res, next) => {
  try {
    const animal = await Animal.findById(req.params.id).populate('owner');
    if (!animal) {
      return sendError(res, 'Animal record not found', 404);
    }

    const [policies, clinicalRecords, vaccinations] = await Promise.all([
      InsurancePolicy.find({ animal: animal._id }).populate('insurancePlan', 'name code').sort({ createdAt: -1 }),
      ClinicalRecord.find({ animal: animal._id }).populate('vetUser', 'name').sort({ visitDate: -1 }).limit(20),
      VaccinationRecord.find({ animal: animal._id }).sort({ dateAdministered: -1 }),
    ]);

    return sendSuccess(
      res,
      { animal, policies, clinicalRecords, vaccinations },
      'Animal complete health and insurance dossier retrieved'
    );
  } catch (err) {
    next(err);
  }
};

const createAnimal = async (req, res, next) => {
  try {
    const {
      ownerId,
      owner,
      tagOrChipId,
      animalName,
      species,
      breed,
      gender,
      dateOfBirth,
      age,
      healthStatus,
      location,
      notes,
    } = req.body;

    const resolvedOwnerId = ownerId || owner;
    if (!resolvedOwnerId || !tagOrChipId || !species) {
      return sendError(res, 'Owner ID, Tag/Microchip ID, and Species are required', 400);
    }

    const ownerExists = await Owner.findById(resolvedOwnerId);
    if (!ownerExists) {
      return sendError(res, 'Specified owner does not exist', 404);
    }

    const cleanTag = tagOrChipId.trim().toUpperCase();
    const existingAnimal = await Animal.findOne({ tagOrChipId: cleanTag });
    if (existingAnimal) {
      return sendError(res, `An animal with Tag/Chip ID '${cleanTag}' already exists`, 409);
    }

    const newAnimal = await Animal.create({
      owner: resolvedOwnerId,
      tagOrChipId: cleanTag,
      animalName: (animalName || '').trim(),
      species,
      breed: (breed || '').trim(),
      gender: gender || 'unknown',
      dateOfBirth: dateOfBirth || undefined,
      age: (age || '').trim(),
      healthStatus: healthStatus || 'healthy',
      location: (location || ownerExists.location || '').trim(),
      notes: (notes || '').trim(),
      createdBy: req.user?._id,
    });

    await logAction({
      req,
      action: 'ANIMAL_CREATED',
      resource: 'animals',
      resourceId: newAnimal._id,
      details: {
        tagOrChipId: newAnimal.tagOrChipId,
        species: newAnimal.species,
        owner: ownerExists.name,
      },
    });

    return sendSuccess(res, newAnimal, 'Animal registered in health management system', 201);
  } catch (err) {
    next(err);
  }
};

const updateAnimal = async (req, res, next) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) {
      return sendError(res, 'Animal record not found', 404);
    }

    const {
      tagOrChipId,
      animalName,
      species,
      breed,
      gender,
      dateOfBirth,
      age,
      healthStatus,
      location,
      notes,
      isActive,
    } = req.body;

    if (tagOrChipId && tagOrChipId.trim().toUpperCase() !== animal.tagOrChipId) {
      const cleanTag = tagOrChipId.trim().toUpperCase();
      const existing = await Animal.findOne({ tagOrChipId: cleanTag, _id: { $ne: animal._id } });
      if (existing) {
        return sendError(res, `Another animal with Tag/Chip ID '${cleanTag}' already exists`, 409);
      }
      animal.tagOrChipId = cleanTag;
    }

    if (animalName !== undefined) animal.animalName = animalName.trim();
    if (species) animal.species = species;
    if (breed !== undefined) animal.breed = breed.trim();
    if (gender) animal.gender = gender;
    if (dateOfBirth !== undefined) animal.dateOfBirth = dateOfBirth;
    if (age !== undefined) animal.age = age.trim();
    if (healthStatus) animal.healthStatus = healthStatus;
    if (location !== undefined) animal.location = location.trim();
    if (notes !== undefined) animal.notes = notes.trim();
    if (isActive !== undefined) animal.isActive = Boolean(isActive);

    await animal.save();

    await logAction({
      req,
      action: 'ANIMAL_UPDATED',
      resource: 'animals',
      resourceId: animal._id,
      details: { tagOrChipId: animal.tagOrChipId, healthStatus: animal.healthStatus },
    });

    return sendSuccess(res, animal, 'Animal updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllAnimals,
  getAnimalById,
  createAnimal,
  updateAnimal,
};
