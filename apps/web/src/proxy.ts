import { NextResponse } from "next/server";

/**
 * A vitrine de componentes (/dev/*) não existe em produção: responde 404 antes de renderizar
 * (a página também chama notFound(), mas a área logada começa a responder antes e o status
 * sairia 200). Liberada com NEXT_PUBLIC_SHOW_DEV_PAGES=true (homologação).
 */
export function proxy() {
  const hidden =
    process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SHOW_DEV_PAGES !== "true";
  return hidden ? new NextResponse(null, { status: 404 }) : NextResponse.next();
}

export const config = { matcher: ["/dev/:path*"] };
