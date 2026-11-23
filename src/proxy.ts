import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // api/cron/* 제외 — Vercel이 크론으로 호출할 땐 로그인 쿠키가 없는
  // 서버 간 요청이라, 이 미들웨어를 그대로 거치면 "로그인 안 한
  // 사용자"로 보고 /login으로 리다이렉트해버려서 크론 라우트 자체가
  // 전혀 실행되지 않는다. 그 라우트는 Authorization 헤더(CRON_SECRET)로
  // 자체적으로 인증한다.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
