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

  test('Login Step 1 succeeds with valid credentials and requires OTP', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'farmer@test.co.ke',
        password: 'Password123!',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.requireOtp, true);
    assert.equal(res.body.data.email, 'farmer@test.co.ke');
  });

  test('Login Step 1 fails with incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'farmer@test.co.ke',
        password: 'WrongPassword!',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /invalid email or password/i);
  });

  test('/api/auth/me returns profile for authenticated user after OTP verification', async () => {
    // Step 1: Login
    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'farmer@test.co.ke',
        password: 'Password123!',
      });

    // Fetch generated OTP
    const user = await User.findOne({ email: 'farmer@test.co.ke' }).select('+otpCode');
    assert.ok(user.otpCode);

    // Step 2: Verify OTP
    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: 'farmer@test.co.ke',
        otp: user.otpCode,
      });

    const token = verifyRes.body.data.token;
    assert.ok(token);

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

  test('POST /api/auth/send-otp dispatches OTP for registered user', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ email: 'farmer@test.co.ke' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.match(res.body.message, /verification passcode has been sent/i);
  });

  test('POST /api/auth/send-otp returns 404 for unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ email: 'nonexistent@test.co.ke' });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  test('POST /api/auth/verify-otp fails with incorrect code', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: 'farmer@test.co.ke',
        otp: '000000',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /invalid verification passcode/i);
  });

  test('POST /api/auth/verify-otp succeeds with valid OTP and issues JWT token', async () => {
    // Read the stored OTP directly from the test database
    const user = await User.findOne({ email: 'farmer@test.co.ke' }).select('+otpCode');
    assert.ok(user.otpCode);

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: 'farmer@test.co.ke',
        otp: user.otpCode,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, 'farmer@test.co.ke');
  });

  test('POST /api/auth/change-password updates password and clears mustChangePassword', async () => {
    // Create test user with mustChangePassword: true
    await User.create({
      name: 'Temp Password User',
      email: 'tempuser@test.co.ke',
      password: 'password123',
      role: 'editor',
      mustChangePassword: true,
    });

    // Step 1: Login
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'tempuser@test.co.ke', password: 'password123' });

    const userDoc = await User.findOne({ email: 'tempuser@test.co.ke' }).select('+otpCode');
    assert.ok(userDoc.otpCode);

    // Step 2: Verify OTP
    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'tempuser@test.co.ke', otp: userDoc.otpCode });

    assert.equal(verifyRes.body.data.mustChangePassword, true);
    const token = verifyRes.body.data.token;

    // Step 3: Change Password
    const changeRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'password123',
        newPassword: 'BrandNewSecurePassword2025!',
      });

    assert.equal(changeRes.status, 200);
    assert.equal(changeRes.body.success, true);

    const updatedUser = await User.findOne({ email: 'tempuser@test.co.ke' });
    assert.equal(updatedUser.mustChangePassword, false);

    // Verify old password no longer works
    const oldLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tempuser@test.co.ke', password: 'password123' });
    assert.equal(oldLoginRes.status, 401);

    // Verify new password works
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tempuser@test.co.ke', password: 'BrandNewSecurePassword2025!' });
    assert.equal(newLoginRes.status, 200);
    assert.equal(newLoginRes.body.data.requireOtp, true);
  });
});
