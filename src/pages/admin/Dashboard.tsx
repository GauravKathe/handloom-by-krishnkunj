import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, Users, TrendingUp, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { exportToCsvFile } from '@/utils/exportCsv';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    inventoryCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();

    // Set up realtime listener for profiles table
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          // Reload dashboard data when a new profile is created
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You don't have admin permissions",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      loadDashboardData();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/");
    }
  };

  const loadDashboardData = async () => {
    try {
      // Get total orders (exclude cancelled)
      const { count: ordersCount, data: ordersData } = await supabase
        .from("orders")
        .select("*", { count: "exact" })
        .neq("status", "cancelled");

      // Calculate total revenue (exclude cancelled)
      const totalRevenue = ordersData?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      // Get total customers (profiles)
      const { count: customersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact" });

      // Get inventory count
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact" });

      // Get recent orders
      const { data: recentOrdersData } = await supabase
        .from("orders")
        .select(`
          *,
          profiles(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        totalOrders: ordersCount || 0,
        totalRevenue,
        totalCustomers: customersCount || 0,
        inventoryCount: productsCount || 0,
      });
      setRecentOrders(recentOrdersData || []);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = async () => {
    try {
      // Create workbook
      // Dashboard Statistics CSV
      const statsRows = [
        { Metric: 'Total Orders', Value: stats.totalOrders },
        { Metric: 'Total Revenue', Value: `₹${stats.totalRevenue.toLocaleString()}` },
        { Metric: 'Total Customers', Value: stats.totalCustomers },
        { Metric: 'Inventory Count', Value: stats.inventoryCount },
      ];
      const statsFileName = `Dashboard_Statistics_${new Date().toISOString().split('T')[0]}.csv`;
      exportToCsvFile(statsRows, statsFileName);

      // Recent Orders CSV
      const ordersRows = recentOrders.map(order => ({
        'Customer Name': order.profiles?.full_name || 'Unknown',
        'Email': order.profiles?.email || 'N/A',
        'Amount': `₹${Number(order.total_amount).toLocaleString()}`,
        'Status': order.status,
        'Date': new Date(order.created_at).toLocaleDateString()
      }));
      const ordersFileName = `Dashboard_Recent_Orders_${new Date().toISOString().split('T')[0]}.csv`;
      exportToCsvFile(ordersRows, ordersFileName);
      
      toast({
        title: "Export Successful",
        description: "Dashboard data exported to Excel",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Could not export dashboard data",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Overview</h1>
          <p className="text-muted-foreground">Welcome to your admin dashboard</p>
        </div>
          <Button onClick={exportToCsv} className="gap-2">
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">₹{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total sales</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.inventoryCount}</div>
            <p className="text-xs text-muted-foreground">Products in stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest customer orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No orders yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Customer</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">{order.profiles?.full_name || "Unknown"}</td>
                        <td className="p-2">₹{Number(order.total_amount).toLocaleString()}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-2">{new Date(order.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}