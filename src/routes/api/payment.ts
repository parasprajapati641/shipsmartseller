import { createServerFn } from "@tanstack/react-start";

export const createCashfreeOrder = createServerFn({
  method: "POST",
}).handler(async () => {
  // Here you will call the Cashfree API
  return {
    payment_session_id: "SESSION_ID_FROM_CASHFREE",
  };
});