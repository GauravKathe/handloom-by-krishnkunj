import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { stripHtml } from "@/lib/htmlUtils";

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
      const contentData = { text: content, enabled: isEnabled };
      const { error } = await supabase.functions.invoke('admin-manage-content', { body: { action: 'save-section', payload: { section: 'marquee_banner', content: contentData } } });
      if (error) throw error;

      toast.success("Marquee banner updated successfully!");
    } catch (error) {
      console.error("Error saving marquee content:", error);
      toast.error("Failed to update marquee banner");
    } finally {
      setLoading(false);
    }
  };

  // Strip HTML tags for plain text preview
  const getPlainText = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
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
            <Label className="text-sm font-medium">
              Banner Content
            </Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Enter marquee banner content..."
            />
            <p className="text-xs text-muted-foreground">
              Use the toolbar to format text, add colors, and styling
            </p>
          </div>
          
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm font-medium mb-2">Live Preview:</p>
            {isEnabled ? (
              <div className="bg-primary text-primary-foreground py-2 overflow-hidden rounded">
                <div className="flex animate-marquee">
                  <span className="flex-shrink-0 px-4">
                    {stripHtml(content) || "Your text here..."}
                  </span>
                  <span className="flex-shrink-0 px-4">
                    {stripHtml(content) || "Your text here..."}
                  </span>
                  <span className="flex-shrink-0 px-4">
                    {stripHtml(content) || "Your text here..."}
                  </span>
                  <span className="flex-shrink-0 px-4">
                    {stripHtml(content) || "Your text here..."}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Banner is currently disabled
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Note: The marquee displays plain text only. HTML formatting is stripped for cleaner display.
            </p>
          </div>

          <Button onClick={handleSave} disabled={loading || !getPlainText(content)}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
