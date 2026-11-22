"use client";

import { Check, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { TextField, type TextFieldProps } from "@/components/ui/text-field";
import { cn } from "@/lib/cn";
import { passwordRules } from "../schemas";

export interface PasswordFieldProps extends Omit<TextFieldProps, "type" | "suffix"> {
  /** Mostra a lista de requisitos atendidos em tempo real (cadastro e nova senha). */
  showRequirements?: boolean;
}

export function PasswordField({ showRequirements = false, value, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const text = typeof value === "string" ? value : "";

  return (
    <div className="flex flex-col gap-2">
      <TextField
        {...props}
        value={value}
        type={visible ? "text" : "password"}
        suffix={
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={visible}
            className="-mr-2 flex size-control-sm cursor-pointer items-center justify-center rounded-md text-ink-muted hover:text-ink"
          >
            {visible ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        }
      />
      {showRequirements ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Requisitos da senha">
          {passwordRules.map((rule) => {
            const met = rule.test(text);
            return (
              <li
                key={rule.id}
                className={cn(
                  "flex items-center gap-1.5 text-caption",
                  met ? "text-brand" : "text-ink-muted",
                )}
              >
                <Check className={cn("size-3.5", !met && "opacity-30")} aria-hidden="true" />
                {rule.label}
                <span className="sr-only">{met ? "(atendido)" : "(pendente)"}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
