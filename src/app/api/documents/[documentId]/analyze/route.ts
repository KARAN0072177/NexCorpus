import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth/require-api-user";
import { Document } from "@/features/documents/models/document.model";
import { documentAnalysisService } from "@/features/documents/services/analysis/document-analysis.service";

interface RouteContext {
  params: Promise<{
    documentId: string;
  }>;
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    const authResult = await requireApiUser();

    if (!authResult.user) {
      return authResult.response;
    }

    const { documentId } = await context.params;

    const document = await Document.findOne({
      _id: documentId,
      ownerId: authResult.user._id,
    });

    if (!document) {
      return NextResponse.json(
        {
          error: "Document not found",
        },
        {
          status: 404,
        }
      );
    }

    const structure =
      await documentAnalysisService.analyzeDocument(documentId);

    return NextResponse.json(
      {
        success: true,
        message: "Document structure analysis completed",
        structure,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Document structure analysis failed:", error);

    return NextResponse.json(
      {
        error: "Document structure analysis failed",
      },
      {
        status: 500,
      }
    );
  }
}
