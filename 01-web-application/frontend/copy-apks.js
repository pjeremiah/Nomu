const fs = require('fs');
const path = require('path');

// Source and destination paths
const publicDir = path.join(__dirname, 'public');
const buildDir = path.join(__dirname, 'build');

// APK files in `public/` (must match filenames used in the app and build output)
const apkFiles = [
  'Nomu-Mobile-Application.apk',
  'Nomu-Barista-Application.apk'
];

console.log('📱 Copying APK files to build directory...');

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
  console.error('❌ Build directory does not exist. Run npm run build first.');
  process.exit(1);
}

// Copy each APK file
apkFiles.forEach(fileName => {
  const sourcePath = path.join(publicDir, fileName);
  const destPath = path.join(buildDir, fileName);
  
  if (fs.existsSync(sourcePath)) {
    try {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`✅ Copied ${fileName}`);
    } catch (error) {
      console.error(`❌ Error copying ${fileName}:`, error.message);
    }
  } else {
    console.warn(`⚠️  APK file not found: ${fileName}`);
  }
});

console.log('🎉 APK files copied successfully!');
