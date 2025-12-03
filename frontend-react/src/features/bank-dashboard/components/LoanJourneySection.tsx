import { FC, useState } from 'react'
import { useBankDashboard } from '../state/BankDashboardContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  MessageSquare, 
  FileText, 
  ClipboardList,
  Smile,
  Meh,
  Frown,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface TimelineEvent {
  id: string
  date: string
  type: 'message' | 'document' | 'status'
  title: string
  description: string
  fullContent: string
  phase: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  metadata?: {
    channel?: string
    agentRole?: string
    docType?: string
  }
}

export const LoanJourneySection: FC = () => {
  const { currentClient, messages, documents, isLoadingClientData } = useBankDashboard()
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  if (!currentClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select a client to view loan journey</p>
      </div>
    )
  }

  if (isLoadingClientData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading loan journey...</p>
      </div>
    )
  }

  // Build timeline from messages and documents
  const events: TimelineEvent[] = [
    ...messages.map((msg) => ({
      id: msg.message_id,
      date: msg.message_time,
      type: 'message' as const,
      title: msg.message_role === 'customer' ? 'Customer Message' : `${msg.agent_role || 'Agent'} Message`,
      description: msg.text.length > 120 ? msg.text.substring(0, 120) + '...' : msg.text,
      fullContent: msg.text,
      phase: msg.phase_label,
      sentiment: msg.sentiment,
      metadata: {
        channel: msg.channel,
        agentRole: msg.agent_role,
      }
    })),
    ...documents.map((doc) => ({
      id: doc.document_id,
      date: doc.created_at,
      type: 'document' as const,
      title: doc.title,
      description: `${doc.doc_type.replace(/_/g, ' ')} uploaded`,
      fullContent: doc.content || 'No content preview available.',
      phase: 'documentation',
      metadata: {
        docType: doc.doc_type,
      }
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Group events by phase
  const phases = [...new Set(events.map((e) => e.phase))]

  const phaseColors: Record<string, string> = {
    onboarding: 'bg-blue-500',
    underwriting: 'bg-purple-500',
    approval: 'bg-emerald-500',
    servicing: 'bg-amber-500',
    renewal: 'bg-sky-500',
    review: 'bg-indigo-500',
    documentation: 'bg-zinc-500',
  }

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return <Smile className="w-4 h-4 text-success" />
      case 'negative': return <Frown className="w-4 h-4 text-danger" />
      default: return <Meh className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4" />
      case 'document': return <FileText className="w-4 h-4" />
      case 'status': return <ClipboardList className="w-4 h-4" />
      default: return null
    }
  }

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  const isExpandable = (event: TimelineEvent) => {
    return event.fullContent.length > 120 || event.type === 'document'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1 tracking-tight">Loan Journey</h1>
        <p className="text-muted-foreground">{currentClient.business_name} • {currentClient.loan_product}</p>
      </div>

      {/* Journey Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <span className="label-text">Loan Status</span>
              <p className="text-lg font-semibold text-foreground capitalize mt-1">
                {currentClient.loan_outcome.replace('_', ' ')}
              </p>
            </div>
            <div>
              <span className="label-text">Timeline Events</span>
              <p className="text-lg font-semibold text-foreground mt-1">{events.length}</p>
            </div>
            <div>
              <span className="label-text">Phases Completed</span>
              <p className="text-lg font-semibold text-foreground mt-1">{phases.length}</p>
            </div>
            <div>
              <span className="label-text">Relationship Duration</span>
              <p className="text-lg font-semibold text-foreground mt-1">{currentClient.relationship_length_years} years</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Legend */}
      <div className="flex flex-wrap gap-2">
        {phases.map((phase) => (
          <Badge key={phase} variant="outline" className="gap-2 capitalize">
            <span className={cn('w-2 h-2 rounded-full', phaseColors[phase] || 'bg-zinc-500')} />
            {phase}
          </Badge>
        ))}
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Event Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No events recorded for this client.</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              <div className="space-y-4">
                {events.map((event) => {
                  const isExpanded = expandedEvents.has(event.id)
                  const canExpand = isExpandable(event)
                  
                  return (
                    <div key={event.id} className="relative pl-12">
                      {/* Timeline dot */}
                      <div className={cn(
                        'absolute left-2.5 w-3 h-3 rounded-full ring-4 ring-background',
                        phaseColors[event.phase] || 'bg-zinc-500'
                      )} />
                      
                      {/* Event card */}
                      <div 
                        className={cn(
                          'bg-muted/50 rounded-xl p-4 border border-border transition-all',
                          canExpand && 'cursor-pointer hover:border-primary/30 hover:bg-muted/70',
                          isExpanded && 'ring-2 ring-primary/20'
                        )}
                        onClick={() => canExpand && toggleExpanded(event.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-background border border-border">
                              {getTypeIcon(event.type)}
                            </div>
                            <span className="font-medium text-foreground">{event.title}</span>
                            {event.sentiment && getSentimentIcon(event.sentiment)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {canExpand && (
                              isExpanded 
                                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className={cn(
                          'text-sm text-foreground transition-all',
                          !isExpanded && 'line-clamp-2'
                        )}>
                          {isExpanded ? (
                            <div className="space-y-3">
                              <p className="whitespace-pre-wrap">{event.fullContent}</p>
                              
                              {/* Metadata when expanded */}
                              {event.metadata && (
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                                  {event.metadata.channel && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Channel: {event.metadata.channel.replace(/_/g, ' ')}
                                    </Badge>
                                  )}
                                  {event.metadata.agentRole && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Role: {event.metadata.agentRole}
                                    </Badge>
                                  )}
                                  {event.metadata.docType && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Type: {event.metadata.docType.replace(/_/g, ' ')}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">{event.description}</p>
                          )}
                        </div>
                        
                        {/* Click hint for expandable items */}
                        {canExpand && !isExpanded && (
                          <p className="text-xs text-primary mt-2">Click to expand</p>
                        )}
                        
                        <div className="mt-3 flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] gap-1 capitalize">
                            <span className={cn('w-1.5 h-1.5 rounded-full', phaseColors[event.phase] || 'bg-zinc-500')} />
                            {event.phase}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">{event.id}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
