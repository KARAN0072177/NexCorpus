import mongoose, {
  Schema,
  type Model,
} from "mongoose";

export interface IDocumentAISection {
  titleBlockId: string;
  title: string;
  level: number;
  sourceBlockIds: string[];
  children: IDocumentAISection[];
}

export interface IDocumentAIAnalysis {
  documentId: mongoose.Types.ObjectId;

  titleBlockId?: string | null;

  documentType:
    | "resume"
    | "report"
    | "article"
    | "notes"
    | "presentation"
    | "invoice"
    | "manual"
    | "book"
    | "unknown";

  language?: string | null;

  sections: IDocumentAISection[];

  createdAt: Date;
  updatedAt: Date;
}

const documentAISectionSchema =
  new Schema<IDocumentAISection>(
    {
      titleBlockId: {
        type: String,
        required: true,
        trim: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
      },

      level: {
        type: Number,
        required: true,
        min: 1,
        max: 6,
      },

      sourceBlockIds: {
        type: [String],
        required: true,
        default: [],
      },

      children: {
        type: [],
        default: [],
      },
    },
    {
      _id: false,
    }
  );

/*
 * Mongoose does not automatically resolve the
 * recursive TypeScript type used by children.
 *
 * Assign the recursive schema after creation.
 */

documentAISectionSchema.path(
  "children",
  [documentAISectionSchema]
);

const documentAIAnalysisSchema =
  new Schema<IDocumentAIAnalysis>(
    {
      documentId: {
        type: Schema.Types.ObjectId,
        ref: "Document",
        required: true,
        unique: true,
        index: true,
      },

      titleBlockId: {
        type: String,
        trim: true,
        default: null,
      },

      documentType: {
        type: String,
        enum: [
          "resume",
          "report",
          "article",
          "notes",
          "presentation",
          "invoice",
          "manual",
          "book",
          "unknown",
        ],
        required: true,
        default: "unknown",
      },

      language: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
      },

      sections: {
        type: [documentAISectionSchema],
        required: true,
        default: [],
      },
    },
    {
      timestamps: true,
    }
  );

// Delete cached model in Next.js development mode so schema updates take effect
if (process.env.NODE_ENV !== "production") {
  delete (mongoose.models as Record<string, unknown>).DocumentAIAnalysis;
}

export const DocumentAIAnalysis: Model<IDocumentAIAnalysis> =
  mongoose.models.DocumentAIAnalysis ||
  mongoose.model<IDocumentAIAnalysis>(
    "DocumentAIAnalysis",
    documentAIAnalysisSchema
  );