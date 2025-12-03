import { FC, useState } from 'react'
import { useBankDashboard } from '../state/BankDashboardContext'
import { Document } from '../data/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { 
  FileText, 
  FileSpreadsheet, 
  FilePen, 
  FileBarChart,
  Plus,
  Eye,
  Download,
  X
} from 'lucide-react'

export const DocumentsSection: FC = () => {
  const { currentClient, documents, isLoadingClientData } = useBankDashboard()
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)

  if (!currentClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select a client to view documents</p>
      </div>
    )
  }

  if (isLoadingClientData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading documents...</p>
      </div>
    )
  }

  const getDocTypeIcon = (docType: string) => {
    switch (docType) {
      case 'tax_return':
        return <FilePen className="w-5 h-5 text-amber-500" />
      case 'financial_statement':
        return <FileBarChart className="w-5 h-5 text-emerald-500" />
      case 'loan_agreement':
        return <FileText className="w-5 h-5 text-blue-500" />
      case 'business_plan':
        return <FileSpreadsheet className="w-5 h-5 text-purple-500" />
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />
    }
  }

  const getFormatBadgeVariant = (format: string): 'danger' | 'secondary' | 'success' | 'outline' => {
    switch (format.toLowerCase()) {
      case 'pdf':
        return 'danger'
      case 'markdown':
        return 'secondary'
      case 'excel':
        return 'success'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1 tracking-tight">Documents</h1>
          <p className="text-muted-foreground">{currentClient.business_name} • {documents.length} documents on file</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Request Document
        </Button>
      </div>

      {/* Document Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['tax_return', 'financial_statement', 'loan_agreement', 'business_plan'].map((type) => {
          const count = documents.filter((d) => d.doc_type === type).length
          return (
            <Card key={type} className="border-border/50">
              <CardContent className="p-4 text-center">
                <div className="flex justify-center mb-2">
                  {getDocTypeIcon(type)}
                </div>
                <p className="text-xl font-semibold text-foreground">{count}</p>
                <span className="label-text capitalize">{type.replace('_', ' ')}</span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents Table */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              All Documents
            </CardTitle>
          </CardHeader>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No documents on file for this client.
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow 
                      key={doc.document_id}
                      className={cn(
                        'cursor-pointer transition-colors',
                        selectedDocument?.document_id === doc.document_id && 'bg-primary/10'
                      )}
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getDocTypeIcon(doc.doc_type)}
                          <div>
                            <p className="font-medium text-foreground text-sm">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getFormatBadgeVariant(doc.format)} className="uppercase text-[10px]">
                          {doc.format}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDocument(doc)
                          }}
                          className="h-7 px-2 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>

        {/* Document Preview */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Document Preview
              </CardTitle>
              {selectedDocument && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDocument(null)}
                  className="h-7 w-7 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {selectedDocument ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  {getDocTypeIcon(selectedDocument.doc_type)}
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{selectedDocument.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getFormatBadgeVariant(selectedDocument.format)} className="uppercase text-[10px]">
                        {selectedDocument.format}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(selectedDocument.created_at).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      ID: {selectedDocument.document_id}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </Button>
                </div>

                <ScrollArea className="h-[280px] rounded-lg border border-border bg-muted/30">
                  <div className="p-4 text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                    {selectedDocument.content || 'No content available for this document.'}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[360px] text-center">
                <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Select a document to preview</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Click on any document in the list</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
