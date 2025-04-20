/**
 * Upload Middleware
 * Handles file uploads using multer
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('../utils');

// Ensure upload directories exist
const createUploadDirs = () => {
  const uploadDirs = [
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'uploads/payment-proofs'),
    path.join(process.cwd(), 'uploads/profile-pictures'),
    path.join(process.cwd(), 'uploads/shop-logos'),
    path.join(process.cwd(), 'uploads/receipts')
  ];
  
  uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Create directories on module load
createUploadDirs();

// Define storage settings
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Set destination based on file type
    let uploadPath = path.join(process.cwd(), 'uploads');
    
    if (file.fieldname === 'paymentProof') {
      uploadPath = path.join(uploadPath, 'payment-proofs');
    } else if (file.fieldname === 'profilePicture') {
      uploadPath = path.join(uploadPath, 'profile-pictures');
    } else if (file.fieldname === 'shopLogo') {
      uploadPath = path.join(uploadPath, 'shop-logos');
    } else if (file.fieldname === 'receipt') {
      uploadPath = path.join(uploadPath, 'receipts');
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create unique filename using timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Accept only specific file types
  const allowedFileTypes = {
    'image/jpeg': true,
    'image/png': true,
    'application/pdf': true
  };
  
  if (allowedFileTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only JPG, PNG, and PDF files are allowed.', 400, 'invalid_file_type'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Handle multer errors
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Maximum size is 5MB.', 400, 'file_too_large'));
    }
    return next(new AppError(`File upload error: ${err.message}`, 400, 'file_upload_error'));
  }
  next(err);
};

// Export configured multer instance
module.exports = upload;
