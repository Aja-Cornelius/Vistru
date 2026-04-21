// ═══════════════════════════════════════════════════════════
//  VISTRU — File Upload Middleware (Multer)
//  src/middleware/upload.middleware.js
//
//  In production, replace diskStorage with Cloudinary/S3 storage.
//  Uploaded file URLs are attached to req.uploadedFiles
// ═══════════════════════════════════════════════════════════
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── File type whitelist ──
const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf'
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

// ── Storage Configuration ──
let storage;

if (process.env.CLOUDINARY_CLOUD_NAME) {
  // Production: Cloudinary
  const cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      const folder = `vistru/${req.user?.id || 'anonymous'}`;
      const ext    = path.extname(file.originalname).substring(1).toLowerCase();
      return {
        folder: folder,
        format: ext === 'pdf' ? 'pdf' : 'webp', // auto-convert images to webp for optimization
        public_id: `${file.fieldname}_${Date.now()}`,
        resource_type: ext === 'pdf' ? 'raw' : 'image'
      };
    }
  });
} else {
  // Development: Local Disk
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const folder = path.join(UPLOAD_DIR, req.user?.id || 'anonymous');
      if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
      cb(null, folder);
    },
    filename: (req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      const name = `${file.fieldname}_${Date.now()}${ext}`;
      cb(null, name);
    }
  });
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ── Attach uploaded file URLs to req.uploadedFiles ──
// Call after multer — maps fieldname → relative/cloud URL
const attachUploadedUrls = (req, res, next) => {
  req.uploadedFiles = {};
  
  const processFile = (file) => {
    // If Cloudinary handled the upload, it puts the URL in file.path or file.secure_url
    // For diskStorage, it's just filename which we map to a local route
    if (file.path && file.path.startsWith('http')) {
      return file.path;
    }
    return `/uploads/${req.user?.id || 'anonymous'}/${file.filename}`;
  };

  if (req.files) {
    Object.entries(req.files).forEach(([field, fileArr]) => {
      if (fileArr && fileArr[0]) {
        req.uploadedFiles[field] = processFile(fileArr[0]);
      }
    });
  }
  if (req.file) {
    req.uploadedFiles[req.file.fieldname] = processFile(req.file);
  }
  next();
};

// ── Field configs per registration type ──
const clientUploadFields = upload.fields([
  { name: 'id_document', maxCount: 1 },
  { name: 'selfie',      maxCount: 1 }
]);

const engineerUploadFields = upload.fields([
  { name: 'id_document',    maxCount: 1 },
  { name: 'licence_doc',    maxCount: 1 },
  { name: 'academic_cert',  maxCount: 1 }
]);

const supplierUploadFields = upload.fields([
  { name: 'id_document', maxCount: 1 },
  { name: 'cac_doc',     maxCount: 1 }
]);

const landDocUpload = upload.fields([
  { name: 'land_docs', maxCount: 5 }
]);

const drawingsUpload = upload.fields([
  { name: 'architectural', maxCount: 3 },
  { name: 'structural',    maxCount: 3 }
]);

const boqUpload = upload.single('boq_pdf');

module.exports = {
  clientUploadFields,
  engineerUploadFields,
  supplierUploadFields,
  landDocUpload,
  drawingsUpload,
  boqUpload,
  attachUploadedUrls,
  upload
};
