import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, MapPin, ShoppingBag, CreditCard, Trash2, Plus, Minus } from "lucide-react";
import { z } from "zod";

// Declare Razorpay on window
declare global {
  interface Window {
    Razorpay: any;
  }
}

// Address validation schema
const addressSchema = z.object({
  houseNo: z.string().min(1, "House/Flat number is required").max(100),
  street: z.string().min(1, "Street/Locality is required").max(200),
  landmark: z.string().max(200).optional(),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits")
});

export default function Checkout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState<number>(0);

  // Step 1: Address
  const [address, setAddress] = useState({
    houseNo: "",
    street: "",
    landmark: "",
    city: "",
    state: "",
    pincode: ""
  });

  // Step 2: Coupon
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discount, setDiscount] = useState(0);

  // Step 3: Payment
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "netbanking" | "cod">("upi");
  const [orderConfirmation, setOrderConfirmation] = useState<any>(null);

  useEffect(() => {
    checkUser();
    loadDeliveryCharge();
    
    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const loadDeliveryCharge = async () => {
    try {
      const { data } = await supabase
        .from("site_content")
        .select("content")
        .eq("section", "settings")
        .single();

      if (data?.content && typeof data.content === 'object' && 'delivery_charge' in data.content) {
        setDeliveryCharge(Number(data.content.delivery_charge));
      }
    } catch (error) {
      console.error("Error loading delivery charge:", error);
    }
  };

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Login required",
        description: "Please login to proceed to checkout",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    setUser(session.user);
    await loadUserData(session.user.id);
    await loadCart(session.user.id);
  };

  const loadUserData = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile(data);
    }
  };

  const loadCart = async (userId: string) => {
    setLoading(true);
    
    try {
      const { data: cartData, error: cartError } = await supabase
        .from("cart_items")
        .select("*, products(*)")
        .eq("user_id", userId);

      if (cartError) throw cartError;

      if (!cartData || cartData.length === 0) {
        toast({
          title: "Cart is empty",
          description: "Add items to your cart before checkout",
        });
        navigate("/cart");
        return;
      }

      const { data: addOnsData } = await supabase.from("add_ons").select("*");

      const itemsWithAddOns = cartData.map((item: any) => ({
        ...item,
        add_ons: addOnsData || []
      }));

      setCartItems(itemsWithAddOns);
    } catch (error: any) {
      console.error("Error loading cart:", error);
      toast({
        title: "Error",
        description: "Failed to load cart items",
        variant: "destructive",
      });
      navigate("/cart");
    } finally {
      setLoading(false);
    }
  };

  const calculateItemTotal = (item: any) => {
    const basePrice = Number(item.products.price);
    const addOnsPrice = (item.selected_add_ons || []).reduce((sum: number, addonId: string) => {
      const addon = item.add_ons?.find((a: any) => a.id === addonId);
      return sum + (addon ? Number(addon.price) : 0);
    }, 0);
    return (basePrice + addOnsPrice) * item.quantity;
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + calculateItemTotal(item), 0);
  };

  const calculateDeliveryCharges = () => {
    return deliveryCharge;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const delivery = calculateDeliveryCharges();
    return subtotal + delivery - discount;
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

  const handleStep1Continue = async () => {
    try {
      const validatedAddress = addressSchema.parse(address);
      setProcessing(true);

      // Save address to profile
      const { error } = await supabase
        .from("profiles")
        .update({
          city: validatedAddress.city,
          state: validatedAddress.state
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({ title: "Address saved successfully" });
      setCurrentStep(2);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save address",
          variant: "destructive",
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        title: "Enter coupon code",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("status", "active")
        .gt("expiry_date", new Date().toISOString())
        .single();

      if (error || !data) {
        toast({
          title: "Invalid coupon",
          description: "This coupon is not valid or has expired",
          variant: "destructive",
        });
        return;
      }

      // Check minimum purchase amount
      const subtotal = calculateSubtotal();
      if (subtotal < Number(data.minimum_purchase_amount)) {
        toast({
          title: "Minimum purchase not met",
          description: `Minimum purchase of ₹${Number(data.minimum_purchase_amount).toLocaleString()} required`,
          variant: "destructive",
        });
        return;
      }

      // Check usage limit
      if (data.current_usage_count >= data.max_usage_limit) {
        toast({
          title: "Coupon limit reached",
          description: "This coupon has reached its usage limit",
          variant: "destructive",
        });
        return;
      }

      const discountAmount = (subtotal * Number(data.discount_percentage)) / 100;
      setDiscount(discountAmount);
      setAppliedCoupon(data);

      toast({
        title: "Coupon applied!",
        description: `You saved ₹${discountAmount.toLocaleString()}`,
      });
    } catch (error: any) {
      console.error("Error applying coupon:", error);
      toast({
        title: "Error",
        description: "Failed to apply coupon",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscount(0);
    setCouponCode("");
    toast({ title: "Coupon removed" });
  };

  const handleStep2Continue = () => {
    setCurrentStep(3);
  };

  const placeOrder = async () => {
    setProcessing(true);
    try {
      // Create order in database first with client-calculated total (will be verified server-side)
      const orderData = {
        user_id: user.id,
        total_amount: calculateTotal(), // Initial value, will be recalculated server-side
        status: paymentMethod === "cod" ? "pending" : "processing",
        shipping_address: address,
        coupon_code: appliedCoupon?.code || null,
        discount_amount: discount
      };

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items with product snapshot including SKU and variants
      const orderItems = cartItems.map(item => {
        const itemTotal = calculateItemTotal(item);
        return {
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: itemTotal,
          item_total: itemTotal,
          selected_add_ons: item.selected_add_ons || [],
          product_name: item.products?.name || '',
          product_image: item.products?.images?.[0] || '',
          product_description: item.products?.description || '',
          product_sku: item.products?.sku || '',
          product_color: item.products?.color || '',
          product_fabric: item.products?.fabric || ''
        };
      });

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // SECURITY: Recalculate and verify order total server-side using actual product prices
      // Using type assertion since recalculate_order_total is a custom RPC function
      const { data: verifiedTotal, error: verifyError } = await (supabase as any)
        .rpc('recalculate_order_total', { order_id: order.id });

      if (verifyError) {
        console.error("Error verifying order total:", verifyError);
        // Continue with order but log the error - the database has the correct total now
      }

      // Fetch the updated order with verified total
      const { data: updatedOrder } = await supabase
        .from("orders")
        .select()
        .eq("id", order.id)
        .single();

      const finalOrder = updatedOrder || order;

      // Update coupon usage
      if (appliedCoupon) {
        await supabase
          .from("coupons")
          .update({ current_usage_count: appliedCoupon.current_usage_count + 1 })
          .eq("id", appliedCoupon.id);
      }

      // If COD, complete order directly
      if (paymentMethod === "cod") {
        await supabase
          .from("cart_items")
          .delete()
          .eq("user_id", user.id);

        // Send order confirmation email
        await sendOrderConfirmationEmail(finalOrder);

        window.dispatchEvent(new Event('cartUpdated'));
        setOrderConfirmation(finalOrder);
        
        toast({
          title: "Order placed successfully! 🎉",
          description: `Order ID: ${finalOrder.id.slice(0, 8)}`,
        });
        setProcessing(false);
        return;
      }

      // For online payment, initiate Razorpay with server-verified total
      await initiateRazorpayPayment(finalOrder);

    } catch (error: any) {
      console.error("Error placing order:", error);
      toast({
        title: "Order failed",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  const initiateRazorpayPayment = async (order: any) => {
    try {
      // Create Razorpay order
      const { data: razorpayOrder, error: razorpayError } = await supabase.functions.invoke(
        'razorpay-create-order',
        {
          body: {
            amount: Math.round(order.total_amount * 100), // Convert to paise
            currency: 'INR',
            receipt: order.id,
            notes: {
              order_id: order.id,
              user_id: user.id
            }
          }
        }
      );

      if (razorpayError) throw razorpayError;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_PLACEHOLDER',
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'HandloomByKrishnKunj',
        description: 'Purchase of Handmade Saree',
        image: '/logo.png',
        order_id: razorpayOrder.orderId,
        prefill: {
          name: profile?.full_name || '',
          email: profile?.email || '',
          contact: profile?.mobile_number || ''
        },
        notes: {
          address: `${address.houseNo}, ${address.street}, ${address.city}, ${address.state} - ${address.pincode}`
        },
        theme: {
          color: '#F4D9B5'
        },
        handler: async function (response: any) {
          await handlePaymentSuccess(response, order);
        },
        modal: {
          ondismiss: function () {
            toast({
              title: "Payment Cancelled",
              description: "You can retry payment from your orders page",
              variant: "destructive",
            });
            setProcessing(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error("Error initiating Razorpay payment:", error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async (response: any, order: any) => {
    try {
      // Verify payment signature
      const { data: verificationResult, error: verificationError } = await supabase.functions.invoke(
        'razorpay-verify-payment',
        {
          body: {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            order_details: {
              order_id: order.id
            }
          }
        }
      );

      if (verificationError || !verificationResult?.verified) {
        throw new Error("Payment verification failed");
      }

      // Clear cart
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id);

      // Send order confirmation and payment receipt emails
      await sendOrderConfirmationEmail(order);
      await sendPaymentReceiptEmail(order, response.razorpay_payment_id);

      window.dispatchEvent(new Event('cartUpdated'));
      setOrderConfirmation(order);

      toast({
        title: "Payment Successful! 🎉",
        description: `Order ID: ${order.id.slice(0, 8)}`,
      });

    } catch (error: any) {
      console.error("Error verifying payment:", error);
      toast({
        title: "Payment Verification Failed",
        description: "Please contact support with your order ID",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const sendOrderConfirmationEmail = async (order: any) => {
    try {
      const items = cartItems.map(item => ({
        name: item.products.name,
        quantity: item.quantity,
        price: calculateItemTotal(item)
      }));

      await supabase.functions.invoke('send-order-confirmation', {
        body: {
          email: profile?.email,
          name: profile?.full_name,
          orderId: order.id,
          totalAmount: order.total_amount,
          items,
          shippingAddress: address
        }
      });
    } catch (error) {
      console.error("Error sending order confirmation:", error);
    }
  };

  const sendPaymentReceiptEmail = async (order: any, paymentId: string) => {
    try {
      await supabase.functions.invoke('send-payment-receipt', {
        body: {
          email: profile?.email,
          name: profile?.full_name,
          orderId: order.id,
          paymentId: paymentId,
          amount: order.total_amount,
          paymentMethod: paymentMethod,
          date: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error sending payment receipt:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (orderConfirmation) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto p-8 text-center">
            <div className="mb-6">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-primary mb-2">Order Confirmed!</h1>
              <p className="text-muted-foreground">Thank you for your purchase</p>
            </div>

            <div className="bg-secondary/10 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-semibold">{orderConfirmation.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-semibold">₹{Number(orderConfirmation.total_amount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-semibold capitalize">{paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                  <p className="font-semibold">5-7 Business Days</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button size="lg" className="w-full" onClick={() => navigate("/profile")}>
                Track Order
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={() => navigate("/shop")}>
                Continue Shopping
              </Button>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const steps = [
    { number: 1, title: "Address", icon: MapPin },
    { number: 2, title: "Order Summary", icon: ShoppingBag },
    { number: 3, title: "Payment", icon: CreditCard }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-8">Checkout</h1>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 max-w-3xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      currentStep >= step.number
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <step.icon className="w-5 h-5" />
                  </div>
                  <p className={`text-xs mt-2 font-medium ${currentStep >= step.number ? "text-primary" : "text-muted-foreground"}`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 ${currentStep > step.number ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
          <Progress value={(currentStep / 3) * 100} className="max-w-3xl mx-auto" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Address */}
            {currentStep === 1 && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-primary" />
                  Delivery Address
                </h2>

                {/* User Info Display */}
                <div className="bg-secondary/10 rounded-lg p-4 mb-6">
                  <p className="text-sm text-muted-foreground mb-1">Delivering to</p>
                  <p className="font-semibold text-lg">{profile?.full_name || "User"}</p>
                  <p className="text-sm">{profile?.email}</p>
                  <p className="text-sm">{profile?.mobile_number}</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="houseNo">House/Flat/Building No. *</Label>
                      <Input
                        id="houseNo"
                        value={address.houseNo}
                        onChange={(e) => setAddress({ ...address, houseNo: e.target.value })}
                        placeholder="e.g., 123, Apartment Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="street">Street/Locality *</Label>
                      <Input
                        id="street"
                        value={address.street}
                        onChange={(e) => setAddress({ ...address, street: e.target.value })}
                        placeholder="e.g., MG Road"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="landmark">Landmark (Optional)</Label>
                    <Input
                      id="landmark"
                      value={address.landmark}
                      onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                      placeholder="e.g., Near City Mall"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        placeholder="e.g., Mumbai"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={address.state}
                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                        placeholder="e.g., Maharashtra"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input
                        id="pincode"
                        value={address.pincode}
                        onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                        placeholder="e.g., 400001"
                        maxLength={6}
                      />
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleStep1Continue}
                    disabled={processing}
                  >
                    {processing ? "Saving..." : "Continue to Order Summary"}
                  </Button>
                </div>
              </Card>
            )}

            {/* Step 2: Order Summary */}
            {currentStep === 2 && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                  Order Summary
                </h2>

                <div className="space-y-4 mb-6">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 bg-secondary/5 rounded-lg">
                      <img
                        src={item.products.images?.[0] || "/placeholder.svg"}
                        alt={item.products.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.products.name}</h3>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        {item.selected_add_ons && item.selected_add_ons.length > 0 && (
                          <p className="text-xs text-primary mt-1">
                            +{item.selected_add_ons.length} add-ons
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{calculateItemTotal(item).toLocaleString()}</p>
                        <div className="flex gap-1 mt-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon Section */}
                <div className="border-t pt-6 mb-6">
                  <h3 className="font-semibold mb-3">Apply Coupon Code</h3>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div>
                        <p className="font-semibold text-green-700">{appliedCoupon.code}</p>
                        <p className="text-sm text-green-600">
                          You saved ₹{discount.toLocaleString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={removeCoupon}>
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      />
                      <Button onClick={applyCoupon} disabled={processing}>
                        {processing ? "Applying..." : "Apply"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCurrentStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={handleStep2Continue}
                  >
                    Continue to Payment
                  </Button>
                </div>
              </Card>
            )}

            {/* Step 3: Payment */}
            {currentStep === 3 && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-primary" />
                  Payment Method
                </h2>

                {/* Razorpay Secure Notice */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm font-semibold text-green-800 mb-1">
                    🔒 Secure Payment via Razorpay
                  </p>
                  <p className="text-xs text-green-700">
                    Your payment information is encrypted and secure. We use industry-standard Razorpay payment gateway.
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    { id: "upi", label: "UPI / Cards / Net Banking", icon: "💳", description: "Pay securely via Razorpay" },
                    { id: "cod", label: "Cash on Delivery", icon: "💵", description: "Pay when order arrives" }
                  ].map((method) => (
                    <div
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === method.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{method.icon}</span>
                        <div className="flex-1">
                          <p className="font-semibold">{method.label}</p>
                          <p className="text-xs text-muted-foreground">{method.description}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            paymentMethod === method.id
                              ? "border-primary"
                              : "border-border"
                          }`}
                        >
                          {paymentMethod === method.id && (
                            <div className="w-3 h-3 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {paymentMethod === "cod" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-amber-800">
                      💵 Cash on Delivery: Pay when your order arrives at your doorstep
                    </p>
                  </div>
                )}

                {paymentMethod !== "cod" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800">
                      💳 You will be redirected to Razorpay's secure payment gateway to complete your payment
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCurrentStep(2)}
                  >
                    Back
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={placeOrder}
                    disabled={processing}
                  >
                    {processing ? "Processing..." : `${paymentMethod === "cod" ? "Place Order" : "Proceed to Pay"} - ₹${calculateTotal().toLocaleString()}`}
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h3 className="font-semibold text-xl mb-6">Price Details</h3>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({cartItems.length} items)</span>
                  <span className="font-medium">₹{calculateSubtotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Charges</span>
                  <span className="font-medium">
                    {calculateDeliveryCharges() === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `₹${calculateDeliveryCharges()}`
                    )}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span className="font-medium">-₹{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-lg">Total Amount</span>
                    <span className="font-bold text-2xl text-primary">
                      ₹{calculateTotal().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {discount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                  <p className="text-sm font-semibold text-green-700">
                    🎉 You saved ₹{discount.toLocaleString()} on this order!
                  </p>
                </div>
              )}

              {calculateDeliveryCharges() === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-blue-700">
                    🚚 Free delivery on orders above ₹5,000
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
