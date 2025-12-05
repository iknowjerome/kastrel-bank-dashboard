import { FC } from 'react'
import { useBankDashboard } from '../state/BankDashboardContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { TrendingUp, Minus, TrendingDown, AlertTriangle } from 'lucide-react'

export const RelationshipHealthSection: FC = () => {
  const { currentClient, messages, isLoadingClientData } = useBankDashboard()

  if (!currentClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select a client to view relationship health</p>
      </div>
    )
  }

  if (isLoadingClientData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading relationship data...</p>
      </div>
    )
  }

  // Calculate sentiment breakdown
  const sentimentCounts = messages.reduce(
    (acc, msg) => {
      acc[msg.sentiment]++
      return acc
    },
    { positive: 0, neutral: 0, negative: 0 }
  )

  const totalMessages = messages.length || 1
  const sentimentPercentages = {
    positive: (sentimentCounts.positive / totalMessages) * 100,
    neutral: (sentimentCounts.neutral / totalMessages) * 100,
    negative: (sentimentCounts.negative / totalMessages) * 100,
  }

  // Calculate channel breakdown
  const channelCounts = messages.reduce((acc, msg) => {
    acc[msg.channel] = (acc[msg.channel] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Calculate response patterns
  const customerMessages = messages.filter((m) => m.message_role === 'customer').length
  const agentMessages = messages.filter((m) => m.message_role === 'agent').length

  // Health score calculation (simplified)
  const healthScore = Math.round(
    (sentimentPercentages.positive * 1.5 +
      sentimentPercentages.neutral * 1 -
      sentimentPercentages.negative * 2 +
      Math.min(currentClient.relationship_length_years * 5, 30) +
      (currentClient.delinquency_count_12m === 0 ? 20 : -currentClient.delinquency_count_12m * 10))
  )

  const normalizedHealthScore = Math.max(0, Math.min(100, healthScore))

  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-success'
    if (score >= 40) return 'text-warning'
    return 'text-danger'
  }

  const getHealthLabel = (score: number) => {
    if (score >= 70) return 'Healthy'
    if (score >= 40) return 'Needs Attention'
    return 'At Risk'
  }

  const getHealthVariant = (score: number): 'success' | 'warning' | 'danger' => {
    if (score >= 70) return 'success'
    if (score >= 40) return 'warning'
    return 'danger'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1 tracking-tight">Relationship Health</h1>
        <p className="text-muted-foreground">{currentClient.business_name}</p>
      </div>

      {/* Health Score */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="label-text block mb-3">Overall Health Score</span>
              <div className="flex items-baseline gap-3">
                <span className={cn('text-5xl font-bold', getHealthColor(normalizedHealthScore))}>
                  {normalizedHealthScore}
                </span>
                <span className="text-muted-foreground text-lg">/100</span>
                <Badge variant={getHealthVariant(normalizedHealthScore)} className="ml-2">
                  {getHealthLabel(normalizedHealthScore)}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <span className="label-text block mb-1">Relationship Length</span>
              <p className="text-3xl font-semibold text-foreground">{currentClient.relationship_length_years} years</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Analysis */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Sentiment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sentiment Bar */}
            <div className="h-3 rounded-full overflow-hidden flex bg-muted">
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${sentimentPercentages.positive}%` }}
              />
              <div
                className="bg-zinc-500 transition-all"
                style={{ width: `${sentimentPercentages.neutral}%` }}
              />
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${sentimentPercentages.negative}%` }}
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-muted/50 rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted-foreground">Positive</span>
                </div>
                <p className="text-xl font-semibold text-success">{sentimentCounts.positive}</p>
                <p className="text-xs text-muted-foreground">{sentimentPercentages.positive.toFixed(0)}%</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Minus className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Neutral</span>
                </div>
                <p className="text-xl font-semibold text-foreground">{sentimentCounts.neutral}</p>
                <p className="text-xs text-muted-foreground">{sentimentPercentages.neutral.toFixed(0)}%</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-danger" />
                  <span className="text-sm text-muted-foreground">Negative</span>
                </div>
                <p className="text-xl font-semibold text-danger">{sentimentCounts.negative}</p>
                <p className="text-xs text-muted-foreground">{sentimentPercentages.negative.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Communication Stats */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Communication Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {[
              { label: 'Total Messages', value: messages.length.toString() },
              { label: 'From Customer', value: customerMessages.toString() },
              { label: 'From Bank', value: agentMessages.toString() },
              { 
                label: 'Response Ratio', 
                value: customerMessages > 0 ? `${(agentMessages / customerMessages).toFixed(1)}:1` : 'N/A'
              },
            ].map((item, i, arr) => (
              <div key={item.label}>
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground text-sm">{item.label}</span>
                  <span className="text-sm font-medium text-foreground">{item.value}</span>
                </div>
                {i < arr.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Channel Breakdown */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Channel Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(channelCounts).map(([channel, count]) => (
              <div key={channel} className="bg-muted/50 rounded-xl p-4 text-center">
                <span className="label-text">{channel.replace('_', ' ')}</span>
                <p className="text-2xl font-semibold text-foreground mt-1">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Indicators */}
      {(currentClient.churn_label === 1 || sentimentPercentages.negative > 30) && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-danger flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Relationship Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {currentClient.churn_label === 1 && (
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-danger mt-0.5">•</span>
                  <span>This client has been flagged as high churn risk based on behavioral patterns.</span>
                </li>
              )}
              {sentimentPercentages.negative > 30 && (
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-danger mt-0.5">•</span>
                  <span>Over 30% of recent communications show negative sentiment.</span>
                </li>
              )}
              {currentClient.delinquency_count_12m > 0 && (
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-danger mt-0.5">•</span>
                  <span>{currentClient.delinquency_count_12m} payment delinquencies in the past 12 months.</span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
