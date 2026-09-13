const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Collaboration = require('../src/models/Collaboration');

let mongoServer;
let adminToken;
let regularUserToken;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const admin = await User.create({
    name: 'Admin Test Collab',
    email: 'admin@aniheal.co.ke',
    password: 'Password123!',
    role: 'admin',
    isActive: true,
  });

  const user = await User.create({
    name: 'Farmer Collab Reader',
    email: 'farmer@gmail.com',
    password: 'Password123!',
    role: 'user',
    isActive: true,
  });

  const jwtSecret = process.env.JWT_SECRET || 'aniheal_super_secret_jwt_key_2026';
  adminToken = jwt.sign({ id: admin._id, role: admin.role }, jwtSecret, { expiresIn: '1d' });
  regularUserToken = jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: '1d' });
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Collaborations & Partnerships Blog Suite', () => {
  let testCollaborationId;

  test('Admin can create a new collaboration story with header and partner', async () => {
    const res = await request(app)
      .post('/api/collaborations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        header: 'Test ILRI Research Surveillance Alliance',
        partnerName: 'ILRI Kenya',
        category: 'One Health Research',
        imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd',
        summary: 'Test summary on zoonotic pathogen tracking in pastoral regions.',
        content: '### Detailed Test Content\nThis is a long test article body explaining One Health surveillance.',
        status: 'published',
        featured: true,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.header, 'Test ILRI Research Surveillance Alliance');
    assert.ok(res.body.data.slug.includes('test-ilri-research-surveillance-alliance'));
    testCollaborationId = res.body.data._id;
  });

  test('Public can list published collaborations and filter by category', async () => {
    const res = await request(app).get('/api/collaborations?category=One+Health+Research');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    const found = res.body.data.find((c) => c._id.toString() === testCollaborationId.toString());
    assert.ok(found, 'Created collaboration should be in public list');
  });

  test('Public visitor can submit a comment to a collaboration story', async () => {
    const res = await request(app)
      .post(`/api/collaborations/${testCollaborationId}/comments`)
      .send({
        name: 'Jane Wambui',
        email: 'jwambui@example.com',
        comment: 'Brilliant initiative! How can smallholder cooperatives participate in the sample collection?',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Jane Wambui');
    assert.equal(res.body.data.approved, true);
  });

  test('Public cannot submit empty comment or missing name', async () => {
    const res = await request(app)
      .post(`/api/collaborations/${testCollaborationId}/comments`)
      .send({
        name: '',
        comment: '',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('Admin can fetch admin collaborations list with telemetry', async () => {
    const res = await request(app)
      .get('/api/collaborations/admin/all')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.metrics);
    assert.ok(res.body.metrics.total >= 1);
  });

  test('Unauthorized regular user cannot create collaboration', async () => {
    const res = await request(app)
      .post('/api/collaborations')
      .set('Authorization', `Bearer ${regularUserToken}`)
      .send({
        header: 'Test Unauthorized Collaboration',
        content: 'Unauthorized body',
      });

    assert.equal(res.status, 403);
  });
});
