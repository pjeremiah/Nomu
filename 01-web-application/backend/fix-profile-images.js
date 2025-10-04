#!/usr/bin/env node

/**
 * Fix Profile Images ContentType Script
 * 
 * This script fixes existing profile images in the database that have
 * incorrect contentType (application/octet-stream) by updating them
 * to the correct image content type based on file extension.
 */

const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    fixProfileImages();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

async function fixProfileImages() {
  try {
    const db = mongoose.connection.db;
    const gfs = new GridFSBucket(db, { bucketName: 'profile_images' });
    
    console.log('🔍 Searching for profile images with incorrect contentType...');
    
    // Find all files with application/octet-stream contentType or undefined contentType
    const files = await gfs.find({ 
      $or: [
        { contentType: 'application/octet-stream' },
        { contentType: { $exists: false } },
        { contentType: null },
        { contentType: undefined }
      ]
    }).toArray();
    
    console.log(`📊 Found ${files.length} files with incorrect contentType`);
    
    if (files.length === 0) {
      console.log('✅ No files need fixing!');
      process.exit(0);
    }
    
    let fixedCount = 0;
    
    for (const file of files) {
      try {
        // Determine correct content type based on filename
        const filename = file.filename || '';
        let correctContentType = 'image/jpeg'; // default
        
        if (filename.toLowerCase().includes('.png')) {
          correctContentType = 'image/png';
        } else if (filename.toLowerCase().includes('.gif')) {
          correctContentType = 'image/gif';
        } else if (filename.toLowerCase().includes('.webp')) {
          correctContentType = 'image/webp';
        } else if (filename.toLowerCase().includes('.jpg') || filename.toLowerCase().includes('.jpeg')) {
          correctContentType = 'image/jpeg';
        }
        
        // Update the file's contentType
        await gfs.rename(file._id, file.filename, {
          contentType: correctContentType,
          metadata: {
            ...file.metadata,
            contentType: correctContentType,
            fixedAt: new Date()
          }
        });
        
        console.log(`✅ Fixed: ${file.filename} -> ${correctContentType}`);
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ Error fixing file ${file.filename}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully fixed ${fixedCount} out of ${files.length} files`);
    console.log('🔄 Profile images should now display correctly on web!');
    
  } catch (error) {
    console.error('❌ Error fixing profile images:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}
