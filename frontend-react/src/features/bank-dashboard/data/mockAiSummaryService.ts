import { AiSummaryResponse, Token, AiSuggestion } from './types';
import { getCustomerById, getDocumentsForCustomer, getMessagesForCustomer } from './mockData';

// =============================================================================
// Helper Functions for Generating Dynamic Mock Data
// =============================================================================

function generateSummaryTokens(customerId: string): Token[] {
  const customer = getCustomerById(customerId);
  const messages = getMessagesForCustomer(customerId);
  const documents = getDocumentsForCustomer(customerId);
  
  if (!customer) {
    return [{ text: 'Customer', riskScore: 0.1 }, { text: 'not', riskScore: 0.3 }, { text: 'found.', riskScore: 0.5 }];
  }

  // Calculate sentiment breakdown
  const sentimentCounts = messages.reduce(
    (acc, msg) => {
      acc[msg.sentiment] = (acc[msg.sentiment] || 0) + 1;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 } as Record<string, number>
  );
  
  const totalMessages = messages.length || 1;
  const negativeRatio = sentimentCounts.negative / totalMessages;
  
  // Build summary based on actual customer data
  const riskLevel = customer.risk_rating >= 7 ? 'elevated' : customer.risk_rating >= 4 ? 'moderate' : 'low';
  const churnRisk = customer.churn_label === 1 ? 'high churn risk' : 'stable retention outlook';
  
  const summaryParts: { text: string; riskScore: number }[] = [
    { text: customer.business_name, riskScore: 0.1 },
    { text: 'is', riskScore: 0.1 },
    { text: 'a', riskScore: 0.1 },
    { text: customer.segment, riskScore: 0.15 },
    { text: 'client', riskScore: 0.1 },
    { text: 'in', riskScore: 0.1 },
    { text: 'the', riskScore: 0.1 },
    { text: customer.industry, riskScore: 0.2 },
    { text: 'sector', riskScore: 0.1 },
    { text: 'with', riskScore: 0.1 },
    { text: riskLevel, riskScore: customer.risk_rating / 10 },
    { text: 'risk', riskScore: customer.risk_rating / 10 },
    { text: 'profile.', riskScore: customer.risk_rating / 10 },
    { text: 'The', riskScore: 0.1 },
    { text: 'client', riskScore: 0.1 },
    { text: 'has', riskScore: 0.1 },
    { text: 'a', riskScore: 0.1 },
    { text: `$${(customer.loan_amount / 1000).toFixed(0)}K`, riskScore: customer.loan_amount > 500000 ? 0.5 : 0.2 },
    { text: customer.loan_product, riskScore: 0.2 },
    { text: 'with', riskScore: 0.1 },
    { text: `${customer.interest_rate}%`, riskScore: customer.interest_rate > 8 ? 0.6 : 0.2 },
    { text: 'interest.', riskScore: 0.1 },
  ];

  // Add delinquency info if relevant
  if (customer.delinquency_count_12m > 0) {
    summaryParts.push(
      { text: 'There', riskScore: 0.3 },
      { text: 'have', riskScore: 0.3 },
      { text: 'been', riskScore: 0.3 },
      { text: `${customer.delinquency_count_12m}`, riskScore: Math.min(0.9, customer.delinquency_count_12m * 0.2) },
      { text: 'delinquencies', riskScore: Math.min(0.9, customer.delinquency_count_12m * 0.2) },
      { text: 'in', riskScore: 0.3 },
      { text: 'the', riskScore: 0.3 },
      { text: 'past', riskScore: 0.3 },
      { text: '12', riskScore: 0.3 },
      { text: 'months.', riskScore: Math.min(0.9, customer.delinquency_count_12m * 0.2) }
    );
  }

  // Add sentiment info
  if (negativeRatio > 0.3) {
    summaryParts.push(
      { text: 'Recent', riskScore: 0.5 },
      { text: 'communications', riskScore: 0.4 },
      { text: 'show', riskScore: 0.4 },
      { text: 'negative', riskScore: 0.8 },
      { text: 'sentiment', riskScore: 0.7 },
      { text: 'patterns.', riskScore: 0.6 }
    );
  } else {
    summaryParts.push(
      { text: 'Communication', riskScore: 0.2 },
      { text: 'sentiment', riskScore: 0.2 },
      { text: 'is', riskScore: 0.1 },
      { text: 'generally', riskScore: 0.1 },
      { text: 'positive.', riskScore: 0.15 }
    );
  }

  // Add document status
  summaryParts.push(
    { text: 'The', riskScore: 0.1 },
    { text: 'client', riskScore: 0.1 },
    { text: 'has', riskScore: 0.1 },
    { text: `${documents.length}`, riskScore: documents.length < 2 ? 0.5 : 0.2 },
    { text: 'documents', riskScore: documents.length < 2 ? 0.4 : 0.2 },
    { text: 'on', riskScore: 0.1 },
    { text: 'file.', riskScore: 0.1 }
  );

  // Final assessment
  summaryParts.push(
    { text: 'Overall:', riskScore: 0.2 },
    { text: churnRisk.split(' ')[0], riskScore: customer.churn_label === 1 ? 0.85 : 0.2 },
    { text: churnRisk.split(' ').slice(1).join(' ') + '.', riskScore: customer.churn_label === 1 ? 0.75 : 0.15 }
  );

  return summaryParts;
}

function generateSuggestions(customerId: string): AiSuggestion[] {
  const customer = getCustomerById(customerId);
  const documents = getDocumentsForCustomer(customerId);
  const messages = getMessagesForCustomer(customerId);
  
  if (!customer) return [];

  const suggestions: AiSuggestion[] = [];

  // Document-related suggestions
  const hasRecentTaxReturn = documents.some(
    (d) => d.doc_type === 'tax_return' && new Date(d.created_at) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  );
  
  if (!hasRecentTaxReturn) {
    suggestions.push({
      id: 'doc-1',
      title: 'Request updated tax return documents',
      categories: ['Documentation', 'Compliance'],
      confidence: 0.92,
    });
  }

  // Risk-related suggestions
  if (customer.risk_rating >= 6) {
    suggestions.push({
      id: 'risk-1',
      title: 'Schedule risk review meeting with client',
      categories: ['Risk mitigation', 'Relationship'],
      confidence: 0.85,
    });
  }

  // Delinquency-related suggestions
  if (customer.delinquency_count_12m > 0) {
    suggestions.push({
      id: 'del-1',
      title: 'Review payment schedule and discuss restructuring options',
      categories: ['Risk mitigation', 'Retention'],
      confidence: 0.88,
    });
  }

  // Churn-related suggestions
  if (customer.churn_label === 1) {
    suggestions.push({
      id: 'churn-1',
      title: 'Proactive outreach to understand concerns',
      categories: ['Retention', 'Relationship'],
      confidence: 0.91,
    });
  }

  // Upsell suggestions for good clients
  if (customer.risk_rating <= 4 && customer.relationship_length_years > 3) {
    suggestions.push({
      id: 'upsell-1',
      title: 'Propose credit limit increase or new product offerings',
      categories: ['Upsell', 'Growth'],
      confidence: 0.78,
    });
  }

  // Sentiment-based suggestions
  const negativeMessages = messages.filter((m) => m.sentiment === 'negative');
  if (negativeMessages.length > 0) {
    suggestions.push({
      id: 'sent-1',
      title: 'Address recent customer concerns with follow-up call',
      categories: ['Relationship', 'Retention'],
      confidence: 0.83,
    });
  }

  // Collateral suggestion
  if (!customer.is_collateralized && customer.loan_amount > 200000) {
    suggestions.push({
      id: 'coll-1',
      title: 'Discuss collateral options for improved terms',
      categories: ['Risk mitigation', 'Advisory'],
      confidence: 0.72,
    });
  }

  // Sort by confidence and take top 5
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

function generateRiskCommentary(customerId: string): string {
  const customer = getCustomerById(customerId);
  const messages = getMessagesForCustomer(customerId);
  
  if (!customer) return 'Unable to generate risk commentary: customer not found.';

  const parts: string[] = [];

  // Overall risk assessment
  if (customer.risk_rating >= 7) {
    parts.push(`${customer.business_name} presents an elevated risk profile with a rating of ${customer.risk_rating}/10.`);
  } else if (customer.risk_rating >= 4) {
    parts.push(`${customer.business_name} has a moderate risk profile with a rating of ${customer.risk_rating}/10.`);
  } else {
    parts.push(`${customer.business_name} maintains a low risk profile with a favorable rating of ${customer.risk_rating}/10.`);
  }

  // Credit score context
  parts.push(`Credit score is in the ${customer.credit_score_bucket} bucket.`);

  // Delinquency commentary
  if (customer.delinquency_count_12m > 2) {
    parts.push(`Multiple delinquencies (${customer.delinquency_count_12m}) in the past year are a significant concern.`);
  } else if (customer.delinquency_count_12m > 0) {
    parts.push(`There has been ${customer.delinquency_count_12m} delinquency event in the past 12 months, which warrants monitoring.`);
  } else {
    parts.push('Payment history has been clean with no delinquencies in the past year.');
  }

  // Collateral status
  if (customer.is_collateralized) {
    parts.push('The loan is secured with collateral, providing additional protection.');
  } else if (customer.loan_amount > 200000) {
    parts.push('The unsecured nature of this larger loan adds some risk exposure.');
  }

  // Sentiment analysis
  const negativeCount = messages.filter((m) => m.sentiment === 'negative').length;
  const totalMessages = messages.length;
  if (totalMessages > 0) {
    const negativeRatio = negativeCount / totalMessages;
    if (negativeRatio > 0.3) {
      parts.push('Communication patterns show elevated negative sentiment which may indicate relationship strain.');
    } else if (negativeRatio > 0.1) {
      parts.push('Some negative sentiment detected in recent communications.');
    }
  }

  // Churn prediction
  if (customer.churn_label === 1) {
    parts.push('Our models indicate elevated churn risk for this client - proactive engagement recommended.');
  }

  return parts.join(' ');
}

// =============================================================================
// Mock API Service
// =============================================================================

export async function fetchAiSummaryForClient(customerId: string): Promise<AiSummaryResponse> {
  // Simulate network delay (800ms - 1500ms)
  const delay = 800 + Math.random() * 700;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Simulate occasional errors (5% chance)
  if (Math.random() < 0.05) {
    throw new Error('Failed to generate AI summary. Please try again.');
  }

  return {
    summaryTokens: generateSummaryTokens(customerId),
    suggestions: generateSuggestions(customerId),
    riskCommentary: generateRiskCommentary(customerId),
    generatedAt: new Date().toISOString(),
  };
}

