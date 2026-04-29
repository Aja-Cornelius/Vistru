// ═══════════════════════════════════════════════════════════
//  VISTRU — Auth Controller
//  src/controllers/auth.controller.js
// ═══════════════════════════════════════════════════════════
const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const { v4: uuid} = require('uuid');
const db          = require('../config/db');
const emailSvc    = require('../services/email.service');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
const OTP_MINS    = parseInt(process.env.OTP_EXPIRES_MINUTES) || 10;

// ── Generate 6-digit OTP ──
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── Issue JWT pair ──
const issueTokens = (userId, role) => {
  const access = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  const refresh = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  return { access, refresh };
};

// ════════════════════════════════════════════
//  POST /api/auth/register/client
// ════════════════════════════════════════════
const registerClient = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const {
      firstName, lastName, email, phone, password,
      nationality, dateOfBirth, residentialAddress,
      idType, idNumber, securityQuestion, securityAnswer
    } = req.body;

    // Check duplicate email
    const dup = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (dup.rows.length) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash  = await bcrypt.hash(password, SALT_ROUNDS);
    const answerHash    = await bcrypt.hash(securityAnswer.toLowerCase(), SALT_ROUNDS);
    const otp           = generateOTP();
    const otpHash       = await bcrypt.hash(otp, 8);
    const otpExpires    = new Date(Date.now() + OTP_MINS * 60 * 1000);

    // Uploaded file URLs (from Cloudinary middleware — req.uploadedFiles)
    const idDocUrl  = req.uploadedFiles?.id_document || null;
    const selfieUrl = req.uploadedFiles?.selfie || null;

    const { rows } = await client.query(`
      INSERT INTO users
        (role, status, first_name, last_name, email, phone, password_hash,
         nationality, date_of_birth, residential_address, id_type, id_number,
         id_document_url, selfie_url, security_question, security_answer,
         email_otp, email_otp_expires)
      VALUES
        ('client','pending_email',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING id, email, first_name, last_name, role, status
    `, [
      firstName, lastName, email.toLowerCase(), phone, passwordHash,
      nationality, dateOfBirth, residentialAddress, idType, idNumber,
      idDocUrl, selfieUrl, securityQuestion, answerHash, otpHash, otpExpires
    ]);

    await client.query('COMMIT');

    // Send OTP email (non-blocking)
    emailSvc.sendOTP({
      to      : email,
      name    : firstName,
      otp,
      purpose : 'verification'
    }).catch(console.error);

    res.status(201).json({
      message : 'Registration successful. Please check your email for the verification code.',
      userId  : rows[0].id,
      email   : rows[0].email
    });
 } catch (err) {
    await client.query('ROLLBACK');
    console.error('registerClient error:', err.message);
    console.error('Detail:', err.detail);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      error: 'Registration failed. Please try again.',
      detail: err.message  // remove this line in production
    });
  }
};

// ════════════════════════════════════════════
//  POST /api/auth/register/engineer
// ════════════════════════════════════════════
const registerEngineer = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const {
      firstName, lastName, email, phone, password,
      nationality, dateOfBirth, residentialAddress,
      idType, idNumber,
      licenceBody, licenceNumber, licenceExpiry,
      discipline, specialisations, yearsExperience,
      highestQualification, primaryState, bio,
      securityQuestion, securityAnswer
    } = req.body;

    const dup = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (dup.rows.length) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Check licence not expired
    if (new Date(licenceExpiry) < new Date()) {
      return res.status(400).json({ error: 'Your engineering licence is expired. Please renew before registering.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const answerHash   = await bcrypt.hash(securityAnswer.toLowerCase(), SALT_ROUNDS);
    const otp          = generateOTP();
    const otpHash      = await bcrypt.hash(otp, 8);
    const otpExpires   = new Date(Date.now() + OTP_MINS * 60 * 1000);

    const idDocUrl      = req.uploadedFiles?.id_document || null;
    const licenceDocUrl = req.uploadedFiles?.licence_doc || null;
    const certUrl       = req.uploadedFiles?.academic_cert || null;

    // Create user
    const { rows: userRows } = await client.query(`
      INSERT INTO users
        (role, status, first_name, last_name, email, phone, password_hash,
         nationality, date_of_birth, residential_address, id_type, id_number,
         id_document_url, security_question, security_answer,
         email_otp, email_otp_expires)
      VALUES ('engineer','pending_email',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id
    `, [
      firstName, lastName, email.toLowerCase(), phone, passwordHash,
      nationality, dateOfBirth, residentialAddress, idType, idNumber,
      idDocUrl, securityQuestion, answerHash, otpHash, otpExpires
    ]);

    const userId = userRows[0].id;

    // Create engineer profile
    await client.query(`
      INSERT INTO engineer_profiles
        (user_id, licence_body, licence_number, licence_expiry, licence_doc_url,
         discipline, specialisations, years_experience, highest_qualification,
         primary_state, bio, academic_cert_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `, [
      userId, licenceBody, licenceNumber, licenceExpiry, licenceDocUrl,
      discipline,
      Array.isArray(specialisations) ? specialisations : JSON.parse(specialisations || '[]'),
      yearsExperience, highestQualification, primaryState, bio, certUrl
    ]);

    await client.query('COMMIT');

    emailSvc.sendOTP({ to: email, name: firstName, otp, purpose: 'verification' }).catch(console.error);

    res.status(201).json({
      message : 'Registration submitted. Verify your email, then our team will review your licence (24–48hrs).',
      userId,
      email   : email.toLowerCase()
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('registerEngineer error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════
//  POST /api/auth/register/supplier
// ════════════════════════════════════════════
const registerSupplier = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const {
      firstName, lastName, email, phone, password,
      nationality, dateOfBirth, idType, idNumber,
      businessName, businessType, cacNumber,
      storeAddress, state, lga, coverageArea,
      materialCategories, deliveryTurnaround, hasOwnVehicles,
      vehicleCount, minimumOrder,
      bankName, accountNumber, accountName, accountType,
      securityQuestion, securityAnswer
    } = req.body;

    const dup = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (dup.rows.length) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const answerHash   = await bcrypt.hash(securityAnswer.toLowerCase(), SALT_ROUNDS);
    const otp          = generateOTP();
    const otpHash      = await bcrypt.hash(otp, 8);
    const otpExpires   = new Date(Date.now() + OTP_MINS * 60 * 1000);

    const idDocUrl  = req.uploadedFiles?.id_document || null;
    const cacDocUrl = req.uploadedFiles?.cac_doc || null;

    const { rows: userRows } = await client.query(`
      INSERT INTO users
        (role, status, first_name, last_name, email, phone, password_hash,
         nationality, date_of_birth, id_type, id_number, id_document_url,
         security_question, security_answer, email_otp, email_otp_expires)
      VALUES ('supplier','pending_email',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING id
    `, [
      firstName, lastName, email.toLowerCase(), phone, passwordHash,
      nationality, dateOfBirth, idType, idNumber, idDocUrl,
      securityQuestion, answerHash, otpHash, otpExpires
    ]);

    const userId = userRows[0].id;

    await client.query(`
      INSERT INTO supplier_profiles
        (user_id, business_name, business_type, cac_number, cac_doc_url,
         store_address, state, lga, coverage_area, material_categories,
         delivery_turnaround, has_own_vehicles, vehicle_count, minimum_order,
         bank_name, account_number, account_name, account_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    `, [
      userId, businessName, businessType, cacNumber, cacDocUrl,
      storeAddress, state, lga, coverageArea,
      Array.isArray(materialCategories) ? materialCategories : JSON.parse(materialCategories || '[]'),
      deliveryTurnaround, hasOwnVehicles === 'true' || hasOwnVehicles === true,
      parseInt(vehicleCount) || 0,
      parseInt(minimumOrder) * 100 || 0,  // convert to kobo
      bankName, accountNumber, accountName, accountType
    ]);

    await client.query('COMMIT');

    emailSvc.sendOTP({ to: email, name: firstName, otp, purpose: 'verification' }).catch(console.error);

    res.status(201).json({
      message : 'Store registered. Verify your email — you can list inventory immediately. CAC verification takes 24–48hrs.',
      userId,
      email   : email.toLowerCase()
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('registerSupplier error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  } finally {
    client.release();
  }
};

// ════════════════════════════════════════════
//  POST /api/auth/verify-email
// ════════════════════════════════════════════
const verifyEmail = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const { rows } = await db.query(
      'SELECT id, email_otp, email_otp_expires, role, first_name FROM users WHERE id = $1',
      [userId]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found.' });

    const user = rows[0];
    if (new Date() > new Date(user.email_otp_expires)) {
      return res.status(400).json({ error: 'Verification code has expired. Request a new one.' });
    }

    const valid = await bcrypt.compare(otp, user.email_otp);
    if (!valid) return res.status(400).json({ error: 'Incorrect verification code.' });

    // Mark email verified; clients go straight to active, others go to pending_review
    const newStatus = user.role === 'client' ? 'active' : 'pending_review';

    await db.query(`
      UPDATE users SET email_verified=TRUE, status=$1, email_otp=NULL, email_otp_expires=NULL
      WHERE id=$2
    `, [newStatus, userId]);

    const { access, refresh } = issueTokens(userId, user.role);
    await db.query('UPDATE users SET refresh_token=$1 WHERE id=$2', [refresh, userId]);

    res.json({
      message      : newStatus === 'active'
                     ? 'Email verified! Your account is now active.'
                     : 'Email verified! Your credentials are under review (24–48hrs).',
      status       : newStatus,
      accessToken  : access,
      refreshToken : refresh,
      user         : { id: userId, role: user.role, firstName: user.first_name }
    });
  } catch (err) {
    console.error('verifyEmail error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
};

// ════════════════════════════════════════════
//  POST /api/auth/resend-otp
// ════════════════════════════════════════════
const resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;
    const { rows } = await db.query('SELECT id, email, first_name FROM users WHERE id=$1', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });

    const user    = rows[0];
    const otp     = generateOTP();
    const otpHash = await bcrypt.hash(otp, 8);
    const expires = new Date(Date.now() + OTP_MINS * 60 * 1000);

    await db.query(
      'UPDATE users SET email_otp=$1, email_otp_expires=$2 WHERE id=$3',
      [otpHash, expires, userId]
    );

    // Send OTP email (non-blocking)
    emailSvc.sendOTP({ 
      to: user.email, 
      name: user.first_name, 
      otp, 
      purpose: 'verification' 
    }).catch(err => {
      console.error('Email delivery failed in resendOTP:', err.message);
    });

    res.json({ message: 'A new verification code has been sent to your email.' });
  } catch (err) {
    console.error('resendOTP main error:', err);
    res.status(500).json({ error: 'Could not resend code. Please try again.' });
  }
};

// ════════════════════════════════════════════
//  POST /api/auth/login
// ════════════════════════════════════════════
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows } = await db.query(
      `SELECT u.*, ep.licence_expiry, ep.is_available
       FROM users u
       LEFT JOIN engineer_profiles ep ON ep.user_id = u.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect email or password.' });

    if (!user.email_verified) {
      return res.status(403).json({
        error  : 'Email not verified. Please check your inbox.',
        userId : user.id,
        needsVerification: true
      });
    }

    if (user.status === 'pending_review') {
      return res.status(403).json({
        error  : 'Your account is under review. We will email you within 24–48 hours.',
        status : 'pending_review'
      });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended. Contact support@vistru.ng' });
    }

    // Check engineer licence expiry
    if (user.role === 'engineer' && user.licence_expiry && new Date(user.licence_expiry) < new Date()) {
      // Don't block login, but flag it
    }

    const { access, refresh } = issueTokens(user.id, user.role);
    await db.query(
      'UPDATE users SET refresh_token=$1, last_login=NOW() WHERE id=$2',
      [refresh, user.id]
    );

    res.json({
      message      : `Welcome back, ${user.first_name}.`,
      accessToken  : access,
      refreshToken : refresh,
      user: {
        id        : user.id,
        role      : user.role,
        status    : user.status,
        firstName : user.first_name,
        lastName  : user.last_name,
        email     : user.email
      }
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

// ════════════════════════════════════════════
//  POST /api/auth/forgot-password
// ════════════════════════════════════════════
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await db.query('SELECT id, first_name FROM users WHERE email=$1', [email.toLowerCase()]);

    // Always return 200 to prevent email enumeration
    if (!rows.length) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const user  = rows[0];
    const token = uuid();
    const exp   = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      'UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3',
      [token, exp, user.id]
    );

    await emailSvc.sendOTP({
      to      : email,
      name    : user.first_name,
      otp     : token.slice(0, 6).toUpperCase(),
      purpose : 'password_reset'
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not process request.' });
  }
};

// ════════════════════════════════════════════
//  POST /api/auth/reset-password
// ════════════════════════════════════════════
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const { rows } = await db.query(
      'SELECT id, reset_token_expires FROM users WHERE reset_token=$1',
      [token]
    );

    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired reset token.' });
    if (new Date() > new Date(rows[0].reset_token_expires)) {
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.query(
      'UPDATE users SET password_hash=$1, reset_token=NULL, reset_token_expires=NULL WHERE id=$2',
      [hash, rows[0].id]
    );

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Password reset failed.' });
  }
};

// ════════════════════════════════════════════
//  POST /api/auth/refresh
// ════════════════════════════════════════════
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token.' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id, role, status, refresh_token FROM users WHERE id=$1',
      [decoded.userId]
    );

    if (!rows.length || rows[0].refresh_token !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }

    const { access, refresh: newRefresh } = issueTokens(rows[0].id, rows[0].role);
    await db.query('UPDATE users SET refresh_token=$1 WHERE id=$2', [newRefresh, rows[0].id]);

    res.json({ accessToken: access, refreshToken: newRefresh });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
};

// ════════════════════════════════════════════
//  POST /api/auth/logout
// ════════════════════════════════════════════
const logout = async (req, res) => {
  try {
    await db.query('UPDATE users SET refresh_token=NULL WHERE id=$1', [req.user.id]);
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed.' });
  }
};

module.exports = {
  registerClient,
  registerEngineer,
  registerSupplier,
  verifyEmail,
  resendOTP,
  login,
  forgotPassword,
  resetPassword,
  refresh,
  logout
};
