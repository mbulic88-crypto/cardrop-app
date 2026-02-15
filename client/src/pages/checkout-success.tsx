import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Home, Eye } from "lucide-react";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const [verified, setVerified] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  const spotIdParam = urlParams.get('spot_id');
  const listingIdParam = urlParams.get('listing_id');
  const isSale = !!listingIdParam;

  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (isSale) {
        return await apiRequest("POST", "/api/stripe/verify-sale-payment", {
          sessionId,
          listingId: listingIdParam,
        });
      } else {
        return await apiRequest("POST", "/api/stripe/verify-payment", {
          sessionId,
          spotId: spotIdParam,
        });
      }
    },
    onSuccess: (data) => {
      setVerified(true);
      if (isSale) {
        setResultId(data.listing?.id || listingIdParam);
        queryClient.invalidateQueries({ queryKey: ["/api/sales-listings"] });
      } else {
        setResultId(data.spot?.id || spotIdParam);
        queryClient.invalidateQueries({ queryKey: ["/api/parking-spots/my-spots"] });
        queryClient.invalidateQueries({ queryKey: ["/api/parking-spots"] });
      }
    },
  });

  useEffect(() => {
    if (sessionId && (spotIdParam || listingIdParam) && !verified) {
      verifyMutation.mutate();
    }
  }, [sessionId, spotIdParam, listingIdParam]);

  if (verifyMutation.isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Verifikacija plaćanja...</h2>
          <p className="text-muted-foreground">Molimo sačekajte dok proveravamo vaše plaćanje.</p>
        </Card>
      </div>
    );
  }

  if (verifyMutation.isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Greška pri verifikaciji</h2>
          <p className="text-muted-foreground mb-4">Došlo je do greške pri verifikaciji plaćanja. Kontaktirajte podršku.</p>
          <Link href="/home">
            <Button data-testid="button-go-home">Nazad na početnu</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="mb-4">
          <img src={parkInLogo} alt="CarDrop" className="w-12 h-12 rounded-lg mx-auto mb-4" />
        </div>
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {isSale ? "Uspešno ste dodali oglas za prodaju!" : "Uspešno ste dodali parking!"}
        </h2>
        <p className="text-muted-foreground mb-6">
          {isSale
            ? "Vaš oglas za prodaju je sada aktivan."
            : "Vaš parking oglas je sada aktivan i vidljiv svima."}
        </p>
        <div className="flex flex-col gap-3">
          {resultId && (
            <Link href={isSale ? `/sale/${resultId}` : `/spot/${resultId}`}>
              <Button className="w-full" data-testid="button-view-listing">
                <Eye className="w-4 h-4 mr-2" />
                {isSale ? "Pogledaj oglas" : "Pogledaj parking"}
              </Button>
            </Link>
          )}
          <Link href="/home">
            <Button variant="outline" className="w-full" data-testid="button-go-home">
              <Home className="w-4 h-4 mr-2" />
              Početna stranica
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
