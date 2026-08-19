import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { deleteUserAccount } from "@/features/auth/services/user.service";

export async function DELETE() {
  try {
    const { user, response } = await requireApiUser();

    if (response) {
      return response;
    }

    const result = await deleteUserAccount(user._id.toString());

    if (!result) {
      return NextResponse.json(
        {
          error: "User account not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account and all associated documents permanently deleted.",
    });
  } catch (error) {
    console.error("Account deletion failed:", error);

    return NextResponse.json(
      {
        error: "Internal server error during account deletion",
      },
      { status: 500 }
    );
  }
}
