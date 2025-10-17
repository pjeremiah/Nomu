const express = require('express');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const GalleryPost = require('../models/GalleryPost');
const authMiddleware = require('../middleware/authMiddleware');
const { galleryUpload } = require('../config/gridfs');
const router = express.Router();

// Get all gallery posts (admin)
router.get('/admin', authMiddleware, async (req, res) => {
  try {
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
router.post('/', authMiddleware, galleryUpload.array('media', 5), async (req, res) => {
  try {
    const { title, description, tags, featured, order } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one media file is required'
      });
    }

    if (req.files.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 media files allowed per post'
      });
    }

    // Process uploaded files from GridFS
    const mediaItems = req.files.map(file => ({
      type: file.mimetype.startsWith('video/') ? 'video' : 'image',
      url: `/api/gallery/media/${file.id}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      gridfsId: file.id
    }));

    // Parse tags if provided
    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
    }

    const postData = {
      title,
      description: description || '',
      media: mediaItems,
      featured: featured === 'true' || featured === true,
      order: parseInt(order) || 0,
      createdBy: req.user.id,
      tags: parsedTags
    };

    const post = new GalleryPost(postData);
    await post.save();

    // Populate the created post
    await post.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Gallery post created successfully',
      data: post
    });
  } catch (error) {
    console.error('Error creating gallery post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create gallery post',
      error: error.message
    });
  }
});

// Update gallery post
router.put('/:id', authMiddleware, galleryUpload.array('media', 5), async (req, res) => {
  try {
    const { title, description, tags, featured, order, isActive } = req.body;
    
    const post = await GalleryPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Gallery post not found'
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

    // Handle new media uploads
    if (req.files && req.files.length > 0) {
      if (req.files.length > 5) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 5 media files allowed per post'
        });
      }

      // Process new uploaded files from GridFS
      const newMediaItems = req.files.map(file => ({
        type: file.mimetype.startsWith('video/') ? 'video' : 'image',
        url: `/api/gallery/media/${file.id}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        gridfsId: file.id
      }));

      // Replace existing media with new media
      post.media = newMediaItems;
    }

    await post.save();
    await post.populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Gallery post updated successfully',
      data: post
    });
  } catch (error) {
    console.error('Error updating gallery post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update gallery post',
      error: error.message
    });
  }
});

// Delete gallery post
router.delete('/:id', authMiddleware, async (req, res) => {
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

// Update post order (for reordering)
router.patch('/reorder', authMiddleware, async (req, res) => {
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
