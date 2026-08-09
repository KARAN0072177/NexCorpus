import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/require-api-user";

import {
  findUserByUsername,
  updateUsername,
} from "@/features/auth/services/user.service";

import {
  isValidUsername,
  normalizeUsername,
} from "@/features/auth/utils/username";

export async function POST(request: Request) {
  try {
    const { user, response } = await requireApiUser();

    if (response) {
      return response;
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

    if (user.username) {
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
      user._id.toString(),
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

export async function GET() {
  try {
    const { user, response } = await requireApiUser();

    if (response) {
      return response;
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