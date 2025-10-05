const https = require('https');
const fs = require('fs');
const path = require('path');

// Create promos directory if it doesn't exist
const promosDir = path.join(__dirname, 'uploads', 'promos');
if (!fs.existsSync(promosDir)) {
  fs.mkdirSync(promosDir, { recursive: true });
}

// Sample images from Unsplash (free to use)
const imageUrls = {
  'coffee.png': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop',
  'donuts.png': 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop',
  'croissant.png': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=300&fit=crop',
  'nomulogo.png': 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop',
  'matcha.jpg': 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=400&h=300&fit=crop',
  'loyaltyicon.png': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
  'coffee-cup.png': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop',
  'nomulogo1.jpg': 'https://images.unsplash.com/photo-1522992319-0365e5f11656?w=400&h=300&fit=crop'
};

// Function to download an image
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(promosDir, filename));
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded: ${filename}`);
          resolve();
        });
      } else {
        console.log(`❌ Failed to download ${filename}: ${response.statusCode}`);
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      console.log(`❌ Error downloading ${filename}:`, err.message);
      reject(err);
    });
  });
}

// Download all images
async function downloadAllImages() {
  console.log('🚀 Starting to download promo images...');
  
  const downloadPromises = Object.entries(imageUrls).map(([filename, url]) => 
    downloadImage(url, filename).catch(err => {
      console.log(`⚠️  Skipped ${filename} due to error`);
    })
  );
  
  try {
    await Promise.all(downloadPromises);
    console.log('\n🎉 All images downloaded successfully!');
    console.log(`📁 Images saved to: ${promosDir}`);
    
    // List downloaded files
    const files = fs.readdirSync(promosDir);
    console.log('\n📋 Downloaded files:');
    files.forEach(file => {
      console.log(`  - ${file}`);
    });
    
  } catch (error) {
    console.error('❌ Error downloading images:', error);
  }
}

// Run the download
downloadAllImages();
