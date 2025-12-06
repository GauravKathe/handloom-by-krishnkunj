import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Plus, Pencil, Eye, EyeOff, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Json } from "@/integrations/supabase/types";

interface BannerSlide {
  image: string;
  title: string;
  subtitle: string;
}

export default function ContentManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState(false);
  const [imageSizeWarning, setImageSizeWarning] = useState<string | null>(null);
  const { toast } = useToast();

  const [bannerSlides, setBannerSlides] = useState<BannerSlide[]>([]);
  const [showTextOverlay, setShowTextOverlay] = useState(true);
  const [bannerBgColor, setBannerBgColor] = useState("#f5f0e8");
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoOptimize, setAutoOptimize] = useState(true);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    image: null as File | null,
  });
  const [categoryToDelete, setCategoryToDelete] = useState<any | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<any | null>(null);
  const [editingCategory, setEditingCategory] = useState({
    name: "",
    description: "",
    image: null as File | null,
  });

  useEffect(() => {
    loadContent();
    
    const channel = supabase
      .channel('content-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        () => {
          loadCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadContent = async () => {
    setLoading(true);
    await Promise.all([loadBanners(), loadCategories()]);
    setLoading(false);
  };

  const loadBanners = async () => {
    const { data } = await supabase
      .from("site_content")
      .select("*")
      .eq("section", "homepage_hero")
      .single();

    if (data?.content && typeof data.content === 'object') {
      const content = data.content as { 
        bannerImages?: string[]; 
        bannerSlides?: BannerSlide[];
        showTextOverlay?: boolean;
        bannerBgColor?: string;
      };
      
      if (content.bannerSlides) {
        setBannerSlides(content.bannerSlides);
      } else if (content.bannerImages) {
        const defaultTitles = ["Elegance Woven With Love", "Where Tradition Meets Soul", "Heritage in Every Thread"];
        const defaultSubtitles = ["Discover the art of traditional handloom sarees", "Premium Paithani sarees crafted by master artisans", "Supporting women artisans across India"];
        const slides = content.bannerImages.map((img, idx) => ({
          image: img,
          title: defaultTitles[idx % defaultTitles.length],
          subtitle: defaultSubtitles[idx % defaultSubtitles.length]
        }));
        setBannerSlides(slides);
      }
      setShowTextOverlay(content.showTextOverlay !== false);
      if (content.bannerBgColor) {
        setBannerBgColor(content.bannerBgColor);
      }
    }
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: false });

    setCategories(data || []);
  };

  const TARGET_WIDTH = 1920;
  const TARGET_HEIGHT = 600;

  const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const validateImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const optimizeImage = async (file: File): Promise<{ blob: Blob; wasOptimized: boolean; originalSize: { width: number; height: number }; newSize: { width: number; height: number } }> => {
    const img = await loadImageFromFile(file);
    const originalWidth = img.naturalWidth;
    const originalHeight = img.naturalHeight;
    
    // Check if optimization is needed
    const needsResize = originalWidth > TARGET_WIDTH || originalHeight > TARGET_HEIGHT * 1.5;
    
    if (!needsResize) {
      URL.revokeObjectURL(img.src);
      return {
        blob: file,
        wasOptimized: false,
        originalSize: { width: originalWidth, height: originalHeight },
        newSize: { width: originalWidth, height: originalHeight }
      };
    }

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = originalWidth;
    let newHeight = originalHeight;
    
    // Scale down to fit within target dimensions
    if (originalWidth > TARGET_WIDTH) {
      const ratio = TARGET_WIDTH / originalWidth;
      newWidth = TARGET_WIDTH;
      newHeight = Math.round(originalHeight * ratio);
    }
    
    // If still too tall, scale down further
    if (newHeight > TARGET_HEIGHT * 1.5) {
      const ratio = (TARGET_HEIGHT * 1.5) / newHeight;
      newHeight = Math.round(TARGET_HEIGHT * 1.5);
      newWidth = Math.round(newWidth * ratio);
    }

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      URL.revokeObjectURL(img.src);
      return {
        blob: file,
        wasOptimized: false,
        originalSize: { width: originalWidth, height: originalHeight },
        newSize: { width: originalWidth, height: originalHeight }
      };
    }

    // Use high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, newWidth, newHeight);
    
    URL.revokeObjectURL(img.src);

    // Convert to blob with good quality
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve({
            blob: blob || file,
            wasOptimized: !!blob,
            originalSize: { width: originalWidth, height: originalHeight },
            newSize: { width: newWidth, height: newHeight }
          });
        },
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        0.9
      );
    });
  };

  const getImageSizeWarning = (width: number, height: number): string | null => {
    const aspectRatio = width / height;
    const warnings: string[] = [];
    
    if (width < 1600) {
      warnings.push(`Width (${width}px) is below recommended 1600-1920px`);
    }
    if (height < 400 || height > 700) {
      warnings.push(`Height (${height}px) is outside recommended 500-600px range`);
    }
    if (aspectRatio < 2.5 || aspectRatio > 4) {
      warnings.push(`Aspect ratio (${aspectRatio.toFixed(1)}:1) is outside recommended 3:1 to 4:1`);
    }
    
    return warnings.length > 0 ? warnings.join('. ') : null;
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WEBP image",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10485760) { // Allow larger files since we'll optimize
      toast({
        title: "File too large",
        description: "Image must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);

    let uploadBlob: Blob = file;
    let finalWidth: number;
    let finalHeight: number;

    // Auto-optimize if enabled
    if (autoOptimize) {
      const result = await optimizeImage(file);
      uploadBlob = result.blob;
      finalWidth = result.newSize.width;
      finalHeight = result.newSize.height;

      if (result.wasOptimized) {
        const savedKB = Math.round((file.size - result.blob.size) / 1024);
        toast({
          title: "Image optimized",
          description: `Resized from ${result.originalSize.width}×${result.originalSize.height} to ${result.newSize.width}×${result.newSize.height}. Saved ${savedKB}KB.`,
        });
      }
    } else {
      // Just validate without optimizing
      const { width, height } = await validateImageDimensions(file);
      finalWidth = width;
      finalHeight = height;
    }

    // Check for warnings on final dimensions
    const warning = getImageSizeWarning(finalWidth, finalHeight);
    setImageSizeWarning(warning);
    
    if (warning && !autoOptimize) {
      toast({
        title: "Image dimension warning",
        description: warning,
        variant: "destructive",
      });
    }

    const fileExt = file.type === 'image/png' ? 'png' : 'jpg';
    const fileName = `banner-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("site-content")
      .upload(fileName, uploadBlob);

    if (error) {
      toast({
        title: "Error uploading image",
        description: error.message,
        variant: "destructive",
      });
      setUploadingImage(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("site-content")
      .getPublicUrl(data.path);

    const newSlide: BannerSlide = {
      image: urlData.publicUrl,
      title: "Your Headline Here",
      subtitle: "Add your subtitle text"
    };
    const newSlides = [...bannerSlides, newSlide];
    setBannerSlides(newSlides);

    await saveBanners(newSlides);
    setUploadingImage(false);
  };

  const removeBannerSlide = async (index: number) => {
    const newSlides = bannerSlides.filter((_, i) => i !== index);
    setBannerSlides(newSlides);
    if (previewIndex >= newSlides.length) {
      setPreviewIndex(Math.max(0, newSlides.length - 1));
    }
    await saveBanners(newSlides);
  };

  const updateSlideText = (index: number, field: 'title' | 'subtitle', value: string) => {
    const newSlides = [...bannerSlides];
    newSlides[index] = { ...newSlides[index], [field]: value };
    setBannerSlides(newSlides);
    setHasUnsavedChanges(true);
  };

  const saveSlideText = async () => {
    setSaving(true);
    await saveBanners(bannerSlides, showTextOverlay, bannerBgColor);
    setHasUnsavedChanges(false);
    setSaving(false);
  };

  const saveBanners = async (slides: BannerSlide[], textOverlay?: boolean, bgColor?: string) => {
    const overlay = textOverlay !== undefined ? textOverlay : showTextOverlay;
    const backgroundColor = bgColor !== undefined ? bgColor : bannerBgColor;
    const contentData = { 
      bannerSlides: slides.map(s => ({ image: s.image, title: s.title, subtitle: s.subtitle })), 
      showTextOverlay: overlay,
      bannerBgColor: backgroundColor
    };
    
    const { data: existing } = await supabase
      .from("site_content")
      .select("id")
      .eq("section", "homepage_hero")
      .single();

    let error;
    if (existing) {
      const result = await supabase
        .from("site_content")
        .update({ content: contentData as Json })
        .eq("section", "homepage_hero");
      error = result.error;
    } else {
      const result = await supabase
        .from("site_content")
        .insert([{ section: "homepage_hero", content: contentData as Json }]);
      error = result.error;
    }

    if (error) {
      toast({
        title: "Error saving banners",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Banners updated successfully" });
    }
  };

  const handleTextOverlayToggle = async (checked: boolean) => {
    setShowTextOverlay(checked);
    await saveBanners(bannerSlides, checked, bannerBgColor);
  };

  const handleBgColorChange = async (color: string) => {
    setBannerBgColor(color);
    setHasUnsavedChanges(true);
  };

  const handleCategoryImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewCategory({ ...newCategory, image: file });
    }
  };

  const addCategory = async () => {
    if (!newCategory.name || !newCategory.image) {
      toast({
        title: "Missing information",
        description: "Please provide category name and image",
        variant: "destructive",
      });
      return;
    }

    setUploadingCategory(true);

    const fileExt = newCategory.image.name.split(".").pop();
    const fileName = `category-${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("site-content")
      .upload(fileName, newCategory.image);

    if (uploadError) {
      toast({
        title: "Error uploading image",
        description: uploadError.message,
        variant: "destructive",
      });
      setUploadingCategory(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("site-content")
      .getPublicUrl(uploadData.path);

    const { error: insertError } = await supabase
      .from("categories")
      .insert({
        name: newCategory.name,
        description: newCategory.description,
        image_url: urlData.publicUrl,
      });

    if (insertError) {
      toast({
        title: "Error creating category",
        description: insertError.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Category created successfully" });
      setNewCategory({ name: "", description: "", image: null });
      loadCategories();
    }

    setUploadingCategory(false);
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error deleting category",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Category deleted successfully" });
      loadCategories();
    }
    setCategoryToDelete(null);
  };

  const openEditDialog = (category: any) => {
    setCategoryToEdit(category);
    setEditingCategory({
      name: category.name,
      description: category.description || "",
      image: null,
    });
  };

  const updateCategory = async () => {
    if (!categoryToEdit || !editingCategory.name) {
      toast({
        title: "Missing information",
        description: "Please provide category name",
        variant: "destructive",
      });
      return;
    }

    setUploadingCategory(true);

    let imageUrl = categoryToEdit.image_url;

    if (editingCategory.image) {
      const fileExt = editingCategory.image.name.split(".").pop();
      const fileName = `category-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("site-content")
        .upload(fileName, editingCategory.image);

      if (uploadError) {
        toast({
          title: "Error uploading image",
          description: uploadError.message,
          variant: "destructive",
        });
        setUploadingCategory(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("site-content")
        .getPublicUrl(uploadData.path);

      imageUrl = urlData.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("categories")
      .update({
        name: editingCategory.name,
        description: editingCategory.description,
        image_url: imageUrl,
      })
      .eq("id", categoryToEdit.id);

    if (updateError) {
      toast({
        title: "Error updating category",
        description: updateError.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Category updated successfully" });
      setCategoryToEdit(null);
      setEditingCategory({ name: "", description: "", image: null });
      loadCategories();
    }

    setUploadingCategory(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content Management</h1>
        <p className="text-muted-foreground">Manage homepage banners and product categories</p>
      </div>

      {/* Homepage Banners */}
      <Card>
        <CardHeader>
          <CardTitle>Homepage Banners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Text Overlay Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <Label htmlFor="text-overlay-toggle" className="font-semibold">Show Text Overlay</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Toggle to show/hide title, subtitle, and button on banner images
              </p>
            </div>
            <Switch
              id="text-overlay-toggle"
              checked={showTextOverlay}
              onCheckedChange={handleTextOverlayToggle}
            />
          </div>

          {/* Background Color Picker */}
          <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
            <div>
              <Label htmlFor="banner-bg-color" className="font-semibold">Banner Background Color</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Fill color for empty space around banner images
              </p>
            </div>
            
            {/* Preset Colors */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">Presets:</span>
              {[
                { name: "Warm Beige", color: "#f5f0e8" },
                { name: "Cream", color: "#fffef5" },
                { name: "White", color: "#ffffff" },
                { name: "Light Gray", color: "#f4f4f5" },
                { name: "Warm Gray", color: "#e7e5e4" },
                { name: "Dark", color: "#1c1917" },
              ].map((preset) => (
                <button
                  key={preset.color}
                  onClick={() => handleBgColorChange(preset.color)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all text-sm ${
                    bannerBgColor === preset.color 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  title={preset.name}
                >
                  <div 
                    className="w-4 h-4 rounded-full border border-border/50"
                    style={{ backgroundColor: preset.color }}
                  />
                  <span className="hidden sm:inline">{preset.name}</span>
                </button>
              ))}
            </div>

            {/* Custom Color Picker */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Custom:</span>
              <div 
                className="w-8 h-8 rounded-lg border-2 border-border shadow-sm"
                style={{ backgroundColor: bannerBgColor }}
              />
              <Input
                id="banner-bg-color"
                type="color"
                value={bannerBgColor}
                onChange={(e) => handleBgColorChange(e.target.value)}
                className="w-14 h-8 p-1 cursor-pointer"
              />
              <span className="text-sm font-mono text-muted-foreground">{bannerBgColor}</span>
            </div>
          </div>

          {/* Banner Slides with Text Editing */}
          <div className="space-y-4">
            {bannerSlides.map((slide, idx) => (
              <div key={idx} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start gap-4">
                  <div className="relative group flex-shrink-0">
                    <img
                      src={slide.image}
                      alt={`Banner ${idx + 1}`}
                      className="w-40 h-24 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeBannerSlide(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label htmlFor={`title-${idx}`} className="text-sm">Title</Label>
                      <Input
                        id={`title-${idx}`}
                        value={slide.title}
                        onChange={(e) => updateSlideText(idx, 'title', e.target.value)}
                        placeholder="Enter banner title"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`subtitle-${idx}`} className="text-sm">Subtitle</Label>
                      <Input
                        id={`subtitle-${idx}`}
                        value={slide.subtitle}
                        onChange={(e) => updateSlideText(idx, 'subtitle', e.target.value)}
                        placeholder="Enter banner subtitle"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save Text Changes Button */}
          {hasUnsavedChanges && (
            <Button onClick={saveSlideText} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Text Changes"}
            </Button>
          )}
          
          {/* Upload New Banner with Guidelines */}
          <div className="mt-4 space-y-4">
            {/* Auto-Optimize Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <div>
                <Label htmlFor="auto-optimize-toggle" className="font-semibold text-green-900 dark:text-green-100">Auto-Optimize Images</Label>
                <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
                  Automatically resize large images to 1920px width for faster loading
                </p>
              </div>
              <Switch
                id="auto-optimize-toggle"
                checked={autoOptimize}
                onCheckedChange={setAutoOptimize}
              />
            </div>

            {/* Dimension Guidelines */}
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📐 Recommended Banner Dimensions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-blue-800 dark:text-blue-200">Optimal Size:</p>
                  <p className="text-blue-700 dark:text-blue-300">1920 × 600 pixels (3.2:1 ratio)</p>
                  <p className="text-blue-600 dark:text-blue-400 text-xs">Alternative: 1600 × 500 pixels</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-blue-800 dark:text-blue-200">Requirements:</p>
                  <ul className="text-blue-700 dark:text-blue-300 space-y-0.5">
                    <li>• Width: 1600-1920px for crisp display</li>
                    <li>• Height: 500-600px for best fit</li>
                    <li>• Format: JPG, PNG, or WEBP</li>
                    <li>• Max file size: 10MB (auto-optimized)</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 <strong>Tip:</strong> Keep important content centered (middle 60%) as edges may be cropped on mobile. Use the background color option above to fill any empty space.
                </p>
              </div>
            </div>

            {/* Image Size Warning */}
            {imageSizeWarning && (
              <div className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Warning:</strong> {imageSizeWarning}
                </p>
              </div>
            )}

            {/* Upload Button */}
            <Label htmlFor="banner-upload" className="cursor-pointer">
              <div className="flex items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg hover:bg-accent transition-colors">
                <Upload className="h-6 w-6" />
                <span className="font-medium">
                  {uploadingImage ? "Uploading..." : "Upload New Banner"}
                </span>
              </div>
              <Input
                id="banner-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleBannerUpload}
                disabled={uploadingImage}
              />
            </Label>
          </div>

          {/* Banner Preview Section */}
          {bannerSlides.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Banner Preview</h3>
                  <span className="text-sm text-muted-foreground">
                    (See how it will appear on homepage)
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Preview
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show Preview
                    </>
                  )}
                </Button>
              </div>

              {showPreview && bannerSlides[previewIndex] && (
                <div className="border rounded-lg overflow-hidden" style={{ backgroundColor: bannerBgColor }}>
                  <div className="relative w-full flex justify-center">
                    <img 
                      src={bannerSlides[previewIndex].image} 
                      alt="Banner preview"
                      className="w-full h-auto max-h-[50vh] object-contain"
                    />
                    {showTextOverlay && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center md:justify-start">
                          <div className="text-center md:text-left px-4 md:px-16 max-w-3xl">
                            <h2 className="text-xl md:text-4xl font-bold text-background mb-2 drop-shadow-lg">
                              {bannerSlides[previewIndex].title}
                            </h2>
                            <p className="text-sm md:text-lg text-background/90 mb-4 drop-shadow-md">
                              {bannerSlides[previewIndex].subtitle}
                            </p>
                            <Button size="sm" className="shadow-lg pointer-events-none">
                              Explore Collection
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {bannerSlides.length > 1 && (
                    <div className="flex items-center justify-center gap-2 p-3 bg-background/50">
                      {bannerSlides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setPreviewIndex(idx)}
                          className={`h-2 rounded-full transition-all ${
                            previewIndex === idx 
                              ? 'w-6 bg-primary' 
                              : 'w-2 bg-muted-foreground/40 hover:bg-muted-foreground/70'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories Management */}
      <Card>
        <CardHeader>
          <CardTitle>Saree Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-lg space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Category
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  placeholder="e.g., Silk Sarees"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="category-description">Description (Optional)</Label>
                <Input
                  id="category-description"
                  placeholder="Brief description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="category-image">Category Image</Label>
              <Input
                id="category-image"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleCategoryImageSelect}
              />
              {newCategory.image && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {newCategory.image.name}
                </p>
              )}
            </div>
            <Button onClick={addCategory} disabled={uploadingCategory}>
              {uploadingCategory ? "Creating..." : "Create Category"}
            </Button>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Existing Categories ({categories.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto pr-2">
              {categories.map((category) => (
                <Card key={category.id} className="flex flex-col">
                  <CardContent className="p-4 flex flex-col h-full">
                    <img
                      src={category.image_url || "/placeholder.svg"}
                      alt={category.name}
                      className="w-full h-40 object-cover rounded-lg mb-3"
                    />
                    <h4 className="font-semibold mb-1 line-clamp-2">{category.name}</h4>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-grow">{category.description}</p>
                    )}
                    <div className="flex gap-2 mt-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditDialog(category)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => setCategoryToDelete(category)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Are you sure you want to delete this category? This action cannot be undone.</p>
              {categoryToDelete && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-start gap-3">
                    <img
                      src={categoryToDelete.image_url || "/placeholder.svg"}
                      alt={categoryToDelete.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{categoryToDelete.name}</p>
                      {categoryToDelete.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {categoryToDelete.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => categoryToDelete && deleteCategory(categoryToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Category Dialog */}
      <AlertDialog open={!!categoryToEdit} onOpenChange={() => setCategoryToEdit(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Category</AlertDialogTitle>
            <AlertDialogDescription>
              Update category information and image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-category-name">Category Name</Label>
                <Input
                  id="edit-category-name"
                  placeholder="e.g., Silk Sarees"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-category-description">Description</Label>
                <Input
                  id="edit-category-description"
                  placeholder="Brief description"
                  value={editingCategory.description}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-category-image">Category Image (Optional)</Label>
              <Input
                id="edit-category-image"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setEditingCategory({ ...editingCategory, image: file });
                  }
                }}
              />
              {editingCategory.image && (
                <p className="text-sm text-muted-foreground mt-1">
                  New image selected: {editingCategory.image.name}
                </p>
              )}
            </div>
            {categoryToEdit && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-2">Current Image:</p>
                <img
                  src={categoryToEdit.image_url || "/placeholder.svg"}
                  alt={categoryToEdit.name}
                  className="w-32 h-32 object-cover rounded"
                />
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={uploadingCategory}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={updateCategory}
              disabled={uploadingCategory}
            >
              {uploadingCategory ? "Updating..." : "Update Category"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
