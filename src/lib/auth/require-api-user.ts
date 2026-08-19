import { NextResponse } from "next/server";
import { getCurrentUser } from "./get-current-user";
import { rateLimiterService } from "@/lib/security/rate-limiter.service";

export async function requireApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        {
          success: false,
          error: "Unauthorized access. Please log in.",
        },
        { status: 401 }
      ),
    };
  }

  // Rate Limiter Enforcement (25 requests / 1 minute)
  const rateLimitResult = rateLimiterService.check(user.id);

  if (!rateLimitResult.allowed) {
    return {
      user,
      response: NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Maximum ${rateLimitResult.limit} requests per minute allowed. Please try again in ${rateLimitResult.resetSeconds} seconds.`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(rateLimitResult.resetSeconds),
          },
        }
      ),
    };
  }

  return {
    user,
    response: null,
  };
}