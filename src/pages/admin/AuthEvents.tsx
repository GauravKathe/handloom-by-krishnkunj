import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search, RefreshCw, AlertTriangle, CheckCircle, XCircle, LogIn, UserPlus, Key } from "lucide-react";
import { format } from "date-fns";

interface AuthEvent {
  id: string;
  user_id: string | null;
  email: string;
  event_type: string;
  metadata: Record<string, any>;
  created_at: string;
}

export default function AuthEvents() {
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    loadEvents();
  }, [filterType]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("auth_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterType !== "all") {
        query = query.eq("event_type", filterType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents((data as AuthEvent[]) || []);
    } catch (error) {
      console.error("Error loading auth events:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "login_success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "login_failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "signup_success":
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case "signup_failed":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "password_reset_requested":
        return <Key className="h-4 w-4 text-yellow-500" />;
      default:
        return <LogIn className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventBadge = (eventType: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      login_success: "default",
      login_failed: "destructive",
      signup_success: "secondary",
      signup_failed: "destructive",
      password_reset_requested: "outline",
    };

    return (
      <Badge variant={variants[eventType] || "outline"}>
        {eventType.replace(/_/g, " ")}
      </Badge>
    );
  };

  const filteredEvents = events.filter((event) =>
    event.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  const failedLoginCount = events.filter(e => e.event_type === "login_failed").length;
  const successLoginCount = events.filter(e => e.event_type === "login_success").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Authentication Events
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor login attempts, signups, and security events
          </p>
        </div>
        <Button onClick={loadEvents} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Successful Logins</p>
                <p className="text-2xl font-bold text-green-600">{successLoginCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed Attempts</p>
                <p className="text-2xl font-bold text-red-600">{failedLoginCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Event Log</CardTitle>
          <CardDescription>Recent authentication activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="login_success">Login Success</SelectItem>
                <SelectItem value="login_failed">Login Failed</SelectItem>
                <SelectItem value="signup_success">Signup Success</SelectItem>
                <SelectItem value="signup_failed">Signup Failed</SelectItem>
                <SelectItem value="password_reset_requested">Password Reset</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No events found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{getEventIcon(event.event_type)}</TableCell>
                      <TableCell className="font-mono text-sm">{event.email}</TableCell>
                      <TableCell>{getEventBadge(event.event_type)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {event.metadata?.error || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(event.created_at), "MMM d, yyyy HH:mm:ss")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
