import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MarqueeBanner = () => {
  const [content, setContent] = useState<string>("Welcome to our store! Free shipping on orders over ₹2000");
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const closed = localStorage.getItem("marquee-banner-closed");
    if (closed === "true") {
      setIsVisible(false);
    }
  }, []);

  useEffect(() => {
    loadContent();

    // Set up realtime listener
    const channel = supabase
      .channel('marquee-banner-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_content',
          filter: 'section=eq.marquee_banner'
        },
        () => {
          loadContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadContent = async () => {
    const { data } = await supabase
      .from("site_content")
      .select("*")
      .eq("section", "marquee_banner")
      .single();

    if (data?.content && typeof data.content === 'object' && 'text' in data.content) {
      setContent((data.content as { text: string }).text);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("marquee-banner-closed", "true");
  };

  if (!content || !isVisible) return null;

  return (
    <div className="bg-primary text-primary-foreground py-2 overflow-hidden relative">
      <div className="flex animate-marquee">
        <span className="flex-shrink-0 px-4">{content}</span>
        <span className="flex-shrink-0 px-4">{content}</span>
        <span className="flex-shrink-0 px-4">{content}</span>
        <span className="flex-shrink-0 px-4">{content}</span>
        <span className="flex-shrink-0 px-4">{content}</span>
        <span className="flex-shrink-0 px-4">{content}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClose}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-primary-foreground/20 text-primary-foreground"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
