# 📁 File Storage System (GridFS)

## Overview
The Nomu Cafe server uses MongoDB GridFS for file storage, providing a scalable and integrated solution for managing images across all features.

## Why GridFS?

### Benefits
- **Integrated Storage**: All data (including files) in one database
- **Cross-Device Compatibility**: Images accessible from any device
- **Mobile App Support**: Works seamlessly with mobile applications
- **No Additional Services**: Uses existing MongoDB Atlas account
- **Automatic Backup**: Files backed up with database
- **Cost Effective**: No additional cloud storage costs
- **Scalable**: MongoDB Atlas scales with your needs

### Before vs After
- **Before**: Local file storage (`/uploads/`) - only accessible on server device
- **After**: MongoDB GridFS - accessible from any device via API

## Architecture

### GridFS Collections
```
promo_images.files     # Promo image metadata
promo_images.chunks    # Promo image binary data
menu_images.files      # Menu item image metadata
menu_images.chunks     # Menu item image binary data
inventory_images.files # Inventory image metadata
inventory_images.chunks # Inventory image binary data
profile_images.files   # Profile image metadata
profile_images.chunks  # Profile image binary data
```

### File Structure
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  filename: "1640995200000-123456789-promo-image.jpg",
  contentType: "image/jpeg",
  uploadDate: ISODate("2021-12-31T12:00:00.000Z"),
  metadata: {
    originalName: "promo-image.jpg",
    uploadDate: ISODate("2021-12-31T12:00:00.000Z"),
    contentType: "image/jpeg"
  }
}
```

## API Endpoints

### Image Serving
```http
GET /api/images/promo/:id      # Serve promo images
GET /api/images/menu/:id       # Serve menu images
GET /api/images/inventory/:id  # Serve inventory images
GET /api/images/profile/:id    # Serve profile images
```

### File Upload (via other endpoints)
```http
POST /api/promos              # Upload promo images
POST /api/menu                # Upload menu images
POST /api/inventory           # Upload inventory images
PUT /api/auth/me/avatar       # Upload profile images
```

## Configuration

### GridFS Setup
```javascript
// server/index.js
const { GridFSBucket } = require('mongodb');

// Initialize GridFS buckets
const db = mongoose.connection.db;
app.locals.gfsPromo = new GridFSBucket(db, { bucketName: 'promo_images' });
app.locals.gfsMenu = new GridFSBucket(db, { bucketName: 'menu_images' });
app.locals.gfsInventory = new GridFSBucket(db, { bucketName: 'inventory_images' });
app.locals.gfsProfile = new GridFSBucket(db, { bucketName: 'profile_images' });
```

### Multer Configuration
```javascript
// server/config/gridfs.js
const multer = require('multer');
const { GridFSStorage } = require('multer-gridfs-storage');

const promoStorage = new GridFSStorage({
  db: mongoose.connection,
  file: (req, file) => {
    return {
      bucketName: 'promo_images',
      filename: `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`
    };
  }
});

const promoUpload = multer({ storage: promoStorage });
```

## File Upload Process

### 1. Client Upload
```javascript
const formData = new FormData();
formData.append('image', file);
formData.append('title', 'Promo Title');

fetch('/api/promos', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 2. Server Processing
```javascript
// server/routes/promos.js
router.post('/', authMiddleware, promoUpload.single('image'), async (req, res) => {
  const promoData = {
    title: req.body.title,
    // ... other fields
  };

  // Add image URL if uploaded
  if (req.file) {
    promoData.imageUrl = `/api/images/promo/${req.file.id}`;
  }

  const promo = new Promo(promoData);
  await promo.save();
  res.json(promo);
});
```

### 3. Image Serving
```javascript
// server/index.js
app.get('/api/images/promo/:id', (req, res) => {
  const gfs = app.locals.gfsPromo;
  const fileId = req.params.id;
  const downloadStream = gfs.openDownloadStream(new mongoose.Types.ObjectId(fileId));
  
  downloadStream.on('error', (err) => {
    res.status(404).json({ message: 'Image not found' });
  });
  
  downloadStream.pipe(res);
});
```

## File Types & Limits

### Supported File Types
- **Images**: JPEG, JPG, PNG, WebP
- **Validation**: Server-side file type checking
- **Security**: Only image files allowed

### File Size Limits
- **Promo Images**: 5MB maximum
- **Menu Images**: 50MB maximum
- **Inventory Images**: 50MB maximum
- **Profile Images**: 5MB maximum

## Security Features

### File Validation
```javascript
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};
```

### Secure File Naming
```javascript
filename: `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`
```

### Access Control
- **Upload**: Requires authentication
- **Viewing**: Public access for display
- **Admin Management**: Role-based access

## Performance Optimization

### Image Optimization
- Consider implementing image compression
- Add image resizing for different screen sizes
- Implement caching headers

### Database Optimization
- Monitor MongoDB Atlas storage usage
- Consider implementing image cleanup policies
- Use appropriate indexes

## Monitoring & Maintenance

### Viewing Images in MongoDB Atlas
1. Go to MongoDB Atlas dashboard
2. Navigate to your database
3. Look for GridFS collections: `promo_images.files` and `promo_images.chunks`
4. The `files` collection contains metadata, `chunks` contains binary data

### Storage Monitoring
```javascript
// Check storage usage
const stats = await db.stats();
console.log('Database size:', stats.dataSize);
console.log('Storage size:', stats.storageSize);
```

### Cleanup Procedures
```javascript
// Example cleanup endpoint (optional)
app.delete('/api/admin/cleanup-images', async (req, res) => {
  // Logic to find and delete unused images
  // This would require tracking image usage
});
```

## Troubleshooting

### Common Issues

#### Images Not Loading
1. Check MongoDB Atlas connection
2. Verify GridFS collections exist
3. Check image URL format (`/api/images/promo/:id`)
4. Verify file ID is valid ObjectId

#### Upload Failures
1. Check file size limits
2. Verify file type validation
3. Check authentication
4. Verify GridFS configuration

#### Performance Issues
1. Monitor database size
2. Check network connectivity
3. Consider image optimization
4. Review caching strategy

### Debug Steps
1. Check server logs for errors
2. Verify GridFS initialization
3. Test with small images first
4. Check MongoDB Atlas dashboard
5. Verify file permissions

## Migration from Local Storage

### If you have existing local images:
1. Upload them through admin interface
2. Or create migration script:
```javascript
const fs = require('fs');
const path = require('path');

// Example migration script
async function migrateLocalImages() {
  const uploadsDir = path.join(__dirname, 'uploads');
  const files = fs.readdirSync(uploadsDir);
  
  for (const file of files) {
    if (file.endsWith('.jpg') || file.endsWith('.png')) {
      // Upload to GridFS
      // Update database records
    }
  }
}
```

## Best Practices

### Development
- Test with various image sizes
- Verify cross-device compatibility
- Check mobile app integration
- Test error handling

### Production
- Monitor storage usage
- Implement cleanup policies
- Set up monitoring alerts
- Regular backup verification

### Security
- Validate all file uploads
- Implement rate limiting
- Monitor upload patterns
- Regular security audits

---

**Related Documentation**:
- [API Endpoints](./api-endpoints.md)
- [Security Implementation](./security.md)
- [Environment Variables](./environment-variables.md)
