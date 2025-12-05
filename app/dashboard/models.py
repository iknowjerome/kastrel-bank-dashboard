"""Pydantic models for Dashboard API."""
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime


class AgentInfo(BaseModel):
    agent_id: str
    last_seen: Optional[float] = None
    model_info: Optional[Dict[str, Any]] = None


class TraceEntry(BaseModel):
    agent_id: str
    traces: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class DashboardStats(BaseModel):
    total_traces: int
    unique_agents: int
    layers_observed: List[str]


