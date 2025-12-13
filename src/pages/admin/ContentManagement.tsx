import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeAdminFunction } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Plus, Pencil, Eye, EyeOff, Crop } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ImageCropper } from "@/components/ImageCropper";
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
import type { Category } from '@/types';

interface BannerSlide {
  image: string;
  title: string;
  subtitle: string;
}

export default function ContentManagement() {
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState(false);
  const { toast } = useToast();

  const [bannerSlides, setBannerSlides] = useState<BannerSlide[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [enableCropping, setEnableCropping] = useState(true);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    image: null as File | null,
  });
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
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
    }
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: false });

    setCategories(data || []);
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

    if (file.size > 10485760) {
      toast({
        title: "File too large",
        description: "Image must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    // If cropping is enabled, open the cropper dialog
    if (enableCropping) {
      setPendingCropFile(file);
      setCropperOpen(true);
      // Reset the input so the same file can be selected again
      e.target.value = '';
      return;
    }

    await processAndUploadBanner(file);
  };

  const processAndUploadBanner = async (fileOrBlob: Blob) => {
    setUploadingImage(true);

    const fileName = `banner-${Date.now()}.jpg`;
    const scanEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-upload`;
    const formData = new FormData();
    formData.append('file', new Blob([fileOrBlob]));
    const getCookie = (name: string) => (document.cookie.split('; ').find(row => row.startsWith(name + '='))?.split('=')[1] || '');
    const scanResponse = await fetch(scanEndpoint, { method: 'POST', body: formData, credentials: 'include', headers: { 'x-csrf-token': getCookie('XSRF-TOKEN') || '' } });
    const scanResult = await scanResponse.json().catch(() => ({}));
    if (!scanResponse.ok || !scanResult.safe) {
      toast({ title: 'Malware detected', description: 'Uploaded image failed malware scan', variant: 'destructive' });
      setUploadingImage(false);
      return;
    }

    const { data, error } = await supabase.storage
      .from("site-content")
      .upload(fileName, fileOrBlob);

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

  const handleCropComplete = async (croppedBlob: Blob, dimensions: { width: number; height: number }) => {
    setPendingCropFile(null);
    toast({
      title: "Image cropped",
      description: `Cropped to ${dimensions.width}×${dimensions.height}px`,
    });
    await processAndUploadBanner(croppedBlob);
  };

  const removeBannerSlide = async (index: number) => {
    const newSlides = bannerSlides.filter((_, i) => i !== index);
    setBannerSlides(newSlides);
    if (previewIndex >= newSlides.length) {
      setPreviewIndex(Math.max(0, newSlides.length - 1));
    }
    await saveBanners(newSlides);
  };

  const saveBanners = async (slides: BannerSlide[]) => {
    // Use server-side admin function with proper CSRF headers
    const { error } = await invokeAdminFunction('admin-manage-content', { action: 'save-banners', payload: { slides } });

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

    const scanEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-upload`;
    const formData = new FormData();
    formData.append('file', newCategory.image as Blob);
    const getCookie = (name: string) => (document.cookie.split('; ').find(row => row.startsWith(name + '='))?.split('=')[1] || '');
    const scanResponse = await fetch(scanEndpoint, { method: 'POST', body: formData, credentials: 'include', headers: { 'x-csrf-token': getCookie('XSRF-TOKEN') || '' } });
    const scanResult = await scanResponse.json().catch(() => ({}));
    if (!scanResponse.ok || !scanResult.safe) {
      toast({ title: "Malware detected", description: 'Uploaded image failed malware scan', variant: 'destructive' });
      setUploadingCategory(false);
      return;
    }

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

    const { error: insertError } = await invokeAdminFunction('admin-manage-content', { action: 'create-category', payload: { name: newCategory.name, description: newCategory.description, image_url: urlData.publicUrl } });

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
    const { error } = await invokeAdminFunction('admin-manage-content', { action: 'delete-category', payload: { id } });

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

      const scanEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-upload`;
      const formData = new FormData();
      formData.append('file', editingCategory.image as Blob);
      const getCookie = (name: string) => (document.cookie.split('; ').find(row => row.startsWith(name + '='))?.split('=')[1] || '');
      const scanResponse = await fetch(scanEndpoint, { method: 'POST', body: formData, credentials: 'include', headers: { 'x-csrf-token': getCookie('XSRF-TOKEN') || '' } });
      const scanResult = await scanResponse.json().catch(() => ({}));
      if (!scanResponse.ok || !scanResult.safe) {
        toast({ title: "Malware detected", description: 'Uploaded image failed malware scan', variant: 'destructive' });
        setUploadingCategory(false);
        return;
      }

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

    const { error: updateError } = await invokeAdminFunction('admin-manage-content', { action: 'update-category', payload: { id: categoryToEdit.id, name: editingCategory.name, description: editingCategory.description, image_url: imageUrl } });

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
          {/* Banner Slides Display */}
          <div className="space-y-4">
            {bannerSlides.map((slide, idx) => (
              <div key={idx} className="p-4 border rounded-lg">
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
                  <div className="flex-1">
                    <p className="font-medium">Banner {idx + 1}</p>
                    <p className="text-sm text-muted-foreground truncate">{slide.image}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Upload New Banner with Guidelines */}
          <div className="mt-4 space-y-4">
            {/* Crop Tool Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2">
                <Crop className="h-4 w-4 text-orange-700 dark:text-orange-300" />
                <div>
                  <Label htmlFor="crop-toggle" className="font-semibold text-orange-900 dark:text-orange-100">Crop Before Upload</Label>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-0.5">
                    Crop images to exact 1280×720px dimensions before uploading
                  </p>
                </div>
              </div>
              <Switch
                id="crop-toggle"
                checked={enableCropping}
                onCheckedChange={setEnableCropping}
              />
            </div>

            {/* Dimension Guidelines */}
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📐 Recommended Banner Dimensions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-blue-800 dark:text-blue-200">Optimal Size:</p>
                  <p className="text-blue-700 dark:text-blue-300">1280 × 720 pixels (16:9 ratio)</p>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-blue-800 dark:text-blue-200">Requirements:</p>
                  <ul className="text-blue-700 dark:text-blue-300 space-y-0.5">
                    <li>• Format: JPG, PNG, or WEBP</li>
                    <li>• Max file size: 10MB</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 <strong>Tip:</strong> Keep important content centered as edges may be cropped on mobile.
                </p>
              </div>
            </div>

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
                <div className="border rounded-lg overflow-hidden">
                  <div className="relative w-full flex justify-center">
                    <img 
                      src={bannerSlides[previewIndex].image} 
                      alt="Banner preview"
                      className="w-full h-auto max-h-[50vh] object-contain"
                    />
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

      {/* Image Cropper Dialog */}
      <ImageCropper
        open={cropperOpen}
        onClose={() => {
          setCropperOpen(false);
          setPendingCropFile(null);
        }}
        imageFile={pendingCropFile}
        onCropComplete={handleCropComplete}
        aspectRatio={16 / 9}
        targetWidth={1280}
        targetHeight={720}
      />
    </div>
  );
}
