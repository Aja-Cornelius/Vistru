// ═══════════════════════════════════════════════════════════
//  VISTRU — Auth Routes
//  src/routes/auth.routes.js
// ═══════════════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { clientUploadFields, engineerUploadFields, supplierUploadFields, attachUploadedUrls } = require('../middleware/upload.middleware');

// Registration
router.post('/register/client',   clientUploadFields,   attachUploadedUrls, ctrl.registerClient);
router.post('/register/engineer', engineerUploadFields, attachUploadedUrls, ctrl.registerEngineer);
router.post('/register/supplier', supplierUploadFields, attachUploadedUrls, ctrl.registerSupplier);

// Email verification
router.post('/verify-email', ctrl.verifyEmail);
router.post('/resend-otp',   ctrl.resendOTP);

// Login / session
router.post('/login',   ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout',  authenticate, ctrl.logout);

// Password reset
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password',  ctrl.resetPassword);

// Who am I
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;