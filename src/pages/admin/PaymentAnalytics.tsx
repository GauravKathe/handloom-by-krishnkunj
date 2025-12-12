import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Download, CreditCard, TrendingUp, Users, DollarSign } from "lucide-react";
import { exportToCsvFile } from '@/utils/exportCsv';

export default function PaymentAnalytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    paidOrders: 0,
    pendingOrders: 0,
    avgOrderValue: 0
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const isAdmin = roles?.some((r) => r.role === "admin");
    
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    loadAnalytics();
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load all orders with profiles
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTransactions(orders || []);

      // Calculate stats
      const paidOrders = orders?.filter(o => o.status === 'paid') || [];
      const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const pendingCount = orders?.filter(o => o.status === 'pending' || o.status === 'processing').length || 0;
      const avgValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

      setStats({
        totalRevenue,
        paidOrders: paidOrders.length,
        pendingOrders: pendingCount,
        avgOrderValue: avgValue
      });

    } catch (error: any) {
      console.error("Error loading analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load payment analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = () => {
    const exportData = transactions.map(transaction => ({
      'Order ID': transaction.id.slice(0, 8),
      'Customer': transaction.profiles?.full_name || 'N/A',
      'Email': transaction.profiles?.email || 'N/A',
      'Amount': Number(transaction.total_amount),
      'Status': transaction.status,
      'Payment Date': new Date(transaction.created_at).toLocaleString(),
      'Discount': Number(transaction.discount_amount || 0),
      'Coupon': transaction.coupon_code || 'None'
    }));

    const fileName = `payment-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    exportToCsvFile(exportData, fileName);

    toast({ title: "Excel file downloaded successfully" });
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      paid: "default",
      pending: "secondary",
      processing: "secondary",
      failed: "destructive",
      cancelled: "destructive"
    };
    return <Badge variant={variants[status] || "secondary"}>{status.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Analytics</h1>
          <p className="text-muted-foreground">Track revenue, transactions, and payment trends</p>
        </div>
        <Button onClick={exportToCsv} className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From {stats.paidOrders} paid orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Orders</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paidOrders}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment/processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{Math.round(stats.avgOrderValue).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Per successful order</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Complete history of all payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono">{transaction.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{transaction.profiles?.full_name || 'N/A'}</span>
                      <span className="text-xs text-muted-foreground">{transaction.profiles?.email || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">₹{Number(transaction.total_amount).toLocaleString()}</TableCell>
                  <TableCell>
                    {transaction.discount_amount > 0 ? (
                      <div className="flex flex-col">
                        <span className="text-green-600">-₹{Number(transaction.discount_amount).toLocaleString()}</span>
                        {transaction.coupon_code && (
                          <Badge variant="outline" className="text-xs w-fit">{transaction.coupon_code}</Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(transaction.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
