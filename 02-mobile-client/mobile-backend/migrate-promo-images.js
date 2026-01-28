const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://Nomucafeph:zJT5fsYVhKr8sLXy@nomudb.batdwqp.mongodb.net/nomucafephdb?retryWrites=true&w=majority&appName=Nomudb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
let gfs;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('✅ Connected to MongoDB');
  
  // Initialize GridFS
  gfs = Grid(db.db, mongoose.mongo);
  gfs.collection('promo_images');
  
  try {
    await migratePromoImages();
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
});

async function migratePromoImages() {
  console.log('🔄 Starting promo image migration...');
  
  // Get all promos
  const Promo = mongoose.model('Promo', new mongoose.Schema({}, { strict: false }));
  const promos = await Promo.find({});
  
  console.log(`📊 Found ${promos.length} promos to process`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const promo of promos) {
    console.log(`\n🔍 Processing promo: ${promo.title} (${promo._id})`);
    
    // Check if promo already has imageId
    if (promo.imageId) {
      console.log('⏭️  Skipping - already has imageId');
      skippedCount++;
      continue;
    }
    
    // Check if promo has imageUrl
    if (!promo.imageUrl) {
      console.log('⏭️  Skipping - no imageUrl');
      skippedCount++;
      continue;
    }
    
    // Extract file ID from your GridFS URL format: /api/images/promo/ID
    let fileId = null;
    
    if (promo.imageUrl.includes('/api/images/promo/')) {
      // Extract ID from /api/images/promo/ID format (your current format)
      const match = promo.imageUrl.match(/\/api\/images\/promo\/([a-f0-9]{24})/);
      if (match) {
        fileId = match[1];
      }
    }
    
    if (!fileId) {
      console.log('❌ Could not extract file ID from imageUrl:', promo.imageUrl);
      skippedCount++;
      continue;
    }
    
    // Verify the file exists in your GridFS promo_images bucket
    try {
      // Convert string ID to ObjectId for proper lookup
      const ObjectId = mongoose.Types.ObjectId;
      const file = await gfs.files.findOne({ _id: new ObjectId(fileId) });
      if (!file) {
        console.log('❌ File not found in GridFS:', fileId);
        skippedCount++;
        continue;
      }
      
      console.log('✅ Found matching GridFS file:', file.filename);
      
      // Update the promo with imageId (keeping imageUrl for backward compatibility)
      await Promo.updateOne(
        { _id: promo._id },
        { 
          $set: { 
            imageId: fileId,
            updatedAt: new Date()
          }
        }
      );
      
      console.log('✅ Updated promo with imageId:', fileId);
      updatedCount++;
      
    } catch (error) {
      console.log('❌ Error processing file:', error.message);
      skippedCount++;
    }
  }
  
  console.log('\n📈 Migration Summary:');
  console.log(`✅ Updated: ${updatedCount} promos`);
  console.log(`⏭️  Skipped: ${skippedCount} promos`);
  console.log(`📊 Total processed: ${promos.length} promos`);
  
  if (updatedCount > 0) {
    console.log('\n🎉 Migration completed! Your promos now have both imageUrl and imageId.');
    console.log('📱 The Flutter app will now use GridFS for better performance!');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Migration interrupted');
  process.exit(0);
});
