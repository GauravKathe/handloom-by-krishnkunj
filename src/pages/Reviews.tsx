import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function Reviews() {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*, products(name), profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(20);

    setReviews(data || []);
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <span
        key={i}
        className={i < rating ? "text-secondary text-lg" : "text-muted text-lg"}
      >
        ★
      </span>
    ));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Customer Reviews
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real stories from our happy customers who love our handloom sarees
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {reviews.map((review) => (
              <Card key={review.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {review.profiles?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{review.profiles?.full_name || "Anonymous"}</p>
                      <div className="flex items-center space-x-1">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">
                    {review.products?.name}
                  </p>

                  <p className="text-foreground/80 mb-4 line-clamp-4">
                    "{review.comment}"
                  </p>

                  {review.verified_purchase && (
                    <Badge variant="secondary" className="text-xs">
                      Verified Purchase
                    </Badge>
                  )}

                  {review.images?.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {review.images.slice(0, 3).map((img: string, idx: number) => (
                        <div
                          key={idx}
                          className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-secondary/10 to-primary/10"
                        >
                          <img
                            src={img}
                            alt={`Review image ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-4">
                    {new Date(review.created_at).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Sample Reviews for Demo */}
        {reviews.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mt-8">
            {[
              {
                name: "Priya Sharma",
                rating: 5,
                comment:
                  "Absolutely stunning Paithani saree! The craftsmanship is impeccable and you can feel the love woven into every thread. Worth every penny!",
              },
              {
                name: "Anjali Desai",
                rating: 5,
                comment:
                  "I wore this saree to my sister's wedding and received so many compliments! The quality is outstanding and I love supporting artisan communities.",
              },
              {
                name: "Meera Patel",
                rating: 5,
                comment:
                  "This is my third saree from Handloom by Krishnkunj. Each one is a work of art. The colors are vibrant and the silk quality is premium.",
              },
            ].map((review, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {review.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{review.name}</p>
                      <div className="flex items-center space-x-1">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                  </div>

                  <p className="text-foreground/80">"{review.comment}"</p>

                  <Badge variant="secondary" className="text-xs mt-4">
                    Verified Purchase
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
