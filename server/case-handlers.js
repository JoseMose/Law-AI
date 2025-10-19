// Case Operations Module
// Extracted from lambda-auth.js for modular deployment

const { loadCasesFromS3, saveCasesToS3, getCaseFolders, createResponse } = require('./s3-handlers');

// Add document to case
async function addDocumentToCase(caseId, documentData) {
  try {
    // Load current cases from S3
    const cases = await loadCasesFromS3();
    
    const caseIndex = cases.findIndex(c => c.id === caseId);
    if (caseIndex === -1) {
      throw new Error(`Case ${caseId} not found`);
    }
    
    const docName = documentData.name || 'untitled.pdf';
    const newDocument = {
      id: Date.now(), // Use timestamp as unique ID
      name: docName,
      filename: docName,
      key: docName,
      size: documentData.size || '1.0 MB',
      url: `/documents/${docName}`,
      uploadDate: new Date().toISOString().split('T')[0]
    };
    
    cases[caseIndex].documents.push(newDocument);
    cases[caseIndex].updatedAt = new Date().toISOString().split('T')[0];
    
    // Save back to S3
    await saveCasesToS3(cases);
    
    return {
      success: true,
      message: `Document added to case ${caseId}`,
      addedDocument: newDocument,
      updatedCase: cases[caseIndex]
    };
  } catch (error) {
    console.error('Error adding document to case:', error);
    throw error;
  }
}

// Delete document from case
async function deleteDocumentFromCase(caseId, documentName) {
  try {
    // Load cases from S3 first
    const cases = await loadCasesFromS3();
    
    const caseIndex = cases.findIndex(c => c.id === caseId);
    if (caseIndex === -1) {
      throw new Error(`Case ${caseId} not found`);
    }
    
    const documentIndex = cases[caseIndex].documents.findIndex(d => d.name === documentName);
    if (documentIndex === -1) {
      throw new Error(`Document ${documentName} not found in case ${caseId}`);
    }
    
    // Remove the document
    const removedDocument = cases[caseIndex].documents.splice(documentIndex, 1)[0];
    cases[caseIndex].updatedAt = new Date().toISOString().split('T')[0];
    
    // Save updated cases to S3
    await saveCasesToS3(cases);
    
    return {
      success: true,
      message: `Document ${documentName} deleted from case ${caseId}`,
      deletedDocument: removedDocument,
      remainingDocuments: cases[caseIndex].documents.length,
      updatedCase: cases[caseIndex]
    };
  } catch (error) {
    console.error('Error deleting document from case:', error);
    throw error;
  }
}

// Delete entire case
async function deleteCase(caseId) {
  try {
    // Load cases from S3 first
    const cases = await loadCasesFromS3();
    
    // Find and delete case
    const initialLength = cases.length;
    const filteredCases = cases.filter(c => c.id !== caseId);
    
    if (filteredCases.length === initialLength) {
      throw new Error(`Case ${caseId} not found`);
    }
    
    // Save updated cases to S3
    await saveCasesToS3(filteredCases);
    
    return {
      success: true,
      message: `Case ${caseId} deleted successfully`,
      deletedCaseId: caseId,
      remainingCases: filteredCases.length
    };
  } catch (error) {
    console.error('Error deleting case:', error);
    throw error;
  }
}

// Update case
async function updateCase(caseId, updateData) {
  try {
    // Load cases from S3 first
    const cases = await loadCasesFromS3();
    
    const caseIndex = cases.findIndex(c => c.id === caseId);
    if (caseIndex === -1) {
      throw new Error(`Case ${caseId} not found`);
    }
    
    // Update the case
    cases[caseIndex] = {
      ...cases[caseIndex],
      ...updateData,
      id: caseId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString().split('T')[0]
    };
    
    // Save updated cases to S3
    await saveCasesToS3(cases);
    
    return {
      success: true,
      message: `Case ${caseId} updated successfully`,
      updatedCase: cases[caseIndex]
    };
  } catch (error) {
    console.error('Error updating case:', error);
    throw error;
  }
}

// Get specific case
async function getCase(caseId) {
  try {
    // Load cases from S3 first
    const cases = await loadCasesFromS3();
    
    const case_ = cases.find(c => c.id === caseId);
    if (!case_) {
      throw new Error(`Case ${caseId} not found`);
    }
    
    return {
      success: true,
      case: case_
    };
  } catch (error) {
    console.error('Error getting case:', error);
    throw error;
  }
}

// Get all cases
async function getAllCases() {
  try {
    const cases = await loadCasesFromS3();
    return {
      success: true,
      cases: cases,
      count: cases.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting all cases:', error);
    throw error;
  }
}

// Create folder in case
async function createFolderInCase(caseId, folderName, parentPath) {
  try {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    const bucket = process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || 'contractfiles1';
    
    // Sanitize folder name
    const sanitizedFolderName = folderName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    if (!sanitizedFolderName) {
      throw new Error('Invalid folder name. Use only letters, numbers, spaces, hyphens, and underscores.');
    }

    // Build folder path
    const basePath = parentPath ? `${parentPath}/${sanitizedFolderName}` : sanitizedFolderName;
    const s3FolderPath = `cases/${caseId}/folders/${basePath}/`;
    
    // Create a placeholder file in S3 to ensure the folder exists
    const placeholderKey = `${s3FolderPath}.folderinfo`;
    const folderInfo = {
      folderName: sanitizedFolderName,
      fullPath: basePath,
      caseId,
      createdAt: new Date().toISOString(),
      type: 'folder'
    };
    
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: placeholderKey,
      Body: JSON.stringify(folderInfo, null, 2),
      ContentType: 'application/json'
    });
    
    await s3Client.send(putCommand);
    console.log('Folder created successfully:', s3FolderPath);
    
    return {
      success: true,
      message: 'Folder created successfully',
      folder: {
        name: sanitizedFolderName,
        path: basePath,
        s3Path: s3FolderPath,
        caseId: caseId,
        created: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error creating folder in case:', error);
    throw error;
  }
}

// Handle case documents collection operations
async function handleCaseDocuments(caseId, method, requestBody) {
  try {
    if (method === 'POST') {
      return await addDocumentToCase(caseId, requestBody);
    }
    
    throw new Error(`Method ${method} not allowed for case documents collection`);
  } catch (error) {
    console.error('Error handling case documents:', error);
    throw error;
  }
}

// Handle individual case document operations
async function handleCaseDocument(caseId, documentName, method) {
  try {
    if (method === 'DELETE') {
      return await deleteDocumentFromCase(caseId, decodeURIComponent(documentName));
    }
    
    throw new Error(`Method ${method} not allowed for individual case documents`);
  } catch (error) {
    console.error('Error handling case document:', error);
    throw error;
  }
}

// Handle individual case operations
async function handleCase(caseId, method, requestBody) {
  try {
    switch (method) {
      case 'GET':
        return await getCase(caseId);
      case 'PUT':
        return await updateCase(caseId, requestBody);
      case 'DELETE':
        return await deleteCase(caseId);
      default:
        throw new Error(`Method ${method} not allowed for case operations`);
    }
  } catch (error) {
    console.error('Error handling case operation:', error);
    throw error;
  }
}

module.exports = {
  addDocumentToCase,
  deleteDocumentFromCase,
  deleteCase,
  updateCase,
  getCase,
  getAllCases,
  createFolderInCase,
  handleCaseDocuments,
  handleCaseDocument,
  handleCase
};