const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Appointment = require('../src/models/Appointment');

let mongoServer;
let adminToken;
let editorToken;

describe('Appointment Triage & Workflow Suite', () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create({ binary: { version: '4.4.29' } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create Admin and Editor accounts
    const admin = await User.create({
      name: 'SuperAdmin Vet',
      email: 'admin_triage@aniheal.co.ke',
      password: 'AdminPassword123!',
      role: 'superadmin',
    });

    const editor = await User.create({
      name: 'Field Officer',
      email: 'officer@aniheal.co.ke',
      password: 'OfficerPassword123!',
      role: 'editor',
    });

    const loginAndGetToken = async (email, password) => {
      await request(app).post('/api/auth/login').send({ email, password });
      const user = await User.findOne({ email }).select('+otpCode');
      const res = await request(app).post('/api/auth/verify-otp').send({ email, otp: user.otpCode });
      return res.body.data.token;
    };

    adminToken = await loginAndGetToken('admin_triage@aniheal.co.ke', 'AdminPassword123!');
    editorToken = await loginAndGetToken('officer@aniheal.co.ke', 'OfficerPassword123!');
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('Public farmer triage submission succeeds with canonical payload', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({
        farmerName: 'Joseph Mwangi',
        farmName: 'Riftview Dairies',
        phone: '+254712345678',
        email: 'mwangi@gmail.com',
        county: 'Nakuru',
        speciesType: 'dairy',
        totalHeadcount: 50,
        affectedCount: 4,
        clinicalService: 'acute_treatment',
        dispatchTier: 'emergency',
        symptomsDescription: 'Severe acute mastitis with high fever in 4 heifers.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data._id);
    assert.match(res.body.data.ticketRef, /^ANH-\d{4}-\d{4}$/);
    assert.equal(res.body.data.status, 'pending');
  });

  test('Triage submission accepts legacy frontend aliases and normalizes them', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({
        producerName: 'Mary Wanjohi',
        producerPhone: '+254722998877',
        farmCounty: 'Nyeri',
        livestockCategory: 'shoats',
        serviceCategory: 'reproductive',
        clinicalNotes: 'Artificial insemination synchronization request',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.farmerName, 'Mary Wanjohi');
    assert.equal(res.body.data.phone, '+254722998877');
    assert.equal(res.body.data.county, 'Nyeri');
    assert.equal(res.body.data.speciesType, 'shoats');
  });

  test('Triage submission is rejected with 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({
        farmerName: 'Incomplete Submission',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.missingFields.length > 0);
  });

  test('Admin can list and filter appointments', async () => {
    const res = await request(app)
      .get('/api/appointments?status=pending')
      .set('Authorization', `Bearer ${editorToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.appointments));
    assert.ok(res.body.data.appointments.length >= 2);
  });

  test('Officer can transition appointment status and assign clinician', async () => {
    const listRes = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${editorToken}`);

    const ticketId = listRes.body.data.appointments[0]._id;

    const updateRes = await request(app)
      .patch(`/api/appointments/${ticketId}/status`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        status: 'dispatched',
        assignedOfficer: 'Dr. Dennis Kipchumba',
        clinicalNotes: 'Mobile ambulatory unit dispatched with ultrasound kit.',
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.success, true);
    assert.equal(updateRes.body.data.status, 'dispatched');
    assert.equal(updateRes.body.data.assignedOfficer, 'Dr. Dennis Kipchumba');
  });

  test('Reverting completed appointment back to pending is prevented', async () => {
    const listRes = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${adminToken}`);

    const ticketId = listRes.body.data.appointments[0]._id;

    // First mark as completed
    await request(app)
      .patch(`/api/appointments/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completed' });

    // Try reverting back to pending
    const invalidRes = await request(app)
      .patch(`/api/appointments/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'pending' });

    assert.equal(invalidRes.status, 400);
    assert.equal(invalidRes.body.success, false);
  });

  test('Fetching non-existent appointment by ID returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/appointments/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  test('Rejected submission does not increment appointment count in database', async () => {
    const beforeCount = await Appointment.countDocuments();
    const res = await request(app)
      .post('/api/appointments')
      .send({ phone: '' });

    assert.equal(res.status, 400);
    const afterCount = await Appointment.countDocuments();
    assert.equal(beforeCount, afterCount);
  });
});
