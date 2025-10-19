# Stripe Integration Overview

## 🔄 Two Separate Stripe Integrations

### 1. **Lawyer → Client Payments** (✅ IMPLEMENTED)
**Purpose:** Lawyers charge their clients for legal services  
**Stripe Account:** Lawyer's own Stripe account  
**Payment Flow:** Client pays lawyer directly  
**Status:** ✅ LIVE - Real Stripe Checkout integration active

**What it does:**
- Lawyer creates invoice for client
- System generates Stripe Checkout link using lawyer's Stripe API keys
- Client pays via Stripe (credit card, Apple Pay, Google Pay, etc.)
- Funds deposited to lawyer's bank account (via their Stripe)
- Payments tracked in Trust or Operating ledger

**Revenue split:**
- **Trust Deposit:** 100% to lawyer's IOLTA trust account (minus 4% processing fee from lawyer)
- **Operating Payment:** 100% to lawyer's operating account

---

### 2. **Platform → Lawyer Subscription** (❌ NOT YET IMPLEMENTED)
**Purpose:** You (platform owner) collect monthly SaaS fees from lawyers  
**Stripe Account:** YOUR platform Stripe account (separate from lawyer's)  
**Payment Flow:** Lawyer pays you for using the platform  
**Status:** ❌ TODO - Future feature

**What it will do:**
- Lawyers subscribe to your platform (e.g., $99/month)
- Recurring monthly billing
- Access control based on subscription status
- Usage tracking and billing tiers

**Revenue split:**
- **100% to you** (platform owner)
- This is YOUR business model revenue

---

## 📋 Current Implementation (Lawyer → Client)

### Stripe Account Setup:
Currently using **your test Stripe account** for demo purposes:
```
Publishable Key: pk_test_51S9znAEJN2kmhTJ7...
Secret Key: sk_test_51S9znAEJN2kmhTJ7...
```

### For Production:
Each lawyer needs to:
1. Create their own Stripe account at https://stripe.com
2. Get their API keys from https://dashboard.stripe.com/apikeys
3. Configure their keys in the platform (future: Stripe Connect)

### Better Approach (Recommended):
Use **Stripe Connect** so:
- Lawyers connect their Stripe account to your platform
- You can take a small % platform fee (e.g., 2.9% + $0.30 per transaction)
- Funds still go directly to lawyer's account
- You earn revenue on transactions, not just subscriptions

---

## 🎯 Payment Types Explained

### Trust Deposit (IOLTA Account)
- **Use Case:** Client retainers, escrow, advance payments
- **Processing Fee:** 4% added to cover Stripe's 2.9% + $0.30
- **Ledger:** Trust ledger (separate from operating)
- **Compliance:** IOLTA-compliant accounting

**Example:**
```
Client Retainer:        $5,000.00
Processing Fee (4%):    $  200.00
Total Client Pays:      $5,200.00

Lawyer Receives:        $5,000.00 (to trust)
Processing Cost:        $  200.00 (from operating)
```

### Operating Payment (Legal Fees)
- **Use Case:** Hourly billing, flat fees, earned income
- **Processing Fee:** None (absorbed by lawyer)
- **Ledger:** Operating ledger
- **Compliance:** Standard business revenue

**Example:**
```
Legal Services:         $1,500.00
Processing Fee:         $     0.00
Total Client Pays:      $1,500.00

Lawyer Receives:        $1,500.00 (to operating)
```

---

## 🔧 How It Works Now

### 1. Invoice Creation:
```javascript
// Lawyer creates invoice
POST /billing
{
  caseId: "case-123",
  clientId: "client-456",
  paymentType: "trust", // or "operating"
  baseAmount: 5000,
  dueDate: "2025-11-01",
  description: "Retainer for contract review"
}
```

### 2. Stripe Session Creation:
```javascript
// System calls Stripe API
POST /billing/create-payment-session
{
  billingId: "billing-789",
  amount: 5200, // Including 4% fee for trust
  clientEmail: "client@example.com",
  metadata: {
    billing_id: "billing-789",
    payment_type: "trust",
    lawyer_payment: "true" // Important flag!
  }
}

// Returns:
{
  sessionId: "cs_test_a1b2c3d4...",
  sessionUrl: "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

### 3. Client Payment:
- Client receives payment link (email/SMS)
- Clicks link → Stripe Checkout page
- Enters credit card
- Pays → Funds to lawyer's Stripe account
- Webhook notifies platform of payment

### 4. Ledger Update:
```javascript
// Webhook handler (future)
POST /billing/webhook
{
  type: "checkout.session.completed",
  data: {
    metadata: {
      billing_id: "billing-789",
      payment_type: "trust"
    }
  }
}

// System updates:
- Billing record status: "pending" → "paid"
- Trust ledger: +$5,000.00 credit
- Operating ledger: -$200.00 debit (processing fee)
```

---

## 🚀 Future: Platform Subscription (You → Lawyer)

### Planned Implementation:

**Subscription Tiers:**
```
Starter:  $49/month  - 1 lawyer, 50 cases
Pro:      $99/month  - 3 lawyers, unlimited cases  
Firm:     $299/month - 10 lawyers, unlimited cases
```

**Tech Stack:**
- Stripe Subscriptions API
- Separate Stripe account (YOUR account, not lawyer's)
- Recurring billing
- Usage metering
- Prorated billing

**Payment Flow:**
```
Lawyer signs up → Creates subscription → Stripe charges monthly
              ↓
         Your Stripe Account
              ↓
         Your Bank Account
```

**Integration Points:**
```javascript
// Create subscription (your Stripe account)
POST /platform/subscribe
{
  lawyerId: "lawyer-123",
  plan: "pro", // $99/month
  paymentMethod: "pm_card_..."
}

// Stripe creates subscription
const subscription = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{ price: 'price_pro_monthly' }],
  metadata: {
    lawyer_id: 'lawyer-123',
    platform_subscription: 'true' // Different from lawyer_payment!
  }
});
```

**Access Control:**
```javascript
// Middleware checks subscription status
if (subscription.status !== 'active') {
  return res.status(403).json({
    error: 'Subscription required',
    message: 'Please update your payment method'
  });
}
```

---

## 💡 Revenue Model Comparison

### Current (Lawyer → Client Only):
```
Lawyer invoices client $5,000
Client pays $5,200 (with processing fee)
Lawyer receives $5,000 in trust account
Stripe fee: ~$150 (2.9% + $0.30)
Lawyer keeps: $5,000 - $150 = $4,850

YOUR REVENUE: $0 (you don't charge lawyers yet)
```

### Future (With Platform Subscription):
```
LAWYER → CLIENT PAYMENT:
Lawyer invoices client $5,000
Client pays $5,200
Lawyer keeps $4,850 (after Stripe)

PLATFORM → LAWYER SUBSCRIPTION:
Lawyer pays you $99/month
Your revenue: $99/month per lawyer

TOTAL YOUR REVENUE: $99/month + potential transaction fees
```

### Future (With Stripe Connect - Recommended):
```
LAWYER → CLIENT PAYMENT:
Lawyer invoices client $5,000
Client pays $5,200
Stripe Connect application fee: 2% = $104
Lawyer receives: $4,850 - $104 = $4,746

PLATFORM → LAWYER SUBSCRIPTION:
Lawyer pays you $99/month

TOTAL YOUR REVENUE: 
- $99/month subscription
- $104 per $5,000 transaction (2% application fee)
- Scales with lawyer's success!
```

---

## 🔐 Security Separation

### Lawyer Stripe Keys (Current Implementation):
```env
# Stored in Lambda environment
STRIPE_SECRET_KEY=sk_test_51S9znA... (lawyer's key)

# Used for:
- Creating checkout sessions for client payments
- Processing refunds
- Viewing payment history
```

### Platform Stripe Keys (Future):
```env
# Stored separately
PLATFORM_STRIPE_SECRET_KEY=sk_live_XYZ... (YOUR key)

# Used for:
- Subscription billing
- Platform revenue
- Lawyer account management
```

### Never Mix Them Up!
```javascript
// ❌ WRONG - Using platform key for client payments
const stripe = require('stripe')(PLATFORM_STRIPE_SECRET_KEY);

// ✅ CORRECT - Each payment type uses correct account
if (paymentType === 'lawyer_to_client') {
  stripe = require('stripe')(LAWYER_STRIPE_SECRET_KEY);
} else if (paymentType === 'platform_subscription') {
  stripe = require('stripe')(PLATFORM_STRIPE_SECRET_KEY);
}
```

---

## 📊 Testing

### Test Current Implementation:
1. Go to http://localhost:3000/billing
2. Click "New Invoice" tab
3. Fill out invoice for a client
4. Click "Create Invoice & Send to Client"
5. Use Stripe test card: `4242 4242 4242 4242`
6. Expiry: Any future date (e.g., 12/25)
7. CVC: Any 3 digits (e.g., 123)
8. Payment should succeed!

### Verify Payment:
1. Check https://dashboard.stripe.com/test/payments
2. You should see the payment
3. Metadata shows: `lawyer_payment: true`

---

## 📝 Next Steps

### For Lawyer → Client (Current):
- [x] Real Stripe Checkout integration
- [x] Trust vs Operating ledger separation
- [x] 4% processing fee for trust deposits
- [ ] Webhook to update payment status
- [ ] Email invoice PDFs to clients
- [ ] Payment receipt generation
- [ ] Refund handling
- [ ] Stripe Connect (let lawyers connect their own accounts)

### For Platform → Lawyer (Future):
- [ ] Create subscription plans
- [ ] Set up recurring billing
- [ ] Access control based on subscription
- [ ] Usage metering (cases, documents, API calls)
- [ ] Billing portal for lawyers
- [ ] Subscription webhooks
- [ ] Trial period handling
- [ ] Prorated billing for upgrades/downgrades

---

**Last Updated:** October 18, 2025  
**Current Status:** Lawyer → Client payments LIVE with real Stripe  
**Next Feature:** Platform subscription billing
