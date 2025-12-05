# Perch Service API Contract

This document defines the API contract between the Kastrel Bank Dashboard and the Perch AI Service.

## Overview

The Perch AI Service is a separate service that hosts the AI model wrapped with perch functionality. It receives client data and streams AI-generated summaries back to the dashboard.

## Base URL

- **Development**: `http://localhost:9000`
- **Production**: Configurable via `PERCH_SERVICE_URL` environment variable

## Endpoints

### 1. Summarize Client

Generate an AI-powered summary for a customer.

**Endpoint**: `POST /api/v1/summarize`

**Content-Type**: `application/json`

**Accept**: `text/event-stream`

#### Request Body

```json
{
  "prompt": "Take all the client data below and summarize it:",
  "customer_data": {
    "customer_id": "CUST001",
    "business_name": "Acme Corp",
    "segment": "SME",
    "industry": "Manufacturing",
    "annual_revenue": 5000000.0,
    "number_of_employees": 50,
    "loan_amount": 250000.0,
    "loan_product": "Term Loan",
    "credit_score_bucket": "high",
    "risk_rating": 3,
    "relationship_length_years": 5.2,
    "region": "West",
    "is_collateralized": true,
    "interest_rate": 6.5,
    "delinquency_count_12m": 0,
    "loan_outcome": "active",
    "churn_label": 0,
    "customer_persona": "Reliable Borrower"
  },
  "documents": [
    {
      "document_id": "DOC001",
      "customer_id": "CUST001",
      "doc_type": "tax_return",
      "created_at": "2024-01-15T10:30:00Z",
      "title": "2023 Tax Return",
      "language": "en",
      "format": "pdf",
      "content": "..."
    }
  ],
  "messages": [
    {
      "message_id": "MSG001",
      "customer_id": "CUST001",
      "message_time": "2024-03-01T14:22:00Z",
      "channel": "email",
      "message_role": "customer",
      "phase_label": "servicing",
      "sentiment": "positive",
      "text": "Thank you for the quick response...",
      "thread_id": "THREAD001"
    }
  ]
}
```

#### Response (Server-Sent Events)

**Status Code**: `200 OK`

**Content-Type**: `text/event-stream`

**Headers**:
```
Cache-Control: no-cache
Connection: keep-alive
```

**Body**: Stream of SSE events in the following format:

```
data: {"order": 0, "token": "Customer", "hallucination_prob": 0.15}

data: {"order": 1, "token": "is", "hallucination_prob": 0.08}

data: {"order": 2, "token": "a", "hallucination_prob": 0.02}

data: {"order": 3, "token": "well-established", "hallucination_prob": 0.12}

...
```

Each SSE event follows this structure:
- Line starts with `data: `
- Followed by JSON object
- Empty line separates events (`\n\n`)

#### Token Data Format

```typescript
{
  "order": number,          // Sequential order starting from 0
  "token": string,          // The generated token/word
  "hallucination_prob": number  // Probability [0.0, 1.0] that token is hallucination
}
```

#### Error Format

If an error occurs during generation, send an error event:

```
data: {"type": "error", "message": "Model inference failed"}

```

Then close the connection.

#### End of Stream

When generation is complete, simply close the SSE connection. No special end marker is needed.

### 2. Health Check

Check if the service is available.

**Endpoint**: `GET /health`

**Response**:

```json
{
  "status": "healthy",
  "model": "gpt2",
  "version": "1.0.0"
}
```

**Status Codes**:
- `200 OK` - Service is healthy
- `503 Service Unavailable` - Service is not ready

## Error Handling

### HTTP Error Responses

| Status Code | Description |
|-------------|-------------|
| 400 | Invalid request body or missing required fields |
| 500 | Internal server error during model inference |
| 503 | Service is temporarily unavailable |

### Error Response Body

```json
{
  "error": "string",
  "detail": "string"
}
```

## Implementation Notes

### 1. Token Generation

- Generate tokens one at a time
- Calculate hallucination probability per token using perch wrapper
- Stream immediately (don't buffer)
- Include sequential `order` field

### 2. Performance

- First token should arrive within 1-2 seconds
- Subsequent tokens should stream smoothly
- Total generation time: < 60 seconds (configurable timeout)

### 3. Streaming

- Use `text/event-stream` content type
- Follow SSE format exactly
- Flush output after each event
- Close connection when done

### 4. Model Context

The model should:
- Use the `prompt` as the system instruction
- Consider `customer_data`, `documents`, and `messages` as context
- Generate a comprehensive summary
- Include risk assessment and recommendations

## Example Implementation (Python)

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
import json

app = FastAPI()

class SummarizeRequest(BaseModel):
    prompt: str
    customer_data: Dict[str, Any]
    documents: List[Dict[str, Any]]
    messages: List[Dict[str, Any]]

@app.post("/api/v1/summarize")
async def summarize(request: SummarizeRequest):
    async def generate():
        # Your model generation code here
        for order, (token, hallucination_prob) in enumerate(model.generate(...)):
            data = {
                "order": order,
                "token": token,
                "hallucination_prob": hallucination_prob
            }
            yield f"data: {json.dumps(data)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

@app.get("/health")
async def health():
    return {"status": "healthy", "model": "your-model"}
```

## Testing

### Test with cURL

```bash
# POST request with streaming
curl -X POST http://localhost:9000/api/v1/summarize \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "prompt": "Summarize this customer:",
    "customer_data": {"customer_id": "TEST"},
    "documents": [],
    "messages": []
  }'
```

### Test with Python

```python
import requests
import json

url = "http://localhost:9000/api/v1/summarize"
data = {
    "prompt": "Summarize this customer:",
    "customer_data": {"customer_id": "TEST"},
    "documents": [],
    "messages": []
}

response = requests.post(
    url,
    json=data,
    headers={"Accept": "text/event-stream"},
    stream=True
)

for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith('data: '):
            token_data = json.loads(line_str[6:])
            print(f"Token {token_data['order']}: {token_data['token']} "
                  f"(hallucination: {token_data['hallucination_prob']:.2f})")
```

## Security Considerations

### Future Enhancements (Not Required Initially)

1. **Authentication**
   - API key in header: `Authorization: Bearer <token>`
   - Validate on each request

2. **Rate Limiting**
   - Limit requests per client
   - Prevent abuse

3. **Input Validation**
   - Sanitize customer data
   - Validate document/message formats
   - Limit payload size

4. **Network Security**
   - Use HTTPS in production
   - VPC/private networking
   - IP whitelisting

## Monitoring and Logging

Recommended metrics to track:

- Request count
- Average generation time
- Token generation rate
- Error rate
- Hallucination probability distribution
- Model inference latency

## Version History

- **v1.0** (2024-12) - Initial API contract
  - POST /api/v1/summarize with SSE streaming
  - GET /health for health checks
  - Token format with order and hallucination_prob

