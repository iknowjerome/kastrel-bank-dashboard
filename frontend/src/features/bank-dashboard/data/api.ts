/**
 * API service for fetching banking data from the backend.
 * The backend loads data from CSV files in /demo_data/
 */

import { Customer, Document, Message, StreamingToken, Token } from './types';

// Base URL for API calls - uses relative path so it works with Vite proxy
const API_BASE = '/api/banking';

// =============================================================================
// Types for API responses
// =============================================================================

interface CustomersResponse {
  customers: Customer[];
  total: number;
  limit: number;
  offset: number;
}

interface DocumentsResponse {
  documents: Document[];
  count: number;
}

interface MessagesResponse {
  messages: Message[];
  count: number;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch all customers from the backend.
 * Fetches up to 1000 customers (the full dataset).
 */
export async function fetchCustomers(): Promise<Customer[]> {
  const response = await fetch(`${API_BASE}/customers?limit=1000`);
  if (!response.ok) {
    throw new Error(`Failed to fetch customers: ${response.statusText}`);
  }
  const data: CustomersResponse = await response.json();
  return data.customers;
}

/**
 * Fetch a single customer by ID.
 */
export async function fetchCustomerById(customerId: string): Promise<Customer | null> {
  const response = await fetch(`${API_BASE}/customers/${customerId}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch customer: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch documents for a specific customer.
 */
export async function fetchCustomerDocuments(customerId: string): Promise<Document[]> {
  const response = await fetch(`${API_BASE}/customers/${customerId}/documents`);
  if (!response.ok) {
    throw new Error(`Failed to fetch documents: ${response.statusText}`);
  }
  const data: DocumentsResponse = await response.json();
  return data.documents;
}

/**
 * Fetch messages for a specific customer.
 */
export async function fetchCustomerMessages(customerId: string): Promise<Message[]> {
  const response = await fetch(`${API_BASE}/customers/${customerId}/messages`);
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`);
  }
  const data: MessagesResponse = await response.json();
  return data.messages;
}

/**
 * Fetch all data for a customer (documents + messages) in parallel.
 */
export async function fetchCustomerData(customerId: string): Promise<{
  documents: Document[];
  messages: Message[];
}> {
  const [documents, messages] = await Promise.all([
    fetchCustomerDocuments(customerId),
    fetchCustomerMessages(customerId),
  ]);
  return { documents, messages };
}

// =============================================================================
// AI Summary Streaming API
// =============================================================================

/**
 * Stream AI summary for a customer using Server-Sent Events (SSE).
 * 
 * @param customerId - The customer ID to summarize
 * @param onToken - Callback called for each token received
 * @param onError - Callback called if an error occurs
 * @param onComplete - Callback called when streaming is complete
 * @returns A function to abort the stream
 */
export function streamAiSummary(
  customerId: string,
  onToken: (token: Token) => void,
  onError: (error: string) => void,
  onComplete: () => void
): () => void {
  const url = `${API_BASE}/customers/${customerId}/summarize`;
  
  // Use fetch with streaming instead of EventSource for POST support
  const abortController = new AbortController();
  
  (async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'text/event-stream',
        },
        signal: abortController.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start summary stream: ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete();
          break;
        }
        
        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages (separated by \n\n)
        const lines = buffer.split('\n\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const dataStr = line.trim().substring(6); // Remove "data: " prefix
            
            try {
              const data = JSON.parse(dataStr);
              
              // Check for error messages
              if (data.type === 'error') {
                onError(data.message || 'Unknown error occurred');
                reader.cancel();
                return;
              }
              
              // Process token data
              if (typeof data.order === 'number' && data.token && typeof data.hallucination_prob === 'number') {
                const streamingToken = data as StreamingToken;
                
                // Convert to Token format expected by the UI
                const token: Token = {
                  text: streamingToken.token,
                  riskScore: streamingToken.hallucination_prob,
                };
                
                onToken(token);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', dataStr, parseError);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Stream was aborted by user
          console.log('Stream aborted');
        } else {
          onError(error.message);
        }
      } else {
        onError('An unexpected error occurred');
      }
    }
  })();
  
  // Return abort function
  return () => {
    abortController.abort();
  };
}

