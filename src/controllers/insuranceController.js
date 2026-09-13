const InsurancePlan = require('../models/InsurancePlan');
const InsurancePolicy = require('../models/InsurancePolicy');
const InsuranceSubscription = require('../models/InsuranceSubscription');
const Owner = require('../models/Owner');
const Animal = require('../models/Animal');
const Payment = require('../models/Payment');
const { sendSuccess, sendError } = require('../utils/response');
const { logAction } = require('../services/auditService');

const generatePolicyNumber = () => {
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `POL-${new Date().getFullYear()}-${rand}`;
};

const generateApplicationNumber = () => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INS-APP-${new Date().getFullYear()}-${rand}`;
};

// --- PUBLIC INSURANCE ENDPOINTS ---

const getActivePlans = async (req, res, next) => {
  try {
    const { species } = req.query;
    const query = { isActive: true };

    if (species && species !== 'all') {
      query.targetSpecies = species;
    }

    const plans = await InsurancePlan.find(query).sort({ sortOrder: 1, createdAt: 1 });
    return sendSuccess(res, plans, 'Active insurance plans retrieved');
  } catch (err) {
    next(err);
  }
};

const getPlanByCode = async (req, res, next) => {
  try {
    const plan = await InsurancePlan.findOne({ code: req.params.code.toUpperCase() });
    if (!plan) {
      return sendError(res, 'Insurance plan not found', 404);
    }
    return sendSuccess(res, plan, 'Insurance plan retrieved');
  } catch (err) {
    next(err);
  }
};

const submitSubscriptionApplication = async (req, res, next) => {
  try {
    const {
      applicantName,
      applicantPhone,
      applicantEmail,
      county,
      farmLocation,
      species,
      animalCount = 1,
      animalName,
      tagOrChipId,
      breed,
      age,
      planId,
      planCode,
      preferredBilling = 'monthly',
      notes,
    } = req.body;

    if (!applicantName || !applicantPhone || !county || !species) {
      return sendError(res, 'Applicant name, phone, county, and species are required', 400);
    }

    let resolvedPlan = null;
    if (planId) {
      resolvedPlan = await InsurancePlan.findById(planId);
    } else if (planCode) {
      resolvedPlan = await InsurancePlan.findOne({ code: planCode.toUpperCase() });
    }

    if (!resolvedPlan) {
      return sendError(res, 'Valid insurance plan ID or code is required', 400);
    }

    const applicationNumber = generateApplicationNumber();

    const subscription = await InsuranceSubscription.create({
      applicationNumber,
      applicantName: applicantName.trim(),
      applicantPhone: applicantPhone.trim(),
      applicantEmail: (applicantEmail || '').trim().toLowerCase(),
      county: county.trim(),
      farmLocation: (farmLocation || '').trim(),
      species,
      animalCount: Math.max(1, Number(animalCount) || 1),
      animalName: (animalName || '').trim(),
      tagOrChipId: (tagOrChipId || '').trim().toUpperCase(),
      breed: (breed || '').trim(),
      age: (age || '').trim(),
      insurancePlan: resolvedPlan._id,
      preferredBilling,
      status: 'submitted',
      notes: (notes || '').trim(),
    });

    await logAction({
      req,
      action: 'INSURANCE_APPLICATION_SUBMITTED',
      resource: 'insurance_subscriptions',
      resourceId: subscription._id,
      details: {
        applicationNumber: subscription.applicationNumber,
        applicantName: subscription.applicantName,
        plan: resolvedPlan.name,
      },
    });

    return sendSuccess(
      res,
      subscription,
      'Insurance application submitted successfully. Our veterinary underwriting desk will contact you within 24 hours.',
      201
    );
  } catch (err) {
    next(err);
  }
};

// --- ADMIN PLAN MANAGEMENT ---

const getAllPlansAdmin = async (req, res, next) => {
  try {
    const plans = await InsurancePlan.find().sort({ sortOrder: 1, createdAt: 1 });
    return sendSuccess(res, plans, 'Insurance plans retrieved');
  } catch (err) {
    next(err);
  }
};

const createPlan = async (req, res, next) => {
  try {
    const {
      name,
      code,
      description,
      targetSpecies,
      speciesPricing,
      coverageDetails,
      exclusions,
      waitingPeriodDays = 14,
      basePrice = 0,
      billingPeriod = 'monthly',
      isActive = true,
      isPopular = false,
      sortOrder = 0,
    } = req.body;

    if (!name || !code || !description) {
      return sendError(res, 'Plan name, unique code, and description are required', 400);
    }

    const existingCode = await InsurancePlan.findOne({ code: code.trim().toUpperCase() });
    if (existingCode) {
      return sendError(res, `Plan with code '${code}' already exists`, 409);
    }

    const plan = await InsurancePlan.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description,
      targetSpecies: Array.isArray(targetSpecies) ? targetSpecies : [],
      speciesPricing: Array.isArray(speciesPricing) ? speciesPricing : [],
      coverageDetails: Array.isArray(coverageDetails) ? coverageDetails : [],
      exclusions: Array.isArray(exclusions) ? exclusions : [],
      waitingPeriodDays: Number(waitingPeriodDays),
      basePrice: Number(basePrice),
      billingPeriod,
      isActive: Boolean(isActive),
      isPopular: Boolean(isPopular),
      sortOrder: Number(sortOrder),
      createdBy: req.user?._id,
    });

    await logAction({
      req,
      action: 'INSURANCE_PLAN_CREATED',
      resource: 'insurance_plans',
      resourceId: plan._id,
      details: { name: plan.name, code: plan.code },
    });

    return sendSuccess(res, plan, 'Insurance plan created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updatePlan = async (req, res, next) => {
  try {
    const plan = await InsurancePlan.findById(req.params.id);
    if (!plan) {
      return sendError(res, 'Insurance plan not found', 404);
    }

    const {
      name,
      code,
      description,
      targetSpecies,
      speciesPricing,
      coverageDetails,
      exclusions,
      waitingPeriodDays,
      basePrice,
      billingPeriod,
      isActive,
      isPopular,
      sortOrder,
    } = req.body;

    if (code && code.trim().toUpperCase() !== plan.code) {
      const existing = await InsurancePlan.findOne({
        code: code.trim().toUpperCase(),
        _id: { $ne: plan._id },
      });
      if (existing) {
        return sendError(res, `Another plan with code '${code}' already exists`, 409);
      }
      plan.code = code.trim().toUpperCase();
    }

    if (name) plan.name = name.trim();
    if (description) plan.description = description;
    if (targetSpecies !== undefined) plan.targetSpecies = targetSpecies;
    if (speciesPricing !== undefined) plan.speciesPricing = speciesPricing;
    if (coverageDetails !== undefined) plan.coverageDetails = coverageDetails;
    if (exclusions !== undefined) plan.exclusions = exclusions;
    if (waitingPeriodDays !== undefined) plan.waitingPeriodDays = Number(waitingPeriodDays);
    if (basePrice !== undefined) plan.basePrice = Number(basePrice);
    if (billingPeriod) plan.billingPeriod = billingPeriod;
    if (isActive !== undefined) plan.isActive = Boolean(isActive);
    if (isPopular !== undefined) plan.isPopular = Boolean(isPopular);
    if (sortOrder !== undefined) plan.sortOrder = Number(sortOrder);
    plan.updatedBy = req.user?._id;

    await plan.save();

    await logAction({
      req,
      action: 'INSURANCE_PLAN_UPDATED',
      resource: 'insurance_plans',
      resourceId: plan._id,
      details: { name: plan.name, code: plan.code },
    });

    return sendSuccess(res, plan, 'Insurance plan updated successfully');
  } catch (err) {
    next(err);
  }
};

const togglePlanStatus = async (req, res, next) => {
  try {
    const plan = await InsurancePlan.findById(req.params.id);
    if (!plan) {
      return sendError(res, 'Insurance plan not found', 404);
    }

    plan.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !plan.isActive;
    await plan.save();

    return sendSuccess(res, plan, `Plan ${plan.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) {
    next(err);
  }
};

const deletePlan = async (req, res, next) => {
  try {
    const plan = await InsurancePlan.findByIdAndDelete(req.params.id);
    if (!plan) {
      return sendError(res, 'Insurance plan not found', 404);
    }
    return sendSuccess(res, { id: req.params.id }, 'Insurance plan deleted');
  } catch (err) {
    next(err);
  }
};

// --- ADMIN SUBSCRIPTIONS & POLICY WORKFLOWS ---

const getAllSubscriptions = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { applicationNumber: { $regex: search, $options: 'i' } },
        { applicantName: { $regex: search, $options: 'i' } },
        { applicantPhone: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await InsuranceSubscription.countDocuments(query);
    const subscriptions = await InsuranceSubscription.find(query)
      .populate('insurancePlan', 'name code basePrice')
      .populate('convertedPolicy', 'policyNumber status')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(
      res,
      { subscriptions, total, page: Number(page), pages: Math.ceil(total / limit) },
      'Subscriptions retrieved'
    );
  } catch (err) {
    next(err);
  }
};

const updateSubscriptionStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const subscription = await InsuranceSubscription.findById(req.params.id);
    if (!subscription) {
      return sendError(res, 'Subscription application not found', 404);
    }

    const allowed = ['submitted', 'under_review', 'approved', 'rejected', 'converted', 'cancelled'];
    if (status && !allowed.includes(status)) {
      return sendError(res, `Invalid status: ${status}`, 400);
    }

    if (status) subscription.status = status;
    if (notes !== undefined) subscription.notes = notes;
    await subscription.save();

    return sendSuccess(res, subscription, 'Subscription application updated');
  } catch (err) {
    next(err);
  }
};

const convertSubscriptionToPolicy = async (req, res, next) => {
  try {
    const subscription = await InsuranceSubscription.findById(req.params.id).populate('insurancePlan');
    if (!subscription) {
      return sendError(res, 'Subscription application not found', 404);
    }

    // 1. Find or create Owner
    let owner = await Owner.findOne({ phone: subscription.applicantPhone });
    if (!owner) {
      owner = await Owner.create({
        name: subscription.applicantName,
        phone: subscription.applicantPhone,
        email: subscription.applicantEmail,
        county: subscription.county,
        location: subscription.farmLocation,
        createdBy: req.user?._id,
      });
    }

    // 2. Find or create Animal
    const cleanTag = subscription.tagOrChipId || `TAG-${Date.now().toString().slice(-6)}`;
    let animal = await Animal.findOne({ tagOrChipId: cleanTag });
    if (!animal) {
      animal = await Animal.create({
        owner: owner._id,
        tagOrChipId: cleanTag,
        animalName: subscription.animalName || `${subscription.species} - ${owner.name}`,
        species: subscription.species,
        breed: subscription.breed || '',
        age: subscription.age || '',
        createdBy: req.user?._id,
      });
    }

    // 3. Determine premium from plan's species pricing or base price
    let premium = subscription.insurancePlan?.basePrice || 12000;
    let coverageLimit = 150000;
    let deductible = 1000;

    if (subscription.insurancePlan?.speciesPricing?.length > 0) {
      const matchPricing = subscription.insurancePlan.speciesPricing.find(
        (sp) => sp.species === subscription.species
      );
      if (matchPricing) {
        premium = subscription.preferredBilling === 'annual' ? matchPricing.annualPremium : matchPricing.monthlyPremium;
        coverageLimit = matchPricing.coverageLimit;
        deductible = matchPricing.deductible;
      }
    }

    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(startDate.getFullYear() + 1);

    // 4. Create InsurancePolicy
    const policyNumber = generatePolicyNumber();
    const policy = await InsurancePolicy.create({
      policyNumber,
      animal: animal._id,
      owner: owner._id,
      insurancePlan: subscription.insurancePlan._id,
      premium,
      billingPeriod: subscription.preferredBilling || 'monthly',
      coverageLimit,
      deductible,
      startDate,
      expiryDate,
      status: 'active',
      enrollmentSource: `Application: ${subscription.applicationNumber}`,
      createdBy: req.user?._id,
    });

    subscription.status = 'converted';
    subscription.convertedPolicy = policy._id;
    await subscription.save();

    await logAction({
      req,
      action: 'POLICY_CONVERTED_FROM_SUBSCRIPTION',
      resource: 'insurance_policies',
      resourceId: policy._id,
      details: {
        policyNumber: policy.policyNumber,
        owner: owner.name,
        animalTag: animal.tagOrChipId,
      },
    });

    return sendSuccess(res, { policy, animal, owner }, 'Policy activated and animal enrolled successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getAllPolicies = async (req, res, next) => {
  try {
    const { status, species, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [{ policyNumber: { $regex: search, $options: 'i' } }];
    }

    const total = await InsurancePolicy.countDocuments(query);
    const policies = await InsurancePolicy.find(query)
      .populate('animal', 'tagOrChipId animalName species breed healthStatus')
      .populate('owner', 'name phone county')
      .populate('insurancePlan', 'name code')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(
      res,
      { policies, total, page: Number(page), pages: Math.ceil(total / limit) },
      'Policies retrieved'
    );
  } catch (err) {
    next(err);
  }
};

const getInsuranceAnalytics = async (req, res, next) => {
  try {
    const [
      activePoliciesCount,
      totalSubscribersCount,
      totalRevenueResult,
      speciesDistribution,
    ] = await Promise.all([
      InsurancePolicy.countDocuments({ status: 'active' }),
      Animal.countDocuments({ isActive: true }),
      InsurancePolicy.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, totalPremiumRevenue: { $sum: '$premium' } } },
      ]),
      InsurancePolicy.aggregate([
        { $match: { status: 'active' } },
        {
          $lookup: {
            from: 'animals',
            localField: 'animal',
            foreignField: '_id',
            as: 'animalInfo',
          },
        },
        { $unwind: '$animalInfo' },
        { $group: { _id: '$animalInfo.species', count: { $sum: 1 } } },
      ]),
    ]);

    const totalPremiumRevenue = totalRevenueResult[0]?.totalPremiumRevenue || 0;

    return sendSuccess(
      res,
      {
        activePoliciesCount,
        totalSubscribersCount,
        totalPremiumRevenue,
        speciesDistribution,
      },
      'Insurance platform revenue and subscriber telemetry retrieved'
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getActivePlans,
  getPlanByCode,
  submitSubscriptionApplication,
  getAllPlansAdmin,
  createPlan,
  updatePlan,
  togglePlanStatus,
  deletePlan,
  getAllSubscriptions,
  updateSubscriptionStatus,
  convertSubscriptionToPolicy,
  getAllPolicies,
  getInsuranceAnalytics,
};
