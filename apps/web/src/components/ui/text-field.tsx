import { useId } from "react";
import { cn } from "@/lib/cn";

export interface TextFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "prefix"
> {
  label: string;
  /** Texto de ajuda exibido abaixo do campo. */
  hint?: string;
  /** Mensagem de erro: diz o que houve e como corrigir. Substitui o hint. */
  error?: string;
  /** Conteúdo à esquerda do valor, como "R$" ou um ícone. */
  prefix?: React.ReactNode;
  /** Conteúdo à direita do valor, como um botão de mostrar senha. */
  suffix?: React.ReactNode;
  containerClassName?: string;
}

export function TextField({
  label,
  hint,
  error,
  prefix,
  suffix,
  id,
  className,
  containerClassName,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={cn("flex w-full flex-col gap-1.5", containerClassName)}>
      <label htmlFor={inputId} className="text-label font-medium text-ink">
        {label}
      </label>
      <div
        className={cn(
          "flex h-control-md items-center gap-2 rounded-md border bg-surface px-3 text-body text-ink",
          "transition-shadow focus-within:border-brand focus-within:shadow-[0_0_0_1px_var(--brand)]",
          error
            ? "border-danger shadow-[0_0_0_1px_var(--danger)] focus-within:border-danger focus-within:shadow-[0_0_0_1px_var(--danger)]"
            : "border-line-control",
          props.disabled && "opacity-50",
        )}
      >
        {prefix ? (
          <span className="flex shrink-0 items-center text-ink-muted [&_svg]:size-4">{prefix}</span>
        ) : null}
        <input
          id={inputId}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-muted disabled:cursor-not-allowed",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          {...props}
        />
        {suffix ? <span className="flex shrink-0 items-center">{suffix}</span> : null}
      </div>
      {message ? (
        <p id={messageId} className={cn("text-caption", error ? "text-danger" : "text-ink-muted")}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
