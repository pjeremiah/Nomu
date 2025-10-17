const mongoose = require('mongoose');

const mediaItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  gridfsId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }
}, { _id: false });

const galleryPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  media: {
    type: [mediaItemSchema],
    required: true,
    validate: {
      validator: function(media) {
        return media.length > 0 && media.length <= 5;
      },
      message: 'Gallery post must have between 1 and 5 media items'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }]
}, {
  timestamps: true
});

// Index for efficient querying
galleryPostSchema.index({ isActive: 1, order: 1, createdAt: -1 });
galleryPostSchema.index({ createdBy: 1 });
galleryPostSchema.index({ featured: 1 });

// Virtual for media count
galleryPostSchema.virtual('mediaCount').get(function() {
  return this.media.length;
});

// Method to get primary media (first image or video)
galleryPostSchema.methods.getPrimaryMedia = function() {
  return this.media[0];
};

// Method to get thumbnail URL (first image or video thumbnail)
galleryPostSchema.methods.getThumbnailUrl = function() {
  const primary = this.getPrimaryMedia();
  if (primary) {
    return primary.url;
  }
  return null;
};

// Static method to get active posts ordered by display order
galleryPostSchema.statics.getActivePosts = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ order: 1, createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'name email')
    .lean();
};

// Static method to get featured posts
galleryPostSchema.statics.getFeaturedPosts = function(limit = 5) {
  return this.find({ isActive: true, featured: true })
    .sort({ order: 1, createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'name email')
    .lean();
};

module.exports = mongoose.model('GalleryPost', galleryPostSchema);
