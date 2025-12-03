import { FC } from 'react'
import { useBankDashboard } from '../state/BankDashboardContext'
import { getRiskLevelFromRating } from '../data/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  AlertTriangle, 
  FileText, 
  MessageSquare, 
  User,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

export const OverviewSection: FC = () => {
  const { currentClient, documents, messages, isLoadingClientData } = useBankDashboard()

  if (!currentClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select a client to view overview</p>
      </div>
    )
  }

  if (isLoadingClientData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading client data...</p>
      </div>
    )
  }

  const riskLevel = getRiskLevelFromRating(currentClient.risk_rating)
  
  const getRiskVariant = (): 'success' | 'warning' | 'danger' => {
    switch (riskLevel) {
      case 'low': return 'success'
      case 'medium': return 'warning'
      case 'high': return 'danger'
    }
  }

  // Calculate sentiment stats
  const sentimentStats = messages.reduce(
    (acc, msg) => {
      acc[msg.sentiment]++
      return acc
    },
    { positive: 0, neutral: 0, negative: 0 }
  )

  const kpis = [
    {
      label: 'Annual Revenue',
      value: `$${(currentClient.annual_revenue / 1000000).toFixed(2)}M`,
      trend: null,
    },
    {
      label: 'Loan Amount',
      value: `$${(currentClient.loan_amount / 1000).toFixed(0)}K`,
      trend: null,
    },
    {
      label: 'Interest Rate',
      value: `${currentClient.interest_rate}%`,
      trend: null,
    },
    {
      label: 'Risk Rating',
      value: `${currentClient.risk_rating}/10`,
      trend: riskLevel,
    },
    {
      label: 'Relationship',
      value: `${currentClient.relationship_length_years} years`,
      trend: null,
    },
    {
      label: 'Employees',
      value: currentClient.number_of_employees.toString(),
      trend: null,
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1 tracking-tight">
            {currentClient.business_name}
          </h1>
          <p className="text-muted-foreground">
            {currentClient.segment} • {currentClient.industry} • {currentClient.region}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentClient.churn_label === 1 && (
            <Badge variant="danger" className="gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Churn Risk
            </Badge>
          )}
          <Badge variant={getRiskVariant()} className="capitalize">
            {riskLevel} Risk
          </Badge>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/50">
            <CardContent className="p-4">
              <span className="label-text">{kpi.label}</span>
              <p className="text-xl font-semibold text-foreground mt-1">{kpi.value}</p>
              {kpi.trend && (
                <Badge 
                  variant={kpi.trend === 'low' ? 'success' : kpi.trend === 'medium' ? 'warning' : 'danger'} 
                  className="mt-2 text-[10px]"
                >
                  {kpi.trend}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Loan Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {[
              { label: 'Product', value: currentClient.loan_product },
              { label: 'Status', value: currentClient.loan_outcome.replace('_', ' '), capitalize: true },
              { 
                label: 'Collateralized', 
                value: currentClient.is_collateralized ? 'Yes' : 'No',
                variant: currentClient.is_collateralized ? 'success' : 'warning'
              },
              { label: 'Credit Score', value: currentClient.credit_score_bucket, capitalize: true },
              { 
                label: 'Delinquencies (12m)', 
                value: currentClient.delinquency_count_12m.toString(),
                variant: currentClient.delinquency_count_12m > 0 ? 'danger' : 'success'
              },
            ].map((item, i, arr) => (
              <div key={item.label}>
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground text-sm">{item.label}</span>
                  <span className={`text-sm font-medium ${
                    item.variant === 'success' ? 'text-success' :
                    item.variant === 'warning' ? 'text-warning' :
                    item.variant === 'danger' ? 'text-danger' :
                    'text-foreground'
                  } ${item.capitalize ? 'capitalize' : ''}`}>
                    {item.value}
                  </span>
                </div>
                {i < arr.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-foreground font-medium">{documents.length} Documents</p>
                  <p className="text-xs text-muted-foreground">On file</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-foreground font-medium">{messages.length} Messages</p>
                  <p className="text-xs text-muted-foreground">In conversation history</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-xl">
              <span className="label-text block mb-3">Sentiment Distribution</span>
              <div className="flex gap-2">
                <div className="flex-1 text-center py-2 rounded-lg bg-emerald-500/10 text-success text-xs font-medium flex items-center justify-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {sentimentStats.positive}
                </div>
                <div className="flex-1 text-center py-2 rounded-lg bg-muted text-muted-foreground text-xs font-medium border border-border flex items-center justify-center gap-1.5">
                  <Minus className="w-3.5 h-3.5" />
                  {sentimentStats.neutral}
                </div>
                <div className="flex-1 text-center py-2 rounded-lg bg-red-500/10 text-danger text-xs font-medium flex items-center justify-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {sentimentStats.negative}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Persona */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg text-foreground font-medium capitalize">
                {currentClient.customer_persona.replace('_', ' ')}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                This persona type typically responds well to {
                  currentClient.customer_persona.includes('thoughtful') ? 'detailed explanations and documentation' :
                  currentClient.customer_persona.includes('busy') ? 'concise, action-oriented communication' :
                  currentClient.customer_persona.includes('impatient') ? 'quick responses and proactive updates' :
                  'personalized, relationship-focused engagement'
                }.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
