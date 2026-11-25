"use client";

import { Camera, Check, Mail } from "lucide-react";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { AuthUser } from "@/features/auth/types";
import { AVATAR_TYPES } from "../avatar";
import type { UserProfile } from "@/data/models/user";
import { useProfileActions } from "../use-profile-actions";

const providerLabels: Record<string, string> = {
  password: "e-mail e senha",
  "google.com": "Google",
  "apple.com": "Apple",
};

const memberSince = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export function ProfileHeader({ user, profile }: { user: AuthUser; profile: UserProfile | null }) {
  const { savePhoto, removePhoto } = useProfileActions();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const name = profile?.displayName || user.displayName || user.email || "Você";
  const photo = user.photoUrl ?? profile?.photoUrl ?? null;
  const plan = profile?.plan?.id === "premium" ? "Plano Premium" : "Plano gratuito";

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      await savePhoto(file);
      toast({ title: "Foto atualizada." });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Não foi possível enviar a foto.",
        tone: "error",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="flex-row flex-wrap items-center gap-5 p-5">
      <div className="relative">
        <Avatar name={name} src={photo} className="size-20 text-h2" />
        <Button
          size="icon-sm"
          variant="secondary"
          className="absolute -right-1 -bottom-1 rounded-full shadow-sm"
          aria-label="Alterar foto"
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? null : <Camera aria-hidden="true" />}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onFile}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-h2">{name}</h2>
          <Badge tone="neutral">{plan}</Badge>
        </div>
        <p className="flex items-center gap-1.5 truncate text-body text-ink-muted">
          <Mail className="size-4 shrink-0" aria-hidden="true" />
          {user.email}
          {user.emailVerified ? (
            <Badge tone="success" icon={<Check aria-hidden="true" />} className="ml-1">
              Confirmado
            </Badge>
          ) : null}
        </p>
        <p className="text-caption text-ink-muted">
          Entra com{" "}
          {user.providerIds.map((id) => providerLabels[id] ?? id).join(" e ") || "e-mail e senha"}
          {profile?.createdAt ? ` · Membro desde ${memberSince.format(profile.createdAt)}` : null}
        </p>
      </div>
      {photo ? (
        <Button
          variant="tertiary"
          size="sm"
          onClick={async () => {
            try {
              await removePhoto();
              toast({ title: "Foto removida." });
            } catch (error) {
              toast({
                title: error instanceof Error ? error.message : "Não foi possível remover.",
                tone: "error",
              });
            }
          }}
        >
          Remover foto
        </Button>
      ) : null}
    </Card>
  );
}
