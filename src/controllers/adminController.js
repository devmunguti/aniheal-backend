const WebsiteSettings = require('../models/WebsiteSettings');
const ContentBlock = require('../models/ContentBlock');
const Service = require('../models/Service');
const PricingPlan = require('../models/PricingPlan');
const TeamMember = require('../models/TeamMember');
const Hub = require('../models/Hub');
const FAQ = require('../models/FAQ');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Product = require('../models/Product');
const ProductOrder = require('../models/ProductOrder');
const Payment = require('../models/Payment');
const InsurancePlan = require('../models/InsurancePlan');
const InsurancePolicy = require('../models/InsurancePolicy');
const Animal = require('../models/Animal');
const VetLog = require('../models/VetLog');
const Collaboration = require('../models/Collaboration');
const { sendSuccess, sendError } = require('../utils/response');
const { logAction } = require('../services/auditService');

// --- 1. DASHBOARD OVERVIEW STATS ---
const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalServices,
      totalTeam,
      totalPricing,
      totalHubs,
      totalFaqs,
      pendingAppointments,
      totalAppointments,
      totalProducts,
      totalOrders,
      pendingOrders,
      productRevenueResult,
      activePolicies,
      insuranceRevenueResult,
      totalAnimals,
      todayVetCases,
      totalCollaborations,
      recentAppointments,
      recentOrders,
      recentPayments,
      recentActivity,
    ] = await Promise.all([
      Service.countDocuments(),
      TeamMember.countDocuments(),
      PricingPlan.countDocuments(),
      Hub.countDocuments(),
      FAQ.countDocuments(),
      Appointment.countDocuments({ status: 'pending' }),
      Appointment.countDocuments(),
      Product.countDocuments({ isActive: true }),
      ProductOrder.countDocuments(),
      ProductOrder.countDocuments({ orderStatus: 'pending' }),
      Payment.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } },
      ]),
      InsurancePolicy.countDocuments({ status: 'active' }),
      InsurancePolicy.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, totalRevenue: { $sum: '$premium' } } },
      ]),
      Animal.countDocuments({ isActive: true }),
      VetLog.countDocuments({ logDate: { $gte: today } }),
      Collaboration.countDocuments(),
      Appointment.find().sort({ createdAt: -1 }).limit(5),
      ProductOrder.find().sort({ createdAt: -1 }).limit(5),
      Payment.find().sort({ createdAt: -1 }).limit(5),
      AuditLog.find().sort({ createdAt: -1 }).limit(8),
    ]);

    const productRevenue = productRevenueResult[0]?.totalRevenue || 0;
    const insuranceRevenue = insuranceRevenueResult[0]?.totalRevenue || 0;

    return sendSuccess(
      res,
      {
        counts: {
          services: totalServices,
          team: totalTeam,
          pricing: totalPricing,
          hubs: totalHubs,
          faqs: totalFaqs,
          pendingAppointments,
          totalAppointments,
          products: totalProducts,
          orders: totalOrders,
          pendingOrders,
          productRevenue,
          activePolicies,
          insuranceRevenue,
          animals: totalAnimals,
          todayVetCases,
          collaborations: totalCollaborations,
        },
        recentAppointments,
        recentOrders,
        recentPayments,
        recentActivity,
      },
      'Dashboard stats retrieved'
    );
  } catch (err) {
    next(err);
  }
};

// --- 2. SETTINGS ---
const getSettingsAdmin = async (req, res, next) => {
  try {
    const settings = await WebsiteSettings.findOne();
    return sendSuccess(res, settings, 'Settings retrieved');
  } catch (err) {
    next(err);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    let settings = await WebsiteSettings.findOne();
    if (!settings) {
      settings = new WebsiteSettings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();

    await logAction({
      req,
      action: 'UPDATE_WEBSITE_SETTINGS',
      resource: 'settings',
      details: { siteName: settings.siteName, primaryPhone: settings.primaryPhone },
    });

    return sendSuccess(res, settings, 'Settings updated successfully');
  } catch (err) {
    next(err);
  }
};

// --- 3. CONTENT BLOCKS ---
const getContentBlocks = async (req, res, next) => {
  try {
    const blocks = await ContentBlock.find().sort({ section: 1, key: 1 });
    return sendSuccess(res, blocks, 'Content blocks retrieved');
  } catch (err) {
    next(err);
  }
};

const upsertContentBlock = async (req, res, next) => {
  try {
    const { key } = req.params;
    const updateData = { ...req.body, key };
    
    const block = await ContentBlock.findOneAndUpdate(
      { key },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    await logAction({
      req,
      action: 'UPSERT_CONTENT_BLOCK',
      resource: 'content_blocks',
      resourceId: block._id,
      details: { key, title: block.title, section: block.section },
    });

    return sendSuccess(res, block, `Content block '${key}' updated`);
  } catch (err) {
    next(err);
  }
};

const deleteContentBlock = async (req, res, next) => {
  try {
    const block = await ContentBlock.findByIdAndDelete(req.params.id);
    if (!block) return sendError(res, 'Content block not found', 404);

    await logAction({
      req,
      action: 'DELETE_CONTENT_BLOCK',
      resource: 'content_blocks',
      resourceId: req.params.id,
      details: { key: block.key },
    });

    return sendSuccess(res, { id: req.params.id }, 'Content block deleted');
  } catch (err) {
    next(err);
  }
};

// --- 4. SERVICES CRUD ---
const getAllServicesAdmin = async (req, res, next) => {
  try {
    const services = await Service.find().sort({ sortOrder: 1, createdAt: -1 });
    return sendSuccess(res, services, 'Services retrieved');
  } catch (err) {
    next(err);
  }
};

const createService = async (req, res, next) => {
  try {
    let baseSlug = (req.body.slug || req.body.title || 'clinical-service')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    let slug = baseSlug;
    const existing = await Service.findOne({ slug });
    if (existing) {
      slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const service = await Service.create({
      ...req.body,
      name: req.body.name || req.body.title,
      slug,
    });

    await logAction({
      req,
      action: 'CREATE_SERVICE',
      resource: 'services',
      resourceId: service._id,
      details: { title: service.title, slug: service.slug },
    });

    return sendSuccess(res, service, 'Service created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateService = async (req, res, next) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!service) return sendError(res, 'Service not found', 404);

    await logAction({
      req,
      action: 'UPDATE_SERVICE',
      resource: 'services',
      resourceId: service._id,
      details: { title: service.title },
    });

    return sendSuccess(res, service, 'Service updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return sendError(res, 'Service not found', 404);

    await logAction({
      req,
      action: 'DELETE_SERVICE',
      resource: 'services',
      resourceId: req.params.id,
      details: { title: service.title },
    });

    return sendSuccess(res, { id: req.params.id }, 'Service deleted successfully');
  } catch (err) {
    next(err);
  }
};

// --- 5. PRICING PLANS CRUD ---
const getAllPricingPlansAdmin = async (req, res, next) => {
  try {
    const plans = await PricingPlan.find().sort({ sortOrder: 1, price: 1 });
    return sendSuccess(res, plans, 'Pricing plans retrieved');
  } catch (err) {
    next(err);
  }
};

const createPricingPlan = async (req, res, next) => {
  try {
    const plan = await PricingPlan.create(req.body);

    await logAction({
      req,
      action: 'CREATE_PRICING_PLAN',
      resource: 'pricing_plans',
      resourceId: plan._id,
      details: { name: plan.name, price: plan.price },
    });

    return sendSuccess(res, plan, 'Pricing plan created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updatePricingPlan = async (req, res, next) => {
  try {
    const plan = await PricingPlan.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!plan) return sendError(res, 'Pricing plan not found', 404);

    await logAction({
      req,
      action: 'UPDATE_PRICING_PLAN',
      resource: 'pricing_plans',
      resourceId: plan._id,
      details: { name: plan.name, price: plan.price },
    });

    return sendSuccess(res, plan, 'Pricing plan updated successfully');
  } catch (err) {
    next(err);
  }
};

const deletePricingPlan = async (req, res, next) => {
  try {
    const plan = await PricingPlan.findByIdAndDelete(req.params.id);
    if (!plan) return sendError(res, 'Pricing plan not found', 404);

    await logAction({
      req,
      action: 'DELETE_PRICING_PLAN',
      resource: 'pricing_plans',
      resourceId: req.params.id,
      details: { name: plan.name },
    });

    return sendSuccess(res, { id: req.params.id }, 'Pricing plan deleted successfully');
  } catch (err) {
    next(err);
  }
};

// --- 6. TEAM MEMBERS CRUD ---
const getAllTeamMembersAdmin = async (req, res, next) => {
  try {
    const team = await TeamMember.find().sort({ isDirector: -1, sortOrder: 1, createdAt: -1 });
    return sendSuccess(res, team, 'Team members retrieved');
  } catch (err) {
    next(err);
  }
};

const createTeamMember = async (req, res, next) => {
  try {
    let baseSlug = (req.body.slug || req.body.name || 'specialist')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    let slug = baseSlug;
    const existing = await TeamMember.findOne({ slug });
    if (existing) {
      slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    if (req.body.isDirector) {
      await TeamMember.updateMany({}, { isDirector: false });
    }

    const member = await TeamMember.create({ ...req.body, slug });

    await logAction({
      req,
      action: 'CREATE_TEAM_MEMBER',
      resource: 'team_members',
      resourceId: member._id,
      details: { name: member.name, specialty: member.specialtyTag },
    });

    return sendSuccess(res, member, 'Team member added successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateTeamMember = async (req, res, next) => {
  try {
    if (req.body.isDirector) {
      await TeamMember.updateMany({ _id: { $ne: req.params.id } }, { isDirector: false });
    }

    const member = await TeamMember.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!member) return sendError(res, 'Team member not found', 404);

    await logAction({
      req,
      action: 'UPDATE_TEAM_MEMBER',
      resource: 'team_members',
      resourceId: member._id,
      details: { name: member.name },
    });

    return sendSuccess(res, member, 'Team member updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteTeamMember = async (req, res, next) => {
  try {
    const member = await TeamMember.findByIdAndDelete(req.params.id);
    if (!member) return sendError(res, 'Team member not found', 404);

    await logAction({
      req,
      action: 'DELETE_TEAM_MEMBER',
      resource: 'team_members',
      resourceId: req.params.id,
      details: { name: member.name },
    });

    return sendSuccess(res, { id: req.params.id }, 'Team member deleted successfully');
  } catch (err) {
    next(err);
  }
};

// --- 7. HUBS CRUD ---
const getAllHubsAdmin = async (req, res, next) => {
  try {
    const hubs = await Hub.find().sort({ sortOrder: 1, createdAt: -1 });
    return sendSuccess(res, hubs, 'Hubs retrieved');
  } catch (err) {
    next(err);
  }
};

const createHub = async (req, res, next) => {
  try {
    const hub = await Hub.create(req.body);

    await logAction({
      req,
      action: 'CREATE_HUB',
      resource: 'hubs',
      resourceId: hub._id,
      details: { name: hub.name, address: hub.address },
    });

    return sendSuccess(res, hub, 'Hub created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateHub = async (req, res, next) => {
  try {
    const hub = await Hub.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!hub) return sendError(res, 'Hub not found', 404);

    await logAction({
      req,
      action: 'UPDATE_HUB',
      resource: 'hubs',
      resourceId: hub._id,
      details: { name: hub.name },
    });

    return sendSuccess(res, hub, 'Hub updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteHub = async (req, res, next) => {
  try {
    const hub = await Hub.findByIdAndDelete(req.params.id);
    if (!hub) return sendError(res, 'Hub not found', 404);

    await logAction({
      req,
      action: 'DELETE_HUB',
      resource: 'hubs',
      resourceId: req.params.id,
      details: { name: hub.name },
    });

    return sendSuccess(res, { id: req.params.id }, 'Hub deleted successfully');
  } catch (err) {
    next(err);
  }
};

// --- 8. FAQS CRUD ---
const getAllFAQsAdmin = async (req, res, next) => {
  try {
    const faqs = await FAQ.find().sort({ sortOrder: 1, createdAt: -1 });
    return sendSuccess(res, faqs, 'FAQs retrieved');
  } catch (err) {
    next(err);
  }
};

const createFAQ = async (req, res, next) => {
  try {
    const faq = await FAQ.create(req.body);

    await logAction({
      req,
      action: 'CREATE_FAQ',
      resource: 'faqs',
      resourceId: faq._id,
      details: { question: faq.question },
    });

    return sendSuccess(res, faq, 'FAQ created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateFAQ = async (req, res, next) => {
  try {
    const faq = await FAQ.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!faq) return sendError(res, 'FAQ not found', 404);

    await logAction({
      req,
      action: 'UPDATE_FAQ',
      resource: 'faqs',
      resourceId: faq._id,
      details: { question: faq.question },
    });

    return sendSuccess(res, faq, 'FAQ updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteFAQ = async (req, res, next) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) return sendError(res, 'FAQ not found', 404);

    await logAction({
      req,
      action: 'DELETE_FAQ',
      resource: 'faqs',
      resourceId: req.params.id,
      details: { question: faq.question },
    });

    return sendSuccess(res, { id: req.params.id }, 'FAQ deleted successfully');
  } catch (err) {
    next(err);
  }
};

// --- 9. USERS (SuperAdmin Only) ---
const getAllUsersAdmin = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return sendSuccess(res, users, 'Users retrieved');
  } catch (err) {
    next(err);
  }
};

const createUserAdmin = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendError(res, 'A user with this email already exists', 400);
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'editor',
      isActive: true,
    });

    const userObj = user.toObject();
    delete userObj.password;

    await logAction({
      req,
      action: 'CREATE_ADMIN_USER',
      resource: 'users',
      resourceId: user._id,
      details: { email: user.email, role: user.role },
    });

    return sendSuccess(res, userObj, 'User created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateUserAdmin = async (req, res, next) => {
  try {
    const { name, email, role, isActive, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 'User not found', 404);

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password; // Will be hashed by pre-save hook

    await user.save();
    const userObj = user.toObject();
    delete userObj.password;

    await logAction({
      req,
      action: 'UPDATE_ADMIN_USER',
      resource: 'users',
      resourceId: user._id,
      details: { email: user.email, role: user.role },
    });

    return sendSuccess(res, userObj, 'User updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteUserAdmin = async (req, res, next) => {
  try {
    // Prevent self-deletion
    if (req.user._id.toString() === req.params.id) {
      return sendError(res, 'Cannot delete your own administrator account', 400);
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return sendError(res, 'User not found', 404);

    await logAction({
      req,
      action: 'DELETE_ADMIN_USER',
      resource: 'users',
      resourceId: req.params.id,
      details: { email: user.email },
    });

    return sendSuccess(res, { id: req.params.id }, 'User deleted successfully');
  } catch (err) {
    next(err);
  }
};

// --- 10. AUDIT LOGS ---
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const total = await AuditLog.countDocuments();
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(
      res,
      { logs, total, page: Number(page), pages: Math.ceil(total / limit) },
      'Audit logs retrieved'
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats,
  getSettingsAdmin,
  updateSettings,
  getContentBlocks,
  upsertContentBlock,
  deleteContentBlock,
  getAllServicesAdmin,
  createService,
  updateService,
  deleteService,
  getAllPricingPlansAdmin,
  createPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
  getAllTeamMembersAdmin,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getAllHubsAdmin,
  createHub,
  updateHub,
  deleteHub,
  getAllFAQsAdmin,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getAllUsersAdmin,
  createUserAdmin,
  updateUserAdmin,
  deleteUserAdmin,
  getAuditLogs,
};
