import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Search, Eye, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as XLSX from 'xlsx';

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          profiles(full_name, email, mobile_number, city, state),
          order_items(*)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading orders:", error);
        toast({ 
          title: "Error loading orders", 
          description: error.message,
          variant: "destructive" 
        });
        return;
      }

      console.log("Loaded orders:", data);
      setOrders(data || []);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({ title: "Error loading orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
      toast({ title: "Order status updated" });
      loadOrders();
    } catch (error) {
      toast({ title: "Error updating order", variant: "destructive" });
    }
  };

  const viewOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    const orderDate = new Date(order.created_at);
    const matchesFromDate = !fromDate || orderDate >= new Date(fromDate);
    const matchesToDate = !toDate || orderDate <= new Date(toDate + 'T23:59:59');
    
    return matchesSearch && matchesStatus && matchesFromDate && matchesToDate;
  });

  const exportToExcel = () => {
    try {
      // Prepare order data with full shipping address and ordered items
      const orderExportData = filteredOrders.map(order => {
        // Format ordered items as a readable string
        const orderedItemsStr = order.order_items?.map((item: any) => {
          const productName = item.product_name || 'Unknown Product';
          const qty = item.quantity;
          const price = Number(item.item_total || item.price).toLocaleString();
          return `${productName} x${qty} (₹${price})`;
        }).join(' | ') || 'No items';

        return {
          'Order ID': order.id,
          'Customer Name': order.profiles?.full_name || 'Unknown',
          'Customer Email': order.profiles?.email || 'N/A',
          'Mobile': order.profiles?.mobile_number || 'N/A',
          'City': order.profiles?.city || 'N/A',
          'State': order.profiles?.state || 'N/A',
          'Shipping House': order.shipping_address?.house || order.shipping_address?.houseNo || 'N/A',
          'Shipping Street': order.shipping_address?.street || 'N/A',
          'Shipping Landmark': order.shipping_address?.landmark || '',
          'Shipping City': order.shipping_address?.city || 'N/A',
          'Shipping State': order.shipping_address?.state || 'N/A',
          'Shipping Pincode': order.shipping_address?.pincode || 'N/A',
          'Ordered Items': orderedItemsStr,
          'Total Amount': `₹${Number(order.total_amount).toLocaleString()}`,
          'Discount': order.discount_amount ? `₹${Number(order.discount_amount).toLocaleString()}` : '₹0',
          'Coupon Code': order.coupon_code || 'None',
          'Status': order.status,
          'Order Date': new Date(order.created_at).toLocaleDateString(),
          'Order Time': new Date(order.created_at).toLocaleTimeString()
        };
      });

      // Prepare detailed items data with SKU and variants from snapshot
      const itemsExportData: any[] = [];
      filteredOrders.forEach(order => {
        order.order_items?.forEach((item: any) => {
          itemsExportData.push({
            'Order ID': order.id,
            'Customer Name': order.profiles?.full_name || 'Unknown',
            'Product Name': item.product_name || 'N/A',
            'SKU': item.product_sku || 'N/A',
            'Color': item.product_color || 'N/A',
            'Fabric': item.product_fabric || 'N/A',
            'Quantity': item.quantity,
            'Unit Price': `₹${Number((item.item_total || item.price) / item.quantity).toLocaleString()}`,
            'Total Price': `₹${Number(item.item_total || item.price).toLocaleString()}`,
            'Order Date': new Date(order.created_at).toLocaleDateString()
          });
        });
      });

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Add Orders Summary sheet
      const ordersWS = XLSX.utils.json_to_sheet(orderExportData);
      XLSX.utils.book_append_sheet(wb, ordersWS, 'Orders Summary');

      // Add Order Items Details sheet
      const itemsWS = XLSX.utils.json_to_sheet(itemsExportData);
      XLSX.utils.book_append_sheet(wb, itemsWS, 'Order Items');

      // Generate file name with current date
      const fileName = `Orders_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Write file
      XLSX.writeFile(wb, fileName);
      
      toast({
        title: "Export Successful",
        description: `Exported ${orderExportData.length} orders to Excel`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Could not export order data",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">Track and manage customer orders</p>
        </div>
        <Button onClick={exportToExcel} className="gap-2">
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="From Date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full md:w-[160px]"
              />
              <Input
                type="date"
                placeholder="To Date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full md:w-[160px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Order ID</th>
                  <th className="text-left p-2">Customer</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono text-sm">{order.id.slice(0, 8)}</td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{order.profiles?.full_name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{order.profiles?.email || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="p-2">₹{Number(order.total_amount).toLocaleString()}</td>
                      <td className="p-2">
                        <Select
                          value={order.status}
                          onValueChange={(value) => updateOrderStatus(order.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="p-2">
                        <div className="flex justify-end">
                          <Button variant="ghost" size="icon" onClick={() => viewOrderDetails(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedOrder.profiles?.full_name}</p>
                    <p><span className="font-medium">Email:</span> {selectedOrder.profiles?.email}</p>
                    <p><span className="font-medium">Phone:</span> {selectedOrder.profiles?.mobile_number}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Order Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Order ID:</span> {selectedOrder.id}</p>
                    <p><span className="font-medium">Date:</span> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                    <p><span className="font-medium">Status:</span> {selectedOrder.status}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Shipping Address</h3>
                <div className="bg-muted p-3 rounded text-sm space-y-1">
                  <p>{selectedOrder.shipping_address?.house}</p>
                  <p>{selectedOrder.shipping_address?.street}</p>
                  {selectedOrder.shipping_address?.landmark && (
                    <p>Landmark: {selectedOrder.shipping_address.landmark}</p>
                  )}
                  <p>{selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state}</p>
                  <p>Pincode: {selectedOrder.shipping_address?.pincode}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.order_items?.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No items found for this order</p>
                  ) : (
                    selectedOrder.order_items?.map((item: any) => {
                      // Use snapshot data from order_items
                      const productName = item.product_name || 'Product Unavailable';
                      const productImage = item.product_image;
                      const productSku = item.product_sku || '';
                      const productColor = item.product_color || 'N/A';
                      const productFabric = item.product_fabric || 'N/A';
                      
                      return (
                        <div key={item.id} className="flex items-start gap-4 p-3 border rounded-lg bg-card">
                          <div className="w-24 h-24 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                            {productImage ? (
                              <img 
                                src={productImage} 
                                alt={productName} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                No Image
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base mb-1">
                              {productName}
                            </p>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {productSku && (
                                <p>SKU: <span className="font-medium text-foreground font-mono">{productSku}</span></p>
                              )}
                              <p>Color: <span className="font-medium text-foreground">{productColor}</span></p>
                              <p>Fabric: <span className="font-medium text-foreground">{productFabric}</span></p>
                              <p>Quantity: <span className="font-medium text-foreground">{item.quantity}</span></p>
                              <p>Price at Purchase: <span className="font-medium text-foreground">₹{Number(item.price).toLocaleString()}</span></p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span>₹{Number(selectedOrder.total_amount).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}