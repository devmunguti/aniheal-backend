const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');

let mongoServer;
let vetToken;
let regularUserToken;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const vet = await User.create({
    name: 'Dr. Joseph Ndungu (BVM)',
    email: 'dr.ndungu@aniheal.co.ke',
    password: 'Password123!',
    role: 'vet',
  });

  const user = await User.create({
    name: 'Regular Public User',
    email: 'user@gmail.com',
    password: 'Password123!',
    role: 'user',
  });

  const jwtSecret = process.env.JWT_SECRET || 'aniheal_super_secret_jwt_key_2026';
  vetToken = jwt.sign({ id: vet._id, role: vet.role, name: vet.name }, jwtSecret, { expiresIn: '1d' });
  regularUserToken = jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: '1d' });
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Vet Clinical Operations Suite', () => {
  test('Vet can log daily clinical activity and auto-create patient records', async () => {
    const logPayload = {
      farmerName: 'Peter Kamau',
      farmerPhone: '+254701234999',
      farmLocation: 'Limuru Dairy Hub',
      county: 'Kiambu',
      animalName: 'Daisy 04',
      tagOrChipId: 'KMB-DAIRY-104',
      species: 'dairy_cattle',
      symptoms: 'High fever 40.5C, drop in milk yield, enlarged prescapular lymph nodes',
      diagnosis: 'East Coast Fever (Theileriosis)',
      proceduresPerformed: ['clinical_exam', 'blood_smear_diagnostics'],
      medicationsAdministered: [
        {
          drugName: 'Buparvaquone (Butalex)',
          dosage: '20ml IM single dose',
          route: 'IM',
          withdrawalPeriodDays: 28,
        },
      ],
      labSamplesTaken: 'Peripheral blood smear confirmed Koch Blue bodies',
      clinicalNotes: 'Administered supportive antipyretic. Advised strict acaricide dipping regimen.',
      feeCharged: 4500,
      paymentStatus: 'paid_cash',
    };

    const res = await request(app)
      .post('/api/vet/logs')
      .set('Authorization', `Bearer ${vetToken}`)
      .send(logPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.vetLog.diagnosis, 'East Coast Fever (Theileriosis)');
    assert.equal(res.body.data.animal.tagOrChipId, 'KMB-DAIRY-104');
    assert.equal(res.body.data.owner.name, 'Peter Kamau');
  });

  test('Vet statistics endpoint aggregates today cases, species distribution, and revenue', async () => {
    const res = await request(app)
      .get('/api/vet/stats')
      .set('Authorization', `Bearer ${vetToken}`)
      .send();

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.todayCasesCount >= 1);
    assert.ok(res.body.data.totalClinicalRevenue >= 4500);
  });

  test('Unauthorized regular users are forbidden from accessing vet operations', async () => {
    const res = await request(app)
      .get('/api/vet/stats')
      .set('Authorization', `Bearer ${regularUserToken}`)
      .send();

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });
});
