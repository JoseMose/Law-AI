// Using minimal dependencies for smaller package size
// const AWS = require('@aws-sdk/client-dynamodb');
// const { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
// const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

// For now using mock data - will integrate with DynamoDB later
// const dynamoClient = new AWS.DynamoDBClient({ region: 'us-east-1' });
// const docClient = DynamoDBDocumentClient.from(dynamoClient);
// const s3Client = new S3Client({ region: 'us-east-1' });

// Mock data for initial testing
const mockCases = [
    {
        id: 'case-1',
        title: 'Contract Dispute - ABC Corp',
        client: 'ABC Corporation',
        status: 'Active',
        createdAt: '2024-01-15',
        lastModified: '2024-10-08',
        description: 'Contract dispute regarding service delivery terms'
    },
    {
        id: 'case-2', 
        title: 'Employment Agreement Review',
        client: 'XYZ Tech Inc',
        status: 'Pending Review',
        createdAt: '2024-02-20',
        lastModified: '2024-10-07',
        description: 'Review and revision of employment agreement templates'
    },
    {
        id: 'case-3',
        title: 'Intellectual Property Filing',
        client: 'StartupCo LLC',
        status: 'Active',
        createdAt: '2024-03-10',
        lastModified: '2024-10-06',
        description: 'Patent and trademark filing assistance'
    }
];

const mockClients = [
    {
        id: 'client-1',
        name: 'ABC Corporation',
        email: 'legal@abccorp.com',
        phone: '(555) 123-4567',
        address: '123 Business Ave, Atlanta, GA 30309',
        createdAt: '2024-01-10',
        activeCases: 1,
        totalBilled: 15750.00
    },
    {
        id: 'client-2',
        name: 'XYZ Tech Inc',
        email: 'contracts@xyztech.com', 
        phone: '(555) 987-6543',
        address: '456 Innovation Dr, Atlanta, GA 30309',
        createdAt: '2024-02-15',
        activeCases: 1,
        totalBilled: 8920.00
    },
    {
        id: 'client-3',
        name: 'StartupCo LLC',
        email: 'info@startupco.com',
        phone: '(555) 555-1234',
        address: '789 Startup Blvd, Atlanta, GA 30309',
        createdAt: '2024-03-05',
        activeCases: 1,
        totalBilled: 12400.00
    }
];

exports.handler = async (event) => {
    console.log('Cases API Event:', JSON.stringify(event));
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
    };

    try {
        const { httpMethod, path, pathParameters, body } = event;

        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }

        // GET /cases - List all cases
        if (path === '/cases' && httpMethod === 'GET') {
            // For now, return mock data. Later we can implement DynamoDB integration
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    cases: mockCases,
                    total: mockCases.length
                })
            };
        }

        // POST /cases - Create new case
        if (path === '/cases' && httpMethod === 'POST') {
            const caseData = JSON.parse(body);
            const newCase = {
                id: `case-${Date.now()}`,
                ...caseData,
                createdAt: new Date().toISOString().split('T')[0],
                lastModified: new Date().toISOString().split('T')[0],
                status: 'Active'
            };
            
            // Add to mock array (in production, save to DynamoDB)
            mockCases.push(newCase);
            
            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(newCase)
            };
        }

        // GET /cases/{id} - Get specific case
        if (path.startsWith('/cases/') && httpMethod === 'GET') {
            const caseId = pathParameters.id;
            const case_ = mockCases.find(c => c.id === caseId);
            
            if (!case_) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Case not found' })
                };
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(case_)
            };
        }

        // DELETE /cases/{id} - Delete case
        if (path.startsWith('/cases/') && httpMethod === 'DELETE') {
            const caseId = pathParameters.id;
            const caseIndex = mockCases.findIndex(c => c.id === caseId);
            
            if (caseIndex === -1) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Case not found' })
                };
            }
            
            mockCases.splice(caseIndex, 1);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Case deleted successfully' })
            };
        }

        // GET /clients - List all clients
        if (path === '/clients' && httpMethod === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    clients: mockClients,
                    total: mockClients.length
                })
            };
        }

        // POST /clients - Create new client
        if (path === '/clients' && httpMethod === 'POST') {
            const clientData = JSON.parse(body);
            const newClient = {
                id: `client-${Date.now()}`,
                ...clientData,
                createdAt: new Date().toISOString().split('T')[0],
                activeCases: 0,
                totalBilled: 0
            };
            
            mockClients.push(newClient);
            
            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(newClient)
            };
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Endpoint not found' })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message 
            })
        };
    }
};