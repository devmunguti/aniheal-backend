const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');

let mongoServer;

describe('Authentication & User Registration Suite', () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create({ binary: { version: '4.4.29' } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('Public registration creates account and strictly enforces "user" role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Farmer',
        email: 'farmer@test.co.ke',
        password: 'Password123!',
        role: 'superadmin', // Malicious attempt to self-elevate
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.role, 'user'); // Role must be sanitized to 'user'
  });

  test('Registration rejects duplicate email addresses', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Another Farmer',
        email: 'farmer@test.co.ke',
        password: 'Password123!',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /already exists/i);
  });

  test('Login succeeds with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'farmer@test.co.ke',
        password: 'Password123!',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, 'farmer@test.co.ke');
  });

  test('Login fails with incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'farmer@test.co.ke',
        password: 'WrongPassword!',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('/api/auth/me returns profile for authenticated user', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'farmer@test.co.ke',
        password: 'Password123!',
      });

    const token = loginRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.success, true);
    assert.equal(meRes.body.data.email, 'farmer@test.co.ke');
  });

  test('/api/auth/me rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });
});
