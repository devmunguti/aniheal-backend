const ClinicalRecord = require('../models/ClinicalRecord');
const VaccinationRecord = require('../models/VaccinationRecord');
const Animal = require('../models/Animal');
const Owner = require('../models/Owner');
const { sendSuccess, sendError } = require('../utils/response');
const { logAction } = require('../services/auditService');

const createClinicalRecord = async (req, res, next) => {
  try {
    const {
      animalId,
      ownerId,
      chiefComplaint,
      symptoms,
      clinicalFindings,
      diagnosis,
      vitals,
      procedures,
      treatments,
      medications,
      labResults,
      clinicalNotes,
      followUpDate,
      billingStatus,
      feeCharged,
    } = req.body;

    if (!animalId || !chiefComplaint || !diagnosis) {
      return sendError(res, 'Animal ID, chief complaint, and diagnosis are required', 400);
    }

    const animal = await Animal.findById(animalId);
    if (!animal) {
      return sendError(res, 'Animal not found', 404);
    }

    const resolvedOwnerId = ownerId || animal.owner;

    const record = await ClinicalRecord.create({
      animal: animal._id,
      owner: resolvedOwnerId,
      vetUser: req.user?._id,
      visitDate: new Date(),
      chiefComplaint: chiefComplaint.trim(),
      symptoms: symptoms || '',
      clinicalFindings: clinicalFindings || '',
      diagnosis: diagnosis.trim(),
      vitals: vitals || {},
      procedures: Array.isArray(procedures) ? procedures : [],
      treatments: treatments || '',
      medications: Array.isArray(medications) ? medications : [],
      labResults: labResults || '',
      clinicalNotes: clinicalNotes || '',
      followUpDate: followUpDate || undefined,
      billingStatus: billingStatus || 'unbilled',
      feeCharged: Number(feeCharged) || 0,
    });

    // Update animal's health status if under treatment
    if (animal.healthStatus !== 'critical') {
      animal.healthStatus = 'under_treatment';
      await animal.save();
    }

    await logAction({
      req,
      action: 'CLINICAL_RECORD_CREATED',
      resource: 'clinical_records',
      resourceId: record._id,
      details: {
        animalTag: animal.tagOrChipId,
        diagnosis: record.diagnosis,
        vet: req.user?.name,
      },
    });

    return sendSuccess(res, record, 'Clinical record created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getClinicalRecordsByAnimal = async (req, res, next) => {
  try {
    const records = await ClinicalRecord.find({ animal: req.params.animalId })
      .populate('vetUser', 'name email')
      .sort({ visitDate: -1 });

    return sendSuccess(res, records, 'Clinical records retrieved');
  } catch (err) {
    next(err);
  }
};

const createVaccination = async (req, res, next) => {
  try {
    const { animalId, vaccineName, dateAdministered, nextDueDate, batchNumber, manufacturer, notes } = req.body;

    if (!animalId || !vaccineName) {
      return sendError(res, 'Animal ID and vaccine name are required', 400);
    }

    const animal = await Animal.findById(animalId);
    if (!animal) {
      return sendError(res, 'Animal not found', 404);
    }

    const vaccination = await VaccinationRecord.create({
      animal: animal._id,
      owner: animal.owner,
      vaccineName: vaccineName.trim(),
      dateAdministered: dateAdministered || new Date(),
      nextDueDate: nextDueDate || undefined,
      batchNumber: batchNumber || '',
      manufacturer: manufacturer || '',
      administeredBy: req.user?._id,
      vetName: req.user?.name || '',
      notes: notes || '',
    });

    return sendSuccess(res, vaccination, 'Vaccination record logged successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getUpcomingVaccinations = async (req, res, next) => {
  try {
    const today = new Date();
    const future30Days = new Date();
    future30Days.setDate(today.getDate() + 30);

    const upcoming = await VaccinationRecord.find({
      nextDueDate: { $gte: today, $lte: future30Days },
    })
      .populate('animal', 'tagOrChipId animalName species')
      .populate('owner', 'name phone county')
      .sort({ nextDueDate: 1 });

    return sendSuccess(res, upcoming, 'Upcoming vaccinations retrieved');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createClinicalRecord,
  getClinicalRecordsByAnimal,
  createVaccination,
  getUpcomingVaccinations,
};
