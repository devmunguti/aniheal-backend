const Appointment = require('../models/Appointment');
const { sendSuccess, sendError } = require('../utils/response');
const { logAction } = require('../services/auditService');

const generateTicketRef = () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `ANH-${new Date().getFullYear()}-${randomNum}`;
};

const createAppointment = async (req, res, next) => {
  try {
    // Extract canonical fields with fallback for legacy field aliases
    const farmerName = (req.body.farmerName || req.body.producerName || '').trim();
    const farmName = (req.body.farmName || farmerName || "Farmer's Holding").trim();
    const phone = (req.body.phone || req.body.producerPhone || req.body.contactPhone || '').trim();
    const email = (req.body.email || req.body.emailAddress || '').trim();
    const county = (req.body.county || req.body.farmCounty || req.body.countySelect || '').trim();
    const landmarks = (req.body.landmarks || req.body.farmLandmarks || '').trim();
    const gpsCoordinates = (req.body.gpsCoordinates || '').trim();
    const speciesType = (req.body.speciesType || req.body.livestockCategory || '').trim();
    const totalHeadcount = Number(req.body.totalHeadcount || req.body.herdCount || 1);
    const affectedCount = Number(req.body.affectedCount || 1);
    const clinicalService = (req.body.clinicalService || req.body.serviceCategory || req.body.inquiryType || '').trim();
    let rawTier = (req.body.dispatchTier || req.body.triagePriority || 'morning').toLowerCase();
    if (rawTier === 'immediate' || rawTier === 'urgent' || rawTier === 'critical') rawTier = 'emergency';
    if (rawTier === 'evening' || rawTier === 'midday') rawTier = 'afternoon';
    const allowedTiers = ['emergency', 'morning', 'afternoon', 'standard'];
    const dispatchTier = allowedTiers.includes(rawTier) ? rawTier : 'morning';
    const preferredDate = req.body.preferredDate || req.body.visitDate || '';
    const symptomsDescription = (req.body.symptomsDescription || req.body.clinicalNotes || req.body.messageText || '').trim();
    const mediaUrls = Array.isArray(req.body.mediaUrls) ? req.body.mediaUrls : [];

    const missingFields = [];
    if (!farmerName) missingFields.push('farmerName / producerName');
    if (!phone) missingFields.push('phone / contactPhone');
    if (!county) missingFields.push('county / farmCounty');
    if (!speciesType) missingFields.push('speciesType / livestockCategory');
    if (!clinicalService) missingFields.push('clinicalService / serviceCategory');
    if (!symptomsDescription) missingFields.push('symptomsDescription / clinicalNotes');

    if (missingFields.length > 0) {
      return sendError(
        res,
        `Missing required appointment triage fields: ${missingFields.join(', ')}`,
        400,
        { missingFields }
      );
    }

    const ticketRef = generateTicketRef();

    const appointment = await Appointment.create({
      ticketRef,
      farmerName,
      farmName,
      phone,
      email,
      county,
      landmarks,
      gpsCoordinates,
      speciesType,
      totalHeadcount: isNaN(totalHeadcount) ? 1 : totalHeadcount,
      affectedCount: isNaN(affectedCount) ? 1 : affectedCount,
      clinicalService,
      dispatchTier,
      preferredDate,
      symptomsDescription,
      mediaUrls,
      status: 'pending',
    });

    await logAction({
      req,
      action: 'CREATE_TRIAGE_APPOINTMENT',
      resource: 'appointments',
      resourceId: appointment._id,
      details: {
        ticketRef: appointment.ticketRef,
        farmerName: appointment.farmerName,
        county: appointment.county,
        speciesType: appointment.speciesType,
      },
    });

    return sendSuccess(res, appointment, 'Triage appointment submitted successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getAllAppointments = async (req, res, next) => {
  try {
    const { status, county, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }
    if (county && county !== 'all') {
      query.county = county;
    }
    if (search) {
      query.$or = [
        { ticketRef: { $regex: search, $options: 'i' } },
        { farmerName: { $regex: search, $options: 'i' } },
        { farmName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(
      res,
      { appointments, total, page: Number(page), pages: Math.ceil(total / limit) },
      'Appointments retrieved'
    );
  } catch (err) {
    next(err);
  }
};

const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return sendError(res, 'Appointment ticket not found', 404);
    }
    return sendSuccess(res, appointment, 'Appointment ticket retrieved');
  } catch (err) {
    next(err);
  }
};

const allowedStatuses = ['pending', 'contacted', 'dispatched', 'completed', 'cancelled'];

const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status, assignedOfficer, clinicalNotes } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return sendError(res, 'Appointment ticket not found', 404);
    }

    if (status) {
      if (!allowedStatuses.includes(status)) {
        return sendError(res, `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`, 400);
      }
      // Business Rule: Prevent reverting from final states without supervisor override
      if (['completed', 'cancelled'].includes(appointment.status) && status === 'pending') {
        return sendError(res, `Cannot revert appointment from final state '${appointment.status}' back to 'pending'.`, 400);
      }
      appointment.status = status;
    }
    if (assignedOfficer !== undefined) appointment.assignedOfficer = String(assignedOfficer).trim();
    if (clinicalNotes !== undefined) appointment.clinicalNotes = String(clinicalNotes).trim();

    await appointment.save();

    await logAction({
      req,
      action: 'UPDATE_APPOINTMENT_STATUS',
      resource: 'appointments',
      resourceId: appointment._id,
      details: {
        ticketRef: appointment.ticketRef,
        status: appointment.status,
        assignedOfficer: appointment.assignedOfficer,
      },
    });

    return sendSuccess(res, appointment, 'Appointment status updated');
  } catch (err) {
    next(err);
  }
};

const deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) {
      return sendError(res, 'Appointment not found', 404);
    }

    await logAction({
      req,
      action: 'DELETE_APPOINTMENT',
      resource: 'appointments',
      resourceId: req.params.id,
      details: { ticketRef: appointment.ticketRef },
    });

    return sendSuccess(res, { id: req.params.id }, 'Appointment deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  deleteAppointment,
};
