# Manual OpenSearch Domain Setup (Console Method)

## 🚨 Permission Issue? Here are your options:

### Option 1: Ask AWS Admin to Create Domain
**If you don't have OpenSearch permissions**, provide this information to your AWS administrator:

**Domain Configuration:**
- **Domain name**: `georgia-law-vectors`
- **Instance type**: `om2.large.search`
- **Number of nodes**: 1
- **Storage**: 20 GiB EBS GP3
- **Network**: Public access (simpler) or VPC
- **Master user**: `test` / `Test123!@`
- **Enable**: Encryption at rest, Node-to-node encryption, Fine-grained access control

**Once created, get the domain endpoint and provide it to the developer.**

### Option 2: Simplified Setup (No OpenSearch)
If OpenSearch permissions are blocked, we can use a simpler approach:

**Alternative Architecture:**
- Use **Amazon Kendra** for semantic search (if available)
- Use **DynamoDB** with simple keyword search
- Use **OpenSearch Serverless** (if your admin enables it)
- Use **local Elasticsearch** for development

### Option 3: Use Existing OpenSearch Domain
If your account already has an OpenSearch domain, we can use it instead.

## OpenSearch Service Types - Which to Choose?

### 🚫 **Serverless** - NOT Recommended
- **Why not?** Doesn't support vector search (k-NN) yet, which is required for your AI-powered law search
- **Current limitations**: No custom vector indexing, limited ML capabilities
- **Best for**: Simple search use cases without AI/vector features

### 🚫 **Ingestion** - NOT Recommended  
- **What it is**: Data pipeline service for routing data TO OpenSearch domains
- **Not for**: Direct search/indexing - this is just for data ingestion pipelines
- **Use case**: ETL pipelines, not search services

### ✅ **Managed Cluster** - RECOMMENDED for Your Use Case
- **Why?** Full support for vector search, custom indexing, and AI features
- **Perfect for**: Your Georgia Law Research with Titan embeddings and semantic search
- **Features you need**: k-NN vector search, custom mappings, full OpenSearch API
- **Cost**: Predictable, cost-effective for development/testing

## Step 1: Create OpenSearch Domain

1. Go to **AWS Console** → **Amazon OpenSearch Service**
2. Click **Create domain**
3. **IMPORTANT**: Choose **Managed cluster** (not Serverless or Ingestion)

### Domain details:
- **Domain name**: `georgia-law-vectors`
- **Domain creation method**: Standard create

### Network:
- **Network configuration**: **VPC** (Recommended for security)
  - **VPC**: Select your default VPC
  - **Subnets**: Select at least 2 private subnets across different AZs
  - **Security groups**: Create a new security group that allows HTTPS (443) from your Lambda functions

### Security:
- **Encryption**: Enable encryption of data at rest
- **Node-to-node encryption**: Enable
- **Fine-grained access control**: Enable
- **Master user**: Create master user
  - **Master username**: `test`
  - **Master password**: `Test123!@`

### Data nodes:
- **Number of data nodes**: 1
- **Data instance type**: `om2.large.search` (OpenSearch optimized, memory-focused)
- **Storage type**: EBS
- **EBS storage size per node**: 20 GiB
- **EBS volume type**: GP3

#### OpenSearch Optimized Instance Types:

**Recommended for Vector Search:**
- `om2.large.search` - **BEST CHOICE**: Memory-optimized for vector operations
- `or2.large.search` - General OpenSearch optimized
- `or1.large.search` - Previous generation

**Why om2.large.search?**
- ✅ **Memory-optimized**: More RAM for vector embeddings and k-NN search
- ✅ **Latest generation**: Best performance for AI/ML workloads
- ✅ **OpenSearch optimized**: Specifically tuned for search operations
- ✅ **Cost-effective**: Good balance for development/testing

**Instance Specs (om2.large.search):**
- **RAM**: 16 GiB (Excellent for vector search)
- **vCPUs**: 2
- **IOPS**: 3,000 baseline, 16,000 burst
- **Throughput**: 250 MiB/s
- **Network**: 12.5 Gbps

### Advanced cluster settings:
- **Instance configuration**: Development and testing
- **Dedicated master nodes**: Disable
- **Warm data nodes**: Disable

4. Click **Create**

## Step 2: Update Lambda Functions for VPC

If you choose VPC, you need to update your Lambda functions to run in the same VPC:

1. Go to **AWS Lambda Console**
2. Find your Lambda functions (lawai-serverless-dev-*)
3. For each function:
   - Go to **Configuration** → **VPC**
   - Select the same VPC as your OpenSearch domain
   - Select private subnets
   - Select/create security groups that allow outbound HTTPS

## Step 3: Wait for Domain Creation

Wait 15-20 minutes for the domain to be fully initialized. The status should show "Active".

## Step 4: Get Domain Endpoint

1. Go to your OpenSearch domain in the console
2. Copy the **Domain endpoint** (it will look like: `https://vpc-georgia-law-vectors-abc123.us-east-1.es.amazonaws.com`)

## Step 6: Test Your OpenSearch Domain

Once your domain is active, test the connection:

### Get Your Domain Endpoint:
1. Go to **AWS Console** → **Amazon OpenSearch Service**
2. Click on your `georgia-law-vectors` domain
3. Copy the **Domain endpoint** (looks like: `https://vpc-georgia-law-vectors-abc123.us-east-1.es.amazonaws.com`)

### Update Environment Variables:
Replace the placeholder in your `.env` file:
```bash
OPENSEARCH_ENDPOINT=https://YOUR_ACTUAL_DOMAIN_ENDPOINT.us-east-1.es.amazonaws.com
```

### Test Connection:
```bash
curl -u test:Test123!@ \
  "https://YOUR_ACTUAL_DOMAIN_ENDPOINT.us-east-1.es.amazonaws.com/_cluster/health?pretty"
```

**Expected Response:**
```json
{
  "cluster_name": "georgia-law-vectors",
  "status": "green",
  "number_of_nodes": 1,
  "active_primary_shards": 0,
  "active_shards": 0
}
```

### Troubleshooting Network Errors:

**1. Wrong Endpoint:**
- Make sure you're using the domain endpoint, not localhost
- The URL should start with `https://` and end with `.es.amazonaws.com`

**2. VPC Issues (if using VPC):**
- Lambda functions must be in the same VPC
- Security groups must allow HTTPS traffic

**3. Authentication Issues:**
- Use the correct username/password from domain creation
- Make sure fine-grained access control is enabled

**4. Domain Not Ready:**
- Wait for status to show "Active" (can take 20-30 minutes)
- Check domain status in AWS console

## Alternative: Public Access (Simpler Setup)

If you prefer simpler setup without VPC complexity:

1. Choose **Public access** instead of VPC in step 1
2. Skip the Lambda VPC configuration in step 2
3. The endpoint will be: `https://search-georgia-law-vectors-abc123.us-east-1.es.amazonaws.com`

## Security Considerations

- **VPC**: More secure, recommended for production
- **Public Access**: Simpler, acceptable for development/testing
- **Always use**: Encryption at rest, HTTPS enforcement, fine-grained access control