import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart } from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [product, setProduct] = useState<any>(null);
  const [addOns, setAddOns] = useState<any[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Scroll to top when product changes
    window.scrollTo(0, 0);
    loadProduct();
    loadAddOns();
    checkUser();
  }, [id]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
  };

  const loadProduct = async () => {
    const { data } = await supabase
      .from("products")
      .select("*, categories(name)")
      .eq("id", id)
      .single();

    if (data) {
      setProduct(data);
      loadSimilarProducts(data.category_id);
    }
  };

  const loadAddOns = async () => {
    const { data } = await supabase.from("add_ons").select("*");
    setAddOns(data || []);
  };

  const loadSimilarProducts = async (categoryId: string) => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("category_id", categoryId)
      .neq("id", id)
      .eq("available", true)
      .limit(4);

    setSimilarProducts(data || []);
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to add items to cart",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Check if item already exists in cart
    const { data: existingItem, error: fetchError } = await supabase
      .from("cart_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("product_id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error checking cart:", fetchError);
      toast({
        title: "Error",
        description: fetchError.message,
        variant: "destructive",
      });
      return;
    }

    if (existingItem) {
      // Update quantity
      const { error } = await supabase
        .from("cart_items")
        .update({
          quantity: existingItem.quantity + 1,
          selected_add_ons: selectedAddOns,
        })
        .eq("id", existingItem.id);

      if (error) {
        console.error("Error updating cart:", error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Updated cart!",
          description: "Item quantity has been updated in your cart",
        });
        // Trigger a custom event for real-time update
        window.dispatchEvent(new Event('cartUpdated'));
      }
    } else {
      // Insert new item
      const { error } = await supabase
        .from("cart_items")
        .insert({
          user_id: user.id,
          product_id: id,
          quantity: 1,
          selected_add_ons: selectedAddOns,
        });

      if (error) {
        console.error("Error adding to cart:", error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Added to cart!",
          description: "Item has been added to your cart",
        });
        // Trigger a custom event for real-time update
        window.dispatchEvent(new Event('cartUpdated'));
      }
    }
  };


  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  const totalPrice = Number(product.price) + 
    selectedAddOns.reduce((sum, addonId) => {
      const addon = addOns.find(a => a.id === addonId);
      return sum + (addon ? Number(addon.price) : 0);
    }, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
          {/* Product Images */}
          <div>
            <Carousel className="w-full">
              <CarouselContent>
                {(product.images || ["/placeholder.svg"]).map((image: string, index: number) => (
                  <CarouselItem key={index}>
                    <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-secondary/10 to-primary/10">
                      <img
                        src={image}
                        alt={`${product.name} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </Carousel>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="flex gap-2 mb-3">
                {product.is_new_arrival && (
                  <Badge className="bg-secondary">New Arrival</Badge>
                )}
                {product.is_best_seller && (
                  <Badge className="bg-primary">Bestseller</Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
                {product.name}
              </h1>
              <p className="text-muted-foreground">
                Category: {product.categories?.name || "Handloom Saree"}
              </p>
            </div>

            <div className="text-4xl font-bold text-primary">
              ₹{totalPrice.toLocaleString()}
            </div>

            <div className="prose prose-sm max-w-none">
              <p className="text-foreground/80 leading-relaxed">{product.description}</p>
            </div>

            {/* Product Details */}
            <Card className="p-6 bg-card/50">
              <h3 className="font-semibold mb-4">Product Details</h3>
              <dl className="space-y-2 text-sm">
                {product.fabric && (
                  <>
                    <dt className="text-muted-foreground inline">Fabric:</dt>
                    <dd className="inline ml-2 font-medium">{product.fabric}</dd>
                    <br />
                  </>
                )}
                {product.color && (
                  <>
                    <dt className="text-muted-foreground inline">Color:</dt>
                    <dd className="inline ml-2 font-medium">{product.color}</dd>
                    <br />
                  </>
                )}
                <dt className="text-muted-foreground inline">Availability:</dt>
                <dd className="inline ml-2 font-medium">
                  {product.available ? "In Stock" : "Out of Stock"}
                </dd>
              </dl>
            </Card>

            {/* Add-ons */}
            {addOns.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Add-on Services</h3>
                <div className="space-y-3">
                  {addOns.map((addon) => (
                    <div key={addon.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={addon.id}
                          checked={selectedAddOns.includes(addon.id)}
                          onCheckedChange={(checked) => {
                            setSelectedAddOns(
                              checked
                                ? [...selectedAddOns, addon.id]
                                : selectedAddOns.filter((id) => id !== addon.id)
                            );
                          }}
                        />
                        <label htmlFor={addon.id} className="cursor-pointer">
                          <p className="font-medium">{addon.name}</p>
                          <p className="text-sm text-muted-foreground">{addon.description}</p>
                        </label>
                      </div>
                      <span className="font-semibold">+₹{Number(addon.price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full"
                onClick={handleAddToCart}
                disabled={!product.available}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/submit-review')}
              >
                Write a Review
              </Button>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-6">
              Similar Sarees
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {similarProducts.map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/product/${item.id}`)}
                >
                  <div className="aspect-square overflow-hidden bg-gradient-to-br from-secondary/10 to-primary/10">
                    <img
                      src={item.images?.[0] || "/placeholder.svg"}
                      alt={item.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm md:text-base line-clamp-1 mb-2">
                      {item.name}
                    </h3>
                    <p className="text-lg font-bold text-primary">
                      ₹{Number(item.price).toLocaleString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
