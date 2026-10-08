import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkOwner, checkPasscode } from "./orders.functions";
import type { AdminRole } from "./orders.functions";

export interface StaffTask {
  id: string;
  created_at: string;
  description: string;
  assigned_to: string;
  assigned_by: string;
  status: "pending" | "completed";
  completed_at: string | null;
  completed_by: string | null;
}

export const adminListTasks = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      passcode: z.string(),
    }).parse(data)
  )
  .handler(async ({ data }): Promise<{ tasks: StaffTask[]; role: AdminRole; username: string }> => {
    // Determine the role and username of the caller
    const role = await checkPasscode(data.passcode);
    const { parseAdminCredential } = await import("./orders.functions");
    const credential = parseAdminCredential(data.passcode);
    const username = credential.username || "owner";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("staff_tasks")
      .select("*")
      .order("created_at", { ascending: false });

    // If not owner, only show tasks assigned to them specifically, or to 'everyone'
    if (role !== "owner") {
      query = query.or(`assigned_to.eq.${username},assigned_to.eq.everyone`);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("[adminListTasks] Error:", error);
      throw new Error(error.message);
    }

    return { tasks: rows as StaffTask[], role, username };
  });

export const adminCreateTask = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      passcode: z.string(),
      description: z.string().trim().min(1),
      assigned_to: z.string().trim().min(1).toLowerCase(),
    }).parse(data)
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const role = await checkPasscode(data.passcode);
    if (role !== "owner") throw new Error("Only the Administrator can create tasks.");

    const { parseAdminCredential } = await import("./orders.functions");
    const credential = parseAdminCredential(data.passcode);
    const username = credential.username || "owner";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("staff_tasks").insert({
      description: data.description,
      assigned_to: data.assigned_to,
      assigned_by: username,
      status: "pending",
    });

    if (error) {
      console.error("[adminCreateTask] Error:", error);
      throw new Error(error.message);
    }

    return { ok: true };
  });

export const adminCompleteTask = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      passcode: z.string(),
      taskId: z.string().uuid(),
    }).parse(data)
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    // Anyone can complete a task assigned to them
    const role = await checkPasscode(data.passcode);
    const { parseAdminCredential } = await import("./orders.functions");
    const credential = parseAdminCredential(data.passcode);
    const username = credential.username || "owner";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("staff_tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_by: username,
      })
      .eq("id", data.taskId);

    if (error) {
      console.error("[adminCompleteTask] Error:", error);
      throw new Error(error.message);
    }

    return { ok: true };
  });

export const adminDeleteTask = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      passcode: z.string(),
      taskId: z.string().uuid(),
    }).parse(data)
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const role = await checkPasscode(data.passcode);
    if (role !== "owner") throw new Error("Only the Administrator can delete tasks.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("staff_tasks").delete().eq("id", data.taskId);

    if (error) {
      console.error("[adminDeleteTask] Error:", error);
      throw new Error(error.message);
    }

    return { ok: true };
  });
