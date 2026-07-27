import { createServerFn } from "@tanstack/react-start";
import {
  connectMeesho,
  disconnectMeesho,
  getMeeshoStatus,
  compareSingleImage,
  compareImageVariants,
} from "../server/meesho";
import type { VariantInput } from "../../automation/types";

export const getMeeshoStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  return await getMeeshoStatus();
});

export const connectMeeshoFn = createServerFn({ method: "POST" })
  .validator((data: { email?: string; password?: string }) => data)
  .handler(async ({ data }) => {
    return await connectMeesho(
      data?.email && data?.password ? { email: data.email, password: data.password } : undefined,
    );
  });

export const disconnectMeeshoFn = createServerFn({ method: "POST" }).handler(async () => {
  return await disconnectMeesho();
});

export const compareSingleImageFn = createServerFn({ method: "POST" })
  .validator((data: { imagePath: string }) => data)
  .handler(async ({ data }) => {
    return await compareSingleImage(data.imagePath);
  });

export const compareVariantsFn = createServerFn({ method: "POST" })
  .validator((data: { variants: VariantInput[] }) => data)
  .handler(async ({ data }) => {
    return await compareImageVariants(data.variants);
  });
