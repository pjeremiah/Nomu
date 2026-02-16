const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const GalleryPost = require('../models/GalleryPost');
const User = require('../models/User');


// Test route to check JWT token
router.get('/test-auth', authMiddleware, (req, res) => {
  res.json({ 
    message: 'Auth test successful',
    user: req.user,
    userId: req.user?.userId,
    id: req.user?.id,
    allFields: req.user
  });
});

// Test route without authentication
router.get('/test-no-auth', (req, res) => {
  res.json({ 
    message: 'No auth test successful',
    timestamp: new Date().toISOString()
  });
});

// Like/Unlike a post
router.post('/like/:postId', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.userId || req.user?.id;


    // Basic validation
    if (!postId || !userId) {
      return res.status(400).json({ message: 'Missing post ID or user ID' });
    }


    // Check if post exists
    const post = await GalleryPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user already liked this post
    const existingLike = await Like.findOne({ user: userId, post: postId });
    
    if (existingLike) {
      // Unlike the post
      await Like.findByIdAndDelete(existingLike._id);
      const likeCount = await Like.countDocuments({ post: postId });
      return res.json({ 
        message: 'Post unliked successfully',
        liked: false,
        likeCount: likeCount
      });
    } else {
      // Like the post
      const newLike = await Like.create({ user: userId, post: postId });
      const likeCount = await Like.countDocuments({ post: postId });
      return res.json({ 
        message: 'Post liked successfully',
        liked: true,
        likeCount: likeCount
      });
    }
  } catch (error) {
    console.error('❌ Error toggling like:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Get likes for a post with user details
router.get('/likes/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // Optionally decode token to get user ID if authenticated
    let userId = null;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded?.userId || decoded?.id;
      } catch (err) {
        // Token invalid or expired, continue without user ID
      }
    }

    const likes = await Like.find({ post: postId })
      .populate('user', 'fullName profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalLikes = await Like.countDocuments({ post: postId });
    
    // Check if current user has liked this post
    let userLiked = false;
    if (userId) {
      const userLike = await Like.findOne({ post: postId, user: userId });
      userLiked = !!userLike;
    }

    res.json({
      likes: likes.map(like => ({
        id: like._id,
        user: {
          id: like.user._id,
          name: like.user.fullName,
          profilePicture: like.user.profilePicture
        },
        createdAt: like.createdAt
      })),
      totalLikes,
      userLiked,
      hasMore: totalLikes > page * limit
    });
  } catch (error) {
    console.error('Error fetching likes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add comment to a post
router.post('/comment/:postId', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId || req.user?.id;


    // Basic validation
    if (!postId || !userId) {
      return res.status(400).json({ message: 'Missing post ID or user ID' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    // Check if post exists
    const post = await GalleryPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Create comment (ensure postId is valid for ref)
    const comment = await Comment.create({
      user: userId,
      post: postId,
      content: content.trim()
    });

    // Populate user details and return same shape as GET comments
    await comment.populate('user', 'fullName profilePicture');

    const userDoc = comment.user;
    const commentPayload = {
      id: String(comment._id),
      content: comment.content,
      user: {
        id: userDoc?._id ? String(userDoc._id) : String(userId),
        name: userDoc?.fullName ?? 'Unknown',
        profilePicture: userDoc?.profilePicture ?? ''
      },
      createdAt: comment.createdAt
    };

    res.status(201).json({
      message: 'Comment added successfully',
      comment: commentPayload
    });
  } catch (error) {
    console.error('❌ Error adding comment:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Get comments for a post (no auth required - comments are public)
router.get('/comments/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 100 } = req.query;

    const comments = await Comment.find({ post: postId })
      .populate('user', 'fullName profilePicture')
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 100)
      .skip((Number(page) - 1) * (Number(limit) || 100))
      .lean();

    const totalComments = await Comment.countDocuments({ post: postId });

    const normalizedComments = comments.map(comment => {
      const userId = comment.user?._id ?? comment.user;
      const userName = comment.user?.fullName ?? 'Unknown';
      const userProfile = comment.user?.profilePicture ?? '';
      return {
        id: String(comment._id),
        content: comment.content || '',
        user: {
          id: userId ? String(userId) : '',
          name: userName,
          profilePicture: userProfile
        },
        createdAt: comment.createdAt
      };
    });

    res.json({
      comments: normalizedComments,
      totalComments,
      hasMore: totalComments > Number(page) * (Number(limit) || 100)
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get engagement stats for a post
router.get('/stats/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Optionally decode token to get user ID if authenticated
    let userId = null;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded?.userId || decoded?.id;
      } catch (err) {
        // Token invalid or expired, continue without user ID
      }
    }

    const [likeCount, commentCount, userLiked] = await Promise.all([
      Like.countDocuments({ post: postId }),
      Comment.countDocuments({ post: postId }),
      userId ? Like.findOne({ user: userId, post: postId }) : null
    ]);

    res.json({
      likeCount,
      commentCount,
      userLiked: !!userLiked
    });
  } catch (error) {
    console.error('Error fetching engagement stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a comment
router.delete('/comment/:commentId', authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.userId || req.user?.id;


    // Basic validation
    if (!commentId || !userId) {
      return res.status(400).json({ message: 'Missing comment ID or user ID' });
    }

    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user owns the comment
    if (comment.user.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Delete the comment
    await Comment.findByIdAndDelete(commentId);

    res.json({ 
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting comment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
