import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Search, Mail, Phone, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCustomers();

    // Set up realtime listener for profiles table
    const channel = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          // Reload customers when profiles change
          loadCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCustomers = async () => {
    try {
      // Load profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Error loading customers:", profilesError);
        toast({ title: "Error loading customers", description: profilesError.message, variant: "destructive" });
        return;
      }

      // Load order counts for each profile
      const customersWithOrderCounts = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { count } = await supabase
            .from("orders")
            .select("*", { count: 'exact', head: true })
            .eq("user_id", profile.id);
          
          return {
            ...profile,
            orders: [{ count: count || 0 }]
          };
        })
      );

      console.log("Loaded customers:", customersWithOrderCounts);
      setCustomers(customersWithOrderCounts);
    } catch (error) {
      console.error("Exception loading customers:", error);
      toast({ title: "Error loading customers", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = filteredCustomers.map(customer => ({
        'Customer Name': customer.full_name,
        'Email': customer.email,
        'Mobile Number': customer.mobile_number || 'N/A',
        'City': customer.city,
        'State': customer.state,
        'Total Orders': customer.orders?.[0]?.count || 0,
        'Joined Date': new Date(customer.created_at).toLocaleDateString()
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');

      // Generate file name with current date
      const fileName = `Customers_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Write file
      XLSX.writeFile(wb, fileName);
      
      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} customers to Excel`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Could not export customer data",
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
          <h1 className="text-3xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground">View and manage registered customers</p>
        </div>
        <Button onClick={exportToExcel} className="gap-2">
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name, email, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Customer</th>
                  <th className="text-left p-2">Contact</th>
                  <th className="text-left p-2">Location</th>
                  <th className="text-left p-2">Orders</th>
                  <th className="text-left p-2">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{customer.full_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {customer.mobile_number || "N/A"}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="text-sm">
                        <div>{customer.city}</div>
                        <div className="text-muted-foreground">{customer.state}</div>
                      </div>
                    </td>
                    <td className="p-2">
                      <span className="font-medium">{customer.orders?.[0]?.count || 0}</span>
                    </td>
                    <td className="p-2 text-sm">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}