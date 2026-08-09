import mongoose, { Schema, type Model } from "mongoose";

export interface IDocumentStructureSection {
  title: string;
  level: number;

  sourceBlockIds: string[];

  children: IDocumentStructureSection[];
}

export interface IDocumentStructure {
  documentId: mongoose.Types.ObjectId;

  sections: IDocumentStructureSection[];

  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema(
  {
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
  },
  {
    _id: false,
  }
);

sectionSchema.add({
  children: {
    type: [sectionSchema],
    default: [],
  },
});

const documentStructureSchema = new Schema<IDocumentStructure>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      unique: true,
      index: true,
    },

    sections: {
      type: [sectionSchema],
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
  delete (mongoose.models as Record<string, unknown>).DocumentStructure;
}

export const DocumentStructure: Model<IDocumentStructure> =
  mongoose.models.DocumentStructure ||
  mongoose.model<IDocumentStructure>(
    "DocumentStructure",
    documentStructureSchema
  );