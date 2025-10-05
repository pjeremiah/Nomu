const mongoose = require('mongoose');

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://Nomucafeph:zJT5fsYVhKr8sLXy@nomudb.batdwqp.mongodb.net/nomucafephdb?retryWrites=true&w=majority&appName=Nomudb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Promo Schema
const promoSchema = new mongoose.Schema({
  title: String,
  description: String,
  promoType: String,
  discountValue: Number,
  minOrderAmount: Number,
  startDate: Date,
  endDate: Date,
  usageLimit: Number,
  status: String,
  imageUrl: String,
  imageId: String,
  imageFilename: String,
  isActive: Boolean,
  createdBy: mongoose.Schema.Types.ObjectId,
  updatedBy: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
  updatedAt: Date
});

const Promo = mongoose.model('Promo', promoSchema);

async function updatePromoUrls() {
  try {
    console.log('🔄 Updating promo image URLs to use port 5000...');
    
    // Find all promos with imageUrl containing localhost:3000
    const promos = await Promo.find({ imageUrl: { $regex: 'localhost:3000' } });
    console.log(`Found ${promos.length} promos to update`);
    
    let updatedCount = 0;
    
    // Update each promo individually
    for (const promo of promos) {
      const newImageUrl = promo.imageUrl.replace('localhost:3000', 'localhost:5000');
      await Promo.updateOne(
        { _id: promo._id },
        { 
          $set: { 
            imageUrl: newImageUrl,
            updatedAt: new Date()
          }
        }
      );
      updatedCount++;
      console.log(`✅ Updated: ${promo.title}`);
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} promos with correct port number`);
    
    // Verify the update
    const allPromos = await Promo.find({ imageUrl: { $exists: true } });
    console.log('\n📋 Current promo image URLs:');
    allPromos.forEach((promo, index) => {
      console.log(`${index + 1}. ${promo.title}: ${promo.imageUrl}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating promo URLs:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

updatePromoUrls();
