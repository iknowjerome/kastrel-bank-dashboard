import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { KastrelDashboard } from '@/features/kastrel-dashboard/KastrelDashboard'
import { BankDashboardPage } from '@/features/bank-dashboard/BankDashboardPage'
import { Bird, Building2 } from 'lucide-react'

type TabId = 'kastrel' | 'bank'

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('bank')

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="max-w-[1920px] mx-auto px-6">
            <div className="flex items-center h-14 gap-6">
              {/* Logo */}
              <div className="flex items-center gap-2.5 mr-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <Bird className="w-4.5 h-4.5 text-primary" />
                </div>
                <span className="font-semibold text-foreground tracking-tight">
                  Kastrel
                </span>
              </div>

              {/* Navigation Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="flex-1">
                <TabsList className="bg-muted/50 h-9">
                  <TabsTrigger value="kastrel" className="gap-2 text-xs px-4">
                    <Bird className="w-3.5 h-3.5" />
                    Kastrel Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="bank" className="gap-2 text-xs px-4">
                    <Building2 className="w-3.5 h-3.5" />
                    Bank Data Dashboard
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Right side */}
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground font-medium">v1.0.0</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'kastrel' && <KastrelDashboard />}
          {activeTab === 'bank' && <BankDashboardPage />}
        </main>
      </div>
    </TooltipProvider>
  )
}

export default App
