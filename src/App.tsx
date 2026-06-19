import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/lib/context/ToastContext";
import { DensityProvider } from "@/lib/context/DensityContext";
import { AsyncOperationsProvider } from "@/lib/context/AsyncOperationsContext";
import ToastRegion from "@/components/ToastRegion";
import SessionExpiryProvider from "@/components/SessionExpiryProvider";
import LayoutWrapper from "@/components/LayoutWrapper";
import { WalletProvider } from "stellar-wallet-kit";

// Pages
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Send from "@/pages/send";
import Transactions from "@/pages/transactions";
import Bills from "@/pages/bills";
import Family from "@/pages/family";
import Insights from "@/pages/insights";
import Insurance from "@/pages/insurance";
import Settings from "@/pages/settings";
import Split from "@/pages/split";
import FinancialInsights from "@/pages/financial-insights";
import EmergencyTransfer from "@/pages/emergency-transfer";
import Fund from "@/pages/fund";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <LayoutWrapper>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/send" component={Send} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/bills" component={Bills} />
        <Route path="/family" component={Family} />
        <Route path="/insights" component={Insights} />
        <Route path="/financial-insights" component={FinancialInsights} />
        <Route path="/insurance" component={Insurance} />
        <Route path="/settings" component={Settings} />
        <Route path="/split" component={Split} />
        <Route path="/emergency-transfer" component={EmergencyTransfer} />
        <Route path="/fund" component={Fund} />
        <Route component={NotFound} />
      </Switch>
    </LayoutWrapper>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WalletProvider>
          <ToastProvider>
            <DensityProvider>
              <AsyncOperationsProvider>
                <SessionExpiryProvider>
                  <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                    <Router />
                  </WouterRouter>
                  <ToastRegion />
                  <Toaster />
                </SessionExpiryProvider>
              </AsyncOperationsProvider>
            </DensityProvider>
          </ToastProvider>
        </WalletProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
