import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trackPageView } from "@/lib/metaPixel";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Terms from "@/pages/terms";
import Home from "@/pages/home";
import SpotDetail from "@/pages/spot-detail";
import AddSpot from "@/pages/add-spot";
import MyBookings from "@/pages/my-bookings";
import Payment from "@/pages/payment";
import Transactions from "@/pages/transactions";
import Dashboard from "@/pages/dashboard";
import EditSpot from "@/pages/edit-spot";
import Admin from "@/pages/admin";
import SelectCategory from "@/pages/select-category";
import AddSale from "@/pages/add-sale";
import SaleDetail from "@/pages/sale-detail";
import CheckoutSuccess from "@/pages/checkout-success";
import CheckoutCancel from "@/pages/checkout-cancel";
import PrivacyPolicy from "@/pages/privacy-policy";
import AuthPage from "@/pages/auth";

// Heavy map pages loaded lazily to keep initial bundle small
const MapHackNS = lazy(() => import("@/pages/map-hack-ns"));
const MapHackSubscribe = lazy(() => import("@/pages/map-hack-subscribe"));

function usePageViewTracking() {
  const [location] = useLocation();
  useEffect(() => {
    trackPageView(location);
  }, [location]);
}

function MapHackRedirect() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  useEffect(() => {
    if (isLoading) return;
    if (user?.mapNickname && (location === "/" || location === "/home")) {
      if (sessionStorage.getItem("bypassMapHackRedirect") === "1") {
        sessionStorage.removeItem("bypassMapHackRedirect");
        return;
      }
      setLocation("/map-hack");
    }
  }, [user, isLoading, location, setLocation]);
  return null;
}

function Router() {
  usePageViewTracking();
  return (
    <>
      <MapHackRedirect />
      <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={Landing} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/home" component={Home} />
      <Route path="/spot/:id" component={SpotDetail} />
      <Route path="/sale/:id" component={SaleDetail} />
      <Route path="/select-category" component={SelectCategory} />
      <Route path="/add-spot" component={AddSpot} />
      <Route path="/edit-spot/:id" component={EditSpot} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/my-bookings" component={MyBookings} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/payment/:bookingId" component={Payment} />
      <Route path="/add-sale" component={AddSale} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/checkout/cancel" component={CheckoutCancel} />
      <Route path="/admin" component={Admin} />
      <Route path="/map-hack">
        <Suspense fallback={null}>
          <MapHackNS />
        </Suspense>
      </Route>
      <Route path="/map-hack/subscribe">
        <Suspense fallback={null}>
          <MapHackSubscribe />
        </Suspense>
      </Route>
      <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
