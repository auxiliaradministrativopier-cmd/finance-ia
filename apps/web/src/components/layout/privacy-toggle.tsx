"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrivacy } from "@/providers/privacy-provider";

export function PrivacyToggle() {
  const { hideValues, toggleHideValues } = usePrivacy();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleHideValues}
      aria-pressed={hideValues}
      aria-label={hideValues ? "Mostrar valores" : "Ocultar valores"}
      title={hideValues ? "Mostrar valores" : "Ocultar valores"}
    >
      {hideValues ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </Button>
  );
}
