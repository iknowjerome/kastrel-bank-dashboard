import { FC, useState, useCallback, useRef } from 'react'
import { useBankDashboard } from '../state/BankDashboardContext'
import { streamAiSummary } from '../data/api'
import { AiSummaryStatus, Token, getRiskLevel } from '../data/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { 
  Sparkles, 
  Loader2, 
  AlertTriangle,
  RefreshCw,
  Bot
} from 'lucide-react'

// =============================================================================
// Token Component with Risk Highlighting
// =============================================================================

interface RiskTokenProps {
  token: Token
}

const RiskToken: FC<RiskTokenProps> = ({ token }) => {
  const riskLevel = getRiskLevel(token.riskScore)

  const getBackgroundStyle = () => {
    if (token.riskScore < 0.34) {
      return 'bg-emerald-500/10'
    } else if (token.riskScore < 0.67) {
      return 'bg-amber-500/20'
    } else {
      return 'bg-red-500/30 border border-red-500/40'
    }
  }

  const getRiskColor = () => {
    if (token.riskScore < 0.34) return 'text-success'
    if (token.riskScore < 0.67) return 'text-warning'
    return 'text-danger'
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'rounded px-0.5 py-0.5 cursor-help transition-colors',
            getBackgroundStyle()
          )}
        >
          {token.text}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Token Analysis</p>
          <p className="text-sm font-medium">"{token.text}"</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Risk:</span>
            <span className={cn('text-sm font-semibold', getRiskColor())}>
              {(token.riskScore * 100).toFixed(0)}%
            </span>
            <Badge 
              variant={riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'danger'} 
              className="text-[10px]"
            >
              {riskLevel}
            </Badge>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// =============================================================================
// Suggestion Card Component (Reserved for future use)
// =============================================================================

// TODO: Implement suggestions feature when backend supports it
// interface SuggestionCardProps {
//   suggestion: AiSuggestion
//   index: number
// }

// const SuggestionCard: FC<SuggestionCardProps> = ({ suggestion, index }) => {
//   const handleClick = () => {
//     console.log('Suggestion clicked:', suggestion)
//   }

//   const getCategoryVariant = (category: string): 'success' | 'danger' | 'secondary' | 'warning' | 'outline' => {
//     switch (category.toLowerCase()) {
//       case 'retention':
//         return 'success'
//       case 'risk mitigation':
//         return 'danger'
//       case 'upsell':
//       case 'growth':
//         return 'secondary'
//       case 'relationship':
//       case 'engagement':
//         return 'secondary'
//       case 'documentation':
//       case 'compliance':
//         return 'warning'
//       default:
//         return 'outline'
//     }
//   }

//   return (
//     <button
//       onClick={handleClick}
//       className="w-full text-left bg-muted/50 hover:bg-muted border border-border hover:border-border/80 rounded-xl p-4 transition-all animate-slide-up group"
//       style={{ animationDelay: `${index * 100}ms` }}
//     >
//       <div className="flex items-start justify-between gap-3">
//         <div className="flex-1">
//           <h4 className="text-foreground font-medium group-hover:text-primary transition-colors">
//             {suggestion.title}
//           </h4>
//           <div className="flex flex-wrap gap-2 mt-2">
//             {suggestion.categories.map((category) => (
//               <Badge
//                 key={category}
//                 variant={getCategoryVariant(category)}
//                 className="text-[10px]"
//               >
//                 {category}
//               </Badge>
//             ))}
//           </div>
//         </div>
//         <div className="text-right">
//           <span className="text-xs text-muted-foreground">Confidence</span>
//           <div className={cn(
//             'text-lg font-semibold',
//             suggestion.confidence >= 0.8 ? 'text-success' :
//             suggestion.confidence >= 0.6 ? 'text-warning' :
//             'text-muted-foreground'
//           )}>
//             {(suggestion.confidence * 100).toFixed(0)}%
//           </div>
//         </div>
//       </div>
      
//       {/* Hover indicator */}
//       <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
//         <span>Click to create task</span>
//         <ChevronRight className="w-3 h-3" />
//       </div>
//     </button>
//   )
// }

// =============================================================================
// Loading Skeleton
// =============================================================================

const AiSummarySkeleton: FC = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader className="pb-4">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="pb-4">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </CardContent>
    </Card>
  </div>
)

// =============================================================================
// Main AI Summary Section
// =============================================================================

export const AiSummarySection: FC = () => {
  const { currentClient, currentClientId } = useBankDashboard()
  const [status, setStatus] = useState<AiSummaryStatus>('idle')
  const [summaryTokens, setSummaryTokens] = useState<Token[]>([])
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Store abort function to cancel ongoing streams
  const abortStreamRef = useRef<(() => void) | null>(null)

  const handleSummarize = useCallback(async () => {
    if (!currentClientId) return

    // Cancel any ongoing stream
    if (abortStreamRef.current) {
      abortStreamRef.current()
      abortStreamRef.current = null
    }

    setStatus('loading')
    setError(null)
    setSummaryTokens([])
    setGeneratedAt(null)

    // Start streaming
    const abort = streamAiSummary(
      currentClientId,
      // onToken callback - append each token as it arrives
      (token) => {
        setSummaryTokens((prev) => [...prev, token])
      },
      // onError callback
      (errorMessage) => {
        setError(errorMessage)
        setStatus('error')
        abortStreamRef.current = null
      },
      // onComplete callback
      () => {
        setStatus('success')
        setGeneratedAt(new Date().toISOString())
        abortStreamRef.current = null
      }
    )
    
    abortStreamRef.current = abort
  }, [currentClientId])

  const getStatusIndicator = () => {
    switch (status) {
      case 'idle':
        return <span className="w-2 h-2 rounded-full bg-muted-foreground" />
      case 'loading':
        return <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      case 'success':
        return <span className="w-2 h-2 rounded-full bg-success" />
      case 'error':
        return <span className="w-2 h-2 rounded-full bg-danger" />
    }
  }

  const getLastRunText = () => {
    if (!generatedAt) return 'Not run yet'
    
    const generated = new Date(generatedAt)
    const now = new Date()
    const diffMs = now.getTime() - generated.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hr ago`
    return generated.toLocaleDateString()
  }

  if (!currentClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select a client to generate AI summary</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1 tracking-tight flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            AI Summary & Suggestions
          </h1>
          <p className="text-muted-foreground">{currentClient.business_name}</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Status & Last Run */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              {getStatusIndicator()}
              <span className="text-muted-foreground capitalize">{status}</span>
            </div>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">Last run: {getLastRunText()}</span>
          </div>
          
          {/* Summarize Button */}
          <Button
            onClick={handleSummarize}
            disabled={status === 'loading'}
            className="gap-2"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Summarize Client
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {status === 'error' && error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
              <div className="flex-1">
                <p className="text-danger font-medium">Error generating summary</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSummarize} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading Skeleton */}
      {status === 'loading' && <AiSummarySkeleton />}

      {/* Summary Display - Show tokens as they stream in */}
      {(status === 'loading' || status === 'success') && summaryTokens.length > 0 && (
        <div className="space-y-6">
          {/* Summary Block */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Summary
                </CardTitle>
                {status === 'loading' && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Generating...</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-foreground leading-relaxed">
                {summaryTokens.map((token, index) => (
                  <span key={index}>
                    <RiskToken token={token} />
                    {index < summaryTokens.length - 1 && ' '}
                  </span>
                ))}
                {status === 'loading' && (
                  <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
                )}
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-500/20" />
                  <span>Low risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-amber-500/30" />
                  <span>Medium risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-red-500/40 border border-red-500/50" />
                  <span>High risk</span>
                </div>
              </div>
              {status === 'success' && (
                <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                  {summaryTokens.length} tokens generated
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Idle State - Prompt to Run */}
      {status === 'idle' && summaryTokens.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Generate AI-Powered Insights
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Click "Summarize Client" to generate a comprehensive analysis including risk assessment, 
              recommended actions, and relationship insights.
            </p>
            <Button onClick={handleSummarize} size="lg" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Summarize Client
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
