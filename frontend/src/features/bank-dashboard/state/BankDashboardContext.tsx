import { createContext, useContext, useState, useCallback, useEffect, FC, ReactNode } from 'react';
import { DashboardSection, Customer, Document, Message } from '../data/types';
import { fetchCustomers, fetchCustomerData } from '../data/api';

// =============================================================================
// Context Type
// =============================================================================

interface BankDashboardContextType {
  // Client selection
  currentClientId: string | null;
  setCurrentClientId: (id: string) => void;
  currentClient: Customer | null;
  allCustomers: Customer[];
  
  // Client data (documents & messages)
  documents: Document[];
  messages: Message[];
  
  // Loading states
  isLoadingCustomers: boolean;
  isLoadingClientData: boolean;
  error: string | null;
  
  // Section navigation
  currentSection: DashboardSection;
  setCurrentSection: (section: DashboardSection) => void;
  
  // Sidebar collapsed state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

// =============================================================================
// Context Creation
// =============================================================================

const BankDashboardContext = createContext<BankDashboardContextType | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

interface BankDashboardProviderProps {
  children: ReactNode;
}

export const BankDashboardProvider: FC<BankDashboardProviderProps> = ({ children }) => {
  // Customer list state
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  
  // Current client state
  const [currentClientId, setCurrentClientIdState] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingClientData, setIsLoadingClientData] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [currentSection, setCurrentSection] = useState<DashboardSection>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Get current client object
  const currentClient = currentClientId
    ? allCustomers.find((c) => c.customer_id === currentClientId) || null
    : null;

  // Fetch all customers on mount
  useEffect(() => {
    let cancelled = false;
    
    async function loadCustomers() {
      try {
        setIsLoadingCustomers(true);
        setError(null);
        const customers = await fetchCustomers();
        
        if (!cancelled) {
          setAllCustomers(customers);
          // Auto-select first customer if none selected
          if (customers.length > 0 && !currentClientId) {
            setCurrentClientIdState(customers[0].customer_id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load customers');
          console.error('Failed to fetch customers:', err);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCustomers(false);
        }
      }
    }
    
    loadCustomers();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch client data (documents & messages) when client changes
  useEffect(() => {
    if (!currentClientId) {
      setDocuments([]);
      setMessages([]);
      return;
    }
    
    // Store in local variable so TypeScript knows it's not null
    const clientId = currentClientId;
    let cancelled = false;
    
    async function loadClientData() {
      try {
        setIsLoadingClientData(true);
        const data = await fetchCustomerData(clientId);
        
        if (!cancelled) {
          setDocuments(data.documents);
          setMessages(data.messages);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch client data:', err);
          // Don't set global error for client data failures
          setDocuments([]);
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingClientData(false);
        }
      }
    }
    
    loadClientData();
    
    return () => {
      cancelled = true;
    };
  }, [currentClientId]);

  // Wrap setCurrentClientId to also reset section to overview
  const setCurrentClientId = useCallback((id: string) => {
    setCurrentClientIdState(id);
    setCurrentSection('overview');
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const value: BankDashboardContextType = {
    currentClientId,
    setCurrentClientId,
    currentClient,
    allCustomers,
    documents,
    messages,
    isLoadingCustomers,
    isLoadingClientData,
    error,
    currentSection,
    setCurrentSection,
    sidebarCollapsed,
    toggleSidebar,
  };

  return (
    <BankDashboardContext.Provider value={value}>
      {children}
    </BankDashboardContext.Provider>
  );
};

// =============================================================================
// Hook
// =============================================================================

export function useBankDashboard(): BankDashboardContextType {
  const context = useContext(BankDashboardContext);
  if (!context) {
    throw new Error('useBankDashboard must be used within a BankDashboardProvider');
  }
  return context;
}
