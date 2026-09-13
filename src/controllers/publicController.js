const WebsiteSettings = require('../models/WebsiteSettings');
const ContentBlock = require('../models/ContentBlock');
const Service = require('../models/Service');
const PricingPlan = require('../models/PricingPlan');
const TeamMember = require('../models/TeamMember');
const Hub = require('../models/Hub');
const FAQ = require('../models/FAQ');
const ResearchItem = require('../models/ResearchItem');
const { sendSuccess } = require('../utils/response');

const getSettings = async (req, res, next) => {
  try {
    let settings = await WebsiteSettings.findOne();
    if (!settings) {
      settings = await WebsiteSettings.create({});
    }
    return sendSuccess(res, settings, 'Website settings retrieved');
  } catch (err) {
    next(err);
  }
};

const getContentBlocksBySection = async (req, res, next) => {
  try {
    const { section } = req.params;
    const query = { isPublished: true };
    if (section && section !== 'all') {
      query.section = section;
    }
    const blocks = await ContentBlock.find(query);
    
    // Map array into a convenient keyed dictionary for frontend ease
    const blocksByKey = {};
    blocks.forEach((b) => {
      blocksByKey[b.key] = b;
    });

    return sendSuccess(res, { blocks, byKey: blocksByKey }, 'Content blocks retrieved');
  } catch (err) {
    next(err);
  }
};

const getAllServices = async (req, res, next) => {
  try {
    const { category } = req.query;
    const query = { isPublished: true };
    if (category && category !== 'all') {
      query.category = category;
    }
    const services = await Service.find(query).sort({ sortOrder: 1, createdAt: 1 });
    return sendSuccess(res, services, 'Services retrieved');
  } catch (err) {
    next(err);
  }
};

const getServiceBySlug = async (req, res, next) => {
  try {
    const rawSlug = (req.params.slug || '').toLowerCase().trim();
    const service = await Service.findOne({ slug: rawSlug, isPublished: true })
      .populate('specialists', 'name title roleTag specialtyTag image kvbLicense')
      .populate('relatedServices', 'slug title badgeText image');
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    return sendSuccess(res, service, 'Service details retrieved');
  } catch (err) {
    next(err);
  }
};

const getPricingPlans = async (req, res, next) => {
  try {
    const plans = await PricingPlan.find({ isPublished: true }).sort({ sortOrder: 1, price: 1 });
    return sendSuccess(res, plans, 'Pricing plans retrieved');
  } catch (err) {
    next(err);
  }
};

const getTeamMembers = async (req, res, next) => {
  try {
    const { category } = req.query;
    const query = { isPublished: true };
    if (category && category !== 'all') {
      query.category = category;
    }
    const team = await TeamMember.find(query).sort({ isDirector: -1, sortOrder: 1, createdAt: 1 });
    return sendSuccess(res, team, 'Team members retrieved');
  } catch (err) {
    next(err);
  }
};

const getHubs = async (req, res, next) => {
  try {
    const hubs = await Hub.find({ isPublished: true }).sort({ sortOrder: 1, createdAt: 1 });
    return sendSuccess(res, hubs, 'Regional hubs retrieved');
  } catch (err) {
    next(err);
  }
};

const getFAQs = async (req, res, next) => {
  try {
    const { category } = req.query;
    const query = { isPublished: true };
    if (category && category !== 'all') {
      query.category = category;
    }
    const faqs = await FAQ.find(query).sort({ sortOrder: 1, createdAt: 1 });
    return sendSuccess(res, faqs, 'FAQs retrieved');
  } catch (err) {
    next(err);
  }
};

const getResearchItems = async (req, res, next) => {
  try {
    const items = await ResearchItem.find({ isPublished: true }).sort({ sortOrder: 1, year: -1 });
    return sendSuccess(res, items, 'Research publications retrieved');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings,
  getContentBlocksBySection,
  getAllServices,
  getServiceBySlug,
  getPricingPlans,
  getTeamMembers,
  getHubs,
  getFAQs,
  getResearchItems,
};
