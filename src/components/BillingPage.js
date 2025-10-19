import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { billingService } from '../services/billing';

const API_BASE = process.env.REACT_APP_API_URL || 'https://sb7snqtgc3.execute-api.us-east-1.amazonaws.com/dev';

const BillingPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [billingRecords, setBillingRecords] = useState([]);
  const [trustLedger, setTrustLedger] = useState([]);
  const [operatingLedger, setOperatingLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    caseId: '',
    clientId: '',
    paymentType: '',
    status: ''
  });

  // New invoice form
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    caseId: '',
    clientId: '',
    paymentType: 'operating',
    baseAmount: '',
    dueDate: '',
    description: ''
  });
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [showPaymentBreakdown, setShowPaymentBreakdown] = useState(false);

  // Real data from S3
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Load clients and cases from S3
  const loadClientsAndCases = useCallback(async () => {
    try {
      setLoadingData(true);
      
      // Fetch clients from S3
      const clientsResponse = await fetch(`${API_BASE}/auth/clients`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
      });

      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        setClients(clientsData.clients || []);
      } else {
        console.error('Failed to load clients');
      }

      // Fetch cases from S3
      const casesResponse = await fetch(`${API_BASE}/auth/cases`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
      });

      if (casesResponse.ok) {
        const casesData = await casesResponse.json();
        setCases(casesData.cases || []);
      } else {
        console.error('Failed to load cases');
      }
    } catch (err) {
      console.error('Error loading clients and cases:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const loadBillingData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load actual payment records from cases and clients
      const allPayments = [];
      
      // Extract payments from cases
      cases.forEach(caseItem => {
        if (caseItem.payments && Array.isArray(caseItem.payments)) {
          caseItem.payments.forEach(payment => {
            allPayments.push({
              ...payment,
              caseTitle: caseItem.title,
              caseId: caseItem.id
            });
          });
        }
      });

      // Apply filters
      let filteredRecords = allPayments;
      if (filters.caseId) {
        filteredRecords = filteredRecords.filter(r => r.caseId === filters.caseId);
      }
      if (filters.clientId) {
        filteredRecords = filteredRecords.filter(r => r.clientId === filters.clientId);
      }
      if (filters.paymentType) {
        filteredRecords = filteredRecords.filter(r => r.paymentType === filters.paymentType);
      }
      if (filters.status) {
        filteredRecords = filteredRecords.filter(r => r.status === filters.status);
      }

      // Sort by date (newest first)
      filteredRecords.sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt));

      setBillingRecords(filteredRecords);

      // Build ledger entries from payments
      const trustPayments = allPayments.filter(p => p.paymentType === 'trust');
      const operatingPayments = allPayments.filter(p => p.paymentType === 'operating');

      setTrustLedger(trustPayments.map(p => ({
        ledger_id: p.id,
        amount: p.amount,
        entry_type: 'credit',
        description: `Payment for ${p.caseTitle || 'case'}`,
        created_at: p.paidAt || p.createdAt
      })));

      setOperatingLedger(operatingPayments.map(p => ({
        ledger_id: p.id,
        amount: p.amount,
        entry_type: 'credit',
        description: `Payment for ${p.caseTitle || 'case'}`,
        created_at: p.paidAt || p.createdAt
      })));
    } catch (err) {
      setError(err.message);
      console.error('Error loading billing data:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, cases, clients]);

  useEffect(() => {
    loadClientsAndCases();
    loadBillingData();
  }, [loadBillingData, loadClientsAndCases]);

  const handleCreateInvoice = async () => {
    // Validation
    if (!newInvoice.caseId || !newInvoice.clientId) {
      setError('Please select both a case and client');
      return;
    }

    if (!newInvoice.baseAmount || newInvoice.baseAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (!newInvoice.dueDate) {
      setError('Please select a due date');
      return;
    }

    try {
      setCreatingInvoice(true);
      setError(null);

      const invoiceData = {
        ...newInvoice,
        baseAmount: parseFloat(newInvoice.baseAmount)
      };

      // Create the invoice record
      const createdInvoice = await billingService.createBillingRecord(invoiceData);

      // Create Stripe Checkout Session for payment
      const selectedClient = clients.find(c => c.id === newInvoice.clientId);
      const selectedCase = cases.find(c => c.id === newInvoice.caseId);
      
      const breakdown = calculateBreakdown();
      const paymentResponse = await fetch(`${API_BASE}/billing/create-payment-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          billingId: createdInvoice.billing_id,
          amount: breakdown.total,
          currency: 'usd',
          clientName: `${selectedClient.first_name} ${selectedClient.last_name}`,
          clientEmail: selectedClient.email,
          description: newInvoice.description || `Invoice for ${selectedCase.title || selectedCase.name}`,
          paymentType: newInvoice.paymentType,
          metadata: {
            billing_id: createdInvoice.billing_id,
            case_id: newInvoice.caseId,
            client_id: newInvoice.clientId,
            payment_type: newInvoice.paymentType
          }
        })
      });

      if (!paymentResponse.ok) {
        throw new Error('Failed to create payment session');
      }

      const { sessionUrl, sessionId } = await paymentResponse.json();

      // Add to local state
      setBillingRecords(prev => [{
        ...createdInvoice,
        stripe_session_id: sessionId,
        payment_url: sessionUrl
      }, ...prev]);

      // Reset form
      setNewInvoice({
        caseId: '',
        clientId: '',
        paymentType: 'operating',
        baseAmount: '',
        dueDate: '',
        description: ''
      });
      setShowNewInvoiceModal(false);
      setShowPaymentBreakdown(false);

      // Reload data to get updated ledger
      await loadBillingData();

      // Open Stripe Checkout in a new tab
      window.open(sessionUrl, '_blank');
    } catch (err) {
      setError(err.message);
      console.error('Error creating invoice:', err);
    } finally {
      setCreatingInvoice(false);
    }
  };

  const calculateBreakdown = () => {
    const baseAmount = parseFloat(newInvoice.baseAmount) || 0;
    const processingFee = newInvoice.paymentType === 'trust'
      ? billingService.calculateProcessingFee(baseAmount)
      : 0;
    const total = baseAmount + processingFee;

    return { baseAmount, processingFee, total };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentTypeBadge = (type) => {
    const typeClasses = {
      trust: 'bg-blue-100 text-blue-800',
      operating: 'bg-purple-100 text-purple-800'
    };

    const displayType = type || 'unknown';

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeClasses[displayType] || 'bg-gray-100 text-gray-800'}`}>
        {displayType.charAt(0).toUpperCase() + displayType.slice(1)}
      </span>
    );
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'new-invoice', label: 'New Invoice', icon: '➕' },
    { id: 'trust-ledger', label: 'Trust Ledger', icon: '🏦' },
    { id: 'operating-ledger', label: 'Operating Ledger', icon: '💼' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing Management</h1>
          <p className="text-gray-600">IOLTA-compliant billing and payment tracking</p>
          <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
            <p className="text-sm text-blue-800">
              <strong>💳 Lawyer → Client Payments:</strong> Use your Stripe account to charge clients for legal services. 
              Funds go directly to your trust or operating account.
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Note: Platform subscription fees (your monthly SaaS billing) will be added in a future update.
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Filters */}
              <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <select
                    value={filters.caseId}
                    onChange={(e) => setFilters(prev => ({ ...prev, caseId: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Cases</option>
                    {cases.map(case_ => (
                      <option key={case_.id} value={case_.id}>{case_.title}</option>
                    ))}
                  </select>

                  <select
                    value={filters.clientId}
                    onChange={(e) => setFilters(prev => ({ ...prev, clientId: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Clients</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.first_name} {client.last_name} {client.company_name && `(${client.company_name})`}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filters.paymentType}
                    onChange={(e) => setFilters(prev => ({ ...prev, paymentType: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Payment Types</option>
                    <option value="trust">Trust</option>
                    <option value="operating">Operating</option>
                  </select>

                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              {/* Billing Records Table */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Billing Records</h3>
                </div>

                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading billing records...</p>
                  </div>
                ) : billingRecords.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No billing records found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Case
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {billingRecords.map((record) => (
                          <tr key={record.billing_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(record.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {cases.find(c => c.id === record.case_id)?.title || record.case_id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(() => {
                                const client = clients.find(c => c.id === record.client_id);
                                return client ? `${client.first_name} ${client.last_name}` : record.client_id;
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getPaymentTypeBadge(record.payment_type)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(record.total_amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(record.status)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'new-invoice' && (
            <motion.div
              key="new-invoice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Create New Invoice</h3>
                  <p className="text-sm text-gray-600">Generate a payment request for your client</p>
                </div>

                {loadingData ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading clients and cases...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Case Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Case *
                      </label>
                      <select
                        value={newInvoice.caseId}
                        onChange={(e) => setNewInvoice(prev => ({ ...prev, caseId: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select a case</option>
                        {cases.map(case_ => (
                          <option key={case_.id} value={case_.id}>
                            {case_.title || case_.name || `Case ${case_.id}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Client Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Client *
                      </label>
                      <select
                        value={newInvoice.clientId}
                        onChange={(e) => setNewInvoice(prev => ({ ...prev, clientId: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select a client</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.first_name} {client.last_name} {client.company_name && `(${client.company_name})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Type *
                      </label>
                      <select
                        value={newInvoice.paymentType}
                        onChange={(e) => setNewInvoice(prev => ({ ...prev, paymentType: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="operating">Operating Payment (Legal Fees)</option>
                        <option value="trust">Trust Deposit (Client Retainer)</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        {newInvoice.paymentType === 'trust' 
                          ? 'Funds will be deposited to IOLTA trust account' 
                          : 'Fees will be deposited to firm operating account'}
                      </p>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newInvoice.baseAmount}
                          onChange={(e) => {
                            setNewInvoice(prev => ({ ...prev, baseAmount: e.target.value }));
                            setShowPaymentBreakdown(e.target.value > 0);
                          }}
                          className="w-full pl-8 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date *
                      </label>
                      <input
                        type="date"
                        value={newInvoice.dueDate}
                        onChange={(e) => setNewInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={newInvoice.description}
                        onChange={(e) => setNewInvoice(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Optional description of the billing item"
                      />
                    </div>

                    {/* Payment Breakdown */}
                    {showPaymentBreakdown && newInvoice.baseAmount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gray-50 p-4 rounded-md"
                      >
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Breakdown</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>
                              {newInvoice.paymentType === 'trust' ? 'Trust Deposit' : 'Operating Payment'}
                            </span>
                            <span>{formatCurrency(calculateBreakdown().baseAmount)}</span>
                          </div>
                          {newInvoice.paymentType === 'trust' && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span>Processing Fee (4%)</span>
                                <span>{formatCurrency(calculateBreakdown().processingFee)}</span>
                              </div>
                              <div className="border-t pt-2 flex justify-between font-medium">
                                <span>Total</span>
                                <span>{formatCurrency(calculateBreakdown().total)}</span>
                              </div>
                              <div className="mt-3 p-3 bg-blue-50 rounded-md">
                                <p className="text-xs text-blue-800">
                                  <strong>Note:</strong> A 4% processing fee is applied to cover secure trust deposit processing costs.
                                  The full retainer amount is credited to your trust account.
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleCreateInvoice}
                        disabled={creatingInvoice}
                        className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingInvoice ? 'Creating Invoice...' : 'Create Invoice & Send to Client'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'trust-ledger' && (
            <motion.div
              key="trust-ledger"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Trust Ledger (IOLTA Account)</h3>
                  <p className="text-sm text-gray-600 mt-1">Client retainer funds held in trust</p>
                </div>

                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading trust ledger...</p>
                  </div>
                ) : trustLedger.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No trust ledger entries found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {trustLedger.map((entry) => (
                          <tr key={entry.ledger_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(entry.created_at)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {entry.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(entry.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                entry.entry_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {entry.entry_type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'operating-ledger' && (
            <motion.div
              key="operating-ledger"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Operating Ledger</h3>
                  <p className="text-sm text-gray-600 mt-1">Firm operating expenses and fee revenue</p>
                </div>

                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading operating ledger...</p>
                  </div>
                ) : operatingLedger.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No operating ledger entries found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {operatingLedger.map((entry) => (
                          <tr key={entry.ledger_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(entry.created_at)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {entry.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(entry.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                entry.entry_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {entry.entry_type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* New Invoice Modal */}
        {showNewInvoiceModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Create New Invoice</h3>
                  <button
                    onClick={() => setShowNewInvoiceModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Case Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Case *
                    </label>
                    <select
                      value={newInvoice.caseId}
                      onChange={(e) => setNewInvoice(prev => ({ ...prev, caseId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      required
                    >
                      <option value="" style={{ color: '#000000', backgroundColor: '#ffffff' }}>Select a case</option>
                      {cases.map(case_ => (
                        <option key={case_.id} value={case_.id} style={{ color: '#000000', backgroundColor: '#ffffff' }}>{case_.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Client Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client *
                    </label>
                    <select
                      value={newInvoice.clientId}
                      onChange={(e) => setNewInvoice(prev => ({ ...prev, clientId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      required
                    >
                      <option value="" style={{ color: '#000000', backgroundColor: '#ffffff' }}>Select a client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id} style={{ color: '#000000', backgroundColor: '#ffffff' }}>
                          {client.first_name} {client.last_name} {client.company_name && `(${client.company_name})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Type *
                    </label>
                    <select
                      value={newInvoice.paymentType}
                      onChange={(e) => setNewInvoice(prev => ({ ...prev, paymentType: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                    >
                      <option value="operating" style={{ color: '#000000', backgroundColor: '#ffffff' }}>Operating Payment (Legal Fees)</option>
                      <option value="trust" style={{ color: '#000000', backgroundColor: '#ffffff' }}>Trust Deposit (Client Retainer)</option>
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newInvoice.baseAmount}
                        onChange={(e) => {
                          setNewInvoice(prev => ({ ...prev, baseAmount: e.target.value }));
                          setShowPaymentBreakdown(e.target.value > 0);
                        }}
                        className="w-full pl-8 border border-gray-300 rounded-md px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        style={{ color: '#000000', backgroundColor: '#ffffff' }}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={newInvoice.dueDate}
                      onChange={(e) => setNewInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newInvoice.description}
                      onChange={(e) => setNewInvoice(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      rows={3}
                      placeholder="Optional description of the billing item"
                    />
                  </div>

                  {/* Payment Breakdown */}
                  {showPaymentBreakdown && newInvoice.baseAmount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gray-50 p-4 rounded-md"
                    >
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Breakdown</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>
                            {newInvoice.paymentType === 'trust' ? 'Trust Deposit' : 'Operating Payment'}
                          </span>
                          <span>{formatCurrency(calculateBreakdown().baseAmount)}</span>
                        </div>
                        {newInvoice.paymentType === 'trust' && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span>Processing Fee (4%)</span>
                              <span>{formatCurrency(calculateBreakdown().processingFee)}</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between font-medium">
                              <span>Total</span>
                              <span>{formatCurrency(calculateBreakdown().total)}</span>
                            </div>
                            <div className="mt-3 p-3 bg-blue-50 rounded-md">
                              <p className="text-xs text-blue-800">
                                <strong>Note:</strong> A 4% processing fee is applied to cover secure trust deposit processing costs.
                                The full retainer amount is credited to your trust account.
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowNewInvoiceModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateInvoice}
                    disabled={creatingInvoice}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingInvoice ? 'Creating...' : 'Create Invoice'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPage;
