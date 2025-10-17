const mongoose = require('mongoose');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');

// Custom GridFS storage engine
const createGridFSStorage = (bucketName) => {
  return {
    _handleFile: function (req, file, cb) {
      const db = mongoose.connection.db;
      const bucket = new GridFSBucket(db, { bucketName: bucketName });
      
      const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
      const uploadStream = bucket.openUploadStream(filename, {
        contentType: file.mimetype, // Set contentType at the root level
        metadata: {
          originalName: file.originalname,
          uploadDate: new Date(),
          contentType: file.mimetype
        }
      });
      
      file.stream.pipe(uploadStream);
      
      uploadStream.on('error', (error) => {
        cb(error);
      });
      
      uploadStream.on('finish', () => {
        cb(null, {
          filename: filename,
          id: uploadStream.id,
          bucketName: bucketName
        });
      });
    },
    _removeFile: function (req, file, cb) {
      // GridFS doesn't need explicit file removal
      cb(null);
    }
  };
};

// Create storage configurations for different upload types
const promoStorage = createGridFSStorage('promo_images');
const menuStorage = createGridFSStorage('menu_images');
const inventoryStorage = createGridFSStorage('inventory_images');
const profileStorage = createGridFSStorage('profile_images');
const galleryStorage = createGridFSStorage('gallery_media');

// Create multer configurations
const createMulterConfig = (storage) => {
  return multer({
    storage: storage,
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow both images and videos for gallery
      if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image and video files are allowed'), false);
      }
    }
  });
};

// Export multer configurations
const promoUpload = createMulterConfig(promoStorage);
const menuUpload = createMulterConfig(menuStorage);
const inventoryUpload = createMulterConfig(inventoryStorage);
const profileUpload = createMulterConfig(profileStorage);
const galleryUpload = createMulterConfig(galleryStorage);

module.exports = {
  promoUpload,
  menuUpload,
  inventoryUpload,
  profileUpload,
  galleryUpload
};
