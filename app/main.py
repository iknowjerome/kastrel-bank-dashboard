"""
Kastrel Dashboard - Main Application

Extends NestServer with dashboard UI and demo features.
"""
import logging
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Import base Nest from kastrel-api
# from services.nest.server import NestServer
# from services.nest.aggregation import TraceAggregator

from .config import load_config
from .dashboard.routes import setup_dashboard_routes
from .dashboard.websocket import ConnectionManager
from .demo.local_data import LocalDataLoader

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# Placeholder classes - Replace with imports from kastrel-api when available
# =============================================================================

class TraceAggregator:
    """
    Placeholder for TraceAggregator from kastrel-api.
    Replace with: from services.nest.aggregation import TraceAggregator
    """
    
    def __init__(self):
        self.trace_history = []
    
    def add_traces(self, agent_id: str, traces: dict, metadata: dict = None):
        """Add traces to history."""
        self.trace_history.append({
            'agent_id': agent_id,
            'traces': traces,
            'metadata': metadata or {}
        })
    
    def get_unique_agents(self) -> set:
        """Get set of unique agent IDs."""
        return {entry.get('agent_id') for entry in self.trace_history}
    
    def aggregate_statistics(self) -> dict:
        """Return aggregate statistics."""
        agents = self.get_unique_agents()
        all_layers = set()
        for entry in self.trace_history:
            all_layers.update(entry.get('traces', {}).keys())
        
        return {
            'total_traces': len(self.trace_history),
            'unique_agents': len(agents),
            'layers_observed': list(all_layers)
        }


class NestServer:
    """
    Placeholder for NestServer from kastrel-api.
    Replace with: from services.nest.server import NestServer
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.app = FastAPI(
            title="Kastrel Nest",
            version="0.1.0"
        )
        self.aggregator = TraceAggregator()
        self._setup_nest_routes()
    
    def _setup_nest_routes(self):
        """Set up base Nest API routes (perch listening)."""
        from pydantic import BaseModel
        from typing import Dict, Any, Optional
        
        class TraceRequest(BaseModel):
            agent_id: str
            traces: Dict[str, Any]
            metadata: Optional[Dict[str, Any]] = None
        
        class AgentRegistrationRequest(BaseModel):
            agent_id: str
            model_info: Dict[str, Any]
        
        @self.app.post("/api/v1/agents/register")
        async def register_agent(request: AgentRegistrationRequest):
            """Register a perch - same API as Nest"""
            logger.info(f"🦅 PERCH REGISTERED: {request.agent_id}")
            logger.info(f"   Model: {request.model_info.get('model_name', 'unknown')}")
            return {
                "status": "registered",
                "message": "Agent registered with Dashboard",
                "go": True,
                "config": {}
            }
        
        @self.app.post("/api/v1/traces")
        async def receive_traces(request: TraceRequest):
            """Receive traces from perch - same API as Nest"""
            self.aggregator.add_traces(
                request.agent_id,
                request.traces,
                request.metadata
            )
            logger.info(f"Received traces from {request.agent_id} ({len(request.traces)} layers)")
            return {"status": "ok", "message": "Traces received"}
        
        @self.app.get("/api/v1/health")
        async def nest_health():
            """Health check - same API as Nest"""
            stats = self.aggregator.aggregate_statistics()
            return {
                "status": "healthy",
                "aggregation_stats": stats
            }


# =============================================================================
# Dashboard Application
# =============================================================================

class DashboardApp(NestServer):
    """
    Dashboard application - extends Nest with UI and demo features.
    
    Inherits:
        - All perch listening endpoints (/api/v1/agents/register, /traces, etc.)
        - TraceAggregator for collecting perch data
        - PerchStorage for persistence
    
    Adds:
        - Dashboard UI (served at /)
        - Dashboard API (/dashboard/api/...)
        - WebSocket for real-time updates (/dashboard/ws)
        - Demo features (local data loading, etc.)
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize Dashboard (inherits from Nest)."""
        if config is None:
            config = load_config()
        
        # Initialize parent Nest
        super().__init__(config)
        
        self.dashboard_config = config.get('dashboard', {})
        self.demo_config = config.get('demo', {})
        
        # Dashboard-specific components
        self.ws_manager = ConnectionManager()
        self.local_data_loader = LocalDataLoader(
            self.demo_config.get('local_data_path', './demo_data/')
        )
        
        # Set up dashboard routes and UI
        self._setup_dashboard()
        
        logger.info("Dashboard initialized (extends Nest)")
    
    def _setup_dashboard(self):
        """Set up dashboard-specific routes and UI."""
        
        # Add dashboard API routes
        setup_dashboard_routes(
            app=self.app,
            aggregator=self.aggregator,
            ws_manager=self.ws_manager,
            local_data_loader=self.local_data_loader
        )
        
        # Serve frontend static files
        frontend_path = Path(__file__).parent.parent / 'frontend'
        if frontend_path.exists():
            static_path = frontend_path / "static"
            if static_path.exists():
                self.app.mount(
                    "/static",
                    StaticFiles(directory=static_path),
                    name="static"
                )
        
        # Dashboard home (serves index.html)
        @self.app.get("/")
        async def dashboard_home():
            index_path = frontend_path / "index.html"
            if index_path.exists():
                return FileResponse(index_path)
            return {"message": "Kastrel Dashboard", "status": "running"}
        
        # Override health to include dashboard info
        @self.app.get("/health")
        async def health():
            nest_stats = self.aggregator.aggregate_statistics()
            return {
                "status": "healthy",
                "version": "0.1.0",
                "nest_stats": nest_stats,
                "websocket_clients": len(self.ws_manager.active_connections),
                "demo_mode": self.demo_config.get('enable_mock_perches', False)
            }
    
    def _broadcast_trace_update(self, agent_id: str, trace_data: dict):
        """Broadcast trace updates to WebSocket clients."""
        # Override or hook into parent's trace handling to broadcast
        # This enables real-time updates in the dashboard
        import asyncio
        asyncio.create_task(
            self.ws_manager.broadcast({
                "type": "trace_update",
                "agent_id": agent_id,
                "data": trace_data
            })
        )


def create_app():
    """Factory function for creating the app (used by uvicorn reload)."""
    config = load_config()
    dashboard = DashboardApp(config)
    return dashboard.app


def main():
    """Run the Dashboard server."""
    import argparse
    import uvicorn
    
    parser = argparse.ArgumentParser(description="Kastrel Dashboard")
    parser.add_argument('--env', default=None, help='Environment (dev, staging, production)')
    parser.add_argument('--host', default=None, help='Host to bind to')
    parser.add_argument('--port', type=int, default=None, help='Port to bind to')
    args = parser.parse_args()
    
    # Load config
    config = load_config(args.env)
    
    # Override with CLI args
    dashboard_config = config.get('dashboard', {})
    host = args.host or dashboard_config.get('host', 'localhost')
    port = args.port or dashboard_config.get('port', 8080)
    debug = dashboard_config.get('debug', False)
    
    logger.info(f"Starting Kastrel Dashboard on {host}:{port}")
    logger.info(f"Dashboard UI: http://{host}:{port}/")
    logger.info(f"Health check: http://{host}:{port}/health")
    
    if debug:
        # Use import string for reload mode
        uvicorn.run(
            "app.main:create_app",
            host=host,
            port=port,
            reload=True,
            factory=True
        )
    else:
        # Direct app object for production
        dashboard = DashboardApp(config)
        uvicorn.run(dashboard.app, host=host, port=port)


if __name__ == '__main__':
    main()
