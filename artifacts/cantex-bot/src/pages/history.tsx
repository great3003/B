import { useListSwapHistory } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, History as HistoryIcon } from "lucide-react";
import { format } from "date-fns";

export function History() {
  const { data: history, isLoading } = useListSwapHistory();

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col gap-1 mb-4 shrink-0">
        <h2 className="text-2xl font-bold font-mono uppercase tracking-tight text-foreground">Transaction Ledger</h2>
        <p className="text-sm text-muted-foreground font-mono">Immutable record of all executed swaps.</p>
      </div>

      <div className="border border-border rounded-md bg-card/30 flex-1 overflow-hidden flex flex-col min-h-[400px]">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : history?.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground font-mono">
            <HistoryIcon className="h-12 w-12 mb-4 opacity-20" />
            <p>No transaction history found in the ledger.</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader className="bg-background sticky top-0 z-10 shadow-sm">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="font-mono text-xs uppercase h-10 w-[180px]">Timestamp</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-10 w-[150px]">Account</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-10">Operation</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-10 text-right w-[150px]">Execution Price</TableHead>
                  <TableHead className="font-mono text-xs uppercase h-10 text-right w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history?.map((entry) => (
                  <TableRow key={entry.id} className="border-border/50 hover:bg-white/5 transition-colors">
                    <TableCell className="font-mono text-xs py-3 text-muted-foreground">
                      {format(new Date(entry.executedAt), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-mono text-xs py-3 font-medium">
                      {entry.accountName}
                    </TableCell>
                    <TableCell className="font-mono text-xs py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.inputAmount}</span>
                        <span className="text-primary">{entry.inputSymbol}</span>
                        <ArrowRight size={12} className="text-muted-foreground/50 mx-1" />
                        <span className="font-medium">{entry.outputAmount}</span>
                        <span>{entry.outputSymbol}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs py-3 text-right">
                      {entry.price ? (
                        <span className="text-muted-foreground">{entry.price}</span>
                      ) : (
                        <span className="text-muted-foreground/30">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm ${
                        entry.status === 'success' 
                          ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_5px_rgba(34,197,94,0.1)]' 
                          : 'bg-destructive/10 text-destructive border border-destructive/20 shadow-[0_0_5px_rgba(239,68,68,0.1)]'
                      }`}>
                        {entry.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
