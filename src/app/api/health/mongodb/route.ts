import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";

export async function GET() {
  try {
    const mongoose = await connectToDatabase();

    if (mongoose.connection.readyState !== 1) {
      return NextResponse.json(
        {
          status: "error",
          database: "mongodb",
          message: "MongoDB is not connected",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "ok",
      database: "mongodb",
      message: "MongoDB connection is healthy",
    });
  } catch (error) {
    console.error("MongoDB health check failed:", error);

    return NextResponse.json(
      {
        status: "error",
        database: "mongodb",
        message: "MongoDB connection failed",
      },
      { status: 500 }
    );
  }
}