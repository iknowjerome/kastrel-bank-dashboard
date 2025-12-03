"""Dashboard module - routes and WebSocket management."""
from .routes import setup_dashboard_routes
from .websocket import ConnectionManager

__all__ = ["setup_dashboard_routes", "ConnectionManager"]
