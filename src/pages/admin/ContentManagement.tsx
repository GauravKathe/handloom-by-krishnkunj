import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Eye } from "lucide-react";

interface SiteContent {
  section: string;
  content: any;
}

export default function ContentManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const { toast } = useToast();

  const [heroContent, setHeroContent] = useState({
    title: "",
    subtitle: "",
    description: "",
    bannerImages: [] as string[],
  });

  const [aboutContent, setAboutContent] = useState({
    title: "",
    content: "",
  });

  const [contactContent, setContactContent] = useState({
    phone: "",
    email: "",
    address: "",
    description: "",
  });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("site_content")
      .select("*")
      .in("section", ["homepage_hero", "about_us", "contact"]);

    if (error) {
      toast({
        title: "Error loading content",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      data.forEach((item) => {
        if (item.section === "homepage_hero") {
          setHeroContent(item.content as any);
        } else if (item.section === "about_us") {
          setAboutContent(item.content as any);
        } else if (item.section === "contact") {
          setContactContent(item.content as any);
        }
      });
    }

    setLoading(false);
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    section: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG or PNG image",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5242880) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(section);

    const fileExt = file.name.split(".").pop();
    const fileName = `${section}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("site-content")
      .upload(fileName, file);

    if (error) {
      toast({
        title: "Error uploading image",
        description: error.message,
        variant: "destructive",
      });
      setUploadingImage(null);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("site-content")
      .getPublicUrl(data.path);

    if (section === "hero-banner") {
      setHeroContent({
        ...heroContent,
        bannerImages: [...(heroContent.bannerImages || []), urlData.publicUrl],
      });
    }

    setUploadingImage(null);
    toast({ title: "Image uploaded successfully" });
  };

  const removeBannerImage = (index: number) => {
    const newImages = heroContent.bannerImages.filter((_, i) => i !== index);
    setHeroContent({ ...heroContent, bannerImages: newImages });
  };

  const saveContent = async (section: string, content: any) => {
    setSaving(true);

    const { error } = await supabase
      .from("site_content")
      .upsert(
        { section, content },
        { onConflict: 'section' }
      );

    if (error) {
      toast({
        title: "Error saving content",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Content saved successfully" });
    }

    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Content Management</h1>

      {/* Homepage Hero Section */}
      <Card>
        <CardHeader>
          <CardTitle>Homepage Hero Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="hero-title">Title</Label>
            <Input
              id="hero-title"
              value={heroContent.title}
              onChange={(e) => setHeroContent({ ...heroContent, title: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="hero-subtitle">Subtitle</Label>
            <Input
              id="hero-subtitle"
              value={heroContent.subtitle}
              onChange={(e) => setHeroContent({ ...heroContent, subtitle: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="hero-description">Description</Label>
            <Textarea
              id="hero-description"
              value={heroContent.description}
              onChange={(e) => setHeroContent({ ...heroContent, description: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <Label>Banner Images</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              {heroContent.bannerImages?.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={img}
                    alt={`Banner ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                    onClick={() => removeBannerImage(idx)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Label htmlFor="hero-banner" className="cursor-pointer">
                <div className="flex items-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-accent">
                  <Upload className="h-5 w-5" />
                  <span>{uploadingImage === "hero-banner" ? "Uploading..." : "Upload Banner Image"}</span>
                </div>
                <Input
                  id="hero-banner"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, "hero-banner")}
                  disabled={uploadingImage === "hero-banner"}
                />
              </Label>
            </div>
          </div>
          <Button onClick={() => saveContent("homepage_hero", heroContent)} disabled={saving}>
            Save Homepage Content
          </Button>
        </CardContent>
      </Card>

      {/* About Us Section */}
      <Card>
        <CardHeader>
          <CardTitle>About Us Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="about-title">Title</Label>
            <Input
              id="about-title"
              value={aboutContent.title}
              onChange={(e) => setAboutContent({ ...aboutContent, title: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="about-content">Content</Label>
            <Textarea
              id="about-content"
              value={aboutContent.content}
              onChange={(e) => setAboutContent({ ...aboutContent, content: e.target.value })}
              rows={8}
            />
          </div>
          <Button onClick={() => saveContent("about_us", aboutContent)} disabled={saving}>
            Save About Content
          </Button>
        </CardContent>
      </Card>

      {/* Contact Section */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                value={contactContent.phone}
                onChange={(e) => setContactContent({ ...contactContent, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={contactContent.email}
                onChange={(e) => setContactContent({ ...contactContent, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="contact-address">Address</Label>
            <Input
              id="contact-address"
              value={contactContent.address}
              onChange={(e) => setContactContent({ ...contactContent, address: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="contact-description">Description</Label>
            <Textarea
              id="contact-description"
              value={contactContent.description}
              onChange={(e) =>
                setContactContent({ ...contactContent, description: e.target.value })
              }
              rows={4}
            />
          </div>
          <Button onClick={() => saveContent("contact", contactContent)} disabled={saving}>
            Save Contact Content
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
