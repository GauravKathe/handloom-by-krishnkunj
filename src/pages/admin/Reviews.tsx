import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Star, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadReviews();
  }, []);

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
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reviews Management</h1>
        <p className="text-muted-foreground">Manage customer reviews and ratings</p>
      </div>

      <div className="grid gap-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < review.rating ? "fill-secondary text-secondary" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                  {review.verified_purchase && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Verified Purchase</span>
                  )}
                </div>
                <h3 className="font-semibold">{review.products?.name}</h3>
                <p className="text-sm text-muted-foreground">
                  By {review.profiles?.full_name} on {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(review.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{review.comment}</p>
              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mt-4">
                  {review.images.map((img: string, idx: number) => (
                    <div key={idx} className="w-20 h-20 rounded bg-muted">
                      <img src={img} alt={`Review ${idx + 1}`} className="w-full h-full object-cover rounded" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}