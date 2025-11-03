import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Wishlist() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  // Reload wishlist when items are updated
  useEffect(() => {
    const handleWishlistUpdate = () => {
      if (user) {
        loadWishlist(user.id);
      }
    };

    window.addEventListener('wishlistUpdated', handleWishlistUpdate);

    return () => {
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
    };
  }, [user]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    loadWishlist(session.user.id);
  };

  const loadWishlist = async (userId: string) => {
    setLoading(true);
    
    try {
      // Fetch wishlist items with products
      const { data: wishlistData, error: wishlistError } = await supabase
        .from("wishlist")
        .select(`
          id,
          product_id,
          created_at,
          products (
            id,
            name,
            description,
            price,
            images,
            category_id,
            categories (
              name
            )
          )
        `)
        .eq("user_id", userId);

      if (wishlistError) throw wishlistError;

      setWishlistItems(wishlistData || []);
    } catch (error: any) {
      console.error("Error loading wishlist:", error);
      toast({
        title: "Error loading wishlist",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-8">My Wishlist</h1>

        {wishlistItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map((item) => (
              <ProductCard key={item.id} product={item.products} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-6">Your wishlist is empty</p>
            <button
              onClick={() => navigate("/shop")}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
