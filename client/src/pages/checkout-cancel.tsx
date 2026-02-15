import { useEffect } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

export default function CheckoutCancel() {
  const urlParams = new URLSearchParams(window.location.search);
  const spotId = urlParams.get('spot_id');

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (spotId) {
        return await apiRequest("POST", "/api/stripe/cancel-spot", { spotId });
      }
    },
  });

  useEffect(() => {
    if (spotId) {
      cancelMutation.mutate();
    }
  }, [spotId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="mb-4">
          <img src={parkInLogo} alt="CarDrop" className="w-12 h-12 rounded-lg mx-auto mb-4" />
        </div>
        <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Plaćanje otkazano</h2>
        <p className="text-muted-foreground mb-6">
          Vaše plaćanje je otkazano. Oglas nije kreiran. Možete ponovo pokušati.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/select-category">
            <Button className="w-full" data-testid="button-try-again">
              Pokušaj ponovo
            </Button>
          </Link>
          <Link href="/home">
            <Button variant="outline" className="w-full" data-testid="button-go-home">
              Nazad na početnu
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
