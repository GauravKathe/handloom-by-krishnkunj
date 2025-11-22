import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
}

interface Profile {
  full_name: string;
  email: string;
}

interface ActivityLogWithProfile extends ActivityLog {
  profile?: Profile;
}

export default function ActivityLog() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLogWithProfile[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const { data: activityData, error } = await supabase
      .from("admin_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error loading activity logs:", error);
      setLoading(false);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(activityData?.map(log => log.user_id) || [])];
    
    // Fetch profile data for these users
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    // Create a map of user_id to profile
    const profileMap = new Map(profileData?.map(p => [p.id, p]) || []);

    // Combine the data
    const logsWithProfiles = activityData?.map(log => ({
      ...log,
      profile: profileMap.get(log.user_id)
    })) || [];

    setLogs(logsWithProfiles);
    setLoading(false);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "create":
        return "default";
      case "update":
        return "secondary";
      case "delete":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getEntityBadgeColor = (entity: string) => {
    switch (entity.toLowerCase()) {
      case "coupon":
        return "default";
      case "order":
        return "secondary";
      case "product":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Activity Log</h1>
        <p className="text-muted-foreground">
          Track all admin actions across the platform
        </p>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No activity logs yet. Actions will appear here as they happen.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Showing the last {logs.length} actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{log.profile?.full_name || "Unknown"}</div>
                        <div className="text-muted-foreground text-xs">{log.profile?.email || ""}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeColor(log.action_type)}>
                        {log.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEntityBadgeColor(log.entity_type)}>
                        {log.entity_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      {log.action_type === "update" && log.new_data && (
                        <div className="text-sm text-muted-foreground">
                          Updated: {Object.keys(log.new_data).join(", ")}
                        </div>
                      )}
                      {log.action_type === "create" && log.new_data && (
                        <div className="text-sm text-muted-foreground">
                          Created new {log.entity_type}
                        </div>
                      )}
                      {log.action_type === "delete" && (
                        <div className="text-sm text-muted-foreground">
                          Deleted {log.entity_type}
                        </div>
                      )}
                    </TableCell>
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
