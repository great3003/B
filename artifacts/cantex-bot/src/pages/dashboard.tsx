import { useListAccounts, useListSwapHistory, getGetAccountBalancesQueryOptions } from "@workspace/api-client-react";
import { useQueries, useQuery } from "@tanstack/react-query";
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowRightLeft, Layers, Zap, Coins } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Dashboard() {
  const { data: accounts, isLoading: accountsLoading } = useListAccounts();
  const { data: history, isLoading: historyLoading } = useListSwapHistory();

  const activeAccountsCount = accounts?.filter(a => a.isActive).length || 0;
  const autoSwapAccountsCount = accounts?.filter(a => a.autoSwapEnabled).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 mb-8">
        <h2 className="text-2xl font-bold font-mono uppercase tracking-tight text-foreground">Command Center</h2>
        <p className="text-sm text-muted-foreground font-mono">Sukuna Swap Bot · automated operations overview.</p>
      </div>

      <AutoSwapStatus accounts={accounts ?? []} />
      <PortfolioTotals accounts={accounts ?? []} accountsLoading={accountsLoading} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Layers size={64} />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-xs uppercase tracking-wider">Total Accounts</CardDescription>
            <CardTitle className="text-3xl font-mono">
              {accountsLoading ? <Skeleton className="h-9 w-16" /> : accounts?.length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
              <span className="text-primary font-medium">{activeAccountsCount}</span> active / <span className="text-primary font-medium">{autoSwapAccountsCount}</span> auto-swap
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ArrowRightLeft size={64} />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-xs uppercase tracking-wider">Recent Swaps</CardDescription>
            <CardTitle className="text-3xl font-mono">
              {historyLoading ? <Skeleton className="h-9 w-16" /> : history?.slice(0, 50).length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground font-mono">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap size={64} />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-xs uppercase tracking-wider">System Status</CardDescription>
            <CardTitle className="text-3xl font-mono text-primary drop-shadow-[0_0_4px_rgba(34,197,94,0.3)]">
              Operational
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Network Connected
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/30 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-mono uppercase tracking-tight">Active Accounts</CardTitle>
            </div>
            <Link href="/accounts">
              <Button variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-foreground">
                View All <ArrowRight size={14} className="ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {accountsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : accounts?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground font-mono text-sm border border-dashed border-border rounded-md">
                No accounts configured.
              </div>
            ) : (
              <div className="space-y-2">
                {accounts?.slice(0, 5).map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 rounded-md bg-background/50 border border-border/50">
                    <div className="flex flex-col">
                      <span className="font-mono font-medium text-sm">{account.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {account.operatorKey.substring(0, 6)}...{account.operatorKey.substring(account.operatorKey.length - 4)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {account.autoSwapEnabled ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px] uppercase rounded-sm px-1.5 py-0">Auto</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground font-mono text-[10px] uppercase rounded-sm px-1.5 py-0">Manual</Badge>
                      )}
                      <div className={`w-2 h-2 rounded-full ${account.isActive ? 'bg-primary' : 'bg-muted'}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/30 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-mono uppercase tracking-tight">Recent Activity</CardTitle>
            </div>
            <Link href="/history">
              <Button variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-foreground">
                View All <ArrowRight size={14} className="ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : history?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground font-mono text-sm border border-dashed border-border rounded-md">
                No swap history found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="font-mono text-xs uppercase h-8">Account</TableHead>
                      <TableHead className="font-mono text-xs uppercase h-8">Action</TableHead>
                      <TableHead className="font-mono text-xs uppercase h-8 text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history?.slice(0, 5).map((entry) => (
                      <TableRow key={entry.id} className="border-border/50">
                        <TableCell className="font-mono text-xs py-2">{entry.accountName}</TableCell>
                        <TableCell className="font-mono text-xs py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">{entry.inputAmount}</span>
                            <span className="text-primary">{entry.inputSymbol}</span>
                            <ArrowRight size={10} className="text-muted-foreground mx-0.5" />
                            <span className="text-muted-foreground">{entry.outputAmount}</span>
                            <span>{entry.outputSymbol}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <span className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded-sm ${
                            entry.status === 'success' ? 'bg-primary/10 text-primary border border-primary/20' : 
                            'bg-destructive/10 text-destructive border border-destructive/20'
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface AutoSwapStatusData {
  running: boolean;
  lastTickAt: number | null;
  lastTickAccounts: number;
  lastSwapAt: number | null;
  lastSkipReason: Record<string, string>;
  totalAttempts: number;
  totalSuccesses: number;
  totalFailures: number;
}

function relTime(ts: number | null): string {
  if (!ts) return "never";
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

function AutoSwapStatus({ accounts }: { accounts: any[] }) {
  const [, force] = React.useReducer((x) => x + 1, 0);
  const { data, refetch, isFetching } = useQuery<AutoSwapStatusData>({
    queryKey: ["auto-swap-status"],
    queryFn: async () => {
      const r = await fetch("/api/auto-swap/status");
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    refetchInterval: 5000,
  });

  React.useEffect(() => {
    const t = setInterval(force, 1000);
    return () => clearInterval(t);
  }, []);

  const runNow = async () => {
    await fetch("/api/auto-swap/trigger", { method: "POST" });
    setTimeout(() => refetch(), 500);
  };

  const autoEnabledCount = accounts.filter((a: any) => a.autoSwapEnabled && a.isActive).length;

  return (
    <Card className="bg-card/30 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${data?.running ? "bg-primary animate-pulse" : "bg-destructive"}`} />
            Auto-Swap Engine
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={runNow}
            disabled={isFetching}
            className="h-7 font-mono text-[10px] uppercase"
          >
            <Zap size={12} className="mr-1" /> Run Now
          </Button>
        </CardTitle>
        <CardDescription className="text-xs font-mono">
          {data?.running ? "Polling every 30s · sweeps full balance when gas ≤ threshold" : "Stopped"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono mb-3">
          <div className="bg-background/50 border border-border/50 rounded p-2">
            <div className="text-[10px] text-muted-foreground uppercase">Last Tick</div>
            <div className="text-foreground tabular-nums">{relTime(data?.lastTickAt ?? null)}</div>
          </div>
          <div className="bg-background/50 border border-border/50 rounded p-2">
            <div className="text-[10px] text-muted-foreground uppercase">Last Swap</div>
            <div className="text-foreground tabular-nums">{relTime(data?.lastSwapAt ?? null)}</div>
          </div>
          <div className="bg-background/50 border border-border/50 rounded p-2">
            <div className="text-[10px] text-muted-foreground uppercase">Watching</div>
            <div className="text-foreground tabular-nums">{autoEnabledCount} acct</div>
          </div>
          <div className="bg-background/50 border border-border/50 rounded p-2">
            <div className="text-[10px] text-muted-foreground uppercase">Tries / OK / Fail</div>
            <div className="text-foreground tabular-nums">
              {data?.totalAttempts ?? 0}/<span className="text-primary">{data?.totalSuccesses ?? 0}</span>/
              <span className="text-destructive">{data?.totalFailures ?? 0}</span>
            </div>
          </div>
        </div>
        {accounts.length > 0 && (
          <div className="space-y-1 border-t border-border/50 pt-2">
            {accounts.map((acc: any) => {
              const reason = data?.lastSkipReason?.[String(acc.id)];
              const isWatched = acc.autoSwapEnabled && acc.isActive;
              return (
                <div key={acc.id} className="flex items-center justify-between text-[11px] font-mono py-0.5">
                  <span className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${isWatched ? "bg-primary" : "bg-muted-foreground/40"}`} />
                    <span className="text-muted-foreground truncate max-w-[160px]">{acc.name}</span>
                  </span>
                  <span className={`text-[10px] ${reason?.startsWith("failed") ? "text-destructive" : reason?.startsWith("swept") || reason?.startsWith("sweeping") ? "text-primary" : "text-muted-foreground"} truncate max-w-[60%] text-right`}>
                    {!isWatched ? "auto-swap off" : reason ?? "waiting…"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function fmtAmount(v: string | number, dp = 10): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (!isFinite(n)) return "0";
  return n.toFixed(dp);
}

function PortfolioTotals({ accounts, accountsLoading }: { accounts: any[]; accountsLoading: boolean }) {
  const balanceQueries = useQueries({
    queries: accounts.map((acc) => ({
      ...getGetAccountBalancesQueryOptions(acc.id, {
        query: { refetchInterval: 30000 },
      }),
    })),
  });

  if (accountsLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!accounts || accounts.length === 0) {
    return null;
  }

  const totalCbtc = balanceQueries.reduce((sum, q) => {
    const tok = (q.data as any)?.tokens?.find((t: any) => t.symbol?.toUpperCase() === "CBTC");
    return sum + parseFloat(tok?.unlockedAmount ?? "0");
  }, 0);
  const totalUsdcx = balanceQueries.reduce((sum, q) => {
    const tok = (q.data as any)?.tokens?.find((t: any) => t.symbol?.toUpperCase() === "USDCX");
    return sum + parseFloat(tok?.unlockedAmount ?? "0");
  }, 0);
  const anyLoading = balanceQueries.some((q) => q.isLoading);
  const anyError = balanceQueries.some((q) => q.isError);

  return (
    <Card className="bg-card/30 border-border overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Coins size={64} />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>Total Portfolio</span>
          <span className={`h-1.5 w-1.5 rounded-full ${anyError ? "bg-destructive" : anyLoading ? "bg-muted-foreground animate-pulse" : "bg-primary animate-pulse"}`} />
        </CardTitle>
        <CardDescription className="text-xs font-mono">Aggregated balances across all accounts · refresh 30s</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-background/50 border border-border/50 rounded-md p-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">cBTC</span>
            <div className="font-mono text-2xl tabular-nums text-foreground">
              {anyLoading && totalCbtc === 0 ? "—" : fmtAmount(totalCbtc, 10)}
            </div>
          </div>
          <div className="bg-background/50 border border-border/50 rounded-md p-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">USDCx</span>
            <div className="font-mono text-2xl tabular-nums text-foreground">
              {anyLoading && totalUsdcx === 0 ? "—" : fmtAmount(totalUsdcx, 10)}
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-1 border-t border-border/50 pt-3">
          {accounts.map((acc, i) => {
            const q = balanceQueries[i];
            const cbtc = (q.data as any)?.tokens?.find((t: any) => t.symbol?.toUpperCase() === "CBTC")?.unlockedAmount ?? "0";
            const usdcx = (q.data as any)?.tokens?.find((t: any) => t.symbol?.toUpperCase() === "USDCX")?.unlockedAmount ?? "0";
            return (
              <div key={acc.id} className="flex items-center justify-between text-xs font-mono py-1">
                <span className="text-muted-foreground truncate max-w-[40%]">{acc.name}</span>
                <div className="flex items-center gap-3">
                  {q.isError ? (
                    <span className="text-destructive text-[10px]">unreachable</span>
                  ) : q.isLoading ? (
                    <Skeleton className="h-3 w-32" />
                  ) : (
                    <>
                      <span className="text-foreground tabular-nums">
                        {fmtAmount(cbtc, 10)} <span className="text-muted-foreground text-[10px]">cBTC</span>
                      </span>
                      <span className="text-foreground tabular-nums">
                        {fmtAmount(usdcx, 10)} <span className="text-muted-foreground text-[10px]">USDCx</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
