import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { TechnicianProvider } from "@/lib/technician";
import { ObdProvider } from "@/lib/obd/context";
import { VehicleProvider } from "@/lib/vehicle-context";
import { ThemeProvider } from "@/lib/theme";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Vehicles from "@/pages/vehicles";
import VehicleDetail from "@/pages/vehicles/detail";
import DiagnosticsHub from "@/pages/diagnostics";
import DiagnosticSessionDetail from "@/pages/diagnostics/detail";
import AdasCalibration from "@/pages/adas";
import Programming from "@/pages/programming";
import Maintenance from "@/pages/maintenance";
import Reports from "@/pages/reports";
import Updates from "@/pages/updates";
import Settings from "@/pages/settings";
import DtcLookup from "@/pages/dtc-lookup";
import Compare from "@/pages/compare";
import LiveScan from "@/pages/live-scan";
import SystemMap from "@/pages/system-map";
import Oscilloscope from "@/pages/oscilloscope";
import GuidedDiag from "@/pages/guided-diag";
import PredictiveMaintenance from "@/pages/predictive";
import FullScan from "@/pages/full-scan";
import BatteryAnalyzer from "@/pages/battery";
import OBDMonitors from "@/pages/monitors";
import WorkshopStats from "@/pages/stats";
import AiChatPage from "@/pages/ai-chat";
import CustomerPortal from "@/pages/customer";
import EmissionsPage from "@/pages/emissions";
import RemoteExpert from "@/pages/remote-expert";
import VinDecoderPage from "@/pages/vin-decoder";
import WiringDiagrams from "@/pages/wiring";
import ActiveTests from "@/pages/active-tests";
import KeyProgramming from "@/pages/key-programming";
import TPMSPage from "@/pages/tpms";
import EVDiagnostics from "@/pages/ev-diagnostics";
import MaxiFix from "@/pages/maxifix";
import Inspection from "@/pages/inspection";
import TopologyMap from "@/pages/topology";
import DVIPage from "@/pages/dvi";
import InjectorCoding from "@/pages/injector-coding";
import PartsCatalog from "@/pages/parts";
import PrePostScan from "@/pages/pre-post-scan";

// Detect the router base from the manifest link in index.html.
// The Replit proxy strips the path prefix before forwarding to Vite,
// so import.meta.env.BASE_URL is always "/" — but the BROWSER still
// sees the full path (e.g. /autel-maxisys/). We derive the correct
// base at runtime from the hardcoded manifest href.
const ROUTER_BASE = (() => {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  const href = link?.getAttribute("href") || "";
  if (href && href.endsWith("/manifest.json")) {
    return href.slice(0, -"/manifest.json".length);
  }
  return import.meta.env.BASE_URL.replace(/\/$/, "");
})();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/vehicles" component={Vehicles} />
      <Route path="/vehicles/:id" component={VehicleDetail} />
      <Route path="/diagnostics" component={DiagnosticsHub} />
      <Route path="/diagnostics/:id" component={DiagnosticSessionDetail} />
      <Route path="/adas" component={AdasCalibration} />
      <Route path="/programming" component={Programming} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/reports" component={Reports} />
      <Route path="/updates" component={Updates} />
      <Route path="/settings" component={Settings} />
      <Route path="/dtc-lookup" component={DtcLookup} />
      <Route path="/compare" component={Compare} />
      <Route path="/live-scan" component={LiveScan} />
      <Route path="/system-map" component={SystemMap} />
      <Route path="/oscilloscope" component={Oscilloscope} />
      <Route path="/guided-diag" component={GuidedDiag} />
      <Route path="/predictive" component={PredictiveMaintenance} />
      <Route path="/full-scan" component={FullScan} />
      <Route path="/battery" component={BatteryAnalyzer} />
      <Route path="/monitors" component={OBDMonitors} />
      <Route path="/stats" component={WorkshopStats} />
      <Route path="/ai-chat" component={AiChatPage} />
      <Route path="/customer" component={CustomerPortal} />
      <Route path="/emissions" component={EmissionsPage} />
      <Route path="/remote-expert" component={RemoteExpert} />
      <Route path="/vin-decoder" component={VinDecoderPage} />
      <Route path="/wiring" component={WiringDiagrams} />
      <Route path="/active-tests" component={ActiveTests} />
      <Route path="/key-programming" component={KeyProgramming} />
      <Route path="/tpms" component={TPMSPage} />
      <Route path="/ev-diagnostics" component={EVDiagnostics} />
      <Route path="/maxifix" component={MaxiFix} />
      <Route path="/inspection" component={Inspection} />
      <Route path="/topology" component={TopologyMap} />
      <Route path="/dvi" component={DVIPage} />
      <Route path="/injector-coding" component={InjectorCoding} />
      <Route path="/parts" component={PartsCatalog} />
      <Route path="/pre-post-scan" component={PrePostScan} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <TechnicianProvider>
          <QueryClientProvider client={queryClient}>
            <ObdProvider>
              <VehicleProvider>
                <TooltipProvider>
                  <WouterRouter base={ROUTER_BASE}>
                    <Layout>
                      <Router />
                    </Layout>
                  </WouterRouter>
                  <Toaster />
                </TooltipProvider>
              </VehicleProvider>
            </ObdProvider>
          </QueryClientProvider>
        </TechnicianProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
