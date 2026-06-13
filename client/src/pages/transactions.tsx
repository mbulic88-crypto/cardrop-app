import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, Calendar, MapPin, Download, CreditCard, Home as HomeIcon, Globe } from "lucide-react";
import type { Booking, ParkingSpot } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { sr, enUS } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { useLanguage } from "@/hooks/useLanguage";

const trs = {
  sr: {
    loginRequired: "Za pregled transakcija potrebna je prijava na nalog.",
    home: "Početna",
    paid: "Plaćeno",
    refunded: "Refundirano",
    transactionDate: "Datum Transakcije",
    parkingTime: "Parking Vreme",
    amount: "Iznos",
    totalPaid: "Ukupno Plaćeno",
    transactionCount: "Broj Transakcija",
    refundedTotal: "Refundirano",
    allTransactions: "Sve Transakcije",
    loading: "Učitavanje...",
    noTransactions: "Nema Transakcija",
    noTransactionsDesc: "Vaše plaćene transakcije će se pojaviti ovde",
  },
  en: {
    loginRequired: "Login is required to view transactions.",
    home: "Home",
    paid: "Paid",
    refunded: "Refunded",
    transactionDate: "Transaction Date",
    parkingTime: "Parking Time",
    amount: "Amount",
    totalPaid: "Total Paid",
    transactionCount: "Transactions",
    refundedTotal: "Refunded",
    allTransactions: "All Transactions",
    loading: "Loading...",
    noTransactions: "No Transactions",
    noTransactionsDesc: "Your paid transactions will appear here",
  },
};

export default function Transactions() {
  const { language } = useLanguage();
  const t = trs[language === "sr" ? "sr" : "en"];
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setShowLoginDialog(true);
    }
  }, [isAuthenticated, authLoading]);

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: isAuthenticated,
  });

  // Filter for paid transactions only
  const paidTransactions = bookings.filter(
    (b) => b.paymentStatus === "paid" || b.paymentStatus === "refunded"
  );

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-accent">{t.paid}</Badge>;
      case "refunded":
        return <Badge variant="secondary">{t.refunded}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const TransactionRow = ({ booking }: { booking: Booking }) => {
    const { data: spot } = useQuery<ParkingSpot>({
      queryKey: ["/api/parking-spots", booking.spotId],
    });

    return (
      <div 
        className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border-b border-card-border hover-elevate transition-colors"
        data-testid={`transaction-${booking.id}`}
      >
        <div className="md:col-span-2">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {spot?.imageUrls && spot.imageUrls.length > 0 ? (
                <img
                  src={spot.imageUrls[0]}
                  alt={spot.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm mb-1 text-card-foreground truncate">
                {spot?.title || t.loading}
              </h4>
              <p className="text-xs text-muted-foreground truncate">{spot?.address}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <div>
            <p className="text-sm text-muted-foreground">{t.transactionDate}</p>
            <p className="text-sm font-medium text-card-foreground">
              {format(new Date(booking.createdAt || booking.startTime), "dd MMM yyyy", { locale: language === "sr" ? sr : enUS })}
            </p>
          </div>
        </div>

        <div className="flex items-center">
          <div>
            <p className="text-sm text-muted-foreground">{t.parkingTime}</p>
            <p className="text-sm font-medium text-card-foreground">
              {format(new Date(booking.startTime), "HH:mm")} - {format(new Date(booking.endTime), "HH:mm")}
            </p>
          </div>
        </div>

        <div className="flex items-center">
          <div>
            <p className="text-sm text-muted-foreground">{t.amount}</p>
            <p className="text-lg font-bold text-accent">
              {booking.totalPrice} {booking.currency}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-2">
          {getPaymentStatusBadge(booking.paymentStatus)}
        </div>
      </div>
    );
  };

  // Calculate total spent
  const totalSpent = paidTransactions
    .filter((b) => b.paymentStatus === "paid")
    .reduce((sum, b) => sum + parseFloat(b.totalPrice), 0);

  const totalRefunded = paidTransactions
    .filter((b) => b.paymentStatus === "refunded")
    .reduce((sum, b) => sum + parseFloat(b.totalPrice), 0);

  return (
    <>
      <LoginRequiredDialog
        open={showLoginDialog}
        onClose={() => {
          setShowLoginDialog(false);
          setLocation("/");
        }}
        message={t.loginRequired}
        redirectPath="/transactions"
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
        <div className="max-w-7xl mx-auto px-1 xs:px-2 sm:px-4 py-2.5 xs:py-3 sm:py-4">
          <div className="flex items-center justify-between gap-1 xs:gap-2">
            <Link href="/map-hack" className="flex items-center gap-1.5 xs:gap-2">
              <img src={parkInLogo} alt="CarDrop" className="w-7 xs:w-8 h-7 xs:h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground hidden sm:inline">CarDrop</span>
            </Link>

            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
              <Link href="/map-hack">
                <Button variant="outline" size="icon" className="h-8 w-8 xs:h-9 xs:w-9 sm:w-auto sm:px-3" data-testid="button-home">
                  <HomeIcon className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t.home}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.totalPaid}</p>
                <p className="text-2xl font-bold text-accent" data-testid="total-paid">{totalSpent.toFixed(2)} RSD</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.transactionCount}</p>
                <p className="text-2xl font-bold text-card-foreground" data-testid="total-count">{paidTransactions.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.refundedTotal}</p>
                <p className="text-2xl font-bold text-muted-foreground" data-testid="total-refunded">{totalRefunded.toFixed(2)} RSD</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <div className="p-6 border-b border-card-border">
            <h2 className="text-lg font-semibold text-card-foreground">{t.allTransactions}</h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">{t.loading}</p>
            </div>
          ) : paidTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                {t.noTransactions}
              </h3>
              <p className="text-muted-foreground">
                {t.noTransactionsDesc}
              </p>
            </div>
          ) : (
            <div>
              {paidTransactions.map((booking) => (
                <TransactionRow key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
    </>
  );
}
