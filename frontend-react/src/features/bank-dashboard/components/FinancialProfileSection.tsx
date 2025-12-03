import { FC } from 'react'
import { useBankDashboard } from '../state/BankDashboardContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const FinancialProfileSection: FC = () => {
  const { currentClient } = useBankDashboard()

  if (!currentClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select a client to view financial profile</p>
      </div>
    )
  }

  const revenuePerEmployee = currentClient.number_of_employees > 0
    ? currentClient.annual_revenue / currentClient.number_of_employees
    : 0

  const loanToRevenueRatio = currentClient.annual_revenue > 0
    ? (currentClient.loan_amount / currentClient.annual_revenue) * 100
    : 0

  const financialMetrics = [
    {
      label: 'Annual Revenue',
      value: `$${(currentClient.annual_revenue / 1000000).toFixed(2)}M`,
      description: 'Total yearly revenue',
    },
    {
      label: 'Revenue per Employee',
      value: `$${(revenuePerEmployee / 1000).toFixed(0)}K`,
      description: 'Productivity indicator',
    },
    {
      label: 'Loan Amount',
      value: `$${(currentClient.loan_amount / 1000).toFixed(0)}K`,
      description: 'Current loan size',
    },
    {
      label: 'Loan-to-Revenue Ratio',
      value: `${loanToRevenueRatio.toFixed(1)}%`,
      description: 'Debt burden indicator',
    },
    {
      label: 'Interest Rate',
      value: `${currentClient.interest_rate}%`,
      description: 'Current loan rate',
    },
    {
      label: 'Number of Employees',
      value: currentClient.number_of_employees.toString(),
      description: 'Company size',
    },
  ]

  const getHealthIcon = (isGood: boolean, isNeutral: boolean = false) => {
    if (isGood) return <CheckCircle className="w-8 h-8 text-success" />
    if (isNeutral) return <AlertCircle className="w-8 h-8 text-warning" />
    return <AlertTriangle className="w-8 h-8 text-danger" />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1 tracking-tight">Financial Profile</h1>
        <p className="text-muted-foreground">{currentClient.business_name}</p>
      </div>

      {/* Financial Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {financialMetrics.map((metric) => (
          <Card key={metric.label} className="border-border/50">
            <CardContent className="p-5">
              <span className="label-text">{metric.label}</span>
              <p className="text-2xl font-bold text-foreground mt-1">{metric.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan Structure */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Loan Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {[
              { label: 'Product Type', value: currentClient.loan_product },
              { 
                label: 'Collateral', 
                value: currentClient.is_collateralized ? 'Secured' : 'Unsecured',
                variant: currentClient.is_collateralized ? 'success' : 'warning'
              },
              { label: 'Status', value: currentClient.loan_outcome.replace('_', ' '), capitalize: true },
              { 
                label: 'Credit Bucket', 
                value: currentClient.credit_score_bucket,
                capitalize: true,
                variant: currentClient.credit_score_bucket === 'high' ? 'success' : 
                         currentClient.credit_score_bucket === 'medium' ? 'warning' : 'danger'
              },
            ].map((item, i, arr) => (
              <div key={item.label}>
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground text-sm">{item.label}</span>
                  <span className={cn(
                    'text-sm font-medium',
                    item.variant === 'success' && 'text-success',
                    item.variant === 'warning' && 'text-warning',
                    item.variant === 'danger' && 'text-danger',
                    !item.variant && 'text-foreground',
                    item.capitalize && 'capitalize'
                  )}>
                    {item.value}
                  </span>
                </div>
                {i < arr.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Business Profile */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Business Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {[
              { label: 'Segment', value: currentClient.segment, capitalize: true },
              { label: 'Industry', value: currentClient.industry },
              { label: 'Region', value: currentClient.region },
              { label: 'Relationship Length', value: `${currentClient.relationship_length_years} years` },
            ].map((item, i, arr) => (
              <div key={item.label}>
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground text-sm">{item.label}</span>
                  <span className={cn(
                    'text-sm font-medium text-foreground',
                    item.capitalize && 'capitalize'
                  )}>
                    {item.value}
                  </span>
                </div>
                {i < arr.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Financial Health Indicator */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Financial Health Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-6 bg-muted/50 rounded-xl">
              <div className="flex justify-center mb-2">
                {getHealthIcon(
                  loanToRevenueRatio < 10,
                  loanToRevenueRatio < 25
                )}
              </div>
              <span className="label-text">Debt Ratio</span>
              <p className="text-lg font-semibold text-foreground mt-1">{loanToRevenueRatio.toFixed(1)}%</p>
            </div>
            <div className="text-center p-6 bg-muted/50 rounded-xl">
              <div className="flex justify-center mb-2">
                {getHealthIcon(
                  currentClient.delinquency_count_12m === 0,
                  currentClient.delinquency_count_12m <= 2
                )}
              </div>
              <span className="label-text">Payment History</span>
              <p className="text-lg font-semibold text-foreground mt-1">{currentClient.delinquency_count_12m} delinquencies</p>
            </div>
            <div className="text-center p-6 bg-muted/50 rounded-xl">
              <div className="flex justify-center mb-2">
                {getHealthIcon(
                  revenuePerEmployee > 100000,
                  revenuePerEmployee > 50000
                )}
              </div>
              <span className="label-text">Productivity</span>
              <p className="text-lg font-semibold text-foreground mt-1">${(revenuePerEmployee / 1000).toFixed(0)}K/emp</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
