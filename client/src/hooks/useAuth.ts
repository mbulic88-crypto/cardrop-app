import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { trackCompleteRegistration } from "@/lib/metaPixel";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const trackedRef = useRef(false);
  useEffect(() => {
    if (user && !trackedRef.current) {
      trackedRef.current = true;
      const hasTracked = sessionStorage.getItem('fb_reg_tracked');
      if (!hasTracked) {
        sessionStorage.setItem('fb_reg_tracked', '1');
        trackCompleteRegistration({ content_name: 'CarDrop Registration' });
      }
    }
  }, [user]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
