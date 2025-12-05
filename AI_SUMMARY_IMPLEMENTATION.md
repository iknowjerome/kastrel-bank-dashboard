# AI Summary Feature Implementation

## Overview

This document describes the implementation of the AI-powered client summarization feature in the Kastrel Bank Dashboard.

## Architecture

The AI summary feature uses a client-server architecture with streaming:

```
Frontend (React)
    ↓ POST /api/banking/customers/{id}/summarize
Backend (FastAPI)
    ↓ Aggregates client data
    ↓ POST /api/v1/summarize
Perch AI Service (Separate Repo)
    ↓ Streams tokens via SSE
Backend
    ↓ Proxies stream
Frontend
    ↓ Displays tokens in real-time
```

## Implementation Details

### Backend Components

#### 1. Configuration (`config/dev.yaml`, `config/production.yaml`)
Added perch service configuration:
```yaml
perch_service:
  url: http://localhost:9000
  timeout: 60
  connection_timeout: 10
```

#### 2. Perch Service Client (`app/services/perch_client.py`)
- HTTP client for communicating with the perch AI service
- Handles SSE streaming responses
- Error handling and timeouts
- Health check endpoint

#### 3. Data Aggregator (`app/services/data_aggregator.py`)
- Aggregates customer profile, documents, and messages
- Prepares data for AI model consumption
- Helper functions for formatting data

#### 4. API Endpoint (`app/dashboard/routes.py`)
- `POST /api/banking/customers/{customer_id}/summarize`
- Fetches all client data
- Calls perch service
- Streams response back to frontend using SSE

#### 5. Main App (`app/main.py`)
- Initializes PerchServiceClient with config
- Passes client to dashboard routes

### Frontend Components

#### 1. Types (`frontend/src/features/bank-dashboard/data/types.ts`)
Added streaming token type:
```typescript
export type StreamingToken = {
  order: number;
  token: string;
  hallucination_prob: number;
}
```

#### 2. API Client (`frontend/src/features/bank-dashboard/data/api.ts`)
- `streamAiSummary()` function
- Uses fetch API with streaming
- Parses SSE events
- Converts to UI-compatible Token format

#### 3. UI Component (`frontend/src/features/bank-dashboard/components/AiSummarySection.tsx`)
- Updated to use streaming API
- Displays tokens in real-time as they arrive
- Shows streaming indicator
- Handles errors and completion

## Data Flow

### 1. User clicks "Summarize Client"

### 2. Frontend initiates stream
```typescript
streamAiSummary(customerId, onToken, onError, onComplete)
```

### 3. Backend aggregates data
- Customer profile
- Documents
- Messages
- Formatted prompt

### 4. Backend calls Perch Service
```json
POST /api/v1/summarize
{
  "prompt": "Take all the client data below and summarize it:",
  "customer_data": {...},
  "documents": [...],
  "messages": [...]
}
```

### 5. Perch Service streams response
```
data: {"order": 0, "token": "Customer", "hallucination_prob": 0.15}\n\n
data: {"order": 1, "token": "is", "hallucination_prob": 0.08}\n\n
data: {"order": 2, "token": "a", "hallucination_prob": 0.02}\n\n
...
```

### 6. Frontend displays tokens
Each token is displayed with risk highlighting based on `hallucination_prob`.

## Response Format

### Streaming Token Format (SSE)
```json
{
  "order": <number>,
  "token": "<string>",
  "hallucination_prob": <0.0 to 1.0>
}
```

### Error Format
```json
{
  "type": "error",
  "message": "<error description>"
}
```

## Configuration

### Development
Edit `config/dev.yaml`:
```yaml
perch_service:
  url: http://localhost:9000
```

### Production
Edit `config/production.yaml` or set environment variable:
```bash
export PERCH_SERVICE_URL=http://perch-service.internal:9000
```

## Testing

### Prerequisites
1. Perch AI Service must be running (separate repo)
2. Perch service must implement `/api/v1/summarize` endpoint
3. Perch service must return SSE stream with correct format

### Manual Testing
1. Start the dashboard: `./dev/start_local.sh`
2. Navigate to a client's AI Summary section
3. Click "Summarize Client"
4. Verify tokens stream in real-time
5. Check for proper error handling if perch service is down

### Testing Without Perch Service
If perch service is not configured, the UI will show:
- Error: "AI summarization service is not configured" (HTTP 503)

## Error Handling

### Backend Errors
- Perch service unavailable → HTTP 503
- Customer not found → HTTP 404
- Timeout → SSE error message
- Network error → SSE error message

### Frontend Errors
- Connection failure → Error message displayed
- Stream interrupted → Error state
- Invalid data → Skipped (logged to console)

## Future Enhancements

1. **Structured Outputs**
   - Parse suggestions and risk commentary from model response
   - Display structured sections in UI

2. **Caching**
   - Cache summaries per customer
   - Invalidate on data updates

3. **Request Management**
   - Queue multiple requests
   - Rate limiting

4. **Authentication**
   - Add auth headers for perch service
   - API key management

5. **Monitoring**
   - Track response times
   - Log model performance
   - Error rate monitoring

## Dependencies

### Backend
- `httpx>=0.25.0` - Async HTTP client with streaming support
- Existing: `fastapi`, `pyyaml`, `uvicorn`

### Frontend
- Native Fetch API (no additional dependencies)
- Existing: React, TypeScript

## Files Modified

### Backend
- `config/dev.yaml` - Added perch service config
- `config/production.yaml` - Added perch service config with env var
- `app/config.py` - Enhanced env var expansion
- `app/services/__init__.py` - NEW
- `app/services/perch_client.py` - NEW
- `app/services/data_aggregator.py` - NEW
- `app/dashboard/routes.py` - Added summarize endpoint
- `app/main.py` - Initialize perch client

### Frontend
- `frontend/src/features/bank-dashboard/data/types.ts` - Added StreamingToken type
- `frontend/src/features/bank-dashboard/data/api.ts` - Added streamAiSummary function
- `frontend/src/features/bank-dashboard/components/AiSummarySection.tsx` - Updated to use streaming

## Next Steps

1. **Implement Perch Service** (separate repo)
   - Model wrapper with perch
   - `/api/v1/summarize` endpoint
   - SSE streaming implementation
   - Per-token hallucination probability calculation

2. **Test End-to-End**
   - Deploy perch service
   - Configure dashboard to point to it
   - Test with real clients

3. **Refine Prompt**
   - Improve summarization quality
   - Add structured output directives

4. **Add Monitoring**
   - Log performance metrics
   - Track error rates
   - Monitor token generation speed

