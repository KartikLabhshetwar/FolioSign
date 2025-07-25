import { useState, useEffect } from "react";

interface UsePdfDocumentProps {
  documentUrl?: string;
}

interface UsePdfDocumentReturn {
  pdfFile: Blob | null;
  pdfLoading: boolean;
  pdfError: string | null;
}

export function usePdfDocument({ documentUrl }: UsePdfDocumentProps): UsePdfDocumentReturn {
  const [pdfFile, setPdfFile] = useState<Blob | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [lastFetchedUrl, setLastFetchedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!documentUrl) {
      setPdfLoading(false);
      return;
    }

    // Prevent refetching the same URL (S3 signed URLs might have different query params but same base)
    const baseUrl = documentUrl.split('?')[0];
    const lastBaseUrl = lastFetchedUrl?.split('?')[0];
    
    if (lastBaseUrl === baseUrl && pdfFile) {
      console.log("PDF already loaded for this document, skipping fetch");
      return;
    }

    console.log("Fetching PDF from:", documentUrl);
    setPdfLoading(true);
    setPdfError(null);
    
    const controller = new AbortController();
    
    fetch(documentUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.statusText}`);
        return res.blob();
      })
      .then((blob) => {
        console.log("PDF Blob received from S3:", { size: blob.size, type: blob.type });
        setPdfFile(blob);
        setLastFetchedUrl(documentUrl);
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          console.log("PDF fetch aborted");
          return;
        }
        console.error("PDF Fetch Error:", err);
        setPdfError(
          "Failed to load PDF. This is likely a CORS issue. Please double-check the S3 bucket configuration and the browser console for specific errors."
        );
      })
      .finally(() => setPdfLoading(false));

    return () => {
      controller.abort();
    };
  }, [documentUrl, pdfFile, lastFetchedUrl]);

  return {
    pdfFile,
    pdfLoading,
    pdfError,
  };
} 