const AWS = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const billingService = require('./billing-service');

const client = new AWS.DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event));
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
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

        if (path === '/billing' && httpMethod === 'GET') {
            const records = await billingService.getBillingRecords();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(records)
            };
        }

        if (path === '/billing' && httpMethod === 'POST') {
            const billingData = JSON.parse(body);
            const result = await billingService.createBillingRecord(billingData);
            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(result)
            };
        }

        if (path.startsWith('/ledger/') && httpMethod === 'GET') {
            const account = pathParameters.account;
            const records = await billingService.getLedgerRecords(account);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(records)
            };
        }

        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Not Found' })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};