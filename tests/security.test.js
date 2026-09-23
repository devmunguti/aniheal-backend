const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');

let mongoServer;
let superadminToken;
let editorToken;
let userToken;

describe('Security, RBAC & API Hardening Suite', () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create({ binary: { version: '4.4.29' } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create superadmin
    await User.create({
      name: 'SuperAdmin User',
      email: 'sec_admin@aniheal.co.ke',
      password: 'Password123!',
      role: 'superadmin',
    });

    // Create editor
    await User.create({
      name: 'Editor User',
      email: 'sec_editor@aniheal.co.ke',
      password: 'Password123!',
      role: 'editor',
    });

    // Create standard user
    await User.create({
      name: 'Regular User',
      email: 'sec_user@aniheal.co.ke',
      password: 'Password123!',
      role: 'user',
    });

    const loginAndGetToken = async (email, password) => {
      await request(app).post('/api/auth/login').send({ email, password });
      const user = await User.findOne({ email }).select('+otpCode');
      const res = await request(app).post('/api/auth/verify-otp').send({ email, otp: user.otpCode });
      return res.body.data.token;
    };

    superadminToken = await loginAndGetToken('sec_admin@aniheal.co.ke', 'Password123!');
    editorToken = await loginAndGetToken('sec_editor@aniheal.co.ke', 'Password123!');
    userToken = await loginAndGetToken('sec_user@aniheal.co.ke', 'Password123!');
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('Public and regular users are forbidden from accessing admin endpoints', async () => {
    // Unauthenticated
    const unauthRes = await request(app).get('/api/admin/dashboard/stats');
    assert.equal(unauthRes.status, 401);

    // Regular user
    const userRes = await request(app)
      .get('/api/admin/dashboard/stats')
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(userRes.status, 403);
  });

  test('Editor can access general admin CMS but NOT superadmin settings', async () => {
    // Stats: allowed
    const statsRes = await request(app)
      .get('/api/admin/dashboard/stats')
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(statsRes.status, 200);

    // Settings update: forbidden for editor
    const settingsRes = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ siteName: 'Hacked Name' });
    assert.equal(settingsRes.status, 403);

    // Audit logs: forbidden for editor
    const auditRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${editorToken}`);
    assert.equal(auditRes.status, 403);
  });

  test('Superadmin has full privileges for settings and audit logs', async () => {
    const settingsRes = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${superadminToken}`)
      .send({ siteName: 'AniHeal Veterinary Solutions' });
    assert.equal(settingsRes.status, 200);

    const auditRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${superadminToken}`);
    assert.equal(auditRes.status, 200);
    assert.equal(auditRes.body.success, true);
  });

  test('Health check endpoint returns detailed operational telemetry', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.database, 'connected');
    assert.ok(res.body.uptimeSeconds >= 0);
  });

  test('Security headers are attached by Helmet', async () => {
    const res = await request(app).get('/health');
    assert.ok(res.headers['x-dns-prefetch-control']);
    assert.ok(res.headers['x-frame-options']);
    assert.ok(res.headers['x-content-type-options']);
  });
});
