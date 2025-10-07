const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const s3Client = new S3Client({ region: 'us-east-1' });

async function uploadGeorgiaCode() {
  try {
    const bucketName = process.env.S3_BUCKET_NAME || 'contractfiles1';
    const filePath = path.join(__dirname, 'data', 'georgia-code.json');

    if (!fs.existsSync(filePath)) {
      throw new Error('Georgia Code file not found at: ' + filePath);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');

    const uploadParams = {
      Bucket: bucketName,
      Key: 'georgia-code/georgia-code.json',
      Body: fileContent,
      ContentType: 'application/json'
    };

    console.log('Uploading Georgia Code to S3...');
    const result = await s3Client.send(new PutObjectCommand(uploadParams));

    console.log('✅ Successfully uploaded Georgia Code to S3');
    console.log('📍 S3 Location:', `s3://${bucketName}/georgia-code/georgia-code.json`);
    console.log('📅 Upload Time:', new Date().toISOString());

    return result;
  } catch (error) {
    console.error('❌ Failed to upload Georgia Code:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  uploadGeorgiaCode()
    .then(() => {
      console.log('🎉 Upload completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Upload failed:', error);
      process.exit(1);
    });
}

module.exports = { uploadGeorgiaCode };