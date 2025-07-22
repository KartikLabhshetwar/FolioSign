import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { z } from "zod";
import { Document } from "../db/models/document.model";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, PutObjectCommand, S3 } from "@aws-sdk/client-s3";
import { s3 } from "../lib/s3";
import { randomUUID } from "crypto";
import { PDFDocument } from "pdf-lib";

async function getObjectFromS3(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
  });
  const response = await s3.send(command);
  const stream = response.Body;
  if (!stream) {
    throw new Error("Failed to get object from S3");
  }
  const chunks = [];
  for await (const chunk of stream as any) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function putObjectToS3(key: string, body: Buffer) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: body,
  });
  await s3.send(command);
}

export const documentRouter = router({
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const document = await Document.findById(input.id);

      if (!document) {
        throw new Error("Document not found");
      }

      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: document.key,
      });

      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

      return { ...document.toObject(), url };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const documents = await Document.find({ userId: ctx.session.user.id });
    return documents;
  }),

  createDocument: protectedProcedure
    .input(z.object({ name: z.string(), key: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const document = new Document({
        _id: randomUUID(),
        ...input,
        userId: ctx.session?.user.id, // Now optional
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await document.save();
      return document;
    }),

  createPresignedUrl: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const key = `${ctx.session.user.id}/${input.name}-${Date.now()}`;
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
      });
      const presignedUrl = await getSignedUrl(s3, command, {
        expiresIn: 3600,
      });
      return { presignedUrl, key };
    }),
  signDocument: publicProcedure
    .input(
      z.object({
        docId: z.string(),
        signature: z.string(), // base64 encoded image
        visitorId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const document = await Document.findById(input.docId);

      if (!document) {
        throw new Error("Document not found");
      }

      // Add visitorId to the document
      document.set({ visitorId: input.visitorId });
      await document.save();

      const pdfBuffer = await getObjectFromS3(document.key);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const signatureImage = await pdfDoc.embedPng(input.signature);
      
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      firstPage.drawImage(signatureImage, {
        x: firstPage.getWidth() / 2 - 100,
        y: 100,
        width: 200,
        height: 100,
      });

      const pdfBytes = await pdfDoc.save();
      await putObjectToS3(document.key, Buffer.from(pdfBytes));

      return { success: true };
    }),
}); 