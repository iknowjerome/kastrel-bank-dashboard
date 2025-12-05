import { FC } from 'react'
import { useBankDashboard } from '../state/BankDashboardContext'
import { ClientSelector } from './ClientSelector'
import { Sidebar } from './Sidebar'
import { OverviewSection } from './OverviewSection'
import { FinancialProfileSection } from './FinancialProfileSection'
import { RelationshipHealthSection } from './RelationshipHealthSection'
import { LoanJourneySection } from './LoanJourneySection'
import { DocumentsSection } from './DocumentsSection'
import { MessagesSection } from './MessagesSection'
import { RiskSignalsSection } from './RiskSignalsSection'
import { NextActionsSection } from './NextActionsSection'
import { AiSummarySection } from './AiSummarySection'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

export const BankDashboardLayout: FC = () => {
  const { currentSection, currentClient } = useBankDashboard()

  const renderSection = () => {
    switch (currentSection) {
      case 'overview':
        return <OverviewSection />
      case 'financial':
        return <FinancialProfileSection />
      case 'relationship':
        return <RelationshipHealthSection />
      case 'journey':
        return <LoanJourneySection />
      case 'documents':
        return <DocumentsSection />
      case 'messages':
        return <MessagesSection />
      case 'risk':
        return <RiskSignalsSection />
      case 'actions':
        return <NextActionsSection />
      case 'aiSummary':
        return <AiSummarySection />
      default:
        return <OverviewSection />
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar with Client Selector */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <span className="label-text block mb-1.5">Current Client</span>
              <ClientSelector />
            </div>
          </div>

          {/* Quick Stats */}
          {currentClient && (
            <div className="hidden lg:flex items-center gap-6">
              <div className="text-right">
                <span className="label-text block mb-1">Segment</span>
                <span className="text-sm font-medium text-foreground capitalize">
                  {currentClient.segment}
                </span>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-right">
                <span className="label-text block mb-1">Industry</span>
                <span className="text-sm font-medium text-foreground">
                  {currentClient.industry}
                </span>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-right">
                <span className="label-text block mb-1">Loan Status</span>
                <Badge variant="secondary" className="capitalize font-medium">
                  {currentClient.loan_outcome.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <ScrollArea className="flex-1 bg-background">
          <main className="p-6 max-w-[1400px]">
            {renderSection()}
          </main>
        </ScrollArea>
      </div>
    </div>
  )
}
