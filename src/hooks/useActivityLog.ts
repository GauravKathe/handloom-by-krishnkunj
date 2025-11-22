import { supabase } from "@/integrations/supabase/client";

export const useActivityLog = () => {
  const logActivity = async (
    actionType: "create" | "update" | "delete",
    entityType: "coupon" | "order" | "product",
    entityId: string | null,
    oldData?: any,
    newData?: any
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("No authenticated user for activity log");
        return;
      }

      const { error } = await supabase
        .from("admin_activity_log")
        .insert({
          user_id: user.id,
          action_type: actionType,
          entity_type: entityType,
          entity_id: entityId,
          old_data: oldData || null,
          new_data: newData || null,
        });

      if (error) {
        console.error("Error logging activity:", error);
      }
    } catch (error) {
      console.error("Error in logActivity:", error);
    }
  };

  return { logActivity };
};
