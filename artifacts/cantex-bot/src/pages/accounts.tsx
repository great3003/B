import { 
  useListAccounts, 
  useDeleteAccount, 
  useUpdateAccountSettings,
  useGetAccountBalances,
  useExecuteSwap,
  useGetSwapQuote,
  getListAccountsQueryKey,
  getGetAccountBalancesQueryKey,
  getListSwapHistoryQueryKey
} from "@workspace/api-client-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Settings, RefreshCw, Power, PowerOff, ShieldAlert, Zap, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Account } from "@workspace/api-client-react/src/generated/api.schemas";

function fmt10(v: string | number): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (!isFinite(n)) return "0.0000000000";
  return n.toFixed(10);
}

export function Accounts() {
  const { data: accounts, isLoading } = useListAccounts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 mb-8">
        <h2 className="text-2xl font-bold font-mono uppercase tracking-tight text-foreground">Accounts</h2>
        <p className="text-sm text-muted-foreground font-mono">Manage automated trading configurations and manual executions.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : accounts?.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg bg-card/30">
          <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-mono font-medium mb-1">No Accounts Configured</h3>
          <p className="text-sm text-muted-foreground font-mono mb-4">Add a trading account to begin operations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {accounts?.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </div>
  );
}

function AccountCard({ account }: { account: Account }) {
  const queryClient = useQueryClient();
  const updateSettings = useUpdateAccountSettings();
  const deleteAccount = useDeleteAccount();
  const { data: balances, isLoading: balancesLoading } = useGetAccountBalances(account.id, {
    query: {
      enabled: !!account.id,
      queryKey: getGetAccountBalancesQueryKey(account.id),
      refetchInterval: 60000, // refresh every minute
    }
  });

  const [gasThreshold, setGasThreshold] = useState<string>(
    account.gasThreshold !== null ? account.gasThreshold.toString() : ""
  );
  
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

  const handleToggleActive = (checked: boolean) => {
    updateSettings.mutate({
      id: account.id,
      data: { isActive: checked }
    }, {
      onSuccess: () => {
        toast.success(`Account ${checked ? 'activated' : 'deactivated'}`);
        queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
      }
    });
  };

  const handleToggleAutoSwap = (checked: boolean) => {
    updateSettings.mutate({
      id: account.id,
      data: { autoSwapEnabled: checked }
    }, {
      onSuccess: () => {
        toast.success(`Auto-swap ${checked ? 'enabled' : 'disabled'}`);
        queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
      }
    });
  };

  const handleSaveThreshold = () => {
    const val = gasThreshold.trim() === "" ? null : parseFloat(gasThreshold);
    updateSettings.mutate({
      id: account.id,
      data: { gasThreshold: val }
    }, {
      onSuccess: () => {
        toast.success("Gas threshold updated");
        queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
      }
    });
  };

  const handleDelete = () => {
    deleteAccount.mutate({ id: account.id }, {
      onSuccess: () => {
        toast.success("Account deleted");
        queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
      }
    });
  };

  const cbtcBalance = balances?.tokens.find(t => t.symbol?.toUpperCase() === "CBTC")?.unlockedAmount || "0";
  const usdcxBalance = balances?.tokens.find(t => t.symbol?.toUpperCase() === "USDCX")?.unlockedAmount || "0";

  return (
    <Card className={`border ${account.isActive ? 'border-primary/30 shadow-[0_0_15px_rgba(34,197,94,0.05)]' : 'border-border opacity-80'} bg-card transition-all duration-300 overflow-hidden`}>
      <div className={`h-1 w-full ${account.isActive ? 'bg-primary' : 'bg-muted'}`}></div>
      
      <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="font-mono text-lg flex items-center gap-2">
            {account.name}
            {account.isActive ? (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px] px-1.5 py-0 uppercase">Active</Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground font-mono text-[10px] px-1.5 py-0 uppercase">Inactive</Badge>
            )}
          </CardTitle>
          <div className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-2">
            <span>{account.operatorKey.substring(0, 8)}...{account.operatorKey.substring(account.operatorKey.length - 6)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 border-primary/50 text-primary hover:bg-primary/10 font-mono text-xs uppercase"
            onClick={() => setIsSwapModalOpen(true)}
          >
            <RefreshCw size={14} className="mr-1.5" /> Swap
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="px-5 pb-5 space-y-5">
        {/* Balances */}
        <div className="grid grid-cols-2 gap-3 bg-background p-3 rounded border border-border/50">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">cBTC Balance</span>
            {balancesLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <span className="font-mono text-sm font-medium text-foreground">{fmt10(cbtcBalance)}</span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">USDCx Balance</span>
            {balancesLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <span className="font-mono text-sm font-medium text-foreground">{fmt10(usdcxBalance)}</span>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-mono uppercase tracking-wide">Account Active</Label>
              <p className="text-[10px] text-muted-foreground font-mono">Enable connection to network</p>
            </div>
            <Switch 
              checked={account.isActive}
              onCheckedChange={handleToggleActive}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-mono uppercase tracking-wide">Auto Swap (Sweep All)</Label>
              <p className="text-[10px] text-muted-foreground font-mono">Sweep entire balance when gas is below threshold</p>
            </div>
            <Switch 
              checked={account.autoSwapEnabled}
              onCheckedChange={handleToggleAutoSwap}
              disabled={!account.isActive}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="space-y-2 pt-1 border-t border-border/50">
            <Label className="text-xs font-mono uppercase tracking-wide">Gas Threshold (CC)</Label>
            <div className="flex gap-2">
              <Input 
                value={gasThreshold}
                onChange={(e) => setGasThreshold(e.target.value)}
                placeholder="e.g. 0.001"
                className="font-mono text-sm bg-background h-8"
              />
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleSaveThreshold}
                disabled={account.gasThreshold === (gasThreshold.trim() === "" ? null : parseFloat(gasThreshold))}
                className="h-8 font-mono text-xs uppercase"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-5 pb-5 pt-0">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border border-destructive/20 font-mono text-xs uppercase tracking-wider"
              disabled={deleteAccount.isPending}
            >
              <Trash2 size={13} className="mr-1.5" />
              {deleteAccount.isPending ? "Deleting..." : "Delete Account"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-destructive/30 bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-mono uppercase tracking-wider">Delete Account?</AlertDialogTitle>
              <AlertDialogDescription className="font-mono text-xs">
                This will permanently remove <span className="text-foreground font-medium">{account.name}</span> and all its settings. Swap history is preserved. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-mono text-xs uppercase">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="font-mono text-xs uppercase bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>

      <SwapModal 
        account={account} 
        open={isSwapModalOpen} 
        onOpenChange={setIsSwapModalOpen}
        balances={balances}
      />
    </Card>
  );
}

const SWAP_DIRECTIONS = [
  { value: "cbtc_to_usdcx", label: "cBTC → CC → USDCx", from: "CBTC", to: "USDCX", display: "cBTC" },
  { value: "usdcx_to_cbtc", label: "USDCx → CC → cBTC", from: "USDCX", to: "CBTC", display: "USDCx" },
] as const;

const swapSchema = z.object({
  direction: z.enum(["cbtc_to_usdcx", "usdcx_to_cbtc"]),
  amount: z.string().min(1, "Amount is required").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Must be a positive number"),
});

function SwapModal({ 
  account, 
  open, 
  onOpenChange,
  balances
}: { 
  account: Account; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  balances: any;
}) {
  const queryClient = useQueryClient();
  const executeSwap = useExecuteSwap();
  const getQuote = useGetSwapQuote();
  
  const [quoteData, setQuoteData] = useState<any>(null);

  const form = useForm<z.infer<typeof swapSchema>>({
    resolver: zodResolver(swapSchema),
    defaultValues: {
      direction: (account.defaultSwapDirection as any) || "cbtc_to_usdcx",
      amount: account.defaultSwapAmount || "",
    },
  });

  const direction = form.watch("direction");
  const amount = form.watch("amount");

  const dirCfg = SWAP_DIRECTIONS.find((d) => d.value === direction) ?? SWAP_DIRECTIONS[0];
  const availableBalance =
    balances?.tokens.find((t: any) => t.symbol?.toUpperCase() === dirCfg.from)?.unlockedAmount || "0";
  const inputSymbol = dirCfg.display;

  // Debounced quote fetch
  const [quoteTimeout, setQuoteTimeout] = useState<NodeJS.Timeout | null>(null);

  const fetchQuote = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setQuoteData(null);
      return;
    }

    if (quoteTimeout) clearTimeout(quoteTimeout);

    const timeout = setTimeout(() => {
      getQuote.mutate({
        id: account.id,
        data: { direction, amount }
      }, {
        onSuccess: (data) => setQuoteData(data),
        onError: () => setQuoteData(null)
      });
    }, 500);

    setQuoteTimeout(timeout);
  };

  // Re-fetch quote when direction or amount changes
  // Note: we're using onBlur on the input or triggering manually via a button for simplicity in this terminal UI
  
  const handleGetQuote = () => {
    fetchQuote();
  };

  function onSubmit(values: z.infer<typeof swapSchema>) {
    executeSwap.mutate({
      id: account.id,
      data: values
    }, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success(`Swap successful: ${result.inputAmount} ${result.inputSymbol} → ${result.outputAmount} ${result.outputSymbol}`);
          queryClient.invalidateQueries({ queryKey: getGetAccountBalancesQueryKey(account.id) });
          queryClient.invalidateQueries({ queryKey: getListSwapHistoryQueryKey() });
          onOpenChange(false);
          form.reset();
          setQuoteData(null);
        } else {
          toast.error(`Swap failed: ${result.message}`);
        }
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to execute swap");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        setQuoteData(null);
        form.reset();
      }
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[450px] border-primary/20 bg-background shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider text-primary flex items-center gap-2">
            <Zap size={16} /> Manual Execution
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {account.name} | Immediate swap execution
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
            <FormField
              control={form.control}
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase tracking-wide">Direction</FormLabel>
                  <Select onValueChange={(val) => {
                    field.onChange(val);
                    setQuoteData(null);
                  }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="font-mono text-sm bg-card border-border">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SWAP_DIRECTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value} className="font-mono text-sm">
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="font-mono text-xs uppercase tracking-wide">Input Amount</FormLabel>
                    <button
                      type="button"
                      className="font-mono text-[10px] text-primary uppercase cursor-pointer hover:text-primary/80 transition-colors border border-primary/30 px-1.5 py-0.5 rounded-sm"
                      onClick={() => {
                        form.setValue("amount", availableBalance);
                        setQuoteData(null);
                      }}
                    >
                      Sweep All: {fmt10(availableBalance)} {inputSymbol}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="0.00" className="font-mono bg-card" {...field} />
                    </FormControl>
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={handleGetQuote}
                      disabled={getQuote.isPending}
                      className="font-mono text-xs uppercase w-24 shrink-0"
                    >
                      {getQuote.isPending ? "Calc..." : "Quote"}
                    </Button>
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {quoteData && (
              <div className="bg-card p-4 rounded-md border border-primary/20 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5">
                  <RefreshCw size={40} />
                </div>
                
                <h4 className="text-[10px] font-mono text-primary uppercase tracking-widest border-b border-border/50 pb-1">Quote Details</h4>
                
                <div className="grid grid-cols-2 gap-y-2 text-sm font-mono">
                  <div className="text-muted-foreground text-xs uppercase">Est. Output</div>
                  <div className="text-right font-medium text-primary">~{quoteData.buyAmount} {quoteData.buySymbol}</div>
                  
                  <div className="text-muted-foreground text-xs uppercase">Price</div>
                  <div className="text-right text-xs">{quoteData.tradePrice}</div>
                  
                  <div className="text-muted-foreground text-xs uppercase">Network Fee</div>
                  <div className="text-right text-xs text-amber-500">{quoteData.networkFee} CC</div>
                  
                  <div className="text-muted-foreground text-xs uppercase">Slippage</div>
                  <div className="text-right text-xs">{quoteData.slippage}</div>
                </div>
              </div>
            )}

            {!account.isActive && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-xs font-mono flex items-start gap-2 border border-destructive/20">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <p>This account is currently inactive. Swaps will likely fail. Activate the account before swapping.</p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="font-mono text-xs uppercase"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={executeSwap.isPending || !quoteData}
                className="font-mono text-xs uppercase bg-primary text-primary-foreground hover:bg-primary/90 min-w-[120px] shadow-[0_0_10px_rgba(34,197,94,0.3)] hover:shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all"
              >
                {executeSwap.isPending ? "Executing..." : "Execute Swap"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
