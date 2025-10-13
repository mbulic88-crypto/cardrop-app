import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";
import { Link } from "wouter";

interface TermsAcceptanceDialogProps {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

export default function TermsAcceptanceDialog({
  open,
  onAccept,
  onCancel,
}: TermsAcceptanceDialogProps) {
  const [accepted, setAccepted] = useState(false);

  // Reset checkbox when dialog opens
  useEffect(() => {
    if (open) {
      setAccepted(false);
    }
  }, [open]);

  const handleAccept = () => {
    if (accepted) {
      localStorage.setItem("parkshare_terms_accepted", "true");
      onAccept();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            Prihvatanje Uslova Korišćenja
          </DialogTitle>
          <DialogDescription className="text-base">
            Pre korišćenja ParkShare platforme, molimo vas da pažljivo pročitate i prihvatite naše uslove.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Key Disclaimer */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Važno Obaveštenje
            </h4>
            <p className="text-sm text-foreground/80">
              <strong>ParkShare i vlasnik sajta nisu odgovorni</strong> za bilo kakve probleme između 
              vlasnika parking mesta i iznajmljivača, uključujući:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-foreground/80 list-disc list-inside ml-2">
              <li>Vlasnik nije obezbedio mesto na vreme ili kako treba</li>
              <li>Netačne informacije o parking mestu</li>
              <li>Bilo kakva šteta na vozilu ili imovini</li>
              <li>Problemi sa pristupom ili kvalitetom mesta</li>
            </ul>
            <p className="mt-2 text-sm text-foreground/80">
              Sve transakcije i dogovori su direktno između vlasnika i iznajmljivača.
            </p>
          </div>

          {/* Additional Terms */}
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Odgovornost Korisnika</h4>
              <p>
                Odgovorni ste za tačnost svih informacija, poštovanje dogovorenih termina, 
                direktnu komunikaciju sa drugom stranom, i poštovanje lokalnih zakona.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-1">Plaćanja</h4>
              <p>
                Sva plaćanja se obrađuju putem Monri platnog sistema. ParkShare zadržava pravo provizije. 
                Politike povraćaja novca određuju vlasnik i iznajmljivač direktno.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-1">Sistem Ocenjivanja</h4>
              <p>
                Možete ocenjivati i ostavljati recenzije nakon transakcije. 
                Recenzije moraju biti istinite i konstruktivne.
              </p>
            </div>
          </div>

          {/* Full Terms Link */}
          <div className="pt-2 border-t">
            <Link href="/terms">
              <Button variant="ghost" className="p-0 h-auto text-primary" data-testid="link-full-terms">
                Pročitajte potpune Uslove Korišćenja →
              </Button>
            </Link>
          </div>

          {/* Acceptance Checkbox */}
          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="accept-terms"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
              data-testid="checkbox-accept-terms"
            />
            <label
              htmlFor="accept-terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Pročitao/la sam i prihvatam Uslove Korišćenja, uključujući odricanje odgovornosti 
              ParkShare platforme za probleme između vlasnika i iznajmljivača.
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-terms">
            Odustani
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!accepted}
            data-testid="button-accept-terms"
          >
            Prihvatam i Nastavi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
