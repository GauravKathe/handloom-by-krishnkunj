import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface CouponAnalytics {
  coupon_code: string;
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  unique_orders: number;
}

export default function CouponAnalytics() {
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<string[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<string>("");
  const [analytics, setAnalytics] = useState<CouponAnalytics[]>([]);

  useEffect(() => {
    loadCoupons();
  }, []);

  useEffect(() => {
    if (selectedCoupon) {
      loadAnalytics();
    }
  }, [selectedCoupon]);

  const loadCoupons = async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("code")
      .order("code");

    if (error) {
      console.error("Error loading coupons:", error);
      return;
    }

    const codes = data.map(c => c.code);
    setCoupons(codes);
    if (codes.length > 0) {
      setSelectedCoupon(codes[0]);
    }
    setLoading(false);
  };

  const loadAnalytics = async () => {
    setLoading(true);

    // Get all orders that used this coupon
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        total_amount,
        discount_amount,
        order_items (
          product_id,
          quantity,
          price
        )
      `)
      .eq("coupon_code", selectedCoupon);

    if (ordersError) {
      console.error("Error loading orders:", ordersError);
      setLoading(false);
      return;
    }

    // Get product IDs from order items
    const productIds = new Set<string>();
    orders?.forEach(order => {
      order.order_items?.forEach(item => {
        if (item.product_id) productIds.add(item.product_id);
      });
    });

    // Get product details
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name")
      .in("id", Array.from(productIds));

    if (productsError) {
      console.error("Error loading products:", productsError);
      setLoading(false);
      return;
    }

    // Calculate analytics
    const productMap = new Map(products?.map(p => [p.id, p.name]));
    const analyticsMap = new Map<string, CouponAnalytics>();

    orders?.forEach(order => {
      order.order_items?.forEach(item => {
        if (!item.product_id) return;

        const key = item.product_id;
        const existing = analyticsMap.get(key) || {
          coupon_code: selectedCoupon,
          product_id: item.product_id,
          product_name: productMap.get(item.product_id) || "Unknown",
          total_quantity: 0,
          total_revenue: 0,
          unique_orders: 0,
        };

        existing.total_quantity += item.quantity || 0;
        existing.total_revenue += Number(item.price) * (item.quantity || 0);
        existing.unique_orders += 1;

        analyticsMap.set(key, existing);
      });
    });

    const analyticsArray = Array.from(analyticsMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue);

    setAnalytics(analyticsArray);
    setLoading(false);
  };

  if (loading && coupons.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Coupon Analytics</h1>
        <p className="text-muted-foreground">
          View which products are most purchased with each coupon
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Coupon</CardTitle>
          <CardDescription>Choose a coupon to view its product analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCoupon} onValueChange={setSelectedCoupon}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a coupon" />
            </SelectTrigger>
            <SelectContent>
              {coupons.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : analytics.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No products have been purchased with this coupon yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Products Purchased with {selectedCoupon}</CardTitle>
            <CardDescription>
              Showing {analytics.length} products sorted by revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Total Quantity Sold</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.map((item) => (
                  <TableRow key={item.product_id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell className="text-right">{item.total_quantity}</TableCell>
                    <TableCell className="text-right">
                      ₹{item.total_revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{item.unique_orders}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
