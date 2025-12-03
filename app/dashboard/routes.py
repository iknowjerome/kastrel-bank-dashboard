"""Dashboard-specific API routes."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any

from .websocket import ConnectionManager
from ..demo.local_data import LocalDataLoader


def setup_dashboard_routes(
    app,
    aggregator,
    ws_manager: ConnectionManager,
    local_data_loader: LocalDataLoader
):
    """Add dashboard routes to the FastAPI app."""
    
    # --- Dashboard API ---
    
    @app.get("/dashboard/api/agents")
    async def list_agents():
        """List all connected/known agents (perches)."""
        agents = set()
        for entry in aggregator.trace_history:
            agents.add(entry.get('agent_id'))
        
        agent_list = []
        for agent_id in agents:
            # Get latest trace for this agent
            latest = None
            for entry in reversed(aggregator.trace_history):
                if entry.get('agent_id') == agent_id:
                    latest = entry
                    break
            
            agent_list.append({
                "agent_id": agent_id,
                "last_seen": latest.get('metadata', {}).get('timestamp') if latest else None,
                "model_info": latest.get('metadata', {}).get('model_info') if latest else None
            })
        
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
