import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, Package, Upload, X, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { stripHtml } from "@/lib/htmlUtils";

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [showDescriptionPreview, setShowDescriptionPreview] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    original_price: "",
    offer_price: "",
    category_id: "",
    fabric: "",
    color: "",
    available: true,
    is_new_arrival: false,
    is_best_seller: false,
    images: [] as string[],
  });

  useEffect(() => {
    loadData();

    // Real-time subscription for product changes
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
        supabase.from("categories").select("*"),
      ]);

      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      toast({ title: "Error loading products", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const productData = {
        ...formData,
        original_price: parseFloat(formData.original_price),
        offer_price: formData.offer_price ? parseFloat(formData.offer_price) : null,
        price: formData.offer_price ? parseFloat(formData.offer_price) : parseFloat(formData.original_price),
      };

      if (editingProduct) {
        await supabase.from("products").update(productData).eq("id", editingProduct.id);
        toast({ title: "Product updated successfully" });
      } else {
        await supabase.from("products").insert(productData);
        toast({ title: "Product created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast({ title: "Error saving product", variant: "destructive" });
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      original_price: product.original_price?.toString() || product.price?.toString() || "",
      offer_price: product.offer_price?.toString() || "",
      category_id: product.category_id || "",
      fabric: product.fabric || "",
      color: product.color || "",
      available: product.available,
      is_new_arrival: product.is_new_arrival,
      is_best_seller: product.is_best_seller,
      images: product.images || [],
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate number of images
    if (formData.images.length + files.length > 4) {
      toast({
        title: "Too many images",
        description: "Maximum 4 images allowed per product",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
          toast({
            title: "Invalid file type",
            description: `File ${file.name} is not a valid image (JPG, JPEG, PNG, or WebP)`,
            variant: "destructive",
          });
          continue;
        }

        // Validate file size (3MB)
        if (file.size > 3145728) {
          toast({
            title: "File too large",
            description: `File ${file.name} must be less than 3MB`,
            variant: "destructive",
          });
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `product-${Date.now()}-${i}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from("product-images")
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(data.path);

        uploadedUrls.push(urlData.publicUrl);
      }

      setFormData({
        ...formData,
        images: [...formData.images, ...uploadedUrls],
      });

      toast({ title: "Images uploaded successfully" });
    } catch (error: any) {
      toast({
        title: "Error uploading images",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  const handleDelete = async (id: string) => {
    try {
      // Check if product is in any orders
      const { data: orderItems, error: checkError } = await supabase
        .from("order_items")
        .select("id")
        .eq("product_id", id)
        .limit(1);

      if (checkError) {
        console.error("Check error:", checkError);
        toast({ 
          title: "Error checking product usage", 
          description: checkError.message,
          variant: "destructive" 
        });
        return;
      }

      if (orderItems && orderItems.length > 0) {
        toast({ 
          title: "Cannot delete product", 
          description: "This product is part of existing orders. Product details are preserved in order history.",
          variant: "destructive" 
        });
        setDeleteDialogOpen(false);
        setProductToDelete(null);
        return;
      }

      const { error } = await supabase.from("products").delete().eq("id", id);
      
      if (error) {
        console.error("Delete error:", error);
        toast({ 
          title: "Error deleting product", 
          description: error.message,
          variant: "destructive" 
        });
        return;
      }

      // Immediately update local state
      setProducts(products.filter(p => p.id !== id));
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      toast({ title: "Product deleted successfully" });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({ 
        title: "Error deleting product", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      // Check which products are in orders
      const { data: orderItems, error: checkError } = await supabase
        .from("order_items")
        .select("product_id")
        .in("product_id", selectedProducts);

      if (checkError) {
        console.error("Check error:", checkError);
        toast({ 
          title: "Error checking products", 
          description: checkError.message,
          variant: "destructive" 
        });
        return;
      }

      const productsInOrders = new Set(orderItems?.map(item => item.product_id) || []);
      const productsToDelete = selectedProducts.filter(id => !productsInOrders.has(id));
      const productsBlocked = selectedProducts.filter(id => productsInOrders.has(id));

      if (productsBlocked.length > 0) {
        const blockedNames = products
          .filter(p => productsBlocked.includes(p.id))
          .map(p => p.name)
          .join(", ");
        
        if (productsToDelete.length === 0) {
          // All products are in orders
          toast({ 
            title: "Cannot delete products", 
            description: `These products are in orders: ${blockedNames}. Product details are preserved in order history.`,
            variant: "destructive" 
          });
          setBulkDeleteDialogOpen(false);
          return;
        } else {
          // Some products can be deleted
          toast({ 
            title: "Some products skipped", 
            description: `These products are in orders and cannot be deleted: ${blockedNames}`,
            variant: "destructive" 
          });
        }
      }

      if (productsToDelete.length > 0) {
        const { error } = await supabase
          .from("products")
          .delete()
          .in("id", productsToDelete);
        
        if (error) {
          console.error("Bulk delete error:", error);
          toast({ 
            title: "Error deleting products", 
            description: error.message,
            variant: "destructive" 
          });
          return;
        }

        // Immediately update local state
        setProducts(products.filter(p => !productsToDelete.includes(p.id)));
        setSelectedProducts([]);
        toast({ 
          title: "Products deleted successfully",
          description: `${productsToDelete.length} product(s) deleted`
        });
      }
      
      setBulkDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Bulk delete error:", error);
      toast({ 
        title: "Error deleting products", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const openDeleteDialog = (product: any) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      original_price: "",
      offer_price: "",
      category_id: "",
      fabric: "",
      color: "",
      available: true,
      is_new_arrival: false,
      is_best_seller: false,
      images: [],
    });
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Product Management</h1>
          <p className="text-muted-foreground">Manage your saree inventory</p>
        </div>
        <div className="flex gap-2">
          {selectedProducts.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete {selectedProducts.length} Selected
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Description *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDescriptionPreview(!showDescriptionPreview)}
                    className="h-7 text-xs"
                  >
                    {showDescriptionPreview ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                    {showDescriptionPreview ? "Hide Preview" : "Show Preview"}
                  </Button>
                </div>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="Enter product description..."
                />
                <p className="text-xs text-muted-foreground">
                  Use the toolbar to format text and create bullet points
                </p>
                
                {/* Live Preview Panel */}
                {showDescriptionPreview && formData.description && (
                  <div className="border rounded-lg p-4 bg-card/50 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live Preview</p>
                    
                    {/* Product Detail Page Preview */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-primary">Product Detail Page:</p>
                      <div 
                        className="prose prose-sm max-w-none text-foreground/80 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-1 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:space-y-1 [&>p]:leading-relaxed [&_li>p]:inline [&_li>p]:m-0 bg-background p-3 rounded border text-sm"
                        dangerouslySetInnerHTML={{ __html: formData.description }}
                      />
                    </div>
                    
                    {/* Product Card Preview */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-primary">Shop Card Preview:</p>
                      <div className="bg-background p-3 rounded border">
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {stripHtml(formData.description)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="original_price">Original Price (₹) *</Label>
                  <Input
                    id="original_price"
                    type="number"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                    required
                    placeholder="e.g. 999"
                  />
                </div>
                <div>
                  <Label htmlFor="offer_price">Offer Price (₹)</Label>
                  <Input
                    id="offer_price"
                    type="number"
                    value={formData.offer_price}
                    onChange={(e) => setFormData({ ...formData, offer_price: e.target.value })}
                    placeholder="Optional"
                  />
                  {formData.original_price && formData.offer_price && (
                    <p className="text-xs text-green-600 mt-1">
                      {Math.round(((parseFloat(formData.original_price) - parseFloat(formData.offer_price)) / parseFloat(formData.original_price)) * 100)}% OFF
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fabric">Fabric</Label>
                  <Input
                    id="fabric"
                    value={formData.fabric}
                    onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
              </div>
              
              {/* Image Upload Section */}
              <div className="space-y-3">
                <Label>Product Images (Max 4)</Label>
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Product ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => removeImage(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {formData.images.length < 4 && (
                  <Label htmlFor="product-images" className="cursor-pointer">
                    <div className="flex items-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-accent transition-colors">
                      <Upload className="h-5 w-5" />
                      <span>{uploadingImage ? "Uploading..." : "Upload Images"}</span>
                      <span className="text-xs text-muted-foreground">
                        ({formData.images.length}/4)
                      </span>
                    </div>
                    <Input
                      id="product-images"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </Label>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="available">Available for Sale</Label>
                  <Switch
                    id="available"
                    checked={formData.available}
                    onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="new_arrival">New Arrival</Label>
                  <Switch
                    id="new_arrival"
                    checked={formData.is_new_arrival}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_new_arrival: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="best_seller">Best Seller</Label>
                  <Switch
                    id="best_seller"
                    checked={formData.is_best_seller}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_best_seller: checked })}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingProduct ? "Update Product" : "Create Product"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 w-12">
                    <Checkbox
                      checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => toggleProductSelection(product.id)}
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover rounded" />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">{product.fabric || "N/A"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2">{product.categories?.name || "Uncategorized"}</td>
                    <td className="p-2">₹{Number(product.price).toLocaleString()}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${product.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {product.available ? "Available" : "Unavailable"}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(product)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {productToDelete && (
            <div className="my-4 p-4 border rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                {productToDelete.images?.[0] ? (
                  <img 
                    src={productToDelete.images[0]} 
                    alt={productToDelete.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                ) : (
                  <div className="w-20 h-20 bg-muted rounded flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-semibold">{productToDelete.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {productToDelete.categories?.name || "Uncategorized"}
                  </p>
                  <p className="text-sm font-medium mt-1">
                    ₹{Number(productToDelete.price).toLocaleString()}
                  </p>
                  {productToDelete.fabric && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Fabric: {productToDelete.fabric}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => productToDelete && handleDelete(productToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Products</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedProducts.length} product(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4 p-4 border rounded-lg max-h-60 overflow-y-auto">
            <p className="text-sm font-medium mb-2">Products to be deleted:</p>
            <ul className="space-y-2">
              {products
                .filter(p => selectedProducts.includes(p.id))
                .map(product => (
                  <li key={product.id} className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                      {product.images?.[0] ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-full h-full p-1 text-muted-foreground" />
                      )}
                    </div>
                    <span className="flex-1">{product.name}</span>
                    <span className="text-muted-foreground">₹{Number(product.price).toLocaleString()}</span>
                  </li>
                ))}
            </ul>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedProducts.length} Product(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}