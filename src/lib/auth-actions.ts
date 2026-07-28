import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server Function to create user account with auto-confirmation enabled (email_confirm: true),
 * completely bypassing email verification & suppressing any unbranded third-party emails.
 */
export const createDirectAccountFn = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("../integrations/supabase/client.server.js");
      const { data: userData, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true, // Auto-confirm user email, preventing verification email dispatch
        user_metadata: {
          platform: "ShipSmart Seller",
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, userId: userData.user.id };
    } catch (err) {
      // If service role key is not configured, signal client to use standard signup
      return { success: false, fallback: true };
    }
  });
