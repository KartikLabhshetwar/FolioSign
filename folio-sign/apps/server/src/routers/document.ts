import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { z } from "zod";
import { Document } from "../db/models/document.model";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3 } from "@aws-sdk/client-s3";
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
    ContentType: 'application/pdf',
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

  createDocument: publicProcedure
    .input(z.object({ name: z.string(), key: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const document = new Document({
        _id: randomUUID(),
        ...input,
        userId: ctx.session?.user?.id || null, // null for guest users, user ID for authenticated users
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await document.save();
      return document;
    }),

  createPresignedUrl: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Extract file extension and base name
      const lastDotIndex = input.name.lastIndexOf('.');
      const baseName = lastDotIndex > 0 ? input.name.substring(0, lastDotIndex) : input.name;
      const extension = lastDotIndex > 0 ? input.name.substring(lastDotIndex) : '';
      
      // Create a clean key with timestamp before extension
      const timestamp = Date.now();
      const userId = ctx.session?.user?.id || 'guest';
      const key = `${userId}/${baseName}_${timestamp}${extension}`;
      
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
      });
      const presignedUrl = await getSignedUrl(s3, command, {
        expiresIn: 3600,
      });
      return { presignedUrl, key };
    }),

  deleteDocument: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const document = await Document.findById(input.id);
      
      if (!document) {
        throw new Error("Document not found");
      }

      // Check if user has permission to delete this document
      // Allow deletion if:
      // 1. User is authenticated and owns the document
      // 2. Document belongs to a guest user (temporary documents)
      const isOwner = ctx.session?.user?.id && document.userId === ctx.session.user.id;
      const isGuestDocument = !document.userId; // Guest documents have null userId
      
      if (!isOwner && !isGuestDocument) {
        throw new Error("You don't have permission to delete this document");
      }

      // Delete from S3
      try {
        const command = new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: document.key,
        });
        await s3.send(command);
        console.log('Successfully deleted from S3:', document.key);
      } catch (error) {
        console.error('Error deleting from S3:', error);
        // Don't throw error - continue with database cleanup
        // This allows the cleanup to work even if S3 permissions are limited
      }

      // Delete from database
      await Document.findByIdAndDelete(input.id);
      console.log('Successfully deleted from database:', input.id);
      
      return { success: true };
    }),

  // Clean up guest documents (called by cleanup service)
  cleanupGuestDocuments: publicProcedure
    .input(z.object({ documentIds: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      const documents = await Document.find({ 
        _id: { $in: input.documentIds },
        userId: null // Only guest documents
      });

      const cleanupResults = [];

      for (const document of documents) {
        try {
          // Delete from S3
          try {
            const command = new DeleteObjectCommand({
              Bucket: process.env.AWS_S3_BUCKET_NAME,
              Key: document.key,
            });
            await s3.send(command);
          } catch (error) {
            console.error('Error deleting from S3:', error);
          }

          // Delete from database
          await Document.findByIdAndDelete(document._id);
          cleanupResults.push({ id: document._id, success: true });
        } catch (error) {
          console.error('Failed to cleanup document:', document._id, error);
          cleanupResults.push({ 
            id: document._id, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      return { results: cleanupResults };
    }),

  signDocument: publicProcedure
    .input(
      z.object({
        docId: z.string(),
        signature: z.string(), // base64 encoded image
        visitorId: z.string(),
        x: z.number(),
        y: z.number(),
        page: z.number().default(1), // Page number to sign on
        width: z.number(),
        height: z.number(),
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
      
      try {
        // Handle various data URI formats and clean base64 data
        let cleanBase64 = input.signature;
        let imageType = 'png'; // default
        
        // Remove data URI prefix if present and detect image type
        if (cleanBase64.startsWith('data:image/')) {
          const base64Index = cleanBase64.indexOf('base64,');
          if (base64Index !== -1) {
            // Extract image type from data URI
            const mimeMatch = cleanBase64.match(/data:image\/([^;]+)/);
            if (mimeMatch) {
              imageType = mimeMatch[1].toLowerCase();
            }
            cleanBase64 = cleanBase64.substring(base64Index + 7);
          }
        }
        
        // Remove any whitespace or newlines
        cleanBase64 = cleanBase64.replace(/\s/g, '');
        
        // Validate base64 format
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
          throw new Error('Invalid base64 format');
        }

        console.log('Processing signature:', {
          originalLength: input.signature.length,
          cleanedLength: cleanBase64.length,
          imageType: imageType,
          page: input.page,
          position: { x: input.x, y: input.y },
          size: { width: input.width, height: input.height }
        });
        
        // Convert base64 to buffer for better handling
        const imageBuffer = Buffer.from(cleanBase64, 'base64');
        
        // Embed image based on detected type
        let signatureImage;
        if (imageType === 'jpeg' || imageType === 'jpg') {
          signatureImage = await pdfDoc.embedJpg(imageBuffer);
        } else {
          // Default to PNG for png, svg, and other formats
          signatureImage = await pdfDoc.embedPng(imageBuffer);
        }
        
        const pages = pdfDoc.getPages();
        
        // Validate page number
        if (input.page < 1 || input.page > pages.length) {
          throw new Error(`Page ${input.page} does not exist. Document has ${pages.length} pages.`);
        }
        
        const targetPage = pages[input.page - 1]; // Convert to 0-based index
        const pageHeight = targetPage.getHeight();
        const pageWidth = targetPage.getWidth();

        console.log('PDF page dimensions:', { 
          page: input.page, 
          width: pageWidth, 
          height: pageHeight,
          totalPages: pages.length 
        });

        // The input x, y from the frontend is the center of the signature.
        // pdf-lib's drawImage places the image from the bottom-left corner.
        // We need to adjust the coordinates.
        const sigWidth = input.width;
        const sigHeight = input.height;

        const pdfX = input.x - (sigWidth / 2);
        // The y-coordinate from the frontend is relative to the top of the page.
        // We convert it to be relative to the bottom for pdf-lib, accounting for the signature's height.
        const pdfY = pageHeight - input.y - (sigHeight / 2);

        console.log('Drawing signature at:', {
          page: input.page,
          x: pdfX,
          y: pdfY,
          width: sigWidth,
          height: sigHeight
        });

        targetPage.drawImage(signatureImage, {
          x: pdfX,
          y: pdfY,
          width: sigWidth,
          height: sigHeight,
        });

        const pdfBytes = await pdfDoc.save();
        await putObjectToS3(document.key, Buffer.from(pdfBytes));

        console.log('PDF saved successfully with signature');
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('PNG processing error:', error);
        console.error('Signature data preview:', input.signature.substring(0, 100));
        console.error('Input data:', {
          docId: input.docId,
          x: input.x,
          y: input.y,
          width: input.width,
          height: input.height,
          signatureLength: input.signature.length
        });
        throw new Error(`Failed to process signature image: ${errorMessage}`);
      }
    }),
}); 