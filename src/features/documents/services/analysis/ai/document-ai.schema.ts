import { z } from "zod";

export interface DocumentAISection {
  titleBlockId: string;
  title: string;
  level: number;
  sourceBlockIds: string[];
  children: DocumentAISection[];
}

export const documentAISectionSchema: z.ZodType<DocumentAISection> = z.lazy(
  () =>
    z.object({
      titleBlockId: z.string().min(1),
      title: z.string().min(1),
      level: z.number().int().min(1).max(6),
      sourceBlockIds: z.array(z.string().min(1)),
      children: z.array(documentAISectionSchema),
    })
);

export const documentAIResultSchema = z.object({
  titleBlockId: z.string().min(1).nullable(),

  documentType: z.enum([
    "resume",
    "report",
    "article",
    "notes",
    "presentation",
    "invoice",
    "manual",
    "book",
    "unknown",
  ]),

  language: z.string().min(2).max(10).nullable(),

  sections: z.array(documentAISectionSchema),
});

export type DocumentAIResult = z.infer<typeof documentAIResultSchema>;