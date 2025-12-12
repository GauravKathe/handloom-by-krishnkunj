import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const ConsentManager = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('userConsent');
    if (!consent) {
      // Small delay for better UX entrance
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = () => {
    setIsVisible(false);
    localStorage.setItem('userConsent', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed bottom-4 right-4 left-4 md:left-auto md:w-[400px] z-[100]",
      "bg-white/80 dark:bg-black/80 backdrop-blur-lg border border-border",
      "p-6 rounded-2xl shadow-2xl",
      "animate-in slide-in-from-bottom-10 fade-in duration-500"
    )}>
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex p-3 bg-primary/10 rounded-full shrink-0">
          <Cookie className="h-6 w-6 text-primary" />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-lg">We value your privacy</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-muted-foreground hover:text-foreground transition-colors sm:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            We use cookies to improve your experience. By using our site, you agree to our
            <Link to="/privacy" className="text-primary hover:underline underline-offset-4 ml-1">
              Privacy Policy
            </Link>.
          </p>

          <div className="flex gap-3 pt-1">
            <Button onClick={handleConsent} className="w-full font-medium shadow-md transition-all hover:scale-[1.02]">
              Accept
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsVisible(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentManager;