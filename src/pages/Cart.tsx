import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Minus } from "lucide-react";

export default function Cart() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Login required",
        description: "Please login to view your cart",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    setUser(session.user);
    loadCart(session.user.id);
  };

  const loadCart = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cart_items")
      .select("*, products(*)")
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading cart:", error);
      toast({
        title: "Error loading cart",
        description: error.message,
        variant: "destructive",
      });
    }

    setCartItems(data || []);
    setLoading(false);
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: newQuantity })
      .eq("id", itemId);

    if (!error) {
      loadCart(user.id);
    }
  };

  const removeItem = async (itemId: string) => {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", itemId);

    if (!error) {
      toast({ title: "Item removed from cart" });
      loadCart(user.id);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const productPrice = Number(item.products.price) * item.quantity;
      return total + productPrice;
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading cart...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-8">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground mb-6">Your cart is empty</p>
            <Button asChild size="lg">
              <a href="/shop">Continue Shopping</a>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id} className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-secondary/10 to-primary/10">
                      <img
                        src={item.products.images?.[0] || "/placeholder.svg"}
                        alt={item.products.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{item.products.name}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {item.products.description}
                      </p>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center space-x-2 border rounded-lg p-1 w-fit">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="text-xl font-bold text-primary">
                          ₹{(Number(item.products.price) * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <h3 className="font-semibold text-xl mb-6">Order Summary</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₹{calculateTotal().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium">Calculated at checkout</span>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-lg">Total</span>
                      <span className="font-bold text-2xl text-primary">
                        ₹{calculateTotal().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <Button size="lg" className="w-full mb-4" asChild>
                  <a href="/checkout">Proceed to Checkout</a>
                </Button>

                <Button size="lg" variant="outline" className="w-full" asChild>
                  <a href="/shop">Continue Shopping</a>
                </Button>
              </Card>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
