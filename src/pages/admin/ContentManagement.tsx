import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Plus } from "lucide-react";
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

export default function ContentManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [uploadingCategory, setUploadingCategory] = useState<boolean>(false);
  const { toast } = useToast();

  const [bannerImages, setBannerImages] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    image: null as File | null,
  });
  const [categoryToDelete, setCategoryToDelete] = useState<any | null>(null);

  useEffect(() => {
    loadContent();
    
    // Set up realtime listener for categories
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

    if (data?.content && typeof data.content === 'object' && 'bannerImages' in data.content) {
      const content = data.content as { bannerImages: string[] };
      setBannerImages(content.bannerImages || []);
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

    if (file.size > 5242880) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `banner-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("site-content")
      .upload(fileName, file);

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

    const newBanners = [...bannerImages, urlData.publicUrl];
    setBannerImages(newBanners);

    await saveBanners(newBanners);
    setUploadingImage(false);
  };

  const removeBannerImage = async (index: number) => {
    const newBanners = bannerImages.filter((_, i) => i !== index);
    setBannerImages(newBanners);
    await saveBanners(newBanners);
  };

  const saveBanners = async (images: string[]) => {
    const { error } = await supabase
      .from("site_content")
      .upsert(
        { 
          section: "homepage_hero", 
          content: { bannerImages: images }
        },
        { onConflict: 'section' }
      );

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

    // Upload image
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

    // Create category
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {bannerImages.map((img, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={img}
                  alt={`Banner ${idx + 1}`}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeBannerImage(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          
          <div className="mt-4">
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
            <p className="text-sm text-muted-foreground mt-2">
              Upload banner images for the homepage carousel. Recommended size: 1920x600px
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Categories Management */}
      <Card>
        <CardHeader>
          <CardTitle>Saree Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Category */}
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

          {/* Existing Categories */}
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
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full mt-auto"
                      onClick={() => setCategoryToDelete(category)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
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
                      <p className="text-xs text-muted-foreground mt-2">
                        Created: {new Date(categoryToDelete.created_at).toLocaleDateString()}
                      </p>
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
    </div>
  );
}
