const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const InsurancePlan = require('../src/models/InsurancePlan');
const InsuranceSubscription = require('../src/models/InsuranceSubscription');
const jwt = require('jsonwebtoken');

let mongoServer;
let adminToken;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin-ins@aniheal.co.ke',
    password: 'Password123!',
    role: 'admin',
  });

  const jwtSecret = process.env.JWT_SECRET || 'aniheal_super_secret_jwt_key_2026';
  adminToken = jwt.sign({ id: admin._id, role: admin.role }, jwtSecret, { expiresIn: '1d' });
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Animal Insurance & Subscription Suite', () => {
  let createdPlanId;
  let createdSubscriptionId;

  test('Admin can create insurance plan with species-specific pricing', async () => {
    const planPayload = {
      name: 'AniHeal Comprehensive Herd & Pet Shield',
      code: 'ANH-SHIELD-PRO',
      description: 'Complete veterinary emergency cover, routine vaccinations, and laboratory diagnostics.',
      targetSpecies: ['dairy_cattle', 'canine', 'equine'],
      speciesPricing: [
        {
          species: 'dairy_cattle',
          monthlyPremium: 2500,
          annualPremium: 28000,
          coverageLimit: 200000,
          deductible: 1500,
        },
        {
          species: 'canine',
          monthlyPremium: 1200,
          annualPremium: 13500,
          coverageLimit: 80000,
          deductible: 800,
        },
      ],
      coverageDetails: ['Emergency Surgeries', 'Annual Foot & Mouth Vaccine', 'Deworming Protocols'],
      exclusions: ['Pre-existing chronic genetic conditions'],
      basePrice: 28000,
      isActive: true,
      isPopular: true,
    };

    const res = await request(app)
      .post('/api/admin/insurance/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(planPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.code, 'ANH-SHIELD-PRO');
    assert.equal(res.body.data.speciesPricing.length, 2);

    createdPlanId = res.body.data._id;
  });

  test('Public can view active insurance plans with species pricing', async () => {
    const res = await request(app)
      .get('/api/insurance/plans')
      .send();

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.length >= 1);
  });

  test('Public farmer can submit insurance subscription application', async () => {
    const applicationPayload = {
      applicantName: 'Wanjiku Mwangi',
      applicantPhone: '+254722334455',
      applicantEmail: 'wanjiku@nyerifarms.co.ke',
      county: 'Nyeri',
      farmLocation: 'Karatina Zone B',
      species: 'dairy_cattle',
      animalName: 'Fresian Queen 01',
      tagOrChipId: 'KE-NYR-8821',
      breed: 'Holstein Friesian',
      age: '3.5 years',
      planId: createdPlanId,
      preferredBilling: 'annual',
    };

    const res = await request(app)
      .post('/api/insurance/subscribe')
      .send(applicationPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'submitted');
    assert.ok(res.body.data.applicationNumber.startsWith('INS-APP-'));

    createdSubscriptionId = res.body.data._id;
  });

  test('Admin can approve and convert application into active policy and register animal', async () => {
    const res = await request(app)
      .post(`/api/admin/insurance/subscriptions/${createdSubscriptionId}/convert`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.policy.status, 'active');
    assert.equal(res.body.data.animal.tagOrChipId, 'KE-NYR-8821');
    assert.equal(res.body.data.owner.phone, '+254722334455');
  });

  test('Insurance telemetry returns active policies and subscriber counts', async () => {
    const res = await request(app)
      .get('/api/admin/insurance/analytics')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.activePoliciesCount >= 1);
    assert.ok(res.body.data.totalPremiumRevenue > 0);
  });
});
