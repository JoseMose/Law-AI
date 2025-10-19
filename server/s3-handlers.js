// S3 Operations Module
// Extracted from lambda-auth.js for modular deployment

const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Initialize S3 client
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const bucket = process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || 'contractfiles1';

// Helper function to create CORS-enabled responses
const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '-1',
    'Last-Modified': new Date().toUTCString(),
    'ETag': `"${Date.now()}-${Math.random().toString(36)}"`,
    'Vary': 'Accept-Encoding'
  },
  body: JSON.stringify(body)
});

// Update document review timestamp
async function updateDocumentReviewTimestamp(caseId, documentKey) {
  try {
    const caseKey = `cases/${caseId}/case-folders.json`;
    let caseData = { folders: [], documents: [] };

    try {
      const getCommand = new GetObjectCommand({ Bucket: bucket, Key: caseKey });
      const response = await s3Client.send(getCommand);
      const data = await response.Body.transformToString();
      caseData = JSON.parse(data);
    } catch (err) {
      console.log('Case folders file does not exist, creating new one');
    }

    // Find and update the document
    const docIndex = caseData.documents.findIndex(doc => doc.key === documentKey);
    if (docIndex >= 0) {
      caseData.documents[docIndex].lastReviewedAt = new Date().toISOString();
    } else {
      caseData.documents.push({
        id: documentKey.split('/').pop().split('.')[0],
        filename: documentKey.split('/').pop(),
        key: documentKey,
        lastReviewedAt: new Date().toISOString()
      });
    }

    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: caseKey,
      Body: JSON.stringify(caseData, null, 2),
      ContentType: 'application/json'
    });

    await s3Client.send(putCommand);
    console.log('Updated review timestamp for document:', documentKey);

  } catch (error) {
    console.error('Failed to update document review timestamp:', error);
    throw error;
  }
}

// Load cases from S3
async function loadCasesFromS3() {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: 'cases/cases.json'
    });
    
    const response = await s3Client.send(command);
    const casesData = await response.Body.transformToString();
    return JSON.parse(casesData);
  } catch (error) {
    console.log('No existing cases file or error loading cases:', error.message);
    return [];
  }
}

// Save cases to S3
async function saveCasesToS3(casesArray) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: 'cases/cases.json',
      Body: JSON.stringify(casesArray, null, 2),
      ContentType: 'application/json'
    });
    
    await s3Client.send(command);
    console.log('Cases saved to S3 successfully');
    return true;
  } catch (error) {
    console.error('Error saving cases to S3:', error);
    return false;
  }
}

// Load clients from S3
async function loadClientsFromS3() {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: 'clients/clients.json'
    });
    
    const response = await s3Client.send(command);
    const clientsData = await response.Body.transformToString();
    return JSON.parse(clientsData);
  } catch (error) {
    console.log('No existing clients file or error loading clients:', error.message);
    return [];
  }
}

// Save clients to S3
async function saveClientsToS3(clientsArray) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: 'clients/clients.json',
      Body: JSON.stringify(clientsArray, null, 2),
      ContentType: 'application/json'
    });
    
    await s3Client.send(command);
    console.log('Clients saved to S3 successfully');
    return true;
  } catch (error) {
    console.error('Error saving clients to S3:', error);
    return false;
  }
}

// Generate presigned URL for file preview
async function generatePresignedUrl(key) {
  try {
    // Check if the file appears to be a PDF (for preview safety)
    const fileExtension = key.split('.').pop().toLowerCase();
    if (fileExtension !== 'pdf' || key.toLowerCase().includes('.docx') || key.toLowerCase().includes('.doc')) {
      throw new Error('Only PDF files can be previewed');
    }

    // Check if this is a mock document (simple filename without timestamp)
    const isMockDocument = !key.includes('-') || key.length < 20;
    
    if (isMockDocument) {
      // Return demo PDF base64 data for mock documents
      return {
        success: true,
        url: `data:application/pdf;base64,JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PAovVGl0bGUgKE1vY2sgRG9jdW1lbnQpCi9Qcm9kdWNlciAoTGF3LUFJIERlbW8pCi9DcmVhdG9yIChMYXctQUkpCj4+CmVuZG9iago2IDAgb2JqCjw8Ci9UeXBlIC9DYXRhbG9nCi9QYWdlcyAzIDAgUgo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzQgMCBSXQovQ291bnQgMQo+PgplbmRvYmoKNCAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDMgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKNSAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVApxCi8xMiBUZgowIDAgVGQKKFRoaXMgaXMgYSBkZW1vIGRvY3VtZW50KSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA3CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDc0IDAwMDAwIG4gCjAwMDAwMDAxMjAgMDAwMDAgbiAKMDAwMDAwMDE3NyAwMDAwMCBuIAowMDAwMDAwMjUyIDAwMDAwIG4gCjAwMDAwMDAzNDQgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA3Ci9Sb290IDYgMCBSCj4+CnN0YXJ0eHJlZgo0MTAKJSVFT0YK`,
        key: key,
        isMock: true,
        message: 'This is a demo document for preview purposes'
      };
    }
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
    
    return {
      success: true,
      url: presignedUrl,
      key: key,
      expiresIn: 3600,
      isMock: false
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
}

// Get case folder contents
async function getCaseFolders(caseId) {
  try {
    console.log('=== S3 CASE-FOLDERS DEBUG ===');
    console.log('Processing case-folders request for case:', caseId);
    
    const prefix = `cases/${caseId}/files/`;
    console.log('S3 prefix:', prefix);
    
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: '/'
    });
    
    const s3Response = await s3Client.send(listCommand);
    console.log('S3 response received:', !!s3Response);
    console.log('Objects found:', s3Response.Contents?.length || 0);
    console.log('Common prefixes found:', s3Response.CommonPrefixes?.length || 0);
    
    // Process folders (common prefixes)
    const folders = (s3Response.CommonPrefixes || []).map(prefix => {
      const folderName = prefix.Prefix.replace(`cases/${caseId}/files/`, '').replace('/', '');
      console.log('Found folder:', folderName);
      return {
        id: folderName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: folderName,
        type: 'folder',
        path: prefix.Prefix
      };
    });
    
    // Process files in root of case
    const files = (s3Response.Contents || [])
      .filter(obj => {
        const key = obj.Key;
        const relativePath = key.replace(`cases/${caseId}/files/`, '');
        const isRootFile = !relativePath.includes('/') && relativePath.length > 0;
        console.log('Checking file:', key, 'isRootFile:', isRootFile);
        return isRootFile;
      })
      .map(obj => {
        const fileName = obj.Key.split('/').pop();
        console.log('Found root file:', fileName);
        return {
          id: fileName.split('.')[0] || fileName,
          name: fileName,
          filename: fileName,
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified.toISOString(),
          type: 'file',
          path: obj.Key,
          extension: fileName.split('.').pop()?.toLowerCase() || 'unknown'
        };
      });
    
    console.log('Final response - folders:', folders.length, 'files:', files.length);
    
    return {
      success: true,
      caseId: caseId,
      folders: folders,
      files: files,
      totalItems: folders.length + files.length,
      s3Bucket: bucket,
      s3Prefix: prefix,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting case folders from S3:', error);
    throw error;
  }
}

// Delete file from S3
async function deleteFileFromS3(key) {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    await s3Client.send(deleteCommand);
    console.log('File deleted from S3:', key);
    return { success: true, key: key };
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
}

// Upload file to S3
async function uploadFileToS3(key, body, contentType) {
  try {
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    });
    
    await s3Client.send(putCommand);
    console.log('File uploaded to S3:', key);
    return { success: true, key: key };
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
}

module.exports = {
  updateDocumentReviewTimestamp,
  loadCasesFromS3,
  saveCasesToS3,
  loadClientsFromS3,
  saveClientsToS3,
  generatePresignedUrl,
  getCaseFolders,
  deleteFileFromS3,
  uploadFileToS3,
  createResponse
};