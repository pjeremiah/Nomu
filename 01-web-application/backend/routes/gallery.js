const express = require('express');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const GalleryPost = require('../models/GalleryPost');
const authMiddleware = require('../middleware/authMiddleware');
const { galleryUpload } = require('../config/gridfs');
const router = express.Router();

// Get all gallery posts (admin) - Owner and Manager only; Staff has no access
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager'].includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Owner or Manager can access Gallery Management. Staff has no access.'
      });
    }
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    const posts = await GalleryPost.find(query)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email')
      .lean();

    const total = await GalleryPost.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalPosts: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching gallery posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gallery posts',
      error: error.message
    });
  }
});

// Get active gallery posts for client (limited to 10)
router.get('/client', async (req, res) => {
  try {
    const posts = await GalleryPost.getActivePosts(10);
    
    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Error fetching client gallery posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gallery posts',
      error: error.message
    });
  }
});

// Get single gallery post
router.get('/:id', async (req, res) => {
  try {
    const post = await GalleryPost.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Gallery post not found'
      });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error fetching gallery post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gallery post',
      error: error.message
    });
  }
});

// Create new gallery post
router.post('/', authMiddleware, (req, res, next) => {
  galleryUpload.array('media', 5)(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 100MB per file.'
        });
      }
      if (err.message && err.message.includes('Only image and video files are allowed')) {
        return res.status(400).json({
          success: false,
          message: 'Only image and video files are allowed'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }
    next();
  });
}, async (req, res) => {
  // Prevent double response
  let responseSent = false;
  const sendResponse = (status, data) => {
    if (!responseSent) {
      responseSent = true;
      return res.status(status).json(data);
    }
  };

  if (!['superadmin', 'manager'].includes(req.user?.role)) {
    return sendResponse(403, {
      success: false,
      message: 'Access denied. Only Owner or Manager can create gallery posts. Staff has no access.'
    });
  }

  try {
    // Check mongoose connection
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected. ReadyState:', mongoose.connection.readyState);
      return sendResponse(500, {
        success: false,
        message: 'Database connection error. Please try again.'
      });
    }
    
    // Get user ID from token (JWT uses userId, not id)
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      console.error('No user ID found in token:', req.user);
      return sendResponse(401, {
        success: false,
        message: 'Invalid user token. Please log in again.'
      });
    }
    
    const { title, description, tags, featured, order } = req.body;
    
    // Validate title
    if (!title || !title.trim()) {
      return sendResponse(400, {
        success: false,
        message: 'Title is required'
      });
    }

    if (title.trim().length > 100) {
      return sendResponse(400, {
        success: false,
        message: 'Title must be 100 characters or less'
      });
    }
    
    if (!req.files || req.files.length === 0) {
      return sendResponse(400, {
        success: false,
        message: 'At least one media file is required'
      });
    }

    if (req.files.length > 5) {
      return sendResponse(400, {
        success: false,
        message: 'Maximum 5 media files allowed per post'
      });
    }

    // Validate description length
    if (description && description.length > 500) {
      return sendResponse(400, {
        success: false,
        message: 'Description must be 500 characters or less'
      });
    }

    // Process uploaded files from GridFS
    const mediaItems = req.files.map((file, index) => {
      // Check if file has id property (from GridFS)
      const fileId = file.id;
      
      if (!fileId) {
        console.error(`File ${index} missing ID:`, file);
        throw new Error(`File upload failed: Missing file ID for file ${index + 1}`);
      }
      
      // Ensure fileId is a valid ObjectId
      let gridfsId;
      try {
        gridfsId = mongoose.Types.ObjectId.isValid(fileId) ? fileId : new mongoose.Types.ObjectId(fileId);
      } catch (idError) {
        console.error(`Invalid file ID for file ${index}:`, fileId, idError);
        throw new Error(`Invalid file ID format for file ${index + 1}`);
      }
      
      return {
        type: file.mimetype && file.mimetype.startsWith('video/') ? 'video' : 'image',
        url: `/api/gallery/media/${gridfsId}`,
        filename: file.filename || `file-${index}`,
        originalName: file.originalname || file.filename || `file-${index}`,
        size: file.size || 0,
        mimetype: file.mimetype || 'application/octet-stream',
        gridfsId: gridfsId
      };
    });

    // Parse tags if provided
    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' 
        ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0 && tag.length <= 20)
        : Array.isArray(tags) ? tags.filter(tag => tag.length > 0 && tag.length <= 20) : [];
    }

    // Ensure userId is a valid ObjectId
    let createdById;
    try {
      createdById = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
    } catch (idError) {
      console.error('Invalid user ID format:', userId, idError);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const postData = {
      title: title.trim(),
      description: (description || '').trim(),
      media: mediaItems,
      featured: featured === 'true' || featured === true,
      order: parseInt(order) || 0,
      createdBy: createdById,
      tags: parsedTags
    };

    const post = new GalleryPost(postData);
    
    // Validate before saving
    const validationError = post.validateSync();
    if (validationError) {
      console.error('Validation error:', validationError);
      const messages = Object.values(validationError.errors).map(err => err.message).join(', ');
      return sendResponse(400, {
        success: false,
        message: `Validation error: ${messages}`,
        error: validationError.message
      });
    }
    
    await post.save();

    // Populate the created post
    try {
      await post.populate('createdBy', 'name email');
    } catch (populateError) {
      console.error('Error populating post:', populateError);
      // Don't fail if populate fails, just log it
    }

    return sendResponse(201, {
      success: true,
      message: 'Gallery post created successfully',
      data: post
    });
  } catch (error) {
    console.error('Error creating gallery post:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message).join(', ');
      return sendResponse(400, {
        success: false,
        message: `Validation error: ${messages}`,
        error: error.message
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return sendResponse(400, {
        success: false,
        message: 'Duplicate entry detected',
        error: error.message
      });
    }

    // Handle CastError (invalid ObjectId)
    if (error.name === 'CastError') {
      return sendResponse(400, {
        success: false,
        message: `Invalid data format: ${error.message}`,
        error: error.message
      });
    }

    // Return detailed error message
    const errorMessage = error.message || 'Unknown error occurred';
    
    return sendResponse(500, {
      success: false,
      message: `Failed to create gallery post: ${errorMessage}`,
      error: errorMessage,
      errorType: error.name || 'UnknownError'
    });
  }
});

// Update gallery post
router.put('/:id', authMiddleware, (req, res, next) => {
  galleryUpload.array('media', 5)(req, res, (err) => {
    if (err) {
      console.error('Multer error in PUT:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 100MB per file.'
        });
      }
      if (err.message && err.message.includes('Only image and video files are allowed')) {
        return res.status(400).json({
          success: false,
          message: 'Only image and video files are allowed (PNG, JPEG, GIF, WebP, MP4, AVI, MOV, WebM, etc.)'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum 5 files allowed per post.'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }
    next();
  });
}, async (req, res) => {
  if (!['superadmin', 'manager'].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only Owner or Manager can update gallery posts. Staff has no access.'
    });
  }
  try {
    const { title, description, tags, featured, order, isActive } = req.body;
    
    const post = await GalleryPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Gallery post not found'
      });
    }
    
    // Convert post to plain object to avoid Mongoose document issues
    // We'll work with the document but convert media to plain objects
    console.log('Post found. Media count:', post.media ? post.media.length : 0);
    if (post.media && post.media.length > 0) {
      console.log('First media item structure:', {
        hasGridfsId: !!post.media[0].gridfsId,
        gridfsIdType: post.media[0].gridfsId ? typeof post.media[0].gridfsId : 'none',
        gridfsIdValue: post.media[0].gridfsId ? String(post.media[0].gridfsId) : 'none',
        keys: Object.keys(post.media[0].toObject ? post.media[0].toObject() : post.media[0])
      });
    }

    // Update basic fields
    if (title) post.title = title;
    if (description !== undefined) post.description = description;
    if (featured !== undefined) post.featured = featured === 'true' || featured === true;
    if (order !== undefined) post.order = parseInt(order);
    if (isActive !== undefined) post.isActive = isActive === 'true' || isActive === true;

    // Parse and update tags
    if (tags !== undefined) {
      post.tags = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
    }

    // Handle media updates (existing + new)
    let keepMediaIds = [];
    const hasKeepMediaIds = req.body.keepMediaIds !== undefined && req.body.keepMediaIds !== null && req.body.keepMediaIds !== '';
    
    if (hasKeepMediaIds) {
      try {
        keepMediaIds = typeof req.body.keepMediaIds === 'string' 
          ? JSON.parse(req.body.keepMediaIds) 
          : req.body.keepMediaIds;
        // Ensure it's an array
        if (!Array.isArray(keepMediaIds)) {
          keepMediaIds = [];
        }
      } catch (parseError) {
        console.error('Error parsing keepMediaIds:', parseError);
        keepMediaIds = [];
      }
    }
    
    // Debug log (can be removed in production)
    console.log('=== Gallery Update Debug ===');
    console.log('Existing media count:', post.media.length);
    console.log('Keep IDs:', keepMediaIds);
    console.log('New files count:', req.files ? req.files.length : 0);
    if (req.files && req.files.length > 0) {
      console.log('New files details:', req.files.map(f => ({
        name: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        id: f.id
      })));
    }
    console.log('Request body keys:', Object.keys(req.body));
    console.log('keepMediaIds from body:', req.body.keepMediaIds);

    // Process new uploaded files from GridFS
    const newMediaItems = [];
    if (req.files && req.files.length > 0) {
      console.log('Processing', req.files.length, 'new files');
      try {
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          console.log(`Processing file ${i + 1}:`, {
            originalname: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            hasId: !!file.id,
            id: file.id,
            idType: file.id ? typeof file.id : 'none',
            keys: Object.keys(file),
            fullFile: JSON.stringify(file, null, 2)
          });
          
          // GridFS returns file info in a specific structure
          // The file object should have: id, filename, originalname, mimetype, size
          if (!file.id) {
            console.error('CRITICAL: File object missing id property!');
            console.error('File object structure:', file);
            throw new Error(`File upload failed: GridFS did not return file ID for ${file.originalname || 'unknown file'}`);
          }
          
          // Ensure file.id is a valid ObjectId
          let gridfsId;
          try {
            if (!file.id) {
              console.error('File missing ID:', file);
              throw new Error(`File missing ID: ${file.originalname || 'unknown'}`);
            }
            
            // Convert to ObjectId if needed
            if (mongoose.Types.ObjectId.isValid(file.id)) {
              gridfsId = typeof file.id === 'string' 
                ? new mongoose.Types.ObjectId(file.id) 
                : file.id;
            } else {
              throw new Error(`Invalid ObjectId format: ${file.id}`);
            }
            
            console.log(`File ${i + 1} gridfsId:`, gridfsId.toString());
          } catch (idError) {
            console.error('Error processing file ID:', idError);
            console.error('File details:', file);
            return res.status(400).json({
              success: false,
              message: `Invalid file ID for file: ${file.originalname || 'unknown'}`,
              error: idError.message
            });
          }

          const mediaItem = {
            type: file.mimetype && file.mimetype.startsWith('video/') ? 'video' : 'image',
            url: `/api/gallery/media/${gridfsId}`,
            filename: file.filename || file.originalname || 'unknown',
            originalName: file.originalname || file.filename || 'unknown',
            size: file.size || 0,
            mimetype: file.mimetype || 'application/octet-stream',
            gridfsId: gridfsId
          };
          
          console.log(`Created media item ${i + 1}:`, mediaItem);
          newMediaItems.push(mediaItem);
        }
        console.log('Successfully processed', newMediaItems.length, 'new media items');
      } catch (fileError) {
        console.error('Error processing new files:', fileError);
        console.error('File error stack:', fileError.stack);
        return res.status(400).json({
          success: false,
          message: 'Error processing uploaded files',
          error: fileError.message,
          details: process.env.NODE_ENV === 'development' ? fileError.stack : undefined
        });
      }
    } else {
      console.log('No new files to process');
    }

    // Determine which existing media to keep
    let keptExistingMedia = [];
    try {
    if (hasKeepMediaIds) {
      // If keepMediaIds was provided, only keep media in that list
      // Normalize keepMediaIds to strings for comparison
      const keepMediaIdsStrings = keepMediaIds.map(id => String(id));
      
      console.log('Filtering existing media. Keep IDs:', keepMediaIdsStrings);
      console.log('Post media gridfsIds:', post.media.map(m => m.gridfsId ? String(m.gridfsId) : 'MISSING'));
      
      // Convert existing media to plain objects to avoid Mongoose document issues
      keptExistingMedia = post.media
        .map(media => {
          // Convert Mongoose subdocument to plain object if needed
          const mediaObj = media.toObject ? media.toObject() : media;
          return mediaObj;
        })
        .filter(media => {
          if (!media.gridfsId) {
            console.warn('Media item missing gridfsId:', media);
            return false;
          }
          // Convert gridfsId to string for comparison
          const mediaIdString = String(media.gridfsId);
          const shouldKeep = keepMediaIdsStrings.includes(mediaIdString);
          if (!shouldKeep) {
            console.log(`Excluding media with ID: ${mediaIdString}`);
          }
          return shouldKeep;
        })
        .map(media => {
          // Ensure gridfsId is a valid ObjectId
          let gridfsId = media.gridfsId;
          if (gridfsId) {
            // If it's already an ObjectId, keep it; otherwise convert
            if (mongoose.Types.ObjectId.isValid(gridfsId)) {
              // If it's a string, convert to ObjectId
              if (typeof gridfsId === 'string') {
                gridfsId = new mongoose.Types.ObjectId(gridfsId);
              }
              // If it's already an ObjectId, keep it as is
            } else {
              console.error('Invalid gridfsId format:', gridfsId);
              return null;
            }
          } else {
            console.error('Media item has no gridfsId:', media);
            return null;
          }
          
          return {
            type: media.type,
            url: media.url,
            filename: media.filename,
            originalName: media.originalName || media.originalname, // Handle both camelCase and lowercase
            size: media.size,
            mimetype: media.mimetype,
            gridfsId: gridfsId
          };
        })
        .filter(media => media !== null); // Remove any null entries
      
      console.log('Kept existing media count after filtering:', keptExistingMedia.length);
    } else {
      // If no keepMediaIds provided, keep ALL existing media (user didn't remove any)
      // Convert to plain objects to avoid Mongoose document issues
      keptExistingMedia = post.media
        .map(media => {
          // Convert Mongoose subdocument to plain object if needed
          return media.toObject ? media.toObject() : media;
        })
        .map(media => {
          // Ensure gridfsId is a valid ObjectId
          let gridfsId = media.gridfsId;
          if (gridfsId) {
            // If it's already an ObjectId, keep it; otherwise convert
            if (mongoose.Types.ObjectId.isValid(gridfsId)) {
              // If it's a string, convert to ObjectId
              if (typeof gridfsId === 'string') {
                gridfsId = new mongoose.Types.ObjectId(gridfsId);
              }
              // If it's already an ObjectId, keep it as is
            } else {
              console.error('Invalid gridfsId format:', gridfsId);
              return null;
            }
          } else {
            console.error('Media item has no gridfsId:', media);
            return null;
          }
          
          return {
            type: media.type,
            url: media.url,
            filename: media.filename,
            originalName: media.originalName || media.originalname, // Handle both camelCase and lowercase
            size: media.size,
            mimetype: media.mimetype,
            gridfsId: gridfsId
          };
        })
        .filter(media => media !== null); // Remove any null entries
    }
    } catch (mediaError) {
      console.error('Error processing existing media:', mediaError);
      console.error('Media error stack:', mediaError.stack);
      return res.status(400).json({
        success: false,
        message: 'Error processing existing media',
        error: mediaError.message,
        details: process.env.NODE_ENV === 'development' ? mediaError.stack : undefined
      });
    }

    // Combine kept existing media with new media
    const finalMedia = [...keptExistingMedia, ...newMediaItems];

    console.log('=== Final Media Array ===');
    console.log('Kept existing media count:', keptExistingMedia.length);
    console.log('New media items count:', newMediaItems.length);
    console.log('Total final media count:', finalMedia.length);
    console.log('Final media structure:', JSON.stringify(finalMedia.map(m => ({
      type: m.type,
      url: m.url,
      filename: m.filename,
      originalName: m.originalName,
      size: m.size,
      mimetype: m.mimetype,
      gridfsId: m.gridfsId ? m.gridfsId.toString() : 'MISSING'
    })), null, 2));

    // Validate total media count doesn't exceed 5
    if (finalMedia.length > 5) {
      return res.status(400).json({
        success: false,
        message: `Maximum 5 media files allowed per post. You have ${keptExistingMedia.length} existing and ${newMediaItems.length} new files (total: ${finalMedia.length}). Please remove some media first.`
      });
    }

    // Validate at least one media item
    if (finalMedia.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one media file is required'
      });
    }

    // Validate each media item has all required fields
    for (let i = 0; i < finalMedia.length; i++) {
      const media = finalMedia[i];
      const missingFields = [];
      if (!media.type) missingFields.push('type');
      if (!media.url) missingFields.push('url');
      if (!media.filename) missingFields.push('filename');
      if (!media.originalName) missingFields.push('originalName');
      if (media.size === undefined || media.size === null) missingFields.push('size');
      if (!media.mimetype) missingFields.push('mimetype');
      if (!media.gridfsId) missingFields.push('gridfsId');
      
      if (missingFields.length > 0) {
        console.error(`Media item ${i} missing fields:`, missingFields, media);
        return res.status(400).json({
          success: false,
          message: `Media item ${i + 1} is missing required fields: ${missingFields.join(', ')}`
        });
      }
    }

    // Update media array - use set() to ensure Mongoose recognizes the change
    post.set('media', finalMedia);
    // Mark media array as modified to ensure Mongoose saves it
    post.markModified('media');
    
    console.log('Post media after update:', post.media.length, 'items');
    console.log('Post media structure check:', post.media.map((m, i) => ({
      index: i,
      type: m.type,
      hasGridfsId: !!m.gridfsId,
      gridfsIdType: m.gridfsId ? typeof m.gridfsId : 'none'
    })));

    // Validate before saving
    try {
      const validationError = post.validateSync();
      if (validationError) {
        console.error('Validation error before save:', validationError);
        console.error('Validation error details:', JSON.stringify(validationError.errors, null, 2));
        const messages = Object.values(validationError.errors || {}).map(err => err.message).join(', ');
        return res.status(400).json({
          success: false,
          message: `Validation error: ${messages || validationError.message}`,
          error: validationError.message,
          details: process.env.NODE_ENV === 'development' ? validationError.errors : undefined
        });
      }
    } catch (validationErr) {
      console.error('Error during validation:', validationErr);
      // Continue if validation check fails, let save() handle it
    }

    try {
      console.log('Attempting to save post...');
      const savedPost = await post.save();
      console.log('Post saved successfully. Media count:', savedPost.media.length);
    } catch (saveError) {
      console.error('=== SAVE ERROR ===');
      console.error('Error name:', saveError.name);
      console.error('Error message:', saveError.message);
      console.error('Error stack:', saveError.stack);
      
      if (saveError.errors) {
        console.error('Validation errors:');
        Object.keys(saveError.errors).forEach(key => {
          console.error(`  ${key}:`, saveError.errors[key].message);
        });
      }
      
      // If it's a validation error, return 400 instead of 500
      if (saveError.name === 'ValidationError') {
        const messages = Object.values(saveError.errors || {}).map(err => err.message).join(', ');
        return res.status(400).json({
          success: false,
          message: `Validation error: ${messages || saveError.message}`,
          error: saveError.message,
          details: process.env.NODE_ENV === 'development' ? saveError.errors : undefined
        });
      }
      
      throw saveError; // Re-throw to be caught by outer catch
    }
    await post.populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Gallery post updated successfully',
      data: post
    });
  } catch (error) {
    console.error('Error updating gallery post:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more detailed error message
    let errorMessage = 'Failed to update gallery post';
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map(err => err.message).join(', ');
      errorMessage = `Validation error: ${messages || error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete gallery post (Owner and Manager only; Staff has no access)
router.delete('/:id', authMiddleware, async (req, res) => {
  if (!['superadmin', 'manager'].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only Owner or Manager can delete gallery posts. Staff has no access.'
    });
  }
  try {
    const post = await GalleryPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Gallery post not found'
      });
    }

    // Delete associated files from GridFS
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'gallery_media' });
    
    for (const mediaItem of post.media) {
      if (mediaItem.gridfsId) {
        try {
          await bucket.delete(mediaItem.gridfsId);
        } catch (deleteError) {
          console.error('Error deleting GridFS file:', deleteError);
          // Continue with post deletion even if file deletion fails
        }
      }
    }

    await GalleryPost.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Gallery post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting gallery post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete gallery post',
      error: error.message
    });
  }
});

// Update post order (Owner and Manager only; Staff has no access)
router.patch('/reorder', authMiddleware, async (req, res) => {
  if (!['superadmin', 'manager'].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only Owner or Manager can reorder gallery posts. Staff has no access.'
    });
  }
  try {
    const { posts } = req.body; // Array of { id, order }
    
    if (!Array.isArray(posts)) {
      return res.status(400).json({
        success: false,
        message: 'Posts array is required'
      });
    }

    const updatePromises = posts.map(({ id, order }) => 
      GalleryPost.findByIdAndUpdate(id, { order }, { new: true })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Gallery posts reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering gallery posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder gallery posts',
      error: error.message
    });
  }
});

// Serve gallery media files from GridFS
router.get('/media/:id', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'gallery_media' });
    
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const downloadStream = bucket.openDownloadStream(fileId);
    
    downloadStream.on('error', (error) => {
      console.error('Error serving gallery media:', error);
      res.status(404).json({
        success: false,
        message: 'Media file not found'
      });
    });
    
    downloadStream.on('data', (chunk) => {
      res.write(chunk);
    });
    
    downloadStream.on('end', () => {
      res.end();
    });
    
    // Set appropriate headers
    downloadStream.on('file', (file) => {
      res.set({
        'Content-Type': file.contentType || 'application/octet-stream',
        'Content-Length': file.length,
        'Cache-Control': 'public, max-age=31536000', // 1 year cache
        'Access-Control-Allow-Origin': '*'
      });
    });
    
  } catch (error) {
    console.error('Error serving gallery media:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve media file',
      error: error.message
    });
  }
});

module.exports = router;
