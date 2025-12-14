import { useState, useEffect } from "react";
import { invokeAdminFunction } from "@/lib/adminApi";
import type { Coupon as CouponType } from '@/types';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
import { format } from "date-fns";


interface CouponStats {
  code: string;
  total_uses: number;
  total_revenue: number;
  unique_customers: number;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<CouponType[]>([]);
  const [couponStats, setCouponStats] = useState<CouponStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  const [formData, setFormData] = useState({
    code: "",
    discount_percentage: "",
    expiry_date: "",
    minimum_purchase_amount: "",
    max_usage_limit: "",
    status: "active",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadCoupons(), loadCouponStats()]);
    setLoading(false);
  };

  const loadCoupons = async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading coupons",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCoupons(data || []);
    }
  };

  const loadCouponStats = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("coupon_code, total_amount, discount_amount, user_id")
      .not("coupon_code", "is", null);

    if (!error && data) {
      const statsMap = new Map<string, CouponStats>();

      data.forEach((order) => {
        const code = order.coupon_code!;
        if (!statsMap.has(code)) {
          statsMap.set(code, {
            code,
            total_uses: 0,
            total_revenue: 0,
            unique_customers: 0,
          });
        }

        const stats = statsMap.get(code)!;
        stats.total_uses++;
        stats.total_revenue += Number(order.total_amount);
      });

      // Count unique customers
      for (const [code, stats] of statsMap.entries()) {
        const uniqueUsers = new Set(
          data.filter(o => o.coupon_code === code).map(o => o.user_id)
        );
        stats.unique_customers = uniqueUsers.size;
      }

      setCouponStats(Array.from(statsMap.values()));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const couponData = {
      code: formData.code.toUpperCase(),
      discount_percentage: parseFloat(formData.discount_percentage),
      expiry_date: formData.expiry_date,
      minimum_purchase_amount: parseFloat(formData.minimum_purchase_amount),
      max_usage_limit: parseInt(formData.max_usage_limit),
      status: formData.status,
    };

    try {
      if (editingCoupon) {
        const oldData = { ...editingCoupon };
        const { data: resp, error } = await invokeAdminFunction('admin-manage-coupons', {
          action: 'update', coupon: { ...couponData, id: editingCoupon.id }
        });

        if (error) throw error;

        await logActivity('update', 'coupon', editingCoupon.id, oldData, couponData);
        toast({ title: 'Coupon updated successfully' });
        setDialogOpen(false);
        resetForm();
        loadCoupons();
      } else {
        const { data: resp, error } = await invokeAdminFunction('admin-manage-coupons', {
          action: 'create', coupon: couponData
        });

        if (error) throw error;

        await logActivity('create', 'coupon', (resp as any)?.coupon?.id || null, null, couponData);
        toast({ title: 'Coupon created successfully' });
        setDialogOpen(false);
        resetForm();
        loadCoupons();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Admin authorization required', variant: 'destructive' });
    }
  };

  const handleEdit = (coupon: CouponType) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_percentage: coupon.discount_percentage.toString(),
      expiry_date: coupon.expiry_date.split("T")[0],
      minimum_purchase_amount: coupon.minimum_purchase_amount.toString(),
      max_usage_limit: coupon.max_usage_limit.toString(),
      status: coupon.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    const coupon = coupons.find(c => c.id === id);
    try {
      const { error } = await invokeAdminFunction('admin-manage-coupons', { action: 'delete', coupon: { id } });
      if (error) throw error;
      await logActivity("delete", "coupon", id, coupon, null);
      toast({ title: "Coupon deleted successfully" });
      loadCoupons();
      return;
    } catch (err: any) {
      toast({
        title: "Error deleting coupon",
        description: err?.message || 'Failed to delete coupon',
        variant: "destructive",
      });
    }
  };

  const toggleStatus = async (coupon: CouponType) => {
    const newStatus = coupon.status === "active" ? "inactive" : "active";
    const oldData = { status: coupon.status };

    try {
      const { error } = await supabase.functions.invoke('admin-manage-coupons', {
        body: { action: 'update', coupon: { id: coupon.id, status: newStatus } }
      });

      if (error) throw error;

      await logActivity("update", "coupon", coupon.id, oldData, { status: newStatus });
      toast({ title: "Status updated successfully" });
      loadCoupons();
    } catch (err: any) {
      toast({
        title: "Error updating status",
        description: err?.message || 'Admin authorization required',
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      discount_percentage: "",
      expiry_date: "",
      minimum_purchase_amount: "",
      max_usage_limit: "",
      status: "active",
    });
    setEditingCoupon(null);
  };

  const filteredCoupons = coupons.filter((coupon) =>
    coupon.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Coupon Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Add Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? "Edit Coupon" : "Add New Coupon"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="code">Coupon Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER2024"
                  required
                />
              </div>
              <div>
                <Label htmlFor="discount">Discount Percentage (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="minimum">Minimum Purchase Amount (₹)</Label>
                <Input
                  id="minimum"
                  type="number"
                  min="0"
                  value={formData.minimum_purchase_amount}
                  onChange={(e) => setFormData({ ...formData, minimum_purchase_amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="max_usage">Max Usage Limit</Label>
                <Input
                  id="max_usage"
                  type="number"
                  min="1"
                  value={formData.max_usage_limit}
                  onChange={(e) => setFormData({ ...formData, max_usage_limit: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.status === "active"}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, status: checked ? "active" : "inactive" })
                  }
                />
                <Label>Active</Label>
              </div>
              <Button type="submit" className="w-full">
                {editingCoupon ? "Update Coupon" : "Create Coupon"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Coupon Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {couponStats.map((stat) => (
          <Card key={stat.code}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.code}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold">₹{stat.total_revenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.total_uses} uses • {stat.unique_customers} customers
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Coupons</CardTitle>
            <Input
              placeholder="Search coupons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Min Purchase</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-medium">{coupon.code}</TableCell>
                  <TableCell>{coupon.discount_percentage}%</TableCell>
                  <TableCell>{format(new Date(coupon.expiry_date), "PPP")}</TableCell>
                  <TableCell>₹{coupon.minimum_purchase_amount}</TableCell>
                  <TableCell>
                    {coupon.current_usage_count} / {coupon.max_usage_limit}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={coupon.status === "active"}
                      onCheckedChange={() => toggleStatus(coupon)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(coupon)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(coupon.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
