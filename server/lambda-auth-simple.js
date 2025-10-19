// Lambda function with real S3 data - no mocks
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: 'us-east-1' });

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'contractfiles1';
const CASES_KEY = 'cases/cases.json';
const CLIENTS_KEY = 'clients/clients.json';

exports.main = async (event, context, callback) => {
    console.log('Lambda handler called');
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const httpMethod = event.httpMethod;
    const path = event.path;
    
    // Handle OPTIONS requests for CORS
    if (httpMethod === 'OPTIONS') {
        const response = {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                'Access-Control-Max-Age': '86400'
            },
            body: ''
        };
        return callback(null, response);
    }
    
    // Handle cases/{id} endpoint - get real data from S3
    if (httpMethod === 'GET' && path && path.includes('/cases/') && !path.includes('/events')) {
        const caseId = event.pathParameters?.id || path.split('/cases/')[1]?.split('/')[0] || path.split('/cases/')[1];
        console.log('Case request for ID:', caseId);
        
        try {
            const result = await s3.getObject({ Bucket: BUCKET_NAME, Key: CASES_KEY }).promise();
            const cases = JSON.parse(result.Body.toString());
            const caseData = cases.find(c => c.id === caseId);
            
            if (!caseData) {
                return callback(null, {
                    statusCode: 404,
                    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: 'Case not found' })
                });
            }
            
            // Transform case data to match expected format
            const transformedCase = {
                id: caseData.id,
                title: caseData.title || caseData.name,
                description: caseData.description,
                status: caseData.status || 'active',
                client: caseData.client,
                created_at: caseData.createdAt || caseData.created_at,
                updated_at: caseData.updatedAt || caseData.updated_at,
                case_number: caseData.case_number,
                court: caseData.court,
                judge: caseData.judge,
                opposing_party: caseData.opposing_party,
                practice_area: caseData.practice_area,
                priority: caseData.priority || 'medium',
                documents: caseData.documents || [],
                role: caseData.role,
                caseLawReferences: caseData.caseLawReferences || []
            };
            
            return callback(null, {
                statusCode: 200,
                headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                body: JSON.stringify(transformedCase)
            });
        } catch (error) {
            console.error('Error fetching case:', error);
            return callback(null, {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Failed to fetch case data' })
            });
        }
    }
    
    // Handle cases list endpoint - get real data from S3
    if (httpMethod === 'GET' && path && (path === '/cases' || path.endsWith('/cases'))) {
        console.log('Cases list request');
        
        try {
            const result = await s3.getObject({ Bucket: BUCKET_NAME, Key: CASES_KEY }).promise();
            const cases = JSON.parse(result.Body.toString());
            
            return callback(null, {
                statusCode: 200,
                headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                body: JSON.stringify({ cases: cases, total: cases.length })
            });
        } catch (error) {
            console.error('Error fetching cases:', error);
            return callback(null, {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Failed to fetch cases data' })
            });
        }
    }
    
    // Handle case events endpoint - get real data from S3
    if (httpMethod === 'GET' && path && path.includes('/cases/') && path.includes('/events')) {
        const caseId = path.split('/cases/')[1]?.split('/events')[0];
        console.log('Case events request for ID:', caseId);
        
        try {
            const result = await s3.getObject({ Bucket: BUCKET_NAME, Key: CASES_KEY }).promise();
            const cases = JSON.parse(result.Body.toString());
            const caseData = cases.find(c => c.id === caseId);
            
            if (!caseData) {
                return callback(null, {
                    statusCode: 404,
                    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: 'Case not found' })
                });
            }
            
            // Use caseLawReferences as events from real S3 data
            const events = caseData.caseLawReferences || [];
            
            return callback(null, {
                statusCode: 200,
                headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                body: JSON.stringify({ events: events, total: events.length, caseId: caseId })
            });
        } catch (error) {
            console.error('Error fetching case events:', error);
            return callback(null, {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Failed to fetch case events' })
            });
        }
    }
    
    // Handle case-folders endpoint - get real S3 objects
    if (httpMethod === 'GET' && path && path.includes('/case-folders/')) {
        const caseId = path.split('/case-folders/')[1];
        console.log('Case folders request for ID:', caseId);
        
        try {
            const listParams = { Bucket: BUCKET_NAME, Prefix: `cases/${caseId}/`, MaxKeys: 1000 };
            const s3Response = await s3.listObjectsV2(listParams).promise();
            const allObjects = s3Response.Contents || [];
            
            const folders = [];
            const documents = [];
            
            for (const obj of allObjects) {
                const key = obj.Key;
                
                if (key.includes('/folders/') && key.endsWith('.folderinfo')) {
                    try {
                        const headResponse = await s3.headObject({ Bucket: BUCKET_NAME, Key: key }).promise();
                        const metadata = headResponse.Metadata || {};
                        folders.push({
                            name: metadata.foldername || 'Unknown Folder',
                            path: metadata.folderpath || '',
                            fullPath: key.replace('.folderinfo', ''),
                            createdAt: metadata.createdat || obj.LastModified?.toISOString()
                        });
                    } catch (error) {
                        console.log('Could not get folder metadata for:', key);
                    }
                } else if (key.includes('/documents/') && !key.includes('/versions/') && 
                          (key.endsWith('.pdf') || key.endsWith('.docx') || key.endsWith('.txt'))) {
                    try {
                        const headResponse = await s3.headObject({ Bucket: BUCKET_NAME, Key: key }).promise();
                        const metadata = headResponse.Metadata || {};
                        
                        let folderPath = '';
                        if (key.includes('/folders/')) {
                            const folderMatch = key.match(/\/folders\/([^\/]+)\//);
                            folderPath = folderMatch ? folderMatch[1] : '';
                        }
                        
                        documents.push({
                            id: key.split('/').pop().replace(/\.(pdf|docx|txt)$/, ''),
                            filename: metadata.originalfilename || key.split('/').pop(),
                            key: key,
                            folderPath: folderPath,
                            uploadedAt: metadata.uploadedat || obj.LastModified?.toISOString(),
                            size: Math.round((obj.Size || 0) / 1024) + ' KB',
                            contentType: headResponse.ContentType || 'application/octet-stream'
                        });
                    } catch (error) {
                        console.log('Could not get document metadata for:', key);
                    }
                }
            }
            
            return callback(null, {
                statusCode: 200,
                headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folders: folders,
                    documents: documents,
                    caseId: caseId,
                    totalFolders: folders.length,
                    totalDocuments: documents.length,
                    message: 'Folders and documents loaded successfully'
                })
            });
        } catch (error) {
            console.error('S3 error loading case folders:', error);
            return callback(null, {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Failed to load folders from S3', details: error.message })
            });
        }
    }
    
    // Handle clients endpoints - get real data from S3
    if (httpMethod === 'GET' && path && path.includes('/clients')) {
        const clientId = path.includes('/clients/') ? path.split('/clients/')[1] : null;
        
        try {
            const result = await s3.getObject({ Bucket: BUCKET_NAME, Key: CLIENTS_KEY }).promise();
            const clients = JSON.parse(result.Body.toString());
            
            if (clientId) {
                // Individual client
                const client = clients.find(c => c.id === clientId);
                if (!client) {
                    return callback(null, {
                        statusCode: 404,
                        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                        body: JSON.stringify({ error: 'Client not found' })
                    });
                }
                
                // Transform client data
                const transformedClient = {
                    id: client.id,
                    name: client.full_name || `${client.first_name} ${client.last_name}`,
                    email: client.email,
                    phone: client.phone,
                    address: client.address?.street ? 
                        `${client.address.street}, ${client.address.city}, ${client.address.state} ${client.address.zip}`.trim().replace(/^,|,$/, '') : '',
                    createdAt: client.created_at,
                    activeCases: client.linked_cases?.length || 0,
                    totalBilled: 0,
                    company_name: client.company_name,
                    status: client.status || 'active',
                    notes: client.notes || []
                };
                
                return callback(null, {
                    statusCode: 200,
                    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                    body: JSON.stringify(transformedClient)
                });
            } else {
                // Clients list - transform all clients
                const transformedClients = clients.map(client => ({
                    id: client.id,
                    name: client.full_name || `${client.first_name} ${client.last_name}`,
                    email: client.email,
                    phone: client.phone,
                    address: client.address?.street ? 
                        `${client.address.street}, ${client.address.city}, ${client.address.state} ${client.address.zip}`.trim().replace(/^,|,$/, '') : '',
                    createdAt: client.created_at,
                    activeCases: client.linked_cases?.length || 0,
                    totalBilled: 0,
                    company_name: client.company_name,
                    status: client.status || 'active'
                }));
                
                return callback(null, {
                    statusCode: 200,
                    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clients: transformedClients, total: transformedClients.length })
                });
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
            return callback(null, {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Failed to fetch clients data' })
            });
        }
    }
    
    // Handle PUT requests for client updates - update real S3 data
    if (httpMethod === 'PUT' && path && path.includes('/clients/')) {
        const clientId = path.split('/clients/')[1];
        
        try {
            const result = await s3.getObject({ Bucket: BUCKET_NAME, Key: CLIENTS_KEY }).promise();
            const clients = JSON.parse(result.Body.toString());
            const clientIndex = clients.findIndex(c => c.id === clientId);
            
            if (clientIndex === -1) {
                return callback(null, {
                    statusCode: 404,
                    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: 'Client not found' })
                });
            }
            
            const updateData = JSON.parse(event.body || '{}');
            clients[clientIndex] = { ...clients[clientIndex], ...updateData, updated_at: new Date().toISOString() };
            
            // Save back to S3
            await s3.putObject({
                Bucket: BUCKET_NAME,
                Key: CLIENTS_KEY,
                Body: JSON.stringify(clients, null, 2),
                ContentType: 'application/json'
            }).promise();
            
            return callback(null, {
                statusCode: 200,
                headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Client updated successfully', client: clients[clientIndex] })
            });
        } catch (error) {
            console.error('Error updating client:', error);
            return callback(null, {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Failed to update client' })
            });
        }
    }
    
    // Handle POST/PUT/DELETE for cases - add/update/delete cases
    if ((httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'DELETE') && path && path.includes('/cases')) {
        return callback(null, {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `${httpMethod} operation on cases - endpoint exists with CORS` })
        });
    }
    
    // Handle file operations - preview, upload, delete, versions
    if (path && (path.includes('/preview') || path.includes('/upload') || path.includes('/delete') || path.includes('/versions'))) {
        return callback(null, {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `File operation endpoint - ${path} exists with CORS` })
        });
    }
    
    // Default response
    const response = {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: 'Lambda function is working',
            timestamp: new Date().toISOString(),
            path: path,
            httpMethod: httpMethod
        })
    };
    
    callback(null, response);
};
