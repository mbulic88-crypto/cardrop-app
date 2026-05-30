import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { useLocation } from "wouter";

interface LoginRequiredDialogProps {
  open: boolean;
  onClose: () => void;
  message?: string;
  redirectPath?: string;
}

export default function LoginRequiredDialog({
  open,
  onClose,
  message = "Za ovu akciju potrebna je prijava na nalog.",
  redirectPath = "/map-hack",
}: LoginRequiredDialogProps) {
  const [, setLocation] = useLocation();

  const handleLogin = () => {
    if (redirectPath) {
      localStorage.setItem("cardrop-returnTo", redirectPath);
    }
    onClose();
    setLocation("/auth");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-login-required">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <img src={parkInLogo} alt="CarDrop" className="w-12 h-12 rounded-lg" />
            <DialogTitle className="text-2xl">CarDrop</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            {message}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20">
            <ShieldCheck className="w-5 h-5 text-accent mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-1">Sigurna Prijava</h4>
              <p className="text-sm text-muted-foreground">
                Prijavite se putem email-a i lozinke ili Google naloga. Vaši podaci su zaštićeni.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-cancel-login"
          >
            Nazad
          </Button>
          <Button
            onClick={handleLogin}
            className="bg-accent hover:bg-accent/90"
            data-testid="button-proceed-login"
          >
            Prijavite se
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
