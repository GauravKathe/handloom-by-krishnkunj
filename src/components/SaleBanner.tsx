import { X } from "lucide-react";
import { useState } from "react";

export const SaleBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative bg-primary text-primary-foreground overflow-hidden">
      <div className="py-2 px-4 flex items-center justify-center gap-4 md:gap-8 flex-wrap">
        <span className="inline-flex items-center gap-2 text-sm md:text-base font-semibold">
          ✨ SPECIAL OFFER - Get Extra 10% off on Prepaid Orders | Use Code: <span className="bg-primary-foreground text-primary px-2 py-0.5 rounded">PREPAID10</span>
        </span>
        <span className="inline-flex items-center gap-2 text-sm md:text-base font-semibold">
          📞 For Wholesale Orders, Contact: <span className="bg-primary-foreground text-primary px-2 py-0.5 rounded">+91 8657218488</span>
        </span>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-primary-foreground/20 rounded-full transition-colors"
        aria-label="Close banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
