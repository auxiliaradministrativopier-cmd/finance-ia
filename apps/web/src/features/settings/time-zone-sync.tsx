"use client";

import { useEffect } from "react";
import { setUserTimeZone } from "@/lib/time";
import { usePreferences } from "./use-preferences";

/** Aplica o fuso horário das preferências às contas de data do app. */
export function TimeZoneSync() {
  const { preferences } = usePreferences();
  const timeZone = preferences?.timezone;
  useEffect(() => {
    if (timeZone) setUserTimeZone(timeZone);
  }, [timeZone]);
  return null;
}
