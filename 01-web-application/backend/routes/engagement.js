const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const GalleryPost = require('../models/GalleryPost');
const User = require('../models/User');

// Like/Unlike a post
router.post('/like/:postId', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    console.log('🔍 Like request - postId:', postId, 'userId:', userId);
    console.log('🔍 User from token:', req.user);

    // Check if post exists
    const post = await GalleryPost.findById(postId);
    if (!post) {
      console.log('❌ Post not found:', postId);
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user already liked this post
    const existingLike = await Like.findOne({ user: userId, post: postId });
    console.log('🔍 Existing like:', existingLike);
    
    if (existingLike) {
      // Unlike the post
      console.log('🔄 Unliking post...');
      await Like.findByIdAndDelete(existingLike._id);
      const likeCount = await Like.countDocuments({ post: postId });
      console.log('✅ Post unliked, new count:', likeCount);
      return res.json({ 
        message: 'Post unliked successfully',
        liked: false,
        likeCount: likeCount
      });
    } else {
      // Like the post
      console.log('🔄 Liking post...');
      const newLike = await Like.create({ user: userId, post: postId });
      console.log('✅ New like created:', newLike);
      const likeCount = await Like.countDocuments({ post: postId });
      console.log('✅ Post liked, new count:', likeCount);
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

    const likes = await Like.find({ post: postId })
      .populate('user', 'fullName profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalLikes = await Like.countDocuments({ post: postId });

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
    const userId = req.user.id;

    console.log('🔍 Comment request - postId:', postId, 'userId:', userId, 'content:', content);
    console.log('🔍 User from token:', req.user);

    if (!content || content.trim().length === 0) {
      console.log('❌ Comment content is required');
      return res.status(400).json({ message: 'Comment content is required' });
    }

    // Check if post exists
    const post = await GalleryPost.findById(postId);
    if (!post) {
      console.log('❌ Post not found:', postId);
      return res.status(404).json({ message: 'Post not found' });
    }

    // Create comment
    console.log('🔄 Creating comment...');
    const comment = await Comment.create({
      user: userId,
      post: postId,
      content: content.trim()
    });
    console.log('✅ Comment created:', comment);

    // Populate user details
    await comment.populate('user', 'fullName profilePicture');
    console.log('✅ Comment populated with user:', comment.user);

    res.status(201).json({
      message: 'Comment added successfully',
      comment: {
        id: comment._id,
        content: comment.content,
        user: {
          id: comment.user._id,
          name: comment.user.fullName,
          profilePicture: comment.user.profilePicture
        },
        createdAt: comment.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Error adding comment:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Get comments for a post
router.get('/comments/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const comments = await Comment.find({ post: postId })
      .populate('user', 'fullName profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalComments = await Comment.countDocuments({ post: postId });

    res.json({
      comments: comments.map(comment => ({
        id: comment._id,
        content: comment.content,
        user: {
          id: comment.user._id,
          name: comment.user.fullName,
          profilePicture: comment.user.profilePicture
        },
        createdAt: comment.createdAt
      })),
      totalComments,
      hasMore: totalComments > page * limit
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
    const userId = req.user?.id; // Optional, for checking if user liked the post

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

module.exports = router;
