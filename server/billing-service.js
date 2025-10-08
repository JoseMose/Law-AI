// Billing Service for IOLTA-Compliant Payment Processing
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  GetCommand
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Table names
const BILLING_TABLE = 'Billing';
const LEDGER_TABLE = 'Ledger';

/**
 * Calculate processing fee for trust deposits (4% IOLTA compliance)
 * @param {number} baseAmount - The base amount of the trust deposit
 * @returns {number} - The 4% processing fee
 */
function calculateProcessingFee(baseAmount) {
  return Math.round((baseAmount * 0.04) * 100) / 100; // Round to 2 decimal places
}

/**
 * Create ledger entries for a billing transaction
 * @param {string} billingId - The billing record ID
 * @param {string} paymentType - 'trust' or 'operating'
 * @param {number} baseAmount - Base amount
 * @param {number} processingFee - Processing fee (0 for operating)
 * @returns {Array} - Array of ledger entries
 */
function createLedgerEntries(billingId, paymentType, baseAmount, processingFee) {
  const entries = [];
  const timestamp = new Date().toISOString();

  if (paymentType === 'trust') {
    // Trust deposit: base amount goes to trust ledger
    entries.push({
      ledger_id: uuidv4(),
      billing_id: billingId,
      ledger_account: 'trust',
      amount: baseAmount,
      entry_type: 'credit',
      description: 'Trust deposit from client retainer',
      created_at: timestamp
    });

    // Processing fee goes to operating ledger
    if (processingFee > 0) {
      entries.push({
        ledger_id: uuidv4(),
        billing_id: billingId,
        ledger_account: 'operating',
        amount: processingFee,
        entry_type: 'credit',
        description: 'Processing fee for trust deposit',
        created_at: timestamp
      });
    }
  } else if (paymentType === 'operating') {
    // Operating payment: full amount goes to operating ledger
    entries.push({
      ledger_id: uuidv4(),
      billing_id: billingId,
      ledger_account: 'operating',
      amount: baseAmount,
      entry_type: 'credit',
      description: 'Operating payment for legal services',
      created_at: timestamp
    });
  }

  return entries;
}

/**
 * Create a new billing record
 * @param {Object} billingData - Billing data
 * @param {string} billingData.caseId - Case ID
 * @param {string} billingData.clientId - Client ID
 * @param {string} billingData.paymentType - 'trust' or 'operating'
 * @param {number} billingData.baseAmount - Base amount
 * @param {string} billingData.dueDate - Due date (ISO string)
 * @param {string} billingData.description - Description
 * @returns {Object} - Created billing record
 */
async function createBillingRecord(billingData) {
  const {
    caseId,
    clientId,
    paymentType,
    baseAmount,
    dueDate,
    description
  } = billingData;

  // Validate required fields
  if (!caseId || !clientId || !paymentType || !baseAmount || !dueDate) {
    throw new Error('Missing required fields: caseId, clientId, paymentType, baseAmount, dueDate');
  }

  if (!['trust', 'operating'].includes(paymentType)) {
    throw new Error('Invalid payment type. Must be "trust" or "operating"');
  }

  if (baseAmount <= 0) {
    throw new Error('Base amount must be greater than 0');
  }

  // Calculate processing fee
  const processingFee = paymentType === 'trust' ? calculateProcessingFee(baseAmount) : 0;
  const totalAmount = baseAmount + processingFee;

  // Create billing record
  const billingId = uuidv4();
  const createdAt = new Date().toISOString();

  const billingRecord = {
    billing_id: billingId,
    case_id: caseId,
    client_id: clientId,
    payment_type: paymentType,
    base_amount: baseAmount,
    processing_fee: processingFee,
    total_amount: totalAmount,
    status: 'pending',
    created_at: createdAt,
    due_date: dueDate,
    description: description || '',
    ledger_entries: []
  };

  // Create ledger entries
  const ledgerEntries = createLedgerEntries(billingId, paymentType, baseAmount, processingFee);
  billingRecord.ledger_entries = ledgerEntries;

  // Save billing record to DynamoDB
  await docClient.send(new PutCommand({
    TableName: BILLING_TABLE,
    Item: billingRecord
  }));

  // Save ledger entries to DynamoDB
  for (const entry of ledgerEntries) {
    await docClient.send(new PutCommand({
      TableName: LEDGER_TABLE,
      Item: entry
    }));
  }

  return billingRecord;
}

/**
 * Get all billing records with optional filters
 * @param {Object} filters - Optional filters
 * @param {string} filters.caseId - Filter by case ID
 * @param {string} filters.clientId - Filter by client ID
 * @param {string} filters.paymentType - Filter by payment type
 * @param {string} filters.status - Filter by status
 * @returns {Array} - Array of billing records
 */
async function getBillingRecords(filters = {}) {
  let params = {
    TableName: BILLING_TABLE
  };

  // Use appropriate index based on filter
  if (filters.caseId) {
    params.IndexName = 'case_id-index';
    params.KeyConditionExpression = 'case_id = :caseId';
    params.ExpressionAttributeValues = { ':caseId': filters.caseId };
  } else if (filters.clientId) {
    params.IndexName = 'client_id-index';
    params.KeyConditionExpression = 'client_id = :clientId';
    params.ExpressionAttributeValues = { ':clientId': filters.clientId };
  } else if (filters.status) {
    params.IndexName = 'status-index';
    params.KeyConditionExpression = 'status = :status';
    params.ExpressionAttributeValues = { ':status': filters.status };
  } else {
    // Scan all records if no specific filter
    params = {
      TableName: BILLING_TABLE
    };
  }

  const result = await docClient.send(
    filters.caseId || filters.clientId || filters.status
      ? new QueryCommand(params)
      : new ScanCommand(params)
  );

  let records = result.Items || [];

  // Apply additional filters if needed
  if (filters.paymentType) {
    records = records.filter(record => record.payment_type === filters.paymentType);
  }

  // Sort by created_at descending
  records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return records;
}

/**
 * Get a single billing record by ID
 * @param {string} billingId - Billing record ID
 * @returns {Object|null} - Billing record or null if not found
 */
async function getBillingRecord(billingId) {
  const result = await docClient.send(new GetCommand({
    TableName: BILLING_TABLE,
    Key: { billing_id: billingId }
  }));

  return result.Item || null;
}

/**
 * Get ledger entries for a specific account
 * @param {string} ledgerAccount - 'trust' or 'operating'
 * @returns {Array} - Array of ledger entries
 */
async function getLedgerEntries(ledgerAccount) {
  const result = await docClient.send(new QueryCommand({
    TableName: LEDGER_TABLE,
    IndexName: 'account_date-index',
    KeyConditionExpression: 'ledger_account = :account',
    ExpressionAttributeValues: { ':account': ledgerAccount },
    ScanIndexForward: false // Sort by date descending
  }));

  return result.Items || [];
}

/**
 * Update billing record status
 * @param {string} billingId - Billing record ID
 * @param {string} status - New status ('pending' or 'paid')
 */
async function updateBillingStatus(billingId, status) {
  if (!['pending', 'paid'].includes(status)) {
    throw new Error('Invalid status. Must be "pending" or "paid"');
  }

  await docClient.send(new PutCommand({
    TableName: BILLING_TABLE,
    Item: {
      billing_id: billingId,
      status: status,
      updated_at: new Date().toISOString()
    },
    ConditionExpression: 'attribute_exists(billing_id)'
  }));
}

module.exports = {
  createBillingRecord,
  getBillingRecords,
  getBillingRecord,
  getLedgerEntries,
  updateBillingStatus,
  calculateProcessingFee
};