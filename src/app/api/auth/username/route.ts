import { NextResponse } from "next/server";

import { auth } from "../../../../../auth";
import {
  findUserByUsername,
  findUserById,
  updateUsername,
} from "@/features/auth/services/user.service";

import {
  isValidUsername,
  normalizeUsername,
} from "@/features/auth/utils/username";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (typeof body.username !== "string") {
      return NextResponse.json(
        {
          error: "Username is required",
        },
        { status: 400 }
      );
    }

    const username = normalizeUsername(body.username);

    if (!isValidUsername(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-30 characters and contain only letters, numbers, and underscores.",
        },
        { status: 400 }
      );
    }

    const currentUser = await findUserById(session.user.id);

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        { status: 404 }
      );
    }

    if (currentUser.username) {
      return NextResponse.json(
        {
          error: "Username has already been set",
        },
        { status: 409 }
      );
    }

    const existingUsername = await findUserByUsername(username);

    if (existingUsername) {
      return NextResponse.json(
        {
          error: "Username is already taken",
        },
        { status: 409 }
      );
    }

    const updatedUser = await updateUsername(
      session.user.id,
      username
    );

    if (!updatedUser) {
      return NextResponse.json(
        {
          error: "Unable to update username",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser._id.toString(),
        username: updatedUser.username,
      },
    });
  } catch (error) {
    console.error("Username setup failed:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// get username status

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const user = await findUserById(session.user.id);

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      username: user.username ?? null,
      usernameRequired: !user.username,
    });
  } catch (error) {
    console.error("Username status check failed:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}