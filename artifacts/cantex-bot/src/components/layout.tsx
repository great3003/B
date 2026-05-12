import { Link, useLocation } from "wouter";
import { useGetGasFee } from "@workspace/api-client-react";
import { Activity, Wallet, History, Plus, BoxSelect } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateAccount, getListAccountsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  operatorKey: z.string().min(1, "Operator key is required"),
  tradingKey: z.string().min(1, "Trading key is required"),
});

export function GlobalLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Activity },
    { href: "/accounts", label: "Accounts", icon: Wallet },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background text-foreground dark selection:bg-primary/30">
      <aside className="w-full md:w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
            <BoxSelect size={18} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight uppercase font-mono">Sukuna</h1>
            <p className="text-xs text-muted-foreground uppercase font-mono tracking-widest">Swap Bot</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all cursor-pointer font-mono text-sm ${
                    isActive 
                      ? "bg-primary/10 text-primary font-medium border border-primary/20 shadow-[inset_2px_0_0_0_hsl(var(--primary))]" 
                      : "text-muted-foreground hover:bg-accent/5 hover:text-foreground"
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <GasFeeTicker />
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]"></div>
            <span className="text-xs font-mono text-primary uppercase tracking-widest">System Online</span>
          </div>
          
          <AddAccountDialog />
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function GasFeeTicker() {
  const { data: gasInfo, isLoading, isError, isFetching } = useGetGasFee({
    query: {
      refetchInterval: 15000,
      refetchIntervalInBackground: true,
      staleTime: 0,
    }
  });

  const status = gasInfo?.status ?? (isError ? "error" : "loading");
  const noAccounts = status === "no_accounts";
  const isLive = status === "ok";
  const fee = gasInfo?.networkFee ?? "—";

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-mono text-muted-foreground uppercase flex items-center justify-between">
        <span>Network Fee</span>
        <span className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${
          isFetching ? 'animate-ping bg-primary/70' :
          isError || noAccounts ? 'bg-muted-foreground' :
          isLive ? 'bg-primary' : 'bg-amber-400'
        }`} />
      </p>
      <div className="flex items-baseline gap-2">
        <span className={`text-xl font-mono font-medium tabular-nums transition-colors duration-500 ${
          isError || noAccounts ? 'text-muted-foreground' :
          isLoading && !gasInfo ? 'text-muted-foreground' :
          isLive ? 'text-primary drop-shadow-[0_0_4px_rgba(34,197,94,0.5)]' :
          'text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]'
        }`}>
          {fee}
        </span>
        {!noAccounts && <span className="text-xs font-mono text-muted-foreground">CC</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <div className={`h-1.5 w-1.5 rounded-full ${
          isError ? 'bg-destructive' :
          noAccounts ? 'bg-muted-foreground' :
          isLoading && !gasInfo ? 'bg-muted-foreground animate-pulse' :
          isLive ? 'bg-primary animate-pulse' : 'bg-amber-400'
        }`} />
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          {isLoading && !gasInfo ? "fetching..." :
           isError ? "unreachable" :
           noAccounts ? "add account" :
           status}
        </span>
      </div>
    </div>
  );
}

function AddAccountDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createAccount = useCreateAccount();

  const form = useForm<z.infer<typeof createAccountSchema>>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      name: "",
      operatorKey: "",
      tradingKey: "",
    },
  });

  function onSubmit(values: z.infer<typeof createAccountSchema>) {
    createAccount.mutate({ data: values }, {
      onSuccess: () => {
        toast.success("Account created successfully");
        queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
        setOpen(false);
        form.reset();
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to create account");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="font-mono text-xs uppercase tracking-wider h-8">
          <Plus size={14} className="mr-1" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider">New Trading Account</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Connect a new wallet for automated swaps.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Main Fund" className="font-mono bg-background" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="operatorKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Operator Key (Hex)</FormLabel>
                  <FormControl>
                    <Input placeholder="0x..." className="font-mono bg-background" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tradingKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs uppercase">Trading Key (Hex)</FormLabel>
                  <FormControl>
                    <Input placeholder="0x..." className="font-mono bg-background" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setOpen(false)}
                className="font-mono text-xs uppercase"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createAccount.isPending}
                className="font-mono text-xs uppercase bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {createAccount.isPending ? "Connecting..." : "Connect Account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
