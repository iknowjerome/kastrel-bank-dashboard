"""Dashboard-specific API routes."""
import csv
import os
import json
import logging
from pathlib import Path
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional

from .websocket import ConnectionManager
from ..demo.local_data import LocalDataLoader
from ..services.perch_client import PerchServiceClient, PerchServiceError
from ..services.data_aggregator import (
    aggregate_client_data_for_summary,
    load_prompt_from_file,
    save_prompt_to_file,
    get_data_context_metadata
)

logger = logging.getLogger(__name__)


# =============================================================================
# Banking Data Loading Helpers
# =============================================================================

def load_csv_data(filename: str) -> List[Dict[str, Any]]:
    """Load data from a CSV file in the demo_data directory."""
    base_path = Path(__file__).parent.parent.parent / 'demo_data'
    file_path = base_path / filename
    
    if not file_path.exists():
        return []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)


def parse_customer(row: Dict[str, str]) -> Dict[str, Any]:
    """Parse a customer row from CSV to typed dict."""
    return {
        'customer_id': row.get('customer_id', ''),
        'business_name': row.get('business_name', ''),
        'segment': row.get('segment', ''),
        'industry': row.get('industry', ''),
        'annual_revenue': float(row.get('annual_revenue', 0)),
        'number_of_employees': int(row.get('number_of_employees', 0)),
        'loan_amount': float(row.get('loan_amount', 0)),
        'loan_product': row.get('loan_product', ''),
        'credit_score_bucket': row.get('credit_score_bucket', 'medium'),
        'risk_rating': int(row.get('risk_rating', 5)),
        'relationship_length_years': float(row.get('relationship_length_years', 0)),
        'region': row.get('region', ''),
        'is_collateralized': row.get('is_collateralized', 'False').lower() == 'true',
        'interest_rate': float(row.get('interest_rate', 0)),
        'delinquency_count_12m': int(row.get('delinquency_count_12m', 0)),
        'loan_outcome': row.get('loan_outcome', ''),
        'churn_label': int(row.get('churn_label', 0)),
        'customer_persona': row.get('customer_persona', ''),
    }


def parse_document(row: Dict[str, str]) -> Dict[str, Any]:
    """Parse a document row from CSV to typed dict."""
    return {
        'document_id': row.get('document_id', ''),
        'customer_id': row.get('customer_id', ''),
        'doc_type': row.get('doc_type', ''),
        'created_at': row.get('created_at', ''),
        'title': row.get('title', ''),
        'language': row.get('language', 'en'),
        'format': row.get('format', ''),
        'content': row.get('content', ''),
    }


def parse_message(row: Dict[str, str]) -> Dict[str, Any]:
    """Parse a message row from CSV to typed dict."""
    return {
        'message_id': row.get('message_id', ''),
        'customer_id': row.get('customer_id', ''),
        'message_time': row.get('message_time', ''),
        'channel': row.get('channel', ''),
        'message_role': row.get('message_role', ''),
        'phase_label': row.get('phase_label', ''),
        'agent_id': row.get('agent_id', ''),
        'agent_persona': row.get('agent_persona', ''),
        'agent_role': row.get('agent_role', ''),
        'agent_tone': row.get('agent_tone', ''),
        'sentiment': row.get('sentiment', 'neutral'),
        'churn_label': int(row.get('churn_label', 0)),
        'loan_outcome': row.get('loan_outcome', ''),
        'customer_persona': row.get('customer_persona', ''),
        'text': row.get('text', ''),
        'referenced_document_ids': row.get('referenced_document_ids') or None,
        'thread_id': row.get('thread_id', ''),
    }


def setup_dashboard_routes(
    app,
    aggregator,
    ws_manager: ConnectionManager,
    local_data_loader: LocalDataLoader,
    perch_client: Optional[PerchServiceClient] = None
):
    """Add dashboard routes to the FastAPI app."""
    
    # --- Dashboard API ---
    
    @app.get("/dashboard/api/agents")
    async def list_agents():
        """List all connected/known agents (perches)."""
        # Start with all registered agents
        agents_dict = {}
        
        # Add all registered agents
        for agent_id, info in aggregator.registered_agents.items():
            agents_dict[agent_id] = {
                "agent_id": agent_id,
                "registered_at": info.get('registered_at'),
                "model_info": info.get('model_info'),
                "last_seen": None  # Will be updated if they've sent traces
            }
        
        # Update with trace information
        for entry in aggregator.trace_history:
            agent_id = entry.get('agent_id')
            if agent_id not in agents_dict:
                # Agent sent traces but never registered (shouldn't happen, but handle it)
                agents_dict[agent_id] = {
                    "agent_id": agent_id,
                    "registered_at": None,
                    "model_info": None,
                    "last_seen": None
                }
            
            # Update last_seen and model_info from most recent trace
            timestamp = entry.get('metadata', {}).get('timestamp')
            # Ensure timestamp is a valid number
            if timestamp is not None:
                try:
                    timestamp = float(timestamp)
                    if agents_dict[agent_id]['last_seen'] is None or timestamp > agents_dict[agent_id]['last_seen']:
                        agents_dict[agent_id]['last_seen'] = timestamp
                except (ValueError, TypeError):
                    # Invalid timestamp, skip it
                    pass
            
            # Update model_info from traces if not set from registration
            if not agents_dict[agent_id]['model_info']:
                agents_dict[agent_id]['model_info'] = entry.get('metadata', {}).get('model_info')
        
        # Use registered_at as fallback for last_seen if no traces sent yet
        for agent_id, agent_info in agents_dict.items():
            if agent_info['last_seen'] is None and agent_info['registered_at'] is not None:
                try:
                    # Ensure registered_at is a valid float before using as fallback
                    agent_info['last_seen'] = float(agent_info['registered_at'])
                except (ValueError, TypeError):
                    # If registered_at is invalid, leave last_seen as None
                    pass
        
        agent_list = list(agents_dict.values())
        
        # Debug logging
        from app.main import logger
        for agent in agent_list:
            logger.debug(f"Agent {agent['agent_id']}: last_seen={agent['last_seen']} (type: {type(agent['last_seen'])})")
        
        return {"agents": agent_list, "count": len(agent_list)}
    
    @app.get("/dashboard/api/traces")
    async def get_traces(limit: int = 100, agent_id: str = None):
        """Get recent traces, optionally filtered by agent."""
        traces = aggregator.trace_history[-limit:]
        
        if agent_id:
            traces = [t for t in traces if t.get('agent_id') == agent_id]
        
        return {"traces": traces, "count": len(traces)}
    
    @app.get("/dashboard/api/stats")
    async def get_stats():
        """Get aggregate statistics."""
        return aggregator.aggregate_statistics()
    
    # --- Demo Features ---
    
    @app.post("/dashboard/api/demo/load-local-data")
    async def load_local_data(filename: str = None):
        """Load pre-recorded data from local files (demo feature)."""
        try:
            data = local_data_loader.load(filename)
            # Inject into aggregator as if it came from perches
            for entry in data:
                aggregator.add_traces(
                    entry.get('agent_id', 'demo-agent'),
                    entry.get('traces', {}),
                    entry.get('metadata', {})
                )
            
            # Broadcast update to WebSocket clients
            await ws_manager.broadcast({
                "type": "trace_update",
                "agent_id": "demo-agent",
                "loaded": len(data)
            })
            
            return {"status": "ok", "loaded": len(data)}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    @app.get("/dashboard/api/demo/available-data")
    async def list_available_data():
        """List available local data files."""
        return {"files": local_data_loader.list_available()}
    
    # --- WebSocket for Real-time Updates ---
    
    @app.websocket("/dashboard/ws")
    async def websocket_endpoint(websocket: WebSocket):
        """WebSocket for real-time trace updates."""
        await ws_manager.connect(websocket)
        try:
            while True:
                # Keep connection alive, receive any client messages
                data = await websocket.receive_text()
                # Could handle client commands here
        except WebSocketDisconnect:
            ws_manager.disconnect(websocket)
    
    # =========================================================================
    # Banking Data API Endpoints
    # =========================================================================
    
    @app.get("/api/banking/customers")
    async def get_customers(
        limit: int = Query(100, ge=1, le=1000),
        offset: int = Query(0, ge=0),
        segment: Optional[str] = None,
        industry: Optional[str] = None,
        churn_risk: Optional[bool] = None
    ):
        """Get list of banking customers with optional filtering."""
        raw_data = load_csv_data('banking_churn_customers_1000.csv')
        customers = [parse_customer(row) for row in raw_data]
        
        # Apply filters
        if segment:
            customers = [c for c in customers if c['segment'].lower() == segment.lower()]
        if industry:
            customers = [c for c in customers if c['industry'].lower() == industry.lower()]
        if churn_risk is not None:
            customers = [c for c in customers if (c['churn_label'] == 1) == churn_risk]
        
        total = len(customers)
        customers = customers[offset:offset + limit]
        
        return {
            "customers": customers,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    
    @app.get("/api/banking/customers/{customer_id}")
    async def get_customer(customer_id: str):
        """Get a specific customer by ID."""
        raw_data = load_csv_data('banking_churn_customers_1000.csv')
        customers = [parse_customer(row) for row in raw_data]
        
        customer = next((c for c in customers if c['customer_id'] == customer_id), None)
        
        if not customer:
            return {"error": "Customer not found"}, 404
        
        return customer
    
    @app.get("/api/banking/customers/{customer_id}/documents")
    async def get_customer_documents(customer_id: str):
        """Get documents for a specific customer."""
        raw_data = load_csv_data('banking_churn_documents_1000.csv')
        documents = [parse_document(row) for row in raw_data]
        
        customer_docs = [d for d in documents if d['customer_id'] == customer_id]
        
        return {
            "documents": customer_docs,
            "count": len(customer_docs)
        }
    
    @app.get("/api/banking/customers/{customer_id}/messages")
    async def get_customer_messages(customer_id: str):
        """Get messages for a specific customer."""
        raw_data = load_csv_data('banking_churn_messages_1000.csv')
        messages = [parse_message(row) for row in raw_data]
        
        customer_msgs = [m for m in messages if m['customer_id'] == customer_id]
        # Sort by message time
        customer_msgs.sort(key=lambda x: x['message_time'])
        
        return {
            "messages": customer_msgs,
            "count": len(customer_msgs)
        }
    
    @app.post("/api/banking/customers/{customer_id}/summarize")
    async def summarize_customer(customer_id: str):
        """
        Generate AI-powered summary for a customer using the Perch AI Service.
        Streams the response using Server-Sent Events (SSE).
        """
        # Check if perch client is configured
        if perch_client is None:
            logger.error("Perch service client not configured")
            raise HTTPException(
                status_code=503,
                detail="AI summarization service is not configured"
            )
        
        # Fetch customer data
        logger.info(f"Fetching data for customer {customer_id}")
        
        # Get customer profile
        raw_customers = load_csv_data('banking_churn_customers_1000.csv')
        customers = [parse_customer(row) for row in raw_customers]
        customer = next((c for c in customers if c['customer_id'] == customer_id), None)
        
        if not customer:
            raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")
        
        # Get documents
        raw_docs = load_csv_data('banking_churn_documents_1000.csv')
        documents = [parse_document(row) for row in raw_docs]
        customer_docs = [d for d in documents if d['customer_id'] == customer_id]
        
        # Get messages
        raw_msgs = load_csv_data('banking_churn_messages_1000.csv')
        messages = [parse_message(row) for row in raw_msgs]
        customer_msgs = [m for m in messages if m['customer_id'] == customer_id]
        customer_msgs.sort(key=lambda x: x['message_time'])
        
        # Aggregate data - let Perch service handle context management
        prompt, customer_data, docs, msgs = aggregate_client_data_for_summary(
            customer, customer_docs, customer_msgs,
            max_documents=None,   # Send all documents
            max_messages=None     # Send all messages
        )
        
        logger.info(f"Requesting summary from perch service for customer {customer_id}")
        logger.info(f"Using prompt: {prompt[:100]}...")  # Log first 100 chars of prompt
        
        # Define async generator for SSE streaming
        async def event_stream():
            try:
                async for token_data in perch_client.summarize_stream(
                    prompt=prompt,
                    customer_data=customer_data,
                    documents=docs,
                    messages=msgs
                ):
                    # Format as SSE: "data: {...}\n\n"
                    yield f"data: {json.dumps(token_data)}\n\n"
                
                logger.info(f"Completed streaming summary for customer {customer_id}")
                
            except PerchServiceError as e:
                logger.error(f"Perch service error: {e}")
                # Send error as SSE event
                error_data = {"type": "error", "message": str(e)}
                yield f"data: {json.dumps(error_data)}\n\n"
            except Exception as e:
                logger.error(f"Unexpected error during summarization: {e}")
                error_data = {"type": "error", "message": "An unexpected error occurred"}
                yield f"data: {json.dumps(error_data)}\n\n"
        
        # Return streaming response
        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # Disable nginx buffering
            }
        )
    
    @app.get("/api/banking/documents")
    async def get_all_documents(
        limit: int = Query(100, ge=1, le=1000),
        offset: int = Query(0, ge=0),
        doc_type: Optional[str] = None
    ):
        """Get list of all documents with optional filtering."""
        raw_data = load_csv_data('banking_churn_documents_1000.csv')
        documents = [parse_document(row) for row in raw_data]
        
        if doc_type:
            documents = [d for d in documents if d['doc_type'].lower() == doc_type.lower()]
        
        total = len(documents)
        documents = documents[offset:offset + limit]
        
        return {
            "documents": documents,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    
    @app.get("/api/banking/messages")
    async def get_all_messages(
        limit: int = Query(100, ge=1, le=1000),
        offset: int = Query(0, ge=0),
        sentiment: Optional[str] = None
    ):
        """Get list of all messages with optional filtering."""
        raw_data = load_csv_data('banking_churn_messages_1000.csv')
        messages = [parse_message(row) for row in raw_data]
        
        if sentiment:
            messages = [m for m in messages if m['sentiment'].lower() == sentiment.lower()]
        
        total = len(messages)
        messages = messages[offset:offset + limit]
        
        return {
            "messages": messages,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    
    @app.get("/api/banking/stats")
    async def get_banking_stats():
        """Get aggregate statistics for the banking data."""
        customers_raw = load_csv_data('banking_churn_customers_1000.csv')
        documents_raw = load_csv_data('banking_churn_documents_1000.csv')
        messages_raw = load_csv_data('banking_churn_messages_1000.csv')
        
        customers = [parse_customer(row) for row in customers_raw]
        
        # Calculate stats
        total_customers = len(customers)
        churn_risk_count = sum(1 for c in customers if c['churn_label'] == 1)
        total_loan_amount = sum(c['loan_amount'] for c in customers)
        avg_risk_rating = sum(c['risk_rating'] for c in customers) / total_customers if total_customers > 0 else 0
        
        segments = {}
        industries = {}
        for c in customers:
            segments[c['segment']] = segments.get(c['segment'], 0) + 1
            industries[c['industry']] = industries.get(c['industry'], 0) + 1
        
        return {
            "customers": {
                "total": total_customers,
                "churn_risk": churn_risk_count,
                "churn_risk_percentage": round(churn_risk_count / total_customers * 100, 1) if total_customers > 0 else 0,
                "total_loan_amount": total_loan_amount,
                "average_risk_rating": round(avg_risk_rating, 2),
            },
            "documents": {
                "total": len(documents_raw),
            },
            "messages": {
                "total": len(messages_raw),
            },
            "segments": segments,
            "industries": industries,
        }
    
    @app.get("/api/banking/prompt")
    async def get_prompt():
        """Get the current AI summarization prompt."""
        try:
            prompt = load_prompt_from_file()
            return {"prompt": prompt}
        except Exception as e:
            logger.error(f"Failed to load prompt: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to load prompt: {str(e)}")
    
    @app.post("/api/banking/prompt")
    async def save_prompt(data: dict):
        """Save a new AI summarization prompt."""
        try:
            prompt = data.get('prompt', '')
            if not prompt:
                raise HTTPException(status_code=400, detail="Prompt cannot be empty")
            
            save_prompt_to_file(prompt)
            return {"message": "Prompt saved successfully", "prompt": prompt}
        except Exception as e:
            logger.error(f"Failed to save prompt: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save prompt: {str(e)}")
    
    @app.get("/api/banking/customers/{customer_id}/context-metadata")
    async def get_customer_context_metadata(customer_id: str):
        """
        Get metadata about what data will be sent to the AI model for this customer.
        This shows which documents, messages, and profile sections will be included
        without showing the actual content.
        """
        # Get customer profile
        raw_customers = load_csv_data('banking_churn_customers_1000.csv')
        customers = [parse_customer(row) for row in raw_customers]
        customer = next((c for c in customers if c['customer_id'] == customer_id), None)
        
        if not customer:
            raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")
        
        # Get documents
        raw_docs = load_csv_data('banking_churn_documents_1000.csv')
        documents = [parse_document(row) for row in raw_docs]
        customer_docs = [d for d in documents if d['customer_id'] == customer_id]
        
        # Get messages
        raw_msgs = load_csv_data('banking_churn_messages_1000.csv')
        messages = [parse_message(row) for row in raw_msgs]
        customer_msgs = [m for m in messages if m['customer_id'] == customer_id]
        
        # Get metadata
        metadata = get_data_context_metadata(customer, customer_docs, customer_msgs)
        
        return metadata