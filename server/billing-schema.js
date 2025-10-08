// DynamoDB Schema for IOLTA-Compliant Billing System

// Billing Table Schema
// Primary Key: billing_id (String)
// Global Secondary Index: case_id-index (case_id as PK)
// Global Secondary Index: client_id-index (client_id as PK)
// Global Secondary Index: status-index (status as PK, created_at as SK)
const BILLING_TABLE_SCHEMA = {
  TableName: 'Billing',
  KeySchema: [
    {
      AttributeName: 'billing_id',
      KeyType: 'HASH' // Partition key
    }
  ],
  AttributeDefinitions: [
    {
      AttributeName: 'billing_id',
      AttributeType: 'S'
    },
    {
      AttributeName: 'case_id',
      AttributeType: 'S'
    },
    {
      AttributeName: 'client_id',
      AttributeType: 'S'
    },
    {
      AttributeName: 'status',
      AttributeType: 'S'
    },
    {
      AttributeName: 'created_at',
      AttributeType: 'S'
    }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'case_id-index',
      KeySchema: [
        {
          AttributeName: 'case_id',
          KeyType: 'HASH'
        }
      ],
      Projection: {
        ProjectionType: 'ALL'
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    },
    {
      IndexName: 'client_id-index',
      KeySchema: [
        {
          AttributeName: 'client_id',
          KeyType: 'HASH'
        }
      ],
      Projection: {
        ProjectionType: 'ALL'
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    },
    {
      IndexName: 'status-index',
      KeySchema: [
        {
          AttributeName: 'status',
          KeyType: 'HASH'
        },
        {
          AttributeName: 'created_at',
          KeyType: 'RANGE'
        }
      ],
      Projection: {
        ProjectionType: 'ALL'
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5
  }
};

// Billing Item Structure
const BILLING_ITEM_SCHEMA = {
  billing_id: 'string (UUID)', // Primary key
  case_id: 'string (FK to cases)', // Foreign key to case
  client_id: 'string (FK to clients)', // Foreign key to client
  payment_type: 'string (trust | operating)', // Type of payment
  base_amount: 'number', // Base amount before fees
  processing_fee: 'number', // 4% fee for trust payments, 0 for operating
  total_amount: 'number', // base_amount + processing_fee
  status: 'string (pending | paid)', // Payment status
  created_at: 'string (ISO date)', // Creation timestamp
  due_date: 'string (ISO date)', // Payment due date
  description: 'string', // Description of the billing item
  ledger_entries: 'array', // Array of ledger entries for this billing
  // Ledger entries structure:
  // [
  //   {
  //     ledger_account: 'trust | operating',
  //     amount: number,
  //     entry_type: 'credit | debit',
  //     description: string,
  //     created_at: string (ISO date)
  //   }
  // ]
};

// Ledger Table Schema (for tracking IOLTA compliance)
// Primary Key: ledger_id (String)
// Global Secondary Index: account_date-index (ledger_account as PK, created_at as SK)
const LEDGER_TABLE_SCHEMA = {
  TableName: 'Ledger',
  KeySchema: [
    {
      AttributeName: 'ledger_id',
      KeyType: 'HASH' // Partition key
    }
  ],
  AttributeDefinitions: [
    {
      AttributeName: 'ledger_id',
      AttributeType: 'S'
    },
    {
      AttributeName: 'ledger_account',
      AttributeType: 'S'
    },
    {
      AttributeName: 'created_at',
      AttributeType: 'S'
    },
    {
      AttributeName: 'billing_id',
      AttributeType: 'S'
    }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'account_date-index',
      KeySchema: [
        {
          AttributeName: 'ledger_account',
          KeyType: 'HASH'
        },
        {
          AttributeName: 'created_at',
          KeyType: 'RANGE'
        }
      ],
      Projection: {
        ProjectionType: 'ALL'
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    },
    {
      IndexName: 'billing_id-index',
      KeySchema: [
        {
          AttributeName: 'billing_id',
          KeyType: 'HASH'
        }
      ],
      Projection: {
        ProjectionType: 'ALL'
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5
  }
};

// Ledger Item Structure
const LEDGER_ITEM_SCHEMA = {
  ledger_id: 'string (UUID)', // Primary key
  billing_id: 'string (FK to billing)', // Reference to billing record
  ledger_account: 'string (trust | operating)', // IOLTA account type
  amount: 'number', // Amount for this ledger entry
  entry_type: 'string (credit | debit)', // Type of ledger entry
  description: 'string', // Description of the transaction
  created_at: 'string (ISO date)', // Entry timestamp
  balance_after: 'number', // Running balance after this entry (calculated)
};

// Payment Routing Logic:
// For Trust Deposits:
// - Trust amount → Trust Ledger (credit)
// - Processing fee (4%) → Operating Ledger (credit)
//
// For Operating Payments:
// - Full amount → Operating Ledger (credit)

module.exports = {
  BILLING_TABLE_SCHEMA,
  BILLING_ITEM_SCHEMA,
  LEDGER_TABLE_SCHEMA,
  LEDGER_ITEM_SCHEMA
};