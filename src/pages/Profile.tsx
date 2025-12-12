import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";

// Profile validation schema
const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Invalid email address").max(255, "Email too long"),
  mobile_number: z.string().regex(/^\d{10}$/, "Mobile number must be 10 digits"),
  city: z.string().max(100, "City name too long"),
  state: z.string().max(100, "State name too long"),
});

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    mobile_number: "",
    city: "",
    state: "",
  });
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    loadProfile(session.user.id);
    loadOrders(session.user.id);
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile({
        full_name: data.full_name || "",
        email: data.email || "",
        mobile_number: data.mobile_number || "",
        city: data.city || "",
        state: data.state || "",
      });
    }
    setLoading(false);
  };

  const loadOrders = async (userId: string) => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*, products(name, images))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setOrders(data || []);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate profile data before submitting
    try {
      const validatedProfile = profileSchema.parse(profile);
      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .update(validatedProfile)
        .eq("id", user.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: err.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
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
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-8">My Account</h1>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="p-6 max-w-2xl">
              <h2 className="text-2xl font-semibold mb-6">Profile Information</h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="mobile_number">Mobile Number</Label>
                  <Input
                    id="mobile_number"
                    value={profile.mobile_number}
                    onChange={(e) => setProfile({ ...profile, mobile_number: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={profile.state}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={saving} className="w-full md:w-auto">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Update Profile"
                  )}
                </Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold mb-6">Order History</h2>
              {orders.length > 0 ? (
                orders.map((order) => (
                  <Card key={order.id} className="p-6">
                    <div className="flex flex-col md:flex-row justify-between mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Order #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="mt-2 md:mt-0">
                        <p className="text-xl font-bold text-primary">
                          ₹{Number(order.total_amount).toLocaleString()}
                        </p>
                        <p className="text-sm capitalize">Status: {order.status}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {order.order_items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <img
                            src={item.products.images[0] || "/placeholder.svg"}
                            alt={item.products.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div>
                            <p className="font-medium">{item.products.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {item.quantity} × ₹{Number(item.price).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No orders yet</p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
