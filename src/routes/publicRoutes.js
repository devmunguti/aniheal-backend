const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const { sendSuccess } = require('../utils/response');

// Settings
router.get('/settings', publicController.getSettings);

// Content blocks
router.get('/content/:section', publicController.getContentBlocksBySection);
router.get('/content', (req, res, next) => {
  req.params.section = 'all';
  return publicController.getContentBlocksBySection(req, res, next);
});
router.get('/blocks', (req, res, next) => {
  req.params.section = 'all';
  return publicController.getContentBlocksBySection(req, res, next);
});

// Services
router.get('/services', publicController.getAllServices);
router.get('/services/:slug', publicController.getServiceBySlug);

// Pricing plans (both canonical /pricing-plans and alias /pricing)
router.get('/pricing-plans', publicController.getPricingPlans);
router.get('/pricing', publicController.getPricingPlans);

// Team members
router.get('/team', publicController.getTeamMembers);

// Regional hubs
router.get('/hubs', publicController.getHubs);

// FAQs
router.get('/faqs', publicController.getFAQs);

// Research items
router.get('/research', publicController.getResearchItems);

// General contact message submission endpoint
router.post('/contact', (req, res) => {
  const { name, email, phone, message } = req.body || {};
  return sendSuccess(res, { received: true, name, email }, 'Inquiry received successfully');
});

module.exports = router;
