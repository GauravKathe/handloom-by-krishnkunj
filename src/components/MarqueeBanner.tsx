import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const MarqueeBanner = () => {
  const [content, setContent] = useState<string>("Welcome to our store! Free shipping on orders over ₹2000");

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

  if (!content) return null;

  return (
    <div className="bg-primary text-primary-foreground py-2 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap">
        <span className="mx-4">{content}</span>
        <span className="mx-4">{content}</span>
        <span className="mx-4">{content}</span>
        <span className="mx-4">{content}</span>
      </div>
    </div>
  );
};
