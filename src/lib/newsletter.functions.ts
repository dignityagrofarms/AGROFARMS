import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const subscribeSchema = z.object({
  email: z.string().trim().email(),
});

export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => subscribeSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .insert({ email: data.email.toLowerCase() });
    if (error && !/duplicate key|unique/i.test(error.message)) {
      console.error("subscribe failed", error);
      throw new Error("Could not subscribe you. Please try again.");
    }
    return { ok: true };
  });
