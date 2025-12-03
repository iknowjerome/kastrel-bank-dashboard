/**
 * API service for fetching banking data from the backend.
 * The backend loads data from CSV files in /demo_data/
 */

import { Customer, Document, Message } from './types';

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

