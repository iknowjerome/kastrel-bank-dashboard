"""Data aggregation utilities for preparing client data for AI summarization."""
from typing import Dict, Any, List
import os
from pathlib import Path


# Path to the prompt file
PROMPTS_DIR = Path(__file__).parent.parent.parent / "prompts"
DEFAULT_PROMPT_FILE = PROMPTS_DIR / "default_summary_prompt.txt"


def load_prompt_from_file(prompt_file: Path = DEFAULT_PROMPT_FILE) -> str:
    """
    Load the prompt from a text file.
    
    Args:
        prompt_file: Path to the prompt file
        
    Returns:
        The prompt text
    """
    try:
        with open(prompt_file, 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        # Fallback to default if file doesn't exist
        default_prompt = """Take all the client data below and summarize it. 
Provide a comprehensive analysis including key risk factors, relationship health, 
and actionable recommendations."""
        # Try to create the file with the default
        try:
            os.makedirs(prompt_file.parent, exist_ok=True)
            with open(prompt_file, 'w') as f:
                f.write(default_prompt)
        except Exception:
            pass
        return default_prompt


def save_prompt_to_file(prompt: str, prompt_file: Path = DEFAULT_PROMPT_FILE) -> None:
    """
    Save the prompt to a text file.
    
    Args:
        prompt: The prompt text to save
        prompt_file: Path to the prompt file
    """
    os.makedirs(prompt_file.parent, exist_ok=True)
    with open(prompt_file, 'w') as f:
        f.write(prompt)


def get_data_context_metadata(
    customer_data: Dict[str, Any],
    documents: List[Dict[str, Any]],
    messages: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Get metadata about what data will be sent to the model.
    
    Args:
        customer_data: Customer profile dictionary
        documents: List of document dictionaries
        messages: List of message dictionaries
        
    Returns:
        Dictionary with metadata about the data being sent
    """
    # Group documents by type
    doc_types = {}
    for doc in documents:
        doc_type = doc.get('doc_type', 'unknown')
        if doc_type not in doc_types:
            doc_types[doc_type] = []
        doc_types[doc_type].append({
            'title': doc.get('title', 'Untitled'),
            'created_at': doc.get('created_at', 'Unknown date'),
            'format': doc.get('format', 'unknown')
        })
    
    # Group messages by channel and sentiment
    message_stats = {
        'total': len(messages),
        'by_channel': {},
        'by_sentiment': {},
        'by_role': {}
    }
    
    for msg in messages:
        channel = msg.get('channel', 'unknown')
        sentiment = msg.get('sentiment', 'neutral')
        role = msg.get('message_role', 'unknown')
        
        message_stats['by_channel'][channel] = message_stats['by_channel'].get(channel, 0) + 1
        message_stats['by_sentiment'][sentiment] = message_stats['by_sentiment'].get(sentiment, 0) + 1
        message_stats['by_role'][role] = message_stats['by_role'].get(role, 0) + 1
    
    # Customer profile sections
    customer_sections = {
        'business_profile': {
            'business_name': customer_data.get('business_name'),
            'customer_id': customer_data.get('customer_id'),
            'industry': customer_data.get('industry'),
            'segment': customer_data.get('segment'),
            'annual_revenue': customer_data.get('annual_revenue'),
            'number_of_employees': customer_data.get('number_of_employees')
        },
        'loan_details': {
            'loan_amount': customer_data.get('loan_amount'),
            'loan_product': customer_data.get('loan_product'),
            'interest_rate': customer_data.get('interest_rate'),
            'is_collateralized': customer_data.get('is_collateralized')
        },
        'risk_profile': {
            'credit_score_bucket': customer_data.get('credit_score_bucket'),
            'risk_rating': customer_data.get('risk_rating'),
            'delinquency_count_12m': customer_data.get('delinquency_count_12m'),
            'churn_label': customer_data.get('churn_label')
        },
        'relationship_health': {
            'relationship_length_years': customer_data.get('relationship_length_years'),
            'region': customer_data.get('region'),
            'loan_outcome': customer_data.get('loan_outcome'),
            'customer_persona': customer_data.get('customer_persona')
        }
    }
    
    return {
        'customer_profile': customer_sections,
        'documents': {
            'total_count': len(documents),
            'by_type': doc_types
        },
        'messages': message_stats
    }


def aggregate_client_data_for_summary(
    customer_data: Dict[str, Any],
    documents: List[Dict[str, Any]],
    messages: List[Dict[str, Any]],
    custom_prompt: str = None,
    max_documents: int = None,
    max_messages: int = None
) -> tuple[str, Dict[str, Any], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Aggregate all client data and prepare it for AI summarization.
    
    Args:
        customer_data: Customer profile dictionary
        documents: List of document dictionaries
        messages: List of message dictionaries
        custom_prompt: Optional custom prompt to use instead of the default
        max_documents: Maximum number of documents to include (most recent). None = all documents.
        max_messages: Maximum number of messages to include (most recent). None = all messages.
    
    Returns:
        Tuple of (prompt, customer_data, documents, messages)
    """
    # Load the prompt from file or use custom prompt
    if custom_prompt:
        prompt = custom_prompt
    else:
        prompt = load_prompt_from_file()
    
    # Sort by most recent, but only limit if max values are specified
    # Take most recent documents
    sorted_documents = sorted(documents, key=lambda d: d.get('created_at', ''), reverse=True)
    limited_documents = sorted_documents[:max_documents] if max_documents else sorted_documents
    
    # Take most recent messages
    sorted_messages = sorted(messages, key=lambda m: m.get('message_time', ''), reverse=True)
    limited_messages = sorted_messages[:max_messages] if max_messages else sorted_messages
    
    # Return the structured data
    # The perch service will format this as needed for the model
    return prompt, customer_data, limited_documents, limited_messages


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

