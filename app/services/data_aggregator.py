"""Data aggregation utilities for preparing client data for AI summarization."""
from typing import Dict, Any, List


def aggregate_client_data_for_summary(
    customer_data: Dict[str, Any],
    documents: List[Dict[str, Any]],
    messages: List[Dict[str, Any]]
) -> tuple[str, Dict[str, Any], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Aggregate all client data and prepare it for AI summarization.
    
    Args:
        customer_data: Customer profile dictionary
        documents: List of document dictionaries
        messages: List of message dictionaries
    
    Returns:
        Tuple of (prompt, customer_data, documents, messages)
    """
    # Build the prompt
    prompt = """Take all the client data below and summarize it. 
Provide a comprehensive analysis including key risk factors, relationship health, 
and actionable recommendations."""
    
    # Return the structured data
    # The perch service will format this as needed for the model
    return prompt, customer_data, documents, messages


def format_customer_data_readable(customer_data: Dict[str, Any]) -> str:
    """
    Format customer data in a human-readable format.
    This can be used if we want to send a pre-formatted prompt to the model.
    
    Args:
        customer_data: Customer profile dictionary
        
    Returns:
        Formatted string representation
    """
    return f"""
Customer Profile:
- Business Name: {customer_data.get('business_name')}
- Customer ID: {customer_data.get('customer_id')}
- Industry: {customer_data.get('industry')}
- Segment: {customer_data.get('segment')}
- Annual Revenue: ${customer_data.get('annual_revenue', 0):,.2f}
- Employees: {customer_data.get('number_of_employees')}

Loan Details:
- Loan Amount: ${customer_data.get('loan_amount', 0):,.2f}
- Loan Product: {customer_data.get('loan_product')}
- Interest Rate: {customer_data.get('interest_rate')}%
- Collateralized: {customer_data.get('is_collateralized')}

Risk Profile:
- Credit Score Bucket: {customer_data.get('credit_score_bucket')}
- Risk Rating: {customer_data.get('risk_rating')}/10
- Delinquency Count (12m): {customer_data.get('delinquency_count_12m')}
- Churn Label: {customer_data.get('churn_label')}

Relationship:
- Relationship Length: {customer_data.get('relationship_length_years')} years
- Region: {customer_data.get('region')}
- Loan Outcome: {customer_data.get('loan_outcome')}
"""


def format_documents_readable(documents: List[Dict[str, Any]]) -> str:
    """
    Format documents in a human-readable format.
    
    Args:
        documents: List of document dictionaries
        
    Returns:
        Formatted string representation
    """
    if not documents:
        return "No documents on file."
    
    lines = [f"\nDocuments ({len(documents)} total):"]
    for doc in documents:
        lines.append(f"- {doc.get('title')} ({doc.get('doc_type')}) - {doc.get('created_at')}")
    
    return "\n".join(lines)


def format_messages_readable(messages: List[Dict[str, Any]]) -> str:
    """
    Format messages in a human-readable format.
    
    Args:
        messages: List of message dictionaries
        
    Returns:
        Formatted string representation
    """
    if not messages:
        return "No messages on record."
    
    lines = [f"\nMessages ({len(messages)} total):"]
    
    # Show up to 10 most recent messages
    recent_messages = messages[-10:] if len(messages) > 10 else messages
    
    for msg in recent_messages:
        sender = msg.get('message_role', 'unknown')
        sentiment = msg.get('sentiment', 'neutral')
        text_preview = msg.get('text', '')[:100]
        if len(msg.get('text', '')) > 100:
            text_preview += '...'
        
        lines.append(f"- [{msg.get('message_time')}] {sender} ({sentiment}): {text_preview}")
    
    if len(messages) > 10:
        lines.append(f"  ... and {len(messages) - 10} more messages")
    
    return "\n".join(lines)

