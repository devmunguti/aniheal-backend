const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');
const { corsOrigin, isProduction, nodeEnv } = require('./config/environment');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const insuranceRoutes = require('./routes/insuranceRoutes');
const vetRoutes = require('./routes/vetRoutes');
const animalRoutes = require('./routes/animalRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const collaborationRoutes = require('./routes/collaborationRoutes');

const app = express();

// 1. Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Managed via frontend Vite headers or proxy
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows /uploads images to be served across origins
  })
);

// 2. Comprehensive CORS Configuration
const envOrigins = (corsOrigin || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const defaultAllowedOrigins = [
  ...envOrigins,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, health checks)
      if (!origin) return callback(null, true);

      // In development or test, allow all localhost and matching origins
      if (!isProduction) {
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || defaultAllowedOrigins.includes(origin)) {
          return callback(null, true);
        }
      }

      // Check configured origins or any Vercel deployment preview / production domain
      if (
        defaultAllowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com')
      ) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy rejection: Origin ${origin} is not authorized`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 3. Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: nodeEnv === 'test' ? 500 : 30, // Relaxed for automated test runs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts from this IP. Please try again in 15 minutes.' },
});

const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: nodeEnv === 'test' ? 500 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests submitted from this IP. Please try again later.' },
});

// 4. Safe Payload Limits (1MB standard; file uploads use multer)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5. Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 6. Comprehensive Health Check
const healthHandler = (req, res) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const dbState = dbStateMap[mongoose.connection.readyState] || 'unknown';
  const isHealthy = mongoose.connection.readyState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    service: 'AniHeal Backend CMS API',
    environment: nodeEnv,
    database: dbState,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// 7. API Routes with Targeted Rate Limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/vet', vetRoutes);
app.use('/api/animals', animalRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/collaborations', collaborationRoutes);

// Also mount public routes directly at /api for clean developer access (e.g., /api/services, /api/settings)
app.use('/api', publicRoutes);

// 8. Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
