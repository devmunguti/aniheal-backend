const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const emailService = require('../src/services/emailService');

describe('Email Notification Suite & HTML Templates', () => {
  test('OTP email template contains code, recipient name, and security alert', () => {
    const html = emailService.buildOtpEmailHtml({
      recipientName: 'Dr. Karu',
      otpCode: '852963',
      expiryMinutes: 10,
    });

    assert.ok(html.includes('852963'));
    assert.ok(html.includes('Dr. Karu'));
    assert.ok(html.includes('10 minutes'));
    assert.ok(html.includes('AniHeal'));
  });

  test('Staff account creation email template contains temp password and role details', () => {
    const html = emailService.buildAccountCreatedEmailHtml({
      recipientName: 'Jane Doe',
      email: 'jane@aniheal.co.ke',
      tempPassword: 'TempSecretPassword99!',
      role: 'vet',
      portalUrl: 'https://aniheal.co.ke/admin/login',
    });

    assert.ok(html.includes('Jane Doe'));
    assert.ok(html.includes('jane@aniheal.co.ke'));
    assert.ok(html.includes('TempSecretPassword99!'));
    assert.ok(html.includes('Field Veterinary Officer'));
    assert.ok(html.includes('https://aniheal.co.ke/admin/login'));
  });

  test('Password changed email template contains security notice and contact hotline', () => {
    const html = emailService.buildPasswordChangedEmailHtml({
      recipientName: 'Main Admin',
      email: 'hello.aniheal@gmail.com',
    });

    assert.ok(html.includes('Main Admin'));
    assert.ok(html.includes('hello.aniheal@gmail.com'));
    assert.ok(html.includes('Password Changed Successfully'));
    assert.ok(html.includes('+254 726 587 044'));
  });

  test('Appointment confirmation email dispatches with valid ticket metadata', async () => {
    const result = await emailService.sendAppointmentConfirmationEmail({
      to: 'farmer_test@aniheal.co.ke',
      appointment: {
        ticketRef: 'ANH-2026-9999',
        farmerName: 'John Kamau',
        phone: '+254700112233',
        county: 'Kiambu',
        clinicalService: 'Emergency C-Section',
        dispatchTier: 'emergency',
        speciesType: 'dairy',
        affectedCount: 1,
        totalHeadcount: 12,
        symptomsDescription: 'Severe dystocia in dairy cow',
      },
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.deliveredVia);
  });

  test('Order confirmation email dispatches with itemized receipt', async () => {
    const result = await emailService.sendOrderConfirmationEmail({
      to: 'buyer_test@aniheal.co.ke',
      order: {
        orderNumber: 'ORD-2026-7777',
        customerName: 'Mary Wambui',
        customerPhone: '+254711223344',
        county: 'Machakos',
        deliveryAddress: 'Plot 45 Katani',
        items: [
          { name: 'Oxytetracycline 20% LA', quantity: 2, unitPrice: 1200, subtotal: 2400 },
          { name: 'Multivitamin Injectable 100ml', quantity: 1, unitPrice: 850, subtotal: 850 },
        ],
        totalAmount: 3250,
      },
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.deliveredVia);
  });

  test('Insurance policy activation email dispatches with policy certificate', async () => {
    const result = await emailService.sendInsurancePolicyActivatedEmail({
      to: 'farmer_policy@aniheal.co.ke',
      policy: {
        policyNumber: 'POL-2026-54321',
        coverageLimit: 250000,
        deductible: 1500,
        premium: 14000,
        billingPeriod: 'annual',
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      owner: { name: 'Peter Kiprono' },
      animal: { animalName: 'Fresian Queen', tagOrChipId: 'KE-NAK-9901' },
      plan: { name: 'Comprehensive Dairy Cover' },
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.deliveredVia);
  });
});
