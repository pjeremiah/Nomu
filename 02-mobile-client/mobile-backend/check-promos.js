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

async function checkPromos() {
  try {
    console.log('🔍 Checking promos in database...');
    
    // Count total promos
    const totalCount = await Promo.countDocuments();
    console.log(`📊 Total promos in database: ${totalCount}`);
    
    // Count active promos
    const activeCount = await Promo.countDocuments({ isActive: true, status: 'Active' });
    console.log(`✅ Active promos: ${activeCount}`);
    
    // Get all promos
    const allPromos = await Promo.find({}).sort({ createdAt: -1 });
    console.log('\n📋 All promos in database:');
    allPromos.forEach((promo, index) => {
      console.log(`${index + 1}. ${promo.title}`);
      console.log(`   - Status: ${promo.status}`);
      console.log(`   - Active: ${promo.isActive}`);
      console.log(`   - Type: ${promo.promoType}`);
      console.log(`   - Image: ${promo.imageUrl || 'No image'}`);
      console.log(`   - Created: ${promo.createdAt}`);
      console.log('');
    });
    
    // Check for promos with our sample titles
    const sampleTitles = [
      'Morning Coffee Special',
      'Buy 1 Get 1 Donuts',
      'Weekend Pastry Delight',
      'Student Discount',
      'Matcha Madness',
      'Loyalty Points Bonus',
      'Happy Hour Special',
      'New Customer Welcome'
    ];
    
    console.log('🎯 Checking for our sample promos:');
    for (const title of sampleTitles) {
      const promo = await Promo.findOne({ title: title });
      if (promo) {
        console.log(`✅ Found: ${title} (${promo.status}, Active: ${promo.isActive})`);
      } else {
        console.log(`❌ Missing: ${title}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking promos:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

checkPromos();
