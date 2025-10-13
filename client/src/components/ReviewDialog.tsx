import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ReviewDialogProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  spotTitle: string;
}

export default function ReviewDialog({
  open,
  onClose,
  bookingId,
  spotTitle,
}: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createReviewMutation = useMutation({
    mutationFn: async (data: { bookingId: string; rating: number; comment: string }) => {
      return await apiRequest("POST", "/api/reviews", data);
    },
    onSuccess: () => {
      toast({
        title: "Uspešno!",
        description: "Vaša recenzija je uspešno poslata.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/booking", bookingId] });
      onClose();
      // Reset form
      setRating(0);
      setComment("");
    },
    onError: (error: any) => {
      toast({
        title: "Greška",
        description: error.message || "Nije moguće poslati recenziju. Pokušajte ponovo.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast({
        title: "Upozorenje",
        description: "Molimo vas da odaberete ocenu.",
        variant: "destructive",
      });
      return;
    }

    if (comment.length < 10) {
      toast({
        title: "Upozorenje",
        description: "Komentar mora imati najmanje 10 karaktera.",
        variant: "destructive",
      });
      return;
    }

    if (comment.length > 1000) {
      toast({
        title: "Upozorenje",
        description: "Komentar može imati maksimalno 1000 karaktera.",
        variant: "destructive",
      });
      return;
    }

    createReviewMutation.mutate({
      bookingId,
      rating,
      comment,
    });
  };

  const handleClose = () => {
    if (!createReviewMutation.isPending) {
      setRating(0);
      setComment("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ocenite Vaše Iskustvo</DialogTitle>
          <DialogDescription>
            Kako biste ocenili parking mesto "{spotTitle}"?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                  data-testid={`star-${star}`}
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {rating === 1 && "Veoma loše"}
                {rating === 2 && "Loše"}
                {rating === 3 && "Okej"}
                {rating === 4 && "Dobro"}
                {rating === 5 && "Odlično"}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-medium">
              Vaš Komentar
            </label>
            <Textarea
              id="comment"
              placeholder="Opišite vaše iskustvo sa parking mestom... (najmanje 10 karaktera)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              maxLength={1000}
              data-testid="textarea-review-comment"
              className="resize-none"
            />
            <p className={`text-xs text-right ${comment.length > 1000 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {comment.length} / 1000 karaktera
              {comment.length > 1000 && " (Preveliko!)"}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createReviewMutation.isPending}
            data-testid="button-cancel-review"
          >
            Odustani
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createReviewMutation.isPending}
            data-testid="button-submit-review"
          >
            {createReviewMutation.isPending ? "Slanje..." : "Pošalji Recenziju"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
