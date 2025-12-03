// Kastrel Dashboard Frontend

const API_BASE = '/dashboard/api';
let ws = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadAgents();
    loadTraces();
    loadStats();
    connectWebSocket();
    
    document.getElementById('load-demo-data').addEventListener('click', loadDemoData);
});

// Fetch agents
async function loadAgents() {
    try {
        const response = await fetch(`${API_BASE}/agents`);
        const data = await response.json();
        renderAgents(data.agents);
    } catch (error) {
        console.error('Failed to load agents:', error);
    }
}

function renderAgents(agents) {
    const container = document.getElementById('agent-list');
    if (agents.length === 0) {
        container.innerHTML = '<p>No perches connected yet</p>';
        return;
    }
    
    container.innerHTML = agents.map(agent => `
        <div class="agent-card">
            <h3>${agent.agent_id}</h3>
            <p>Model: ${agent.model_info?.model_name || 'Unknown'}</p>
            <p>Last seen: ${agent.last_seen ? new Date(agent.last_seen * 1000).toLocaleString() : 'Never'}</p>
        </div>
    `).join('');
}

// Fetch traces
async function loadTraces() {
    try {
        const response = await fetch(`${API_BASE}/traces?limit=20`);
        const data = await response.json();
        renderTraces(data.traces);
    } catch (error) {
        console.error('Failed to load traces:', error);
    }
}

function renderTraces(traces) {
    const container = document.getElementById('trace-list');
    if (traces.length === 0) {
        container.innerHTML = '<p>No traces received yet</p>';
        return;
    }
    
    container.innerHTML = traces.slice(-10).reverse().map(trace => `
        <div class="trace-card">
            <strong>${trace.agent_id}</strong>
            <span>Layers: ${Object.keys(trace.traces || {}).length}</span>
        </div>
    `).join('');
}

// Fetch stats
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();
        renderStats(data);
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

function renderStats(stats) {
    const container = document.getElementById('stats-display');
    container.innerHTML = `
        <p>Total traces: ${stats.total_traces || 0}</p>
        <p>Unique agents: ${stats.unique_agents || 0}</p>
        <p>Layers observed: ${(stats.layers_observed || []).length}</p>
    `;
}

// WebSocket for real-time updates
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/dashboard/ws`);
    
    ws.onopen = () => {
        document.getElementById('status').textContent = '● Connected';
        document.getElementById('status').classList.add('connected');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'trace_update') {
            loadTraces();  // Refresh traces
            loadStats();   // Refresh stats
            loadAgents();  // Refresh agents
        }
    };
    
    ws.onclose = () => {
        document.getElementById('status').textContent = '○ Disconnected';
        document.getElementById('status').classList.remove('connected');
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
    };
}

// Demo data loading
async function loadDemoData() {
    try {
        const response = await fetch(`${API_BASE}/demo/load-local-data`, { method: 'POST' });
        const data = await response.json();
        alert(`Loaded ${data.loaded} trace entries`);
        loadTraces();
        loadStats();
        loadAgents();
    } catch (error) {
        console.error('Failed to load demo data:', error);
    }
}

