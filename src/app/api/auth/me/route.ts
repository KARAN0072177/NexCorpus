// auth/me api route - this api is used to get the current user's information

import { NextResponse } from "next/server";

import { auth } from "../../../../../auth";
import { findUserById } from "@/features/auth/services/user.service";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        { status: 401 }
      );
    }

    const user = await findUserById(session.user.id);

    if (!user) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id.toString(),
        username: user.username ?? null,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
      },
    });
  } catch (error) {
    console.error("Auth identity check failed:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}