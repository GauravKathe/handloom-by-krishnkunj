import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Star, Trash2, Plus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [formData, setFormData] = useState({
    product_id: "",
    rating: 5,
    comment: "",
    verified_purchase: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadReviews(), loadProducts()]);
    setLoading(false);
  };

  const loadReviews = async () => {
    try {
      const { data } = await supabase
        .from("reviews")
        .select(`
          *,
          profiles(full_name),
          products(name)
        `)
        .order("created_at", { ascending: false });

      setReviews(data || []);
    } catch (error) {
      toast({ title: "Error loading reviews", variant: "destructive" });
    }
  };

  const loadProducts = async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select("id, name")
        .order("name");

      setProducts(data || []);
    } catch (error) {
      toast({ title: "Error loading products", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Authentication required", variant: "destructive" });
        return;
      }

      const reviewData = {
        product_id: formData.product_id,
        rating: formData.rating,
        comment: formData.comment,
        verified_purchase: formData.verified_purchase,
        user_id: user.id,
      };

      if (editingReview) {
        const { error } = await supabase
          .from("reviews")
          .update(reviewData)
          .eq("id", editingReview.id);

        if (error) throw error;
        toast({ title: "Review updated successfully" });
      } else {
        const { error } = await supabase
          .from("reviews")
          .insert(reviewData);

        if (error) throw error;
        toast({ title: "Review added successfully" });
      }

      setDialogOpen(false);
      resetForm();
      loadReviews();
    } catch (error: any) {
      toast({
        title: "Error saving review",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (review: any) => {
    setEditingReview(review);
    setFormData({
      product_id: review.product_id,
      rating: review.rating,
      comment: review.comment || "",
      verified_purchase: review.verified_purchase,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      await supabase.from("reviews").delete().eq("id", id);
      toast({ title: "Review deleted successfully" });
      loadReviews();
    } catch (error) {
      toast({ title: "Error deleting review", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      rating: 5,
      comment: "",
      verified_purchase: true,
    });
    setEditingReview(null);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reviews Management</h1>
          <p className="text-muted-foreground">Manage customer reviews and ratings</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Review
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingReview ? "Edit Review" : "Add New Review"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="product">Product</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rating">Rating</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= formData.rating
                            ? "fill-secondary text-secondary"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  rows={4}
                  placeholder="Write review comment..."
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="verified"
                  checked={formData.verified_purchase}
                  onChange={(e) =>
                    setFormData({ ...formData, verified_purchase: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="verified">Verified Purchase</Label>
              </div>
              <Button type="submit" className="w-full">
                {editingReview ? "Update Review" : "Add Review"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No reviews yet. Add your first review using the button above.
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating ? "fill-secondary text-secondary" : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    {review.verified_purchase && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold">{review.products?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    By {review.profiles?.full_name || "Admin"} on{" "}
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(review)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(review.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{review.comment}</p>
                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 mt-4">
                    {review.images.map((img: string, idx: number) => (
                      <div key={idx} className="w-20 h-20 rounded bg-muted">
                        <img
                          src={img}
                          alt={`Review ${idx + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
