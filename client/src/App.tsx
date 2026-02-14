import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/terms" component={Terms} />
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
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
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
