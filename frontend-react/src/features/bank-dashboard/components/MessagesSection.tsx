import { FC, useState, useMemo } from 'react'
import { useBankDashboard } from '../state/BankDashboardContext'
import { Message } from '../data/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  FileText, 
  Bell,
  Send,
  AlertTriangle,
  Paperclip
} from 'lucide-react'

// Helper to group messages by thread
function groupMessagesByThread(messages: Message[]): Map<string, Message[]> {
  const threads = new Map<string, Message[]>();
  
  messages.forEach((msg) => {
    const existing = threads.get(msg.thread_id) || [];
    existing.push(msg);
    threads.set(msg.thread_id, existing);
  });
  
  // Sort messages within each thread by time
  threads.forEach((msgs, threadId) => {
    msgs.sort((a, b) => new Date(a.message_time).getTime() - new Date(b.message_time).getTime());
    threads.set(threadId, msgs);
  });
  
  return threads;
}

export const MessagesSection: FC = () => {
  const { currentClient, messages, isLoadingClientData } = useBankDashboard()
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null)

  // Group messages by thread
  const threads = useMemo(() => {
    // Reset selected thread when messages change (new customer)
    setSelectedThread(null)
    setExpandedMessage(null)
    return groupMessagesByThread(messages)
  }, [messages])
  const threadIds = Array.from(threads.keys())

  if (!currentClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select a client to view messages</p>
      </div>
    )
  }

  if (isLoadingClientData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    )
  }

  // Auto-select first thread if none selected
  const activeThreadId = selectedThread || threadIds[0] || null
  const activeThreadMessages = activeThreadId ? threads.get(activeThreadId) || [] : []

  const getSentimentVariant = (sentiment: string): 'success' | 'secondary' | 'danger' => {
    switch (sentiment) {
      case 'positive': return 'success'
      case 'negative': return 'danger'
      default: return 'secondary'
    }
  }

  const getSentimentBorderColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'border-l-emerald-500'
      case 'negative': return 'border-l-red-500'
      default: return 'border-l-zinc-500'
    }
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="w-4 h-4" />
      case 'phone': return <Phone className="w-4 h-4" />
      case 'chat': return <MessageSquare className="w-4 h-4" />
      case 'document_request': return <FileText className="w-4 h-4" />
      case 'status_update': return <Bell className="w-4 h-4" />
      default: return <MessageSquare className="w-4 h-4" />
    }
  }

  const formatMessageTime = (time: string) => {
    const date = new Date(time)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getThreadSummary = (messages: Message[]) => {
    const lastMessage = messages[messages.length - 1]
    const negativeCount = messages.filter((m) => m.sentiment === 'negative').length
    
    return {
      lastMessage,
      negativeCount,
      totalMessages: messages.length,
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1 tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          {currentClient.business_name} • {threadIds.length} conversation threads
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
        {/* Thread List */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Threads
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="divide-y divide-border">
              {threadIds.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No message threads</div>
              ) : (
                threadIds.map((threadId) => {
                  const messages = threads.get(threadId) || []
                  const summary = getThreadSummary(messages)
                  const isActive = threadId === activeThreadId

                  return (
                    <button
                      key={threadId}
                      onClick={() => setSelectedThread(threadId)}
                      className={cn(
                        'w-full text-left p-4 hover:bg-muted/50 transition-colors',
                        isActive && 'bg-primary/5 border-l-2 border-l-primary'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground truncate">{threadId}</span>
                        {summary.negativeCount > 0 && (
                          <Badge variant="danger" className="text-[10px] px-1.5 gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {summary.negativeCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {summary.lastMessage?.text.substring(0, 80)}...
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{summary.totalMessages} messages</span>
                        <span>{formatMessageTime(summary.lastMessage?.message_time || '')}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Message Thread */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">
                  {activeThreadId || 'Select a thread'}
                </CardTitle>
                {activeThreadMessages.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeThreadMessages.length} messages • Phase: {activeThreadMessages[0]?.phase_label}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {activeThreadMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a thread to view messages
                </div>
              ) : (
                activeThreadMessages.map((message) => {
                  const isExpanded = expandedMessage === message.message_id
                  const isLongMessage = message.text.length > 300
                  
                  return (
                    <div
                      key={message.message_id}
                      className={cn(
                        'border-l-4 bg-muted/50 rounded-xl p-4 cursor-pointer transition-all hover:bg-muted/70',
                        getSentimentBorderColor(message.sentiment),
                        isExpanded && 'ring-2 ring-primary/20'
                      )}
                      onClick={() => setExpandedMessage(isExpanded ? null : message.message_id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-background border border-border">
                            {getChannelIcon(message.channel)}
                          </div>
                          <div>
                            <span className="font-medium text-foreground capitalize">
                              {message.message_role === 'customer'
                                ? currentClient.business_name
                                : message.agent_role || 'Bank Agent'}
                            </span>
                            {message.message_role === 'agent' && message.agent_persona && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({message.agent_persona.replace('_', ' ')})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getSentimentVariant(message.sentiment)} className="text-[10px]">
                            {message.sentiment}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatMessageTime(message.message_time)}
                          </span>
                        </div>
                      </div>
                      
                      <div className={cn(
                        'text-sm text-foreground whitespace-pre-wrap transition-all',
                        !isExpanded && isLongMessage && 'line-clamp-3'
                      )}>
                        {message.text}
                      </div>
                      
                      {isLongMessage && !isExpanded && (
                        <button className="text-xs text-primary mt-2 hover:underline">
                          Click to expand...
                        </button>
                      )}
                      
                      {message.referenced_document_ids && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Attached:</span>
                          <span className="text-primary">{message.referenced_document_ids}</span>
                        </div>
                      )}
                      
                      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="capitalize">{message.channel.replace('_', ' ')}</span>
                        <span>•</span>
                        <span className="capitalize">{message.phase_label}</span>
                        {message.agent_tone && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{message.agent_tone} tone</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="font-mono text-[10px]">{message.message_id}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>

          {/* Quick Reply (placeholder) */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Type a reply..."
                disabled
                className="flex-1"
              />
              <Button disabled className="gap-2">
                <Send className="w-4 h-4" />
                Send
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Reply functionality coming soon</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
