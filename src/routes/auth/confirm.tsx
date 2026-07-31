import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthCallbackPage } from "./callback";

const confirmSearchSchema = z.object({
  code: z.string().optional(),
  token_hash: z.string().optional(),
  type: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
  error_code: z.string().optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth/confirm")({
  validateSearch: confirmSearchSchema,
  head: () => ({
    meta: [
      { title: "Confirming Authentication — ShipSmart Seller" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallbackPage,
});
