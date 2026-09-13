const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const ProductOrder = require('../src/models/ProductOrder');
const Payment = require('../src/models/Payment');
const jwt = require('jsonwebtoken');

let mongoServer;
let adminToken;
let editorToken;
let regularUserToken;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@aniheal.co.ke',
    password: 'Password123!',
    role: 'admin',
  });

  const editor = await User.create({
    name: 'Editor User',
    email: 'editor@aniheal.co.ke',
    password: 'Password123!',
    role: 'editor',
  });

  const user = await User.create({
    name: 'Farmer User',
    email: 'farmer@gmail.com',
    password: 'Password123!',
    role: 'user',
  });

  const jwtSecret = process.env.JWT_SECRET || 'aniheal_super_secret_jwt_key_2026';
  adminToken = jwt.sign({ id: admin._id, role: admin.role }, jwtSecret, { expiresIn: '1d' });
  editorToken = jwt.sign({ id: editor._id, role: editor.role }, jwtSecret, { expiresIn: '1d' });
  regularUserToken = jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: '1d' });
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Company Products, Inventory, Orders & Sales Suite', () => {
  let createdProductId;

  test('Admin can create a new product with unique SKU and initial stock', async () => {
    const payload = {
      name: 'Oxytetracycline 20% LA Injectable',
      sku: 'MED-OXY-20LA',
      category: 'pharmaceuticals',
      description: 'Broad-spectrum antibiotic for bovine respiratory and systemic bacterial infections.',
      price: 2400,
      stockQuantity: 50,
      lowStockThreshold: 10,
      isActive: true,
      features: ['Long-acting 72h', 'Bovine & Ovine approved', 'KVB Certified'],
      paymentMethods: ['cash', 'mpesa'],
    };

    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, payload.name);
    assert.equal(res.body.data.sku, 'MED-OXY-20LA');
    assert.equal(res.body.data.stockQuantity, 50);

    createdProductId = res.body.data._id;
  });

  test('Creating product with duplicate SKU is rejected with 409 Conflict', async () => {
    const duplicatePayload = {
      name: 'Duplicate SKU Med',
      sku: 'MED-OXY-20LA',
      category: 'pharmaceuticals',
      description: 'Test duplicate description',
      price: 1500,
    };

    const res = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(duplicatePayload);

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  test('Public can view active products with category filtering', async () => {
    const res = await request(app)
      .get('/api/products?category=pharmaceuticals')
      .send();

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.equal(res.body.data[0].sku, 'MED-OXY-20LA');
  });

  test('Public can submit a product order with price snapshots', async () => {
    const orderPayload = {
      customerName: 'Kiprono Cheruiyot',
      customerPhone: '+254712345678',
      county: 'Nakuru',
      deliveryAddress: 'Rongai Farm Block 4',
      items: [
        {
          productId: createdProductId,
          quantity: 2,
        },
      ],
      notes: 'Please dispatch via morning courier',
    };

    const res = await request(app)
      .post('/api/products/orders')
      .send(orderPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.customerName, 'Kiprono Cheruiyot');
    assert.equal(res.body.data.totalAmount, 4800); // 2400 * 2
    assert.ok(res.body.data.orderNumber.startsWith('ORD-'));
  });

  test('Admin can record a manual cash payment and update revenue analytics', async () => {
    const paymentPayload = {
      amount: 4800,
      paymentMethod: 'cash',
      customerName: 'Kiprono Cheruiyot',
      customerPhone: '+254712345678',
      referenceNumber: 'CSH-NAK-2026-001',
      notes: 'Direct farm gate cash payment for antibiotics',
    };

    const res = await request(app)
      .post('/api/admin/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(paymentPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.paymentMethod, 'cash');
    assert.equal(res.body.data.amount, 4800);

    // Check Analytics
    const analyticsRes = await request(app)
      .get('/api/admin/payments/analytics')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    assert.equal(analyticsRes.status, 200);
    assert.equal(analyticsRes.body.success, true);
    assert.ok(analyticsRes.body.data.totalRevenue >= 4800);
  });

  test('Admin can adjust stock and view inventory audit log', async () => {
    const adjustPayload = {
      productId: createdProductId,
      adjustmentType: 'purchase',
      quantity: 20,
      reason: 'New warehouse shipment',
    };

    const res = await request(app)
      .post('/api/admin/inventory/adjust')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(adjustPayload);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.product.stockQuantity, 70); // 50 + 20
  });
});
