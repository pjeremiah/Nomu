# MongoDB GridFS Setup Guide for Nomu Web App

## Problem Solved
This guide addresses the issue where promo images (and other uploaded images) were not appearing across different devices because they were stored locally on the file system. Now all images are stored in MongoDB Atlas using GridFS, making them accessible from any device, including mobile applications.

## What Changed
- ✅ All image uploads now use MongoDB GridFS storage
- ✅ Images are stored directly in your MongoDB Atlas database
- ✅ Images are accessible from any device (computer, laptop, mobile)
- ✅ Images work in mobile applications
- ✅ No additional cloud storage service needed
- ✅ Uses your existing MongoDB Atlas account

## How GridFS Works

### Before (Local Storage)
```
Image uploaded → Saved to server/uploads/ → Only accessible on that device
```

### After (MongoDB GridFS)
```
Image uploaded → Stored in MongoDB Atlas as binary data → Accessible from any device via API
```

### Image URLs
- **Before**: `/uploads/promo_1234567890.jpg` (relative path)
- **After**: `/api/images/promo/507f1f77bcf86cd799439011` (MongoDB ObjectId)

## Setup Instructions

### 1. Install Dependencies
The required packages have already been installed:
- `multer-gridfs-storage` - Multer storage engine for GridFS
- `gridfs-stream` - Stream interface for GridFS

### 2. No Additional Configuration Needed!
Since you're already using MongoDB Atlas, no additional setup is required. The GridFS solution uses your existing database connection.

### 3. Test the Setup
1. Start your server: `npm start` (in the server directory)
2. Start your client: `npm start` (in the website directory)
3. Try adding a new promo with an image
4. Check that the image appears correctly
5. Test on different devices to confirm cross-device compatibility

## How It Works Now

### Image Storage
- Images are stored as binary data in MongoDB collections:
  - `promo_images` - Promo images
  - `menu_images` - Menu item images
  - `inventory_images` - Inventory item images

### Image Serving
- Images are served through API endpoints:
  - `/api/images/promo/:id` - Serve promo images
  - `/api/images/menu/:id` - Serve menu images
  - `/api/images/inventory/:id` - Serve inventory images

### Database Structure
Each image is stored with metadata:
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

## Benefits

1. **Cross-Device Compatibility**: Images work on any device
2. **Mobile App Support**: Images are accessible from mobile applications
3. **No Additional Services**: Uses your existing MongoDB Atlas account
4. **Integrated Storage**: All data (including images) in one database
5. **Automatic Backup**: Images are backed up with your database
6. **Cost Effective**: No additional cloud storage costs
7. **Scalable**: MongoDB Atlas scales with your needs

## File Organization in MongoDB

Images are organized in separate GridFS collections:
- `promo_images` - All promo images
- `menu_images` - All menu item images  
- `inventory_images` - All inventory item images

## Troubleshooting

### Images Not Loading
1. Check that your MongoDB Atlas connection is working
2. Restart your server after making changes
3. Check the browser console for any error messages
4. Verify that the image URL in the database is correct (should be `/api/images/promo/:id`)

### Server Errors
1. Make sure all dependencies are installed: `npm install`
2. Check that GridFS is properly initialized in the server logs
3. Verify your MongoDB Atlas connection string is correct

### Database Connection Issues
1. Check your `MONGO_URI` environment variable
2. Ensure your MongoDB Atlas cluster is running
3. Verify your IP address is whitelisted in MongoDB Atlas

## Migration from Local to GridFS

If you have existing images in your local `uploads` folder:
1. You can manually upload them through your admin interface
2. Or create a migration script to upload existing images to GridFS
3. The old local images can be safely deleted after migration

## Monitoring and Maintenance

### Viewing Images in MongoDB Atlas
1. Go to your MongoDB Atlas dashboard
2. Navigate to your database
3. Look for the GridFS collections: `promo_images.files` and `promo_images.chunks`
4. The `files` collection contains metadata, `chunks` contains the actual binary data

### Cleaning Up Old Images
You can create an admin endpoint to clean up unused images:
```javascript
// Example cleanup endpoint (optional)
app.delete('/api/admin/cleanup-images', async (req, res) => {
  // Logic to find and delete unused images
});
```

## Performance Considerations

### Image Optimization
- Consider implementing image compression before upload
- Add image resizing for different screen sizes
- Implement caching headers for better performance

### Database Size
- Monitor your MongoDB Atlas storage usage
- Consider implementing image cleanup policies
- GridFS is efficient for large files but monitor your database size

## Security

### Access Control
- Image serving endpoints are public (for display purposes)
- Upload endpoints require authentication
- Consider adding rate limiting for image uploads

### File Validation
- File type validation is already implemented
- File size limits are enforced (5MB for promos, 50MB for inventory)
- Only image files are allowed

## Support

If you encounter any issues:
1. Check the server console for error messages
2. Verify your MongoDB Atlas connection
3. Ensure all environment variables are properly set
4. Check that GridFS collections are created properly

---

**Note**: This setup ensures that your promo images (and all other uploaded images) will work consistently across all devices, including mobile applications, using your existing MongoDB Atlas infrastructure without requiring any additional cloud storage services.
