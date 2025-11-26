import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function MarqueeBannerAdmin() {
  const [content, setContent] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const { data } = await supabase
        .from("site_content")
        .select("*")
        .eq("section", "marquee_banner")
        .single();

      if (data?.content && typeof data.content === 'object') {
        const contentData = data.content as { text?: string; enabled?: boolean };
        if ('text' in contentData) {
          setContent(contentData.text || "");
        }
        if ('enabled' in contentData) {
          setIsEnabled(contentData.enabled ?? true);
        }
      }
    } catch (error) {
      console.error("Error loading marquee content:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("site_content")
        .select("id")
        .eq("section", "marquee_banner")
        .single();

      const contentData = { text: content, enabled: isEnabled };

      if (existing) {
        await supabase
          .from("site_content")
          .update({ content: contentData, updated_at: new Date().toISOString() })
          .eq("section", "marquee_banner");
      } else {
        await supabase
          .from("site_content")
          .insert({ section: "marquee_banner", content: contentData });
      }

      toast.success("Marquee banner updated successfully!");
    } catch (error) {
      console.error("Error saving marquee content:", error);
      toast.error("Failed to update marquee banner");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Marquee Banner Settings</CardTitle>
          <CardDescription>
            Customize the scrolling text that appears above the navigation bar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="banner-enabled" className="text-base font-medium">
                Display Banner
              </Label>
              <p className="text-sm text-muted-foreground">
                Toggle to show or hide the marquee banner on the website
              </p>
            </div>
            <Switch
              id="banner-enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="marquee-text" className="text-sm font-medium">
              Banner Text
            </label>
            <Input
              id="marquee-text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter marquee banner text..."
              className="w-full"
            />
          </div>
          
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm font-medium mb-2">Preview:</p>
            {isEnabled ? (
              <div className="bg-primary text-primary-foreground py-2 overflow-hidden rounded">
                <div className="flex animate-marquee">
                  <span className="flex-shrink-0 px-4">{content || "Your text here..."}</span>
                  <span className="flex-shrink-0 px-4">{content || "Your text here..."}</span>
                  <span className="flex-shrink-0 px-4">{content || "Your text here..."}</span>
                  <span className="flex-shrink-0 px-4">{content || "Your text here..."}</span>
                  <span className="flex-shrink-0 px-4">{content || "Your text here..."}</span>
                  <span className="flex-shrink-0 px-4">{content || "Your text here..."}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Banner is currently disabled
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={loading || !content}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
