import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/pricing")({
  component: PricingPageRedirect,
});

function PricingPageRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/", search: { pricing: true }, replace: true });
  }, [navigate]);

  return null;
}
