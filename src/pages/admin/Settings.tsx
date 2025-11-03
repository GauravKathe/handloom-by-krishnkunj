import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({ title: "Settings saved successfully" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your admin settings</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Settings</CardTitle>
            <CardDescription>Configure payment gateway and processing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Payment Gateway</Label>
              <Input placeholder="Razorpay/Stripe API Key" type="password" />
            </div>
            <Button onClick={handleSave}>Save Payment Settings</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Settings</CardTitle>
            <CardDescription>Set delivery charges and tax rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Standard Delivery Charge (₹)</Label>
              <Input type="number" placeholder="100" />
            </div>
            <div>
              <Label>Tax Rate (%)</Label>
              <Input type="number" placeholder="5" />
            </div>
            <Button onClick={handleSave}>Save Delivery Settings</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Profile</CardTitle>
            <CardDescription>Update your admin account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input placeholder="Admin Name" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="admin@example.com" />
            </div>
            <div>
              <Label>New Password</Label>
              <Input type="password" placeholder="Leave blank to keep current password" />
            </div>
            <Button onClick={handleSave}>Update Profile</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}