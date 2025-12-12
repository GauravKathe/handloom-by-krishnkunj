import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    averageOrderValue: 0,
  });
  const [salesData, setSalesData] = useState<{ date: string; revenue: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; units: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; revenue: number }[]>([]);
  const [couponData, setCouponData] = useState<{ code: string; uses: number; revenue: number }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

    try {
      // Get orders data (exclude cancelled)
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*, order_items(*, product_id, quantity)")
        .gte("created_at", daysAgo.toISOString())
        .neq("status", "cancelled");

      if (ordersError) throw ordersError;

      // Calculate overview stats
      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const totalOrders = orders?.length || 0;
      const uniqueCustomers = new Set(orders?.map(o => o.user_id)).size;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setAnalytics({
        totalRevenue,
        totalOrders,
        totalCustomers: uniqueCustomers,
        averageOrderValue,
      });

      // Sales over time
      const salesByDate = new Map<string, number>();
      orders?.forEach((order) => {
        const date = new Date(order.created_at).toLocaleDateString();
        salesByDate.set(date, (salesByDate.get(date) || 0) + Number(order.total_amount));
      });

      setSalesData(
        Array.from(salesByDate.entries())
          .map(([date, revenue]) => ({ date, revenue }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      );

      // Top selling products
      const { data: products } = await supabase.from("products").select("*");
      const productSales = new Map<string, { name: string; units: number }>();

      orders?.forEach((order) => {
        order.order_items?.forEach((item: any) => {
          const product = products?.find(p => p.id === item.product_id);
          if (product) {
            const current = productSales.get(product.id) || { name: product.name, units: 0 };
            productSales.set(product.id, { name: product.name, units: current.units + item.quantity });
          }
        });
      });

      setTopProducts(
        Array.from(productSales.values())
          .sort((a, b) => b.units - a.units)
          .slice(0, 5)
      );

      // Category performance
      const { data: categories } = await supabase.from("categories").select("*");
      const categoryRevenue = new Map<string, { name: string; revenue: number }>();

      orders?.forEach((order) => {
        order.order_items?.forEach((item: any) => {
          const product = products?.find(p => p.id === item.product_id);
          if (product) {
            const category = categories?.find(c => c.id === product.category_id);
            if (category) {
              const current = categoryRevenue.get(category.id) || { name: category.name, revenue: 0 };
              categoryRevenue.set(category.id, {
                name: category.name,
                revenue: current.revenue + Number(item.price) * item.quantity,
              });
            }
          }
        });
      });

      setCategoryData(Array.from(categoryRevenue.values()));

      // Coupon analytics
      const couponUsage = new Map<string, { code: string; uses: number; revenue: number }>();
      orders?.forEach((order) => {
        if (order.coupon_code) {
          const current = couponUsage.get(order.coupon_code) || {
            code: order.coupon_code,
            uses: 0,
            revenue: 0,
          };
          couponUsage.set(order.coupon_code, {
            code: order.coupon_code,
            uses: current.uses + 1,
            revenue: current.revenue + Number(order.total_amount),
          });
        }
      });

      setCouponData(Array.from(couponUsage.values()));
    } catch (error: any) {
      toast({
        title: "Error loading analytics",
        description: error.message,
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
            <SelectItem value="180">Last 6 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{analytics.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{analytics.averageOrderValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue (₹)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="units" fill="#8884d8" name="Units Sold" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Coupon Analytics */}
        {couponData.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Coupon Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={couponData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="code" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="uses" fill="#8884d8" name="Uses" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
