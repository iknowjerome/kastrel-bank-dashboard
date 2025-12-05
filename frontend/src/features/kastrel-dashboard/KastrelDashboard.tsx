import { FC, useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { 
  Bird, 
  Activity, 
  Users, 
  Layers, 
  Database
} from 'lucide-react'

interface Agent {
  agent_id: string
  model_info?: {
    model_name?: string
  }
  last_seen?: number
}

interface Trace {
  agent_id: string
  traces: Record<string, unknown>
  metadata?: {
    timestamp?: number
    [key: string]: unknown
  }
}

interface Stats {
  total_traces: number
  unique_agents: number
  layers_observed: string[]
}

const API_BASE = '/dashboard/api'

export const KastrelDashboard: FC = () => {
  const [agents, setAgents] = useState<Agent[]>([])
  const [traces, setTraces] = useState<Trace[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadAgents = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/agents`)
      const data = await response.json()
      setAgents(data.agents || [])
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  }, [])

  const loadTraces = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/traces?limit=20`)
      const data = await response.json()
      setTraces(data.traces || [])
    } catch (error) {
      console.error('Failed to load traces:', error)
    }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }, [])

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([loadAgents(), loadTraces(), loadStats()])
      setLoading(false)
    }
    loadAll()

    // WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/dashboard/ws`)

    ws.onopen = () => setConnected(true)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'trace_update' || data.type === 'agent_registered') {
        loadTraces()
        loadStats()
        loadAgents()
      }
    }
    ws.onclose = () => setConnected(false)

    return () => ws.close()
  }, [loadAgents, loadTraces, loadStats])

  return (
    <div className="max-w-[1400px] mx-auto p-8 animate-fade-in">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 pb-6 border-b border-border">
        <h1 className="text-2xl font-semibold flex items-center gap-3 tracking-tight">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Bird className="w-5 h-5 text-primary" />
          </div>
          <span>Kastrel Dashboard</span>
        </h1>
        <Badge 
          variant={connected ? 'success' : 'secondary'}
          className="gap-1.5"
        >
          <span className={cn(
            'w-2 h-2 rounded-full',
            connected ? 'bg-success animate-pulse' : 'bg-muted-foreground'
          )} />
          {connected ? 'Connected' : 'Disconnected'}
        </Badge>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-4">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <main className="grid grid-cols-2 gap-6">
          {/* Connected Perches */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Connected Perches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No perches connected yet</p>
              ) : (
                <div className="space-y-3">
                  {agents.map((agent) => (
                    <div
                      key={agent.agent_id}
                      className="bg-muted/50 rounded-xl p-4 border border-border"
                    >
                      <h3 className="text-primary font-medium text-sm mb-1">
                        {agent.agent_id}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        Model: {agent.model_info?.model_name || 'Unknown'}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Last seen: {agent.last_seen
                          ? new Date(agent.last_seen * 1000).toLocaleString()
                          : 'Never'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="space-y-0">
                  {[
                    { label: 'Total traces', value: stats.total_traces, icon: Database },
                    { label: 'Unique agents', value: stats.unique_agents, icon: Users },
                    { label: 'Layers observed', value: stats.layers_observed.length, icon: Layers },
                  ].map((item, i, arr) => (
                    <div key={item.label}>
                      <div className="flex justify-between items-center py-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        <span className="text-foreground font-semibold">{item.value}</span>
                      </div>
                      {i < arr.length - 1 && <div className="h-px bg-border" />}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No statistics available</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Traces - spans full width */}
          <Card className="col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Traces
              </CardTitle>
            </CardHeader>
            <CardContent>
              {traces.length === 0 ? (
                <p className="text-muted-foreground text-sm">No traces received yet</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {traces.slice(-10).reverse().map((trace, idx) => (
                    <div
                      key={idx}
                      className="bg-muted/50 rounded-xl p-4 border border-border hover:border-border/80 transition-colors"
                    >
                      <span className="text-primary font-medium text-sm block mb-1">
                        {trace.agent_id}
                      </span>
                      <span className="text-muted-foreground text-xs block">
                        Layers: {Object.keys(trace.traces || {}).length}
                      </span>
                      {trace.metadata?.timestamp && (
                        <span className="text-muted-foreground text-xs block mt-1">
                          {new Date(trace.metadata.timestamp * 1000).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      )}
    </div>
  )
}
