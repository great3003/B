import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { GlobalLayout } from "@/components/layout";
import { Dashboard } from "@/pages/dashboard";
import { Accounts } from "@/pages/accounts";
import { History } from "@/pages/history";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60, // 1 minute
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/">
        <GlobalLayout>
          <Dashboard />
        </GlobalLayout>
      </Route>
      <Route path="/accounts">
        <GlobalLayout>
          <Accounts />
        </GlobalLayout>
      </Route>
      <Route path="/history">
        <GlobalLayout>
          <History />
        </GlobalLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster theme="dark" position="bottom-right" className="font-mono" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
