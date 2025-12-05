import { FC, useState, useCallback, useRef, useEffect } from 'react'
import { useBankDashboard } from '../state/BankDashboardContext'
import { streamAiSummary } from '../data/api'
import { AiSummaryStatus, Token, getRiskLevel } from '../data/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
  FileText,
  MessageSquare,
  Users,
  Save,
  RotateCcw,
  Eye
} from 'lucide-react'

const BANKING_API_BASE = '/api/banking'

interface ContextMetadata {
  customer_profile: {
    business_profile: Record<string, any>
    loan_details: Record<string, any>
    risk_profile: Record<string, any>
    relationship_health: Record<string, any>
  }
  documents: {
    total_count: number
    by_type: Record<string, Array<{title: string, created_at: string, format: string}>>
  }
  messages: {
    total: number
    by_channel: Record<string, number>
    by_sentiment: Record<string, number>
    by_role: Record<string, number>
  }
}

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

// Removed loading skeleton - not needed with streaming dialog

// =============================================================================
// Main AI Summary Section
// =============================================================================

export const AiSummarySection: FC = () => {
  const { currentClient, currentClientId } = useBankDashboard()
  const [status, setStatus] = useState<AiSummaryStatus>('idle')
  const [summaryTokens, setSummaryTokens] = useState<Token[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Store abort function to cancel ongoing streams
  const abortStreamRef = useRef<(() => void) | null>(null)

  // Prompt management
  const [prompt, setPrompt] = useState('')
  const [originalPrompt, setOriginalPrompt] = useState('')
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptSaving, setPromptSaving] = useState(false)
  
  // Context metadata (for showing what data will be sent)
  const [contextMetadata, setContextMetadata] = useState<ContextMetadata | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)

  // Load prompt from backend
  const loadPrompt = useCallback(async () => {
    setPromptLoading(true)
    try {
      const response = await fetch(`${BANKING_API_BASE}/prompt`)
      const data = await response.json()
      setPrompt(data.prompt)
      setOriginalPrompt(data.prompt)
    } catch (error) {
      console.error('Failed to load prompt:', error)
    } finally {
      setPromptLoading(false)
    }
  }, [])

  // Save prompt to backend
  const savePrompt = async () => {
    setPromptSaving(true)
    try {
      const response = await fetch(`${BANKING_API_BASE}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await response.json()
      setOriginalPrompt(data.prompt)
      alert('Prompt saved successfully!')
    } catch (error) {
      console.error('Failed to save prompt:', error)
      alert('Failed to save prompt')
    } finally {
      setPromptSaving(false)
    }
  }

  const resetPrompt = () => {
    setPrompt(originalPrompt)
  }

  // Load context metadata for current client
  const loadContextMetadata = useCallback(async (customerId: string) => {
    if (!customerId) return
    
    setMetadataLoading(true)
    try {
      const response = await fetch(`${BANKING_API_BASE}/customers/${customerId}/context-metadata`)
      const data = await response.json()
      setContextMetadata(data)
    } catch (error) {
      console.error('Failed to load context metadata:', error)
      setContextMetadata(null)
    } finally {
      setMetadataLoading(false)
    }
  }, [])

  // Load prompt on mount
  useEffect(() => {
    loadPrompt()
  }, [loadPrompt])

  // Load context metadata when client changes
  useEffect(() => {
    if (currentClientId) {
      loadContextMetadata(currentClientId)
    } else {
      setContextMetadata(null)
    }
  }, [currentClientId, loadContextMetadata])

  const handleSummarize = useCallback(async () => {
    if (!currentClientId) return

    // Cancel any ongoing stream
    if (abortStreamRef.current) {
      abortStreamRef.current()
      abortStreamRef.current = null
    }

    // Open dialog and reset state
    setDialogOpen(true)
    setStatus('loading')
    setError(null)
    setSummaryTokens([])

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
        abortStreamRef.current = null
      }
    )
    
    abortStreamRef.current = abort
  }, [currentClientId])

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
            AI Generation Configuration
          </h1>
          <p className="text-muted-foreground">{currentClient.business_name}</p>
        </div>
        
        <Button
          onClick={handleSummarize}
          disabled={!currentClient}
          className="gap-2"
          size="lg"
        >
          <Sparkles className="w-4 h-4" />
          Summarize Client
        </Button>
      </div>

      {/* Configuration Section - Data Context and Prompt */}
      <div className="grid grid-cols-3 gap-6">
        {/* Data Context Preview - 2 columns */}
        <Card className="col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Data Context Preview
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-2">
              Shows what data will be sent to the model (without actual content)
            </p>
          </CardHeader>
          <CardContent>
            {metadataLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : contextMetadata ? (
              <div className="space-y-4">
                {/* Customer Profile Sections */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Customer Profile Sections
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(contextMetadata.customer_profile).map(([section, data]) => (
                      <div key={section} className="bg-muted/50 rounded-lg p-3 border border-border">
                        <div className="text-xs font-medium text-primary capitalize mb-1">
                          {section.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Object.keys(data).length} fields
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Documents ({contextMetadata.documents.total_count})
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(contextMetadata.documents.by_type).map(([docType, docs]) => (
                      <div key={docType} className="bg-muted/50 rounded-lg p-3 border border-border">
                        <div className="text-xs font-medium text-primary capitalize mb-1">
                          {docType.replace(/_/g, ' ')} ({docs.length})
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {docs.slice(0, 3).map((doc, idx) => (
                            <div key={idx}>• {doc.title}</div>
                          ))}
                          {docs.length > 3 && (
                            <div className="text-muted-foreground/70">+ {docs.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Messages ({contextMetadata.messages.total})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 rounded-lg p-3 border border-border">
                      <div className="text-xs font-medium mb-1">By Channel</div>
                      {Object.entries(contextMetadata.messages.by_channel).map(([channel, count]) => (
                        <div key={channel} className="text-xs text-muted-foreground">
                          {channel}: {count}
                        </div>
                      ))}
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 border border-border">
                      <div className="text-xs font-medium mb-1">By Sentiment</div>
                      {Object.entries(contextMetadata.messages.by_sentiment).map(([sentiment, count]) => (
                        <div key={sentiment} className="text-xs text-muted-foreground">
                          {sentiment}: {count}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No customer data loaded</p>
            )}
          </CardContent>
        </Card>

        {/* Prompt Editor - 1 column */}
        <Card className="col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              AI Prompt Template
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-2">
              This prompt will be used when generating summaries
            </p>
          </CardHeader>
          <CardContent>
            {promptLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-3">
                {prompt === originalPrompt && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Active prompt (from file)
                    </p>
                  </div>
                )}
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="h-64 resize-none text-xs"
                  placeholder="Enter prompt template..."
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={savePrompt} 
                    disabled={promptSaving || prompt === originalPrompt}
                    className="flex-1 gap-2"
                    size="sm"
                  >
                    {promptSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={resetPrompt} 
                    disabled={prompt === originalPrompt}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </Button>
                </div>
                {prompt !== originalPrompt && (
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    ⚠️ You have unsaved changes - save to use this prompt
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Dialog */}
      <Dialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          if (!open && abortStreamRef.current && status === 'loading') {
            // Cancel ongoing stream when closing dialog
            abortStreamRef.current()
            abortStreamRef.current = null
            setStatus('idle')
          }
          setDialogOpen(open)
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Summary - {currentClient.business_name}
            </DialogTitle>
            <DialogDescription>
              AI-generated analysis with risk assessment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status Indicator */}
            {status === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating summary...</span>
              </div>
            )}

            {/* Error State */}
            {status === 'error' && error && (
              <div className="border-red-500/30 bg-red-500/5 rounded-lg p-4">
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
              </div>
            )}

            {/* Summary Content */}
            {summaryTokens.length > 0 && (
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-6">
                  <div className="text-foreground leading-relaxed text-base">
                    {summaryTokens.map((token, index) => (
                      <span key={index}>
                        <RiskToken token={token} />
                      </span>
                    ))}
                    {status === 'loading' && (
                      <span className="inline-block w-2 h-5 ml-1 bg-primary animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Risk Legend */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
                  <span className="font-medium">Risk levels:</span>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-emerald-500/20" />
                    <span>Low</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-amber-500/30" />
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-red-500/40 border border-red-500/50" />
                    <span>High</span>
                  </div>
                </div>

                {/* Token Count */}
                {status === 'success' && (
                  <div className="text-xs text-muted-foreground text-center">
                    {summaryTokens.length} tokens generated
                  </div>
                )}
              </div>
            )}

            {/* Initial State (waiting for first token) */}
            {summaryTokens.length === 0 && status === 'loading' && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Analyzing client data...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
