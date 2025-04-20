/**
 * File Upload Service
 * Handles file uploads for payment proofs and other documents
 */
const fs = require('fs');
const path = require('path');
const util = require('util');
const { AppError, logInfo, logError, logSuccess, idGenerator } = require('../utils');

// Promisify fs operations
const mkdirAsync = util.promisify(fs.mkdir);
const existsAsync = util.promisify(fs.exists);
const writeFileAsync = util.promisify(fs.writeFile);
const unlinkAsync = util.promisify(fs.unlink);

/**
 * FileUploadService provides methods for handling file uploads
 */
const FileUploadService = {
  /**
   * Base directory for uploads
   */
  baseUploadDir: path.join(process.cwd(), 'uploads'),
  
  /**
   * Initialize upload directories
   * @returns {Promise<boolean>} Success status
   */
  init: async () => {
    try {
      // Create base upload directory if it doesn't exist
      if (!await existsAsync(FileUploadService.baseUploadDir)) {
        await mkdirAsync(FileUploadService.baseUploadDir, { recursive: true });
      }
      
      // Create subdirectories for different upload types
      const uploadDirs = ['payment-proofs', 'profile-pictures', 'shop-logos', 'receipts'];
      
      for (const dir of uploadDirs) {
        const dirPath = path.join(FileUploadService.baseUploadDir, dir);
        if (!await existsAsync(dirPath)) {
          await mkdirAsync(dirPath, { recursive: true });
        }
      }
      
      logSuccess('File upload directories initialized', 'FileUploadService');
      return true;
    } catch (error) {
      logError(`Failed to initialize upload directories: ${error.message}`, 'FileUploadService', error);
      return false;
    }
  },
  
  /**
   * Save a payment proof file
   * @param {Object} fileData - File data object
   * @param {Buffer} fileData.buffer - File buffer
   * @param {string} fileData.originalname - Original file name
   * @param {string} fileData.mimetype - File MIME type
   * @param {string} shopId - Shop ID
   * @param {string} paymentContext - Payment context (subscription, debt, pos)
   * @returns {Promise<Object>} File metadata
   */
  savePaymentProof: async (fileData, shopId, paymentContext) => {
    try {
      const { buffer, originalname, mimetype } = fileData;
      
      // Generate unique file ID
      const fileId = await idGenerator.generateFileId();
      
      // Get file extension
      const fileExt = path.extname(originalname).toLowerCase();
      
      // Validate file type
      const allowedTypes = ['.jpg', '.jpeg', '.png', '.pdf'];
      if (!allowedTypes.includes(fileExt)) {
        throw new AppError(
          'Invalid file type. Only JPG, PNG, and PDF files are allowed.', 
          400, 
          'invalid_file_type'
        );
      }
      
      // Create filename with shopId and timestamp
      const timestamp = Date.now();
      const filename = `${shopId}_${paymentContext}_${timestamp}${fileExt}`;
      
      // Get upload directory
      const uploadDir = path.join(FileUploadService.baseUploadDir, 'payment-proofs');
      const filePath = path.join(uploadDir, filename);
      
      // Save file
      await writeFileAsync(filePath, buffer);
      
      logSuccess(`Payment proof saved: ${filename}`, 'FileUploadService');
      
      // Return file metadata
      return {
        fileId,
        originalName: originalname,
        fileName: filename,
        filePath,
        mimeType: mimetype,
        size: buffer.length,
        uploadedAt: new Date(),
        context: paymentContext
      };
    } catch (error) {
      logError(`Failed to save payment proof: ${error.message}`, 'FileUploadService', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to save payment proof file', 500, 'file_upload_error');
    }
  },
  
  /**
   * Save a shop logo file during registration or update
   * @param {Object} file - File object from multer
   * @param {string} shopId - Shop ID (optional during registration)
   * @returns {Promise<Object>} File metadata with URL and fileId
   */
  saveShopLogo: async (file, shopId = null) => {
    try {
      if (!file) {
        throw new AppError('No file provided', 400, 'file_required');
      }
      
      // Validate file
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new AppError(
          'Invalid file type. Allowed types: JPG, PNG, WebP',
          400,
          'invalid_file_type'
        );
      }
      
      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new AppError(
          'File size exceeds the 5MB limit',
          400,
          'file_too_large'
        );
      }
      
      // Generate file ID
      const { File } = require('../models');
      let fileId;
      try {
        fileId = await idGenerator.generateFileId(File);
      } catch (error) {
        // If there's an error generating the ID, create a timestamp-based fallback
        const timestamp = Date.now();
        fileId = `FILE${timestamp}`;
        logWarning(`Using fallback file ID generation: ${fileId}`, 'FileUploadService');
      }
      
      // Generate a unique filename
      const ext = path.extname(file.originalname);
      const filename = `${fileId}${ext}`;
      
      // Ensure shop-logos directory exists
      const uploadDir = path.join(FileUploadService.baseUploadDir, 'shop-logos');
      if (!await existsAsync(uploadDir)) {
        await mkdirAsync(uploadDir, { recursive: true });
      }
      
      // Set file path
      const filePath = path.join(uploadDir, filename);
      
      // Generate URL for file
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const fileUrl = `${baseUrl}/api/files/${fileId}`;
      
      // File is already saved by multer, just create record in database
      // Create file record in database
      try {
        const fileRecord = new File({
          fileId,
          fileName: filename,
          originalName: file.originalname,
          size: file.size,
          path: filePath,
          shopId: shopId || 'pending', // Mark as pending if shopId not provided yet
          uploadedBy: 'system',
          status: 'active',
          // Add required fields to match model schema
          extension: ext.replace('.', ''),
          url: fileUrl,
          fileType: 'logo',
          linkedEntityType: 'shop',
          linkedEntityId: shopId || 'pending'
        });
        
        await fileRecord.save();
        
        logSuccess(`Shop logo saved: ${fileId}`, 'FileUploadService');
      } catch (error) {
        // If this is a duplicate key error, try one more time with a timestamp-based ID
        if (error.code === 11000 && error.keyPattern && error.keyPattern.fileId) {
          const timestamp = Date.now();
          const newFileId = `FILE${timestamp}`;
          logWarning(`Duplicate fileId detected. Retrying with: ${newFileId}`, 'FileUploadService');
          
          // Create a new record with the timestamp-based ID
          const retryFileRecord = new File({
            fileId: newFileId,
            fileName: `${newFileId}${ext}`,
            originalName: file.originalname,
            size: file.size,
            path: filePath,
            shopId: shopId || 'pending',
            uploadedBy: 'system',
            status: 'active',
            extension: ext.replace('.', ''),
            url: `${baseUrl}/api/files/${newFileId}`,
            fileType: 'logo',
            linkedEntityType: 'shop',
            linkedEntityId: shopId || 'pending'
          });
          
          await retryFileRecord.save();
          logSuccess(`Shop logo saved on retry: ${newFileId}`, 'FileUploadService');
          
          // Update the fileId and fileUrl for the return value
          fileId = newFileId;
          fileUrl = `${baseUrl}/api/files/${newFileId}`;
        } else {
          // If it's not a duplicate key error or retry failed, rethrow
          throw error;
        }
      }
      
      // Return file metadata
      return {
        fileId,
        fileName: filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: fileUrl
      };
    } catch (error) {
      logError(`Failed to save shop logo: ${error.message}`, 'FileUploadService', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to save shop logo', 500, 'file_upload_error');
    }
  },
  
  /**
   * Get file path for a file ID
   * @param {string} fileId - File ID
   * @returns {Promise<string>} File path
   */
  getFilePath: async (fileId) => {
    try {
      // In a production system, you would look up the file path from a database
      // For this implementation, we'll assume a simple approach
      
      // Lookup file details from database
      const file = await File.findOne({ fileId });
      
      if (!file) {
        throw new AppError('File not found', 404, 'file_not_found');
      }
      
      // Check if file exists
      const filePath = path.join(FileUploadService.baseUploadDir, file.category, file.fileName);
      if (!await existsAsync(filePath)) {
        throw new AppError('File not found on disk', 404, 'file_not_found');
      }
      
      return filePath;
    } catch (error) {
      logError(`Failed to get file path: ${error.message}`, 'FileUploadService', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to retrieve file', 500, 'file_retrieval_error');
    }
  },
  
  /**
   * Delete a file
   * @param {string} fileId - File ID
   * @returns {Promise<boolean>} Success status
   */
  deleteFile: async (fileId) => {
    try {
      // Get file path
      const filePath = await FileUploadService.getFilePath(fileId);
      
      // Delete file
      await unlinkAsync(filePath);
      
      // Delete file record from database
      await File.findOneAndUpdate(
        { fileId },
        { isDeleted: true, deletedAt: new Date() }
      );
      
      logSuccess(`File deleted: ${fileId}`, 'FileUploadService');
      return true;
    } catch (error) {
      logError(`Failed to delete file: ${error.message}`, 'FileUploadService', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to delete file', 500, 'file_deletion_error');
    }
  }
};

module.exports = FileUploadService;
