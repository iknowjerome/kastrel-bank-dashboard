import { FC } from 'react'
import { useBankDashboard } from '../state/BankDashboardContext'
import { getRiskLevelFromRating } from '../data/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  AlertTriangle, 
  AlertCircle, 
  Info,
  CheckCircle,
  Lightbulb
} from 'lucide-react'

interface RiskSignal {
  id: string
  category: string
  title: string
  severity: 'low' | 'medium' | 'high'
  description: string
  dataPoint: string
}

export const RiskSignalsSection: FC = () => {
  const { currentClient, messages, documents, isLoadingClientData } = useBankDashboard()

  if (!currentClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select a client to view risk signals</p>
      </div>
    )
  }

  if (isLoadingClientData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading risk signals...</p>
      </div>
    )
  }

  // Calculate risk signals based on client data
  const riskSignals: RiskSignal[] = []

  // Risk rating signal
  const riskLevel = getRiskLevelFromRating(currentClient.risk_rating)
  if (riskLevel !== 'low') {
    riskSignals.push({
      id: 'risk-rating',
      category: 'Credit Risk',
      title: `${riskLevel === 'high' ? 'High' : 'Elevated'} Risk Rating`,
      severity: riskLevel as 'medium' | 'high',
      description: `Client has a risk rating of ${currentClient.risk_rating}/10, indicating ${riskLevel} credit risk.`,
      dataPoint: `Risk Rating: ${currentClient.risk_rating}/10`,
    })
  }

  // Delinquency signals
  if (currentClient.delinquency_count_12m > 0) {
    riskSignals.push({
      id: 'delinquency',
      category: 'Payment History',
      title: 'Payment Delinquencies Detected',
      severity: currentClient.delinquency_count_12m > 2 ? 'high' : 'medium',
      description: `${currentClient.delinquency_count_12m} payment delinquencies recorded in the past 12 months.`,
      dataPoint: `Delinquencies: ${currentClient.delinquency_count_12m}`,
    })
  }

  // Credit score signal
  if (currentClient.credit_score_bucket === 'low') {
    riskSignals.push({
      id: 'credit-score',
      category: 'Credit Score',
      title: 'Low Credit Score Bucket',
      severity: 'high',
      description: 'Client falls into the low credit score bucket, indicating potential creditworthiness concerns.',
      dataPoint: `Credit Bucket: ${currentClient.credit_score_bucket}`,
    })
  }

  // Churn risk signal
  if (currentClient.churn_label === 1) {
    riskSignals.push({
      id: 'churn',
      category: 'Retention',
      title: 'High Churn Probability',
      severity: 'high',
      description: 'Predictive models indicate elevated churn risk based on behavioral patterns.',
      dataPoint: 'Churn Label: At Risk',
    })
  }

  // Sentiment signal
  const negativeMessages = messages.filter((m) => m.sentiment === 'negative').length
  const totalMessages = messages.length || 1
  const negativeRatio = negativeMessages / totalMessages
  
  if (negativeRatio > 0.3) {
    riskSignals.push({
      id: 'sentiment',
      category: 'Relationship',
      title: 'Negative Communication Sentiment',
      severity: negativeRatio > 0.5 ? 'high' : 'medium',
      description: `${(negativeRatio * 100).toFixed(0)}% of communications show negative sentiment.`,
      dataPoint: `Negative Messages: ${negativeMessages}/${messages.length}`,
    })
  }

  // Collateral signal for large loans
  if (!currentClient.is_collateralized && currentClient.loan_amount > 200000) {
    riskSignals.push({
      id: 'collateral',
      category: 'Loan Security',
      title: 'Large Unsecured Loan',
      severity: 'medium',
      description: 'Loan exceeds $200K without collateral backing.',
      dataPoint: `Loan: $${(currentClient.loan_amount / 1000).toFixed(0)}K unsecured`,
    })
  }

  // Interest rate signal
  if (currentClient.interest_rate > 10) {
    riskSignals.push({
      id: 'interest',
      category: 'Financial',
      title: 'High Interest Rate',
      severity: 'low',
      description: 'Interest rate above 10% may indicate higher perceived risk or market conditions.',
      dataPoint: `Interest Rate: ${currentClient.interest_rate}%`,
    })
  }

  // Document freshness signal
  const recentDocs = documents.filter((d) => {
    const docDate = new Date(d.created_at)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    return docDate > sixMonthsAgo
  })
  
  if (documents.length > 0 && recentDocs.length === 0) {
    riskSignals.push({
      id: 'docs',
      category: 'Documentation',
      title: 'Outdated Documentation',
      severity: 'low',
      description: 'No documents updated in the past 6 months.',
      dataPoint: `Last Update: ${documents.length > 0 ? new Date(documents[0].created_at).toLocaleDateString() : 'N/A'}`,
    })
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 }
  riskSignals.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-danger" />
      case 'medium': return <AlertCircle className="w-5 h-5 text-warning" />
      case 'low': return <Info className="w-5 h-5 text-primary" />
      default: return null
    }
  }

  const getSeverityVariant = (severity: string): 'danger' | 'warning' | 'secondary' => {
    switch (severity) {
      case 'high': return 'danger'
      case 'medium': return 'warning'
      default: return 'secondary'
    }
  }

  const highCount = riskSignals.filter((s) => s.severity === 'high').length
  const mediumCount = riskSignals.filter((s) => s.severity === 'medium').length
  const lowCount = riskSignals.filter((s) => s.severity === 'low').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1 tracking-tight">Risk Signals</h1>
        <p className="text-muted-foreground">{currentClient.business_name}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-5">
            <span className="label-text">Overall Risk</span>
            <p className={cn(
              'text-2xl font-bold capitalize mt-1',
              riskLevel === 'high' ? 'text-danger' :
              riskLevel === 'medium' ? 'text-warning' :
              'text-success'
            )}>
              {riskLevel}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Rating: {currentClient.risk_rating}/10</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <span className="label-text">High Severity</span>
            <p className="text-2xl font-bold text-danger mt-1">{highCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Critical issues</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <span className="label-text">Medium Severity</span>
            <p className="text-2xl font-bold text-warning mt-1">{mediumCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <span className="label-text">Low Severity</span>
            <p className="text-2xl font-bold text-primary mt-1">{lowCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Monitor</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Signals List */}
      <Card>
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Detected Risk Signals
          </CardTitle>
        </CardHeader>
        
        {riskSignals.length === 0 ? (
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="text-foreground font-medium">No Risk Signals Detected</p>
            <p className="text-muted-foreground text-sm mt-1">This client has a healthy risk profile.</p>
          </CardContent>
        ) : (
          <div className="divide-y divide-border">
            {riskSignals.map((signal) => (
              <div key={signal.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-4">
                  {getSeverityIcon(signal.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-foreground">{signal.title}</span>
                      <Badge variant={getSeverityVariant(signal.severity)} className="text-[10px]">
                        {signal.severity}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {signal.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{signal.description}</p>
                    <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                      {signal.dataPoint}
                    </code>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Risk Mitigation Recommendations */}
      {riskSignals.some((s) => s.severity === 'high' || s.severity === 'medium') && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-warning flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Risk Mitigation Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {highCount > 0 && (
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-warning mt-0.5">•</span>
                  <span>Schedule an immediate review meeting with the relationship manager.</span>
                </li>
              )}
              {currentClient.churn_label === 1 && (
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-warning mt-0.5">•</span>
                  <span>Proactive engagement recommended to address potential churn concerns.</span>
                </li>
              )}
              {currentClient.delinquency_count_12m > 0 && (
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-warning mt-0.5">•</span>
                  <span>Review payment schedule and consider restructuring options.</span>
                </li>
              )}
              {!currentClient.is_collateralized && currentClient.loan_amount > 200000 && (
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-warning mt-0.5">•</span>
                  <span>Discuss collateral options to reduce exposure.</span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
