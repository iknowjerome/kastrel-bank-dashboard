import { FC } from 'react'
import { useBankDashboard } from '../state/BankDashboardContext'
import { DashboardSection } from '../data/types'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  HeartHandshake,
  Route,
  FileText,
  MessageSquare,
  AlertTriangle,
  CheckSquare,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'

interface NavItem {
  id: DashboardSection
  label: string
  icon: React.ElementType
  category: 'overview' | 'data' | 'analysis' | 'ai'
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, category: 'overview' },
  { id: 'financial', label: 'Financial Profile', icon: Wallet, category: 'data' },
  { id: 'relationship', label: 'Relationship Health', icon: HeartHandshake, category: 'data' },
  { id: 'journey', label: 'Loan Journey', icon: Route, category: 'data' },
  { id: 'documents', label: 'Documents', icon: FileText, category: 'data' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, category: 'data' },
  { id: 'risk', label: 'Risk Signals', icon: AlertTriangle, category: 'analysis' },
  { id: 'actions', label: 'Next Actions', icon: CheckSquare, category: 'analysis' },
  { id: 'aiSummary', label: 'AI Summary', icon: Sparkles, category: 'ai' },
]

const categoryLabels: Record<string, string> = {
  overview: 'Dashboard',
  data: 'Client Data',
  analysis: 'Analysis',
  ai: 'AI Insights',
}

export const Sidebar: FC = () => {
  const { currentSection, setCurrentSection, sidebarCollapsed, toggleSidebar, currentClient } = useBankDashboard()

  // Group items by category
  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, NavItem[]>)

  const categories = ['overview', 'data', 'analysis', 'ai']

  return (
    <aside
      className={cn(
        'bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Collapse Toggle */}
      <div className="p-3 border-b border-border flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="py-4">
          {!currentClient ? (
            <div className={cn(
              'px-4 text-center text-muted-foreground text-sm',
              sidebarCollapsed && 'hidden'
            )}>
              Select a client to view sections
            </div>
          ) : (
            categories.map((category, categoryIndex) => (
              <div key={category} className="mb-2">
                {/* Category Label */}
                {!sidebarCollapsed && (
                  <div className="px-4 py-2 label-text">
                    {categoryLabels[category]}
                  </div>
                )}

                {/* Items */}
                <div className="px-2 space-y-0.5">
                  {groupedItems[category]?.map((item) => {
                    const Icon = item.icon
                    const isActive = currentSection === item.id
                    
                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? 'secondary' : 'ghost'}
                        onClick={() => setCurrentSection(item.id)}
                        className={cn(
                          'w-full justify-start gap-3 h-10 font-medium transition-all duration-200',
                          sidebarCollapsed && 'justify-center px-2',
                          isActive && 'bg-primary/10 text-foreground border-l-2 border-primary rounded-l-none',
                          !isActive && 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <Icon className={cn(
                          'h-4 w-4 shrink-0',
                          isActive && 'text-primary'
                        )} />
                        {!sidebarCollapsed && (
                          <span className="text-sm truncate">{item.label}</span>
                        )}
                      </Button>
                    )
                  })}
                </div>

                {categoryIndex < categories.length - 1 && !sidebarCollapsed && (
                  <Separator className="my-3 mx-4" />
                )}
              </div>
            ))
          )}
        </nav>
      </ScrollArea>

      {/* Footer */}
      {!sidebarCollapsed && currentClient && (
        <div className="p-4 border-t border-border">
          <div className="text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Client ID</span>
              <span className="text-foreground font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                {currentClient.customer_id}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Region</span>
              <span className="text-foreground">{currentClient.region}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
