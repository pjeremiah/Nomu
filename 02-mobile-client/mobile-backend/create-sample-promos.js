const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://Nomucafeph:zJT5fsYVhKr8sLXy@nomudb.batdwqp.mongodb.net/nomucafephdb?retryWrites=true&w=majority&appName=Nomudb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Promo Schema (same as in server.js)
const promoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  promoType: { type: String, required: true },
  discountValue: { type: Number, required: true },
  minOrderAmount: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  usageLimit: { type: Number, required: true },
  status: { type: String, enum: ['Active', 'Inactive', 'Expired'], default: 'Active' },
  imageUrl: { type: String },
  imageId: { type: String },
  imageFilename: { type: String },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Promo = mongoose.model('Promo', promoSchema);

// Sample promos data
const samplePromos = [
  {
    title: "Morning Coffee Special",
    description: "Start your day right with our premium coffee blend. Get 20% off on all coffee drinks when you order before 10 AM.",
    promoType: "percentage",
    discountValue: 20,
    minOrderAmount: 150,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    usageLimit: 100,
    imageFilename: "coffee.png",
    status: "Active",
    isActive: true
  },
  {
    title: "Buy 1 Get 1 Donuts",
    description: "Craving something sweet? Buy any donut and get another one absolutely free! Perfect for sharing with friends.",
    promoType: "buy_one_get_one",
    discountValue: 0,
    minOrderAmount: 80,
    startDate: new Date(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    usageLimit: 50,
    imageFilename: "donuts.png",
    status: "Active",
    isActive: true
  },
  {
    title: "Weekend Pastry Delight",
    description: "Indulge in our freshly baked pastries this weekend. Get ₱50 off on orders above ₱200.",
    promoType: "fixed",
    discountValue: 50,
    minOrderAmount: 200,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    usageLimit: 75,
    imageFilename: "croissant.png",
    status: "Active",
    isActive: true
  },
  {
    title: "Student Discount",
    description: "Show your student ID and enjoy 15% off on all items. Valid for all students with valid school ID.",
    promoType: "percentage",
    discountValue: 15,
    minOrderAmount: 100,
    startDate: new Date(),
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    usageLimit: 200,
    imageFilename: "nomulogo.png",
    status: "Active",
    isActive: true
  },
  {
    title: "Matcha Madness",
    description: "Experience the perfect blend of tradition and taste. 25% off on all matcha-based drinks and desserts.",
    promoType: "percentage",
    discountValue: 25,
    minOrderAmount: 120,
    startDate: new Date(),
    endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
    usageLimit: 60,
    imageFilename: "matcha.jpg",
    status: "Active",
    isActive: true
  },
  {
    title: "Loyalty Points Bonus",
    description: "Earn double loyalty points on every purchase this month. Build up your points faster and redeem amazing rewards!",
    promoType: "loyalty_bonus",
    discountValue: 2, // 2x multiplier
    minOrderAmount: 50,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    usageLimit: 500,
    imageFilename: "loyaltyicon.png",
    status: "Active",
    isActive: true
  },
  {
    title: "Happy Hour Special",
    description: "Join us during happy hour (3-5 PM) and enjoy 30% off on all beverages. Perfect for an afternoon break!",
    promoType: "percentage",
    discountValue: 30,
    minOrderAmount: 80,
    startDate: new Date(),
    endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    usageLimit: 150,
    imageFilename: "coffee-cup.png",
    status: "Active",
    isActive: true
  },
  {
    title: "New Customer Welcome",
    description: "Welcome to NOMU! Get ₱100 off on your first order above ₱250. Start your journey with us today!",
    promoType: "fixed",
    discountValue: 100,
    minOrderAmount: 250,
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    usageLimit: 300,
    imageFilename: "nomulogo1.jpg",
    status: "Active",
    isActive: true
  }
];

// Function to copy images from assets to backend/uploads/promos
function copyPromoImages() {
  const assetsDir = path.join(__dirname, '..', 'assets', 'images');
  const promosDir = path.join(__dirname, 'uploads', 'promos');
  
  // Create promos directory if it doesn't exist
  if (!fs.existsSync(promosDir)) {
    fs.mkdirSync(promosDir, { recursive: true });
  }
  
  // Copy images used in promos
  const imagesToCopy = [
    'coffee.png',
    'donuts.png', 
    'croissant.png',
    'nomulogo.png',
    'matcha.jpg',
    'loyaltyicon.png',
    'coffee-cup.png',
    'nomulogo1.jpg'
  ];
  
  imagesToCopy.forEach(imageName => {
    const sourcePath = path.join(assetsDir, imageName);
    const destPath = path.join(promosDir, imageName);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied ${imageName} to promos directory`);
    } else {
      console.log(`⚠️  Image ${imageName} not found in assets`);
    }
  });
}

// Function to create sample promos
async function createSamplePromos() {
  try {
    console.log('🚀 Starting to create sample promos...');
    
    // Copy images first
    console.log('📁 Copying promo images...');
    copyPromoImages();
    
    // Clear existing promos (optional - comment out if you want to keep existing ones)
    // await Promo.deleteMany({});
    // console.log('🗑️  Cleared existing promos');
    
    // Create promos
    console.log('📝 Creating sample promos...');
    const createdPromos = [];
    
    for (const promoData of samplePromos) {
      // Create image URL for the promo
      const imageUrl = `http://localhost:5000/uploads/promos/${promoData.imageFilename}`;
      
      const promo = new Promo({
        ...promoData,
        imageUrl: imageUrl,
        createdBy: null, // Set to null since we don't have a valid ObjectId
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const savedPromo = await promo.save();
      createdPromos.push(savedPromo);
      console.log(`✅ Created promo: ${savedPromo.title}`);
    }
    
    console.log(`\n🎉 Successfully created ${createdPromos.length} sample promos!`);
    console.log('\n📋 Created Promos:');
    createdPromos.forEach((promo, index) => {
      console.log(`${index + 1}. ${promo.title} - ${promo.promoType} (${promo.discountText})`);
    });
    
    console.log('\n🔗 You can view the promos at: http://localhost:3000/api/promos');
    
  } catch (error) {
    console.error('❌ Error creating sample promos:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
createSamplePromos();
