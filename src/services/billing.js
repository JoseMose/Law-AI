const API_URL = process.env.REACT_APP_API_URL || 'https://f4w6ji2x85.execute-api.us-east-1.amazonaws.com/dev';

class BillingError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'BillingError';
    this.code = code;
  }
}

export const billingService = {
  /**
   * Get all billing records with optional filters
   * @param {Object} filters - Optional filters
   * @param {string} filters.caseId - Filter by case ID
   * @param {string} filters.clientId - Filter by client ID
   * @param {string} filters.paymentType - Filter by payment type ('trust' or 'operating')
   * @param {string} filters.status - Filter by status ('pending' or 'paid')
   * @returns {Promise<Array>} - Array of billing records
   */
  async getBillingRecords(filters = {}) {
    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) {
        throw new BillingError('Authentication required', 'AUTH_REQUIRED');
      }

      const queryParams = new URLSearchParams();
      if (filters.caseId) queryParams.append('caseId', filters.caseId);
      if (filters.clientId) queryParams.append('clientId', filters.clientId);
      if (filters.paymentType) queryParams.append('paymentType', filters.paymentType);
      if (filters.status) queryParams.append('status', filters.status);

      const url = `${API_URL}/billing${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new BillingError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          'API_ERROR'
        );
      }

      const data = await response.json();
      return data.billing || [];
    } catch (error) {
      if (error instanceof BillingError) {
        throw error;
      }
      console.error('Error fetching billing records:', error);
      throw new BillingError('Failed to fetch billing records', 'NETWORK_ERROR');
    }
  },

  /**
   * Get a single billing record by ID
   * @param {string} billingId - Billing record ID
   * @returns {Promise<Object>} - Billing record
   */
  async getBillingRecord(billingId) {
    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) {
        throw new BillingError('Authentication required', 'AUTH_REQUIRED');
      }

      const response = await fetch(`${API_URL}/billing/${billingId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new BillingError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          'API_ERROR'
        );
      }

      const data = await response.json();
      return data.billing;
    } catch (error) {
      if (error instanceof BillingError) {
        throw error;
      }
      console.error('Error fetching billing record:', error);
      throw new BillingError('Failed to fetch billing record', 'NETWORK_ERROR');
    }
  },

  /**
   * Create a new billing record
   * @param {Object} billingData - Billing data
   * @param {string} billingData.caseId - Case ID
   * @param {string} billingData.clientId - Client ID
   * @param {string} billingData.paymentType - 'trust' or 'operating'
   * @param {number} billingData.baseAmount - Base amount
   * @param {string} billingData.dueDate - Due date (ISO string)
   * @param {string} billingData.description - Description
   * @returns {Promise<Object>} - Created billing record
   */
  async createBillingRecord(billingData) {
    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) {
        throw new BillingError('Authentication required', 'AUTH_REQUIRED');
      }

      // Validate required fields
      const requiredFields = ['caseId', 'clientId', 'paymentType', 'baseAmount', 'dueDate'];
      for (const field of requiredFields) {
        if (!billingData[field]) {
          throw new BillingError(`${field} is required`, 'VALIDATION_ERROR');
        }
      }

      if (!['trust', 'operating'].includes(billingData.paymentType)) {
        throw new BillingError('Payment type must be "trust" or "operating"', 'VALIDATION_ERROR');
      }

      if (billingData.baseAmount <= 0) {
        throw new BillingError('Base amount must be greater than 0', 'VALIDATION_ERROR');
      }

      const response = await fetch(`${API_URL}/billing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'same-origin',
        body: JSON.stringify(billingData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new BillingError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          'API_ERROR'
        );
      }

      const data = await response.json();
      return data.billing;
    } catch (error) {
      if (error instanceof BillingError) {
        throw error;
      }
      console.error('Error creating billing record:', error);
      throw new BillingError('Failed to create billing record', 'NETWORK_ERROR');
    }
  },

  /**
   * Update billing record status
   * @param {string} billingId - Billing record ID
   * @param {string} status - New status ('pending' or 'paid')
   * @returns {Promise<Object>} - Update result
   */
  async updateBillingStatus(billingId, status) {
    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) {
        throw new BillingError('Authentication required', 'AUTH_REQUIRED');
      }

      if (!['pending', 'paid'].includes(status)) {
        throw new BillingError('Status must be "pending" or "paid"', 'VALIDATION_ERROR');
      }

      const response = await fetch(`${API_URL}/billing/${billingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'same-origin',
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new BillingError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          'API_ERROR'
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof BillingError) {
        throw error;
      }
      console.error('Error updating billing status:', error);
      throw new BillingError('Failed to update billing status', 'NETWORK_ERROR');
    }
  },

  /**
   * Get ledger entries for a specific account
   * @param {string} account - 'trust' or 'operating'
   * @returns {Promise<Array>} - Array of ledger entries
   */
  async getLedgerEntries(account) {
    try {
      const token = sessionStorage.getItem('accessToken');
      if (!token) {
        throw new BillingError('Authentication required', 'AUTH_REQUIRED');
      }

      if (!['trust', 'operating'].includes(account)) {
        throw new BillingError('Account must be "trust" or "operating"', 'VALIDATION_ERROR');
      }

      const response = await fetch(`${API_URL}/ledger/${account}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new BillingError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          'API_ERROR'
        );
      }

      const data = await response.json();
      return data.ledger || [];
    } catch (error) {
      if (error instanceof BillingError) {
        throw error;
      }
      console.error('Error fetching ledger entries:', error);
      throw new BillingError('Failed to fetch ledger entries', 'NETWORK_ERROR');
    }
  },

  /**
   * Calculate processing fee for trust deposits (4%)
   * @param {number} baseAmount - Base amount
   * @returns {number} - Processing fee
   */
  calculateProcessingFee(baseAmount) {
    return Math.round((baseAmount * 0.04) * 100) / 100;
  }
};