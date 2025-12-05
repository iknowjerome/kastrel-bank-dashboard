import { FC, useState } from 'react'
import { useBankDashboard } from '../state/BankDashboardContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { 
  AlertCircle, 
  Zap, 
  ClipboardList, 
  FileText,
  Plus,
  Calendar,
  Sparkles
} from 'lucide-react'

interface ActionItem {
  id: string
  title: string
  description: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  category: string
  dueDate?: string
  completed: boolean
}

export const NextActionsSection: FC = () => {
  const { currentClient, messages, documents, isLoadingClientData } = useBankDashboard()
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set())

  if (!currentClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select a client to view next actions</p>
      </div>
    )
  }

  if (isLoadingClientData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading actions...</p>
      </div>
    )
  }

  // Generate action items based on client data
  const actions: ActionItem[] = []

  // Churn-related actions
  if (currentClient.churn_label === 1) {
    actions.push({
      id: 'churn-1',
      title: 'Schedule retention call',
      description: 'Client shows high churn risk. Schedule a call to understand concerns and discuss retention options.',
      priority: 'urgent',
      category: 'Retention',
      dueDate: getRelativeDate(3),
      completed: completedActions.has('churn-1'),
    })
  }

  // Delinquency-related actions
  if (currentClient.delinquency_count_12m > 0) {
    actions.push({
      id: 'del-1',
      title: 'Review payment plan',
      description: `Client has ${currentClient.delinquency_count_12m} delinquencies. Review current payment schedule and discuss modification options.`,
      priority: currentClient.delinquency_count_12m > 2 ? 'urgent' : 'high',
      category: 'Collections',
      dueDate: getRelativeDate(currentClient.delinquency_count_12m > 2 ? 2 : 7),
      completed: completedActions.has('del-1'),
    })
  }

  // Document-related actions
  const hasRecentFinancials = documents.some((d) => {
    const docDate = new Date(d.created_at)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    return d.doc_type === 'financial_statement' && docDate > sixMonthsAgo
  })

  if (!hasRecentFinancials) {
    actions.push({
      id: 'doc-1',
      title: 'Request updated financial statements',
      description: 'No recent financial statements on file. Request updated documentation for annual review.',
      priority: 'medium',
      category: 'Documentation',
      dueDate: getRelativeDate(14),
      completed: completedActions.has('doc-1'),
    })
  }

  // Sentiment-related actions
  const recentNegative = messages.filter((m) => {
    const msgDate = new Date(m.message_time)
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    return m.sentiment === 'negative' && msgDate > oneMonthAgo
  })

  if (recentNegative.length > 0) {
    actions.push({
      id: 'sent-1',
      title: 'Address recent customer concerns',
      description: `${recentNegative.length} negative interactions in the past month. Follow up to address concerns and improve satisfaction.`,
      priority: 'high',
      category: 'Relationship',
      dueDate: getRelativeDate(5),
      completed: completedActions.has('sent-1'),
    })
  }

  // Renewal actions
  if (currentClient.loan_outcome === 'renewed' || currentClient.loan_outcome === 'approved') {
    actions.push({
      id: 'review-1',
      title: 'Schedule annual review',
      description: 'Conduct annual relationship review to discuss business needs and potential product offerings.',
      priority: 'low',
      category: 'Relationship',
      dueDate: getRelativeDate(30),
      completed: completedActions.has('review-1'),
    })
  }

  // Upsell for good clients
  if (currentClient.risk_rating <= 4 && currentClient.relationship_length_years > 3 && !currentClient.churn_label) {
    actions.push({
      id: 'upsell-1',
      title: 'Present expansion opportunities',
      description: 'Strong client relationship with good risk profile. Consider presenting credit limit increase or additional products.',
      priority: 'medium',
      category: 'Sales',
      dueDate: getRelativeDate(21),
      completed: completedActions.has('upsell-1'),
    })
  }

  // Sort by priority and completion status
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
  actions.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  function getRelativeDate(daysFromNow: number): string {
    const date = new Date()
    date.setDate(date.getDate() + daysFromNow)
    return date.toISOString().split('T')[0]
  }

  const toggleComplete = (actionId: string) => {
    setCompletedActions((prev) => {
      const next = new Set(prev)
      if (next.has(actionId)) {
        next.delete(actionId)
      } else {
        next.add(actionId)
      }
      return next
    })
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="w-4 h-4 text-danger" />
      case 'high': return <Zap className="w-4 h-4 text-warning" />
      case 'medium': return <ClipboardList className="w-4 h-4 text-primary" />
      case 'low': return <FileText className="w-4 h-4 text-muted-foreground" />
      default: return null
    }
  }

  const getPriorityVariant = (priority: string): 'danger' | 'warning' | 'secondary' | 'outline' => {
    switch (priority) {
      case 'urgent': return 'danger'
      case 'high': return 'warning'
      case 'medium': return 'secondary'
      default: return 'outline'
    }
  }

  const pendingActions = actions.filter((a) => !a.completed)
  const completedActionsList = actions.filter((a) => a.completed)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1 tracking-tight">Next Actions</h1>
        <p className="text-muted-foreground">{currentClient.business_name}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <span className="label-text">Total Actions</span>
            <p className="text-2xl font-bold text-foreground mt-1">{actions.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <span className="label-text">Urgent</span>
            <p className="text-2xl font-bold text-danger mt-1">
              {actions.filter((a) => a.priority === 'urgent' && !a.completed).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <span className="label-text">Pending</span>
            <p className="text-2xl font-bold text-warning mt-1">{pendingActions.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <span className="label-text">Completed</span>
            <p className="text-2xl font-bold text-success mt-1">{completedActionsList.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions List */}
      <Card>
        <CardHeader className="pb-4 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Action Items
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add Action
          </Button>
        </CardHeader>

        {actions.length === 0 ? (
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="text-foreground font-medium">No Actions Required</p>
            <p className="text-muted-foreground text-sm mt-1">This client is in good standing with no pending items.</p>
          </CardContent>
        ) : (
          <div className="divide-y divide-border">
            {actions.map((action) => (
              <div
                key={action.id}
                className={cn(
                  'p-4 transition-colors',
                  action.completed ? 'bg-muted/30 opacity-60' : 'hover:bg-muted/30'
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <Checkbox
                    checked={action.completed}
                    onCheckedChange={() => toggleComplete(action.id)}
                    className="mt-1"
                  />

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      {getPriorityIcon(action.priority)}
                      <span className={cn(
                        'font-medium',
                        action.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                      )}>
                        {action.title}
                      </span>
                      <Badge variant={getPriorityVariant(action.priority)} className="text-[10px]">
                        {action.priority}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {action.category}
                      </Badge>
                    </div>
                    <p className={cn(
                      'text-sm mb-2',
                      action.completed ? 'text-muted-foreground' : 'text-muted-foreground'
                    )}>
                      {action.description}
                    </p>
                    {action.dueDate && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        Due: {new Date(action.dueDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <Button variant="ghost" size="sm" className="h-8 text-xs">
                    Schedule
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
