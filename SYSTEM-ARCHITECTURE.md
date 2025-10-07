# 🏗️ Georgia Law Research System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  React Frontend - Georgia Law Research Tab             │    │
│  │  • Search bar for natural language queries             │    │
│  │  • Practice area dropdown filter                       │    │
│  │  • Results display with full statutory text            │    │
│  │  • AI summarization interface                          │    │
│  └─────────────────────┬──────────────────────────────────┘    │
│                        │                                         │
└────────────────────────┼─────────────────────────────────────────┘
                         │
                         │ HTTPS Requests
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS API GATEWAY                               │
│  Base URL: https://xxxxxxxxxx.execute-api.us-east-1.amazonaws... │
│                                                                  │
│  Endpoints:                                                      │
│  ├─ POST /laws/search      → Georgia Law Search                 │
│  ├─ POST /laws/summarize   → AI Analysis                        │
│  └─ POST /laws/upload      → Embeddings Processing              │
│                                                                  │
│  Features:                                                       │
│  • CORS enabled for browser access                              │
│  • Request throttling & rate limiting                           │
│  • API key authentication (optional)                            │
│  • CloudWatch request logging                                   │
└────────┬───────────────┬──────────────┬─────────────────────────┘
         │               │              │
         │               │              │
         ▼               ▼              ▼
┌────────────────┐ ┌─────────────┐ ┌──────────────────┐
│   Lambda 1     │ │  Lambda 2   │ │    Lambda 3      │
│   Embeddings   │ │   Search    │ │   Summarize      │
│                │ │             │ │                  │
│ • Node.js 20   │ │ • Node.js   │ │ • Node.js 20     │
│ • 1024 MB RAM  │ │ • 512 MB    │ │ • 512 MB RAM     │
│ • 15 min       │ │ • 30 sec    │ │ • 60 sec timeout │
│   timeout      │ │   timeout   │ │                  │
│                │ │             │ │                  │
│ Processes 20   │ │ Searches    │ │ AI-powered       │
│ Georgia        │ │ statute     │ │ legal analysis   │
│ statutes       │ │ vectors     │ │                  │
└───────┬────────┘ └──────┬──────┘ └────────┬─────────┘
        │                 │                  │
        │                 │                  │
        │    ┌────────────┴──────────────────┘
        │    │                 │
        │    │                 │
        ▼    ▼                 │
┌──────────────────────────────┼──────────────────────────┐
│      AWS BEDROCK             │                           │
│                              │                           │
│  ┌─────────────────────┐    │   ┌──────────────────┐   │
│  │  Titan Embeddings   │    │   │  Claude AI       │   │
│  │  Model              │    │   │  (Opus/Sonnet)   │   │
│  │                     │    │   │                  │   │
│  │ • Converts statute  │    │   │ • Analyzes laws  │   │
│  │   text to 1536-dim  │    │   │ • Answers Qs     │   │
│  │   vectors           │    │   │ • Summarizes     │   │
│  │ • Used for both     │    │   │   statutes       │   │
│  │   indexing & search │    │   │                  │   │
│  └─────────────────────┘    │   └──────────────────┘   │
│                              │                           │
└──────────────────────────────┴───────────────────────────┘
        │                      │
        │                      │
        ▼                      │
┌─────────────────────────────────────────────────────────┐
│           AWS OPENSEARCH SERVICE                         │
│   Domain: georgia-law-vectors                            │
│   Endpoint: search-georgia-law-vectors-...               │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Index: georgia-law-vectors                       │  │
│  │                                                    │  │
│  │  Data Structure:                                  │  │
│  │  {                                                │  │
│  │    "title_number": "16",                          │  │
│  │    "chapter_number": "5",                         │  │
│  │    "section_number": "21",                        │  │
│  │    "section_name": "Aggravated assault",          │  │
│  │    "full_text": "A person commits...",            │  │
│  │    "embedding": [0.123, -0.456, ...],  // 1536-d │  │
│  │    "practice_area": "criminal",                   │  │
│  │    "source_url": "https://...",                   │  │
│  │    "effective_date": "2020-01-01"                 │  │
│  │  }                                                │  │
│  │                                                    │  │
│  │  Total Documents: 20 statutes                     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  Features:                                               │
│  • k-NN vector similarity search                         │
│  • Full-text search capabilities                         │
│  • Practice area filtering                               │
│  • Real-time indexing                                    │
│  • OpenSearch Dashboards for monitoring                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Data Flow: Search Query

```
1. User enters query: "What are the laws about assault?"
   │
   ▼
2. React frontend sends POST to API Gateway:
   {
     "query": "What are the laws about assault?",
     "practiceArea": "criminal",
     "limit": 5
   }
   │
   ▼
3. API Gateway routes to georgia-law-search Lambda
   │
   ▼
4. Lambda sends query to Bedrock Titan for embedding:
   "What are the laws about assault?" 
   → [0.234, -0.567, 0.123, ...] (1536 dimensions)
   │
   ▼
5. Lambda performs k-NN search in OpenSearch:
   - Finds top 5 statute vectors most similar to query vector
   - Filters by practice_area = "criminal"
   - Returns matching statutes
   │
   ▼
6. OpenSearch returns results:
   [
     { title: "16-5-21", name: "Aggravated assault", similarity: 0.89 },
     { title: "16-5-20", name: "Simple assault", similarity: 0.85 },
     { title: "16-5-23", name: "Aggravated battery", similarity: 0.82 }
   ]
   │
   ▼
7. Lambda formats response and returns to API Gateway
   │
   ▼
8. API Gateway returns to frontend
   │
   ▼
9. React displays results with:
   - Statute citations
   - Full text
   - Source links
   - "Summarize" buttons
```

---

## Data Flow: Embeddings Creation (One-Time)

```
1. Trigger: Developer invokes georgia-law-embeddings Lambda
   │
   ▼
2. Lambda loads georgia-code.json (20 statutes)
   │
   ▼
3. Lambda checks if OpenSearch index exists:
   - If no → Creates index with k-NN configuration
   - If yes → Uses existing index
   │
   ▼
4. For each statute (loop 20 times):
   │
   ├─▶ Extract statute text
   │   │
   │   ▼
   ├─▶ Send to Bedrock Titan for embedding
   │   "A person commits aggravated assault when..."
   │   → [0.123, -0.456, 0.789, ...] (1536-dim vector)
   │   │
   │   ▼
   ├─▶ Index document in OpenSearch:
   │   {
   │     document: { ...statute data, embedding: [...] },
   │     index: "georgia-law-vectors"
   │   }
   │   │
   │   ▼
   └─▶ Log progress: "Processed statute 1/20"
   │
   ▼
5. All 20 statutes indexed
   │
   ▼
6. Return success response
```

---

## Data Flow: AI Summarization

```
1. User clicks "Summarize" on a statute result
   │
   ▼
2. Frontend sends POST to /laws/summarize:
   {
     "statuteText": "A person commits theft by taking when...",
     "question": "What are the penalties?"
   }
   │
   ▼
3. API Gateway routes to georgia-law-summarize Lambda
   │
   ▼
4. Lambda constructs prompt for Claude:
   "You are a legal expert. Analyze this Georgia statute:
    [statute text]
    Answer this question: [user's question]
    Provide a clear, accurate legal analysis."
   │
   ▼
5. Lambda sends to Bedrock Claude (Opus/Sonnet)
   │
   ▼
6. Claude processes and generates response:
   "The penalties for theft by taking vary based on the value
    of the property taken. For property valued at less than
    $1,500, it is a misdemeanor..."
   │
   ▼
7. Lambda returns formatted response
   │
   ▼
8. React displays AI analysis in a card/modal
```

---

## Component Details

### React Frontend
**Location:** `/Users/josephesfandiari/Lawyer App/law-ai/src/`
- **Components:** Search bar, results list, statute viewer, AI chat
- **State Management:** React hooks for search state
- **API Communication:** Fetch API for HTTP requests
- **Styling:** CSS modules or styled-components

### Lambda Functions
**Location:** `/Users/josephesfandiari/Lawyer App/law-ai/server/`

**1. georgia-law-embeddings**
- **File:** `lambda-law-embeddings.js`
- **Purpose:** Process statutes and create vector embeddings
- **Triggers:** Manual invocation or API call
- **Dependencies:** @aws-sdk, @opensearch-project
- **Data:** Includes `data/georgia-code.json` (20 statutes)

**2. georgia-law-search**
- **File:** `lambda-law-search.js`
- **Purpose:** Semantic search using vector similarity
- **Input:** `{ query, practiceArea, limit }`
- **Output:** Array of matching statutes with scores

**3. georgia-law-summarize**
- **File:** `lambda-law-summarize.js`
- **Purpose:** AI-powered legal analysis
- **Input:** `{ statuteText, question }`
- **Output:** Claude-generated summary/answer

### OpenSearch Index Schema
```json
{
  "mappings": {
    "properties": {
      "title_number": { "type": "keyword" },
      "chapter_number": { "type": "keyword" },
      "section_number": { "type": "keyword" },
      "section_name": { "type": "text" },
      "full_text": { "type": "text" },
      "practice_area": { "type": "keyword" },
      "source_url": { "type": "keyword" },
      "effective_date": { "type": "date" },
      "embedding": {
        "type": "knn_vector",
        "dimension": 1536,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimilarity",
          "engine": "nmslib"
        }
      }
    }
  }
}
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Security Layers                       │
│                                                          │
│  1. API Gateway                                          │
│     • HTTPS only (TLS 1.2+)                             │
│     • CORS configuration                                 │
│     • Request throttling (1000 req/sec)                 │
│     • Optional API keys                                  │
│                                                          │
│  2. Lambda IAM Roles                                     │
│     • Minimum required permissions                       │
│     • Bedrock invoke access                             │
│     • OpenSearch read/write                             │
│     • CloudWatch logging                                │
│                                                          │
│  3. OpenSearch Security                                  │
│     • Username/password authentication                   │
│     • Fine-grained access control                       │
│     • Encryption at rest                                │
│     • Encryption in transit                             │
│     • VPC deployment option                             │
│                                                          │
│  4. AWS Bedrock                                          │
│     • Model access controls                             │
│     • Request logging                                   │
│     • Data privacy (no training on your data)           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Monitoring & Logging

```
┌─────────────────────────────────────────────────────────┐
│                  CloudWatch Integration                  │
│                                                          │
│  Lambda Metrics:                                         │
│  • Invocation count                                      │
│  • Error rate                                           │
│  • Duration (response time)                             │
│  • Concurrent executions                                │
│  • Throttles                                            │
│                                                          │
│  API Gateway Metrics:                                    │
│  • Total requests                                       │
│  • 4XX/5XX errors                                       │
│  • Latency                                              │
│  • Cache hits/misses                                    │
│                                                          │
│  OpenSearch Metrics:                                     │
│  • Cluster health (green/yellow/red)                    │
│  • Search latency                                       │
│  • Indexing rate                                        │
│  • Storage usage                                        │
│  • CPU/memory utilization                               │
│                                                          │
│  Bedrock Metrics:                                        │
│  • Model invocations                                    │
│  • Token usage                                          │
│  • Cost tracking                                        │
│                                                          │
│  Custom Logs:                                            │
│  • Search queries and results                           │
│  • User interactions                                    │
│  • Error stack traces                                   │
│  • Performance bottlenecks                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Cost Breakdown

```
┌─────────────────────────────────────────────────────────┐
│              Monthly Cost Estimate                       │
│                                                          │
│  AWS OpenSearch:                                         │
│  • Instance: t3.small.search                            │
│  • Pricing: $0.096/hour                                 │
│  • Monthly: $0.096 × 24 × 30 = $69.12                   │
│                                                          │
│  AWS Lambda:                                             │
│  • Requests: 10,000/month                               │
│  • Duration: avg 500ms                                  │
│  • Cost: ~$0.20/month (mostly free tier)                │
│                                                          │
│  API Gateway:                                            │
│  • Requests: 10,000/month                               │
│  • Cost: $0.035/month (mostly free tier)                │
│                                                          │
│  AWS Bedrock:                                            │
│  • Titan Embeddings: $0.0001/1K tokens                  │
│  • Claude Opus: $0.015/1K input tokens                  │
│  • Estimated: $5-10/month (varies by usage)             │
│                                                          │
│  Data Transfer:                                          │
│  • First 100GB free                                     │
│  • Cost: ~$1/month                                      │
│                                                          │
│  ─────────────────────────────────────────              │
│  TOTAL: ~$75-85/month                                   │
│                                                          │
│  Breakdown:                                              │
│  • 92% OpenSearch (vector database)                     │
│  • 6% Bedrock (AI processing)                           │
│  • 2% Lambda + API Gateway + Transfer                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Scalability

```
Current Capacity:
├─ 20 statutes indexed
├─ Handles ~1,000 searches/day
├─ Response time: < 2 seconds
└─ Single OpenSearch node

Easy Scaling Options:

Vertical Scaling (More Power):
├─ Upgrade OpenSearch instance
│   t3.small → t3.medium → t3.large
├─ Increase Lambda memory
│   512MB → 1024MB → 3008MB
└─ Add provisioned concurrency

Horizontal Scaling (More Capacity):
├─ Add OpenSearch data nodes (2, 3, 4...)
├─ Enable Lambda reserved concurrency
├─ Add API Gateway caching
├─ Implement CloudFront CDN
└─ Use DynamoDB for metadata

Data Scaling:
├─ Current: 20 statutes
├─ Can handle: 10,000+ statutes
├─ Index size: ~500MB for 10K statutes
└─ Search remains fast with proper indexing
```

---

## Future Enhancements

```
Phase 2: Enhanced Search
├─ Boolean operators (AND, OR, NOT)
├─ Date range filters
├─ Citation cross-referencing
├─ Search history
└─ Autocomplete suggestions

Phase 3: Expanded Dataset
├─ All Georgia Code titles (60+)
├─ Georgia case law
├─ Administrative regulations
├─ Legal forms and templates
└─ Attorney general opinions

Phase 4: Advanced AI
├─ Multi-turn conversations
├─ Legal document drafting
├─ Contract analysis
├─ Precedent research
└─ Legal strategy suggestions

Phase 5: Collaboration
├─ User accounts and profiles
├─ Saved searches and favorites
├─ Shared research folders
├─ Annotations and notes
└─ Team workspaces
```

---

**System Status:** ✅ Ready for Production Deployment  
**Architecture:** Serverless, scalable, cost-effective  
**Technology Stack:** React + AWS Lambda + OpenSearch + Bedrock  
**Legal Compliance:** Authoritative sources, proper attribution
