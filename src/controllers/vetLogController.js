const VetLog = require('../models/VetLog');
const Owner = require('../models/Owner');
const Animal = require('../models/Animal');
const ClinicalRecord = require('../models/ClinicalRecord');
const { sendSuccess, sendError } = require('../utils/response');
const { logAction } = require('../services/auditService');

const logDailyActivity = async (req, res, next) => {
  try {
    const {
      farmerName,
      farmerPhone,
      farmLocation,
      county,
      animalName,
      tagOrChipId,
      species = 'dairy_cattle',
      symptoms,
      diagnosis,
      proceduresPerformed,
      medicationsAdministered,
      labSamplesTaken,
      clinicalNotes,
      feeCharged = 0,
      paymentStatus = 'paid_cash',
      followUpDate,
      logDate,
    } = req.body;

    if (!farmerName || !diagnosis) {
      return sendError(res, 'Farmer name and diagnosis are required for clinical daily log', 400);
    }

    // 1. Auto-link or auto-create Owner
    let owner = null;
    if (farmerPhone) {
      owner = await Owner.findOne({ phone: farmerPhone.trim() });
    }
    if (!owner) {
      owner = await Owner.create({
        name: farmerName.trim(),
        phone: farmerPhone ? farmerPhone.trim() : 'N/A',
        county: county || 'Nairobi',
        location: farmLocation || '',
        createdBy: req.user?._id,
      });
    }

    // 2. Auto-link or auto-create Animal
    let animal = null;
    const cleanTag = (tagOrChipId || '').trim().toUpperCase();
    if (cleanTag) {
      animal = await Animal.findOne({ tagOrChipId: cleanTag });
    }
    if (!animal) {
      const generatedTag = cleanTag || `VET-${Date.now().toString().slice(-6)}`;
      animal = await Animal.create({
        owner: owner._id,
        tagOrChipId: generatedTag,
        animalName: animalName || `${species} - ${farmerName}`,
        species,
        location: farmLocation || owner.location || '',
        createdBy: req.user?._id,
      });
    }

    // 3. Create full ClinicalRecord
    const clinicalRecord = await ClinicalRecord.create({
      animal: animal._id,
      owner: owner._id,
      vetUser: req.user?._id,
      visitDate: logDate ? new Date(logDate) : new Date(),
      chiefComplaint: symptoms || diagnosis,
      symptoms: symptoms || '',
      diagnosis: diagnosis.trim(),
      procedures: Array.isArray(proceduresPerformed) ? proceduresPerformed : [],
      medications: Array.isArray(medicationsAdministered) ? medicationsAdministered : [],
      labResults: labSamplesTaken || '',
      clinicalNotes: clinicalNotes || '',
      followUpDate: followUpDate || undefined,
      feeCharged: Number(feeCharged) || 0,
      billingStatus: paymentStatus === 'paid_cash' ? 'billed_cash' : paymentStatus === 'paid_mpesa' ? 'billed_mpesa' : 'unbilled',
    });

    // 4. Create VetLog entry
    const vetLog = await VetLog.create({
      vetUser: req.user?._id,
      vetName: req.user?.name || 'Duty Veterinarian',
      owner: owner._id,
      farmerName: farmerName.trim(),
      farmerPhone: (farmerPhone || '').trim(),
      farmLocation: (farmLocation || '').trim(),
      county: (county || '').trim(),
      animal: animal._id,
      animalName: (animalName || '').trim(),
      tagOrChipId: animal.tagOrChipId,
      species,
      clinicalRecord: clinicalRecord._id,
      logDate: logDate ? new Date(logDate) : new Date(),
      symptoms: symptoms || '',
      diagnosis: diagnosis.trim(),
      proceduresPerformed: Array.isArray(proceduresPerformed) ? proceduresPerformed : [],
      medicationsAdministered: Array.isArray(medicationsAdministered) ? medicationsAdministered : [],
      labSamplesTaken: labSamplesTaken || '',
      clinicalNotes: clinicalNotes || '',
      feeCharged: Number(feeCharged) || 0,
      paymentStatus,
      followUpDate: followUpDate || undefined,
    });

    await logAction({
      req,
      action: 'VET_LOG_CREATED',
      resource: 'vet_logs',
      resourceId: vetLog._id,
      details: {
        farmer: vetLog.farmerName,
        diagnosis: vetLog.diagnosis,
        species: vetLog.species,
      },
    });

    return sendSuccess(res, { vetLog, clinicalRecord, animal, owner }, 'Vet clinical daily log saved successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getVetLogs = async (req, res, next) => {
  try {
    const { vetId, species, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (vetId) {
      query.vetUser = vetId;
    }
    if (species && species !== 'all') {
      query.species = species;
    }
    if (search) {
      query.$or = [
        { farmerName: { $regex: search, $options: 'i' } },
        { tagOrChipId: { $regex: search, $options: 'i' } },
        { diagnosis: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await VetLog.countDocuments(query);
    const logs = await VetLog.find(query)
      .populate('vetUser', 'name email')
      .sort({ logDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(
      res,
      { logs, total, page: Number(page), pages: Math.ceil(total / limit) },
      'Vet logs retrieved'
    );
  } catch (err) {
    next(err);
  }
};

const getVetStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCasesCount, totalCasesCount, speciesAggregation, proceduresAggregation, totalFeesResult] = await Promise.all([
      VetLog.countDocuments({ logDate: { $gte: today } }),
      VetLog.countDocuments(),
      VetLog.aggregate([
        { $group: { _id: '$species', count: { $sum: 1 } } },
      ]),
      VetLog.aggregate([
        { $unwind: '$proceduresPerformed' },
        { $group: { _id: '$proceduresPerformed', count: { $sum: 1 } } },
      ]),
      VetLog.aggregate([
        { $group: { _id: null, totalRevenue: { $sum: '$feeCharged' } } },
      ]),
    ]);

    const totalRevenue = totalFeesResult[0]?.totalRevenue || 0;

    return sendSuccess(
      res,
      {
        todayCasesCount,
        totalCasesCount,
        speciesBreakdown: speciesAggregation,
        proceduresBreakdown: proceduresAggregation,
        totalClinicalRevenue: totalRevenue,
      },
      'Veterinary clinical operations statistics retrieved'
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  logDailyActivity,
  getVetLogs,
  getVetStats,
};
