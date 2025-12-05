import { FC, useState } from 'react'
import { useBankDashboard } from '../state/BankDashboardContext'
import { getRiskLevelFromRating } from '../data/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { ChevronsUpDown, Check, AlertTriangle, Building2 } from 'lucide-react'

export const ClientSelector: FC = () => {
  const { allCustomers, currentClientId, setCurrentClientId, currentClient } = useBankDashboard()
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter customers based on search
  const filteredCustomers = allCustomers.filter(
    (c) =>
      c.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.industry.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelect = (customerId: string) => {
    setCurrentClientId(customerId)
    setOpen(false)
    setSearchTerm('')
  }

  const getRiskBadgeVariant = (rating: number): 'success' | 'warning' | 'danger' => {
    const level = getRiskLevelFromRating(rating)
    switch (level) {
      case 'low':
        return 'success'
      case 'medium':
        return 'warning'
      case 'high':
        return 'danger'
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full max-w-md justify-between h-auto py-3 px-4 bg-background hover:bg-muted/50"
        >
          {currentClient ? (
            <div className="flex items-center gap-3 flex-1 text-left">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">
                    {currentClient.business_name}
                  </span>
                  <Badge variant={getRiskBadgeVariant(currentClient.risk_rating)} className="text-[10px] px-1.5">
                    Risk: {currentClient.risk_rating}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {currentClient.customer_id} • {currentClient.industry} • {currentClient.segment}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">Select a client...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[440px] p-0" align="start">
        <Command className="rounded-xl">
          <CommandInput
            placeholder="Search by name, ID, or industry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <CommandList>
            <CommandEmpty>No customers found.</CommandEmpty>
            <CommandGroup heading="Customers">
              {filteredCustomers.map((customer) => (
                <CommandItem
                  key={customer.customer_id}
                  onClick={() => handleSelect(customer.customer_id)}
                  className={cn(
                    'cursor-pointer py-3',
                    customer.customer_id === currentClientId && 'bg-primary/10'
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {customer.business_name}
                        </span>
                        {customer.churn_label === 1 && (
                          <Badge variant="danger" className="text-[10px] px-1.5 gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Churn Risk
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {customer.customer_id} • {customer.industry} • ${(customer.annual_revenue / 1000000).toFixed(1)}M
                      </div>
                    </div>
                    <Badge 
                      variant={getRiskBadgeVariant(customer.risk_rating)} 
                      className="text-[10px] px-1.5 shrink-0"
                    >
                      {customer.risk_rating}
                    </Badge>
                    {customer.customer_id === currentClientId && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
