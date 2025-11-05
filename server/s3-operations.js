// S3 Operations for Lambda Auth
// Extracted from lambda-auth.js to reduce main file size

const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, getSignedUrl } = require('./aws-clients');

// Initialize S3 client
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

async function loadJsonFromS3(key, defaultValue) {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    });
    const response = await s3Client.send(command);
    const payload = await response.Body.transformToString();
    return JSON.parse(payload);
  } catch (error) {
    console.log(`No existing ${key} file or error loading:`, error.message);
    return defaultValue;
  }
}

async function saveJsonToS3(key, payload) {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(payload, null, 2),
      ContentType: 'application/json'
    });
    await s3Client.send(command);
    console.log(`${key} saved to S3 successfully`);
    return true;
  } catch (error) {
    console.error(`Error saving ${key} to S3:`, error);
    return false;
  }
}

// Update document review timestamp
async function updateDocumentReviewTimestamp(caseId, documentKey) {
  try {
    const bucket = process.env.S3_BUCKET || 'contractfiles1';
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
      Bucket: process.env.S3_BUCKET_NAME,
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
      Bucket: process.env.S3_BUCKET_NAME,
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
      Bucket: process.env.S3_BUCKET_NAME,
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
      Bucket: process.env.S3_BUCKET_NAME,
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

module.exports = {
  updateDocumentReviewTimestamp,
  loadCasesFromS3,
  saveCasesToS3,
  loadClientsFromS3,
  saveClientsToS3,
  loadJsonFromS3,
  saveJsonToS3,
  loadCRMContactsFromS3: () => loadJsonFromS3('crm/contacts.json', []),
  saveCRMContactsToS3: (contacts) => saveJsonToS3('crm/contacts.json', contacts),
  loadCRMOrganizationsFromS3: () => loadJsonFromS3('crm/organizations.json', []),
  saveCRMOrganizationsToS3: (organizations) => saveJsonToS3('crm/organizations.json', organizations),
  loadCRMInteractionsFromS3: () => loadJsonFromS3('crm/interactions.json', []),
  saveCRMInteractionsToS3: (interactions) => saveJsonToS3('crm/interactions.json', interactions)
};