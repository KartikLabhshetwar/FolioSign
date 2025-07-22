import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "@/utils/trpc";
import { Document, Page, pdfjs } from "react-pdf";
import { useEffect, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "sonner";
import { getVisitorId } from "@/lib/analytics";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const Route = createFileRoute("/document/$documentId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { documentId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: document, isLoading: isDocInfoLoading } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => trpcClient.document.get.query({ id: documentId }),
  });

  const [pdfFile, setPdfFile] = useState<Blob | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [isSigning, setIsSigning] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  let sigPad: SignatureCanvas | null = null;

  useEffect(() => {
    if (document?.url) {
      setPdfLoading(true);
      setPdfError(null);
      fetch(document.url)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.statusText}`);
          return res.blob();
        })
        .then((blob) => {
          console.log("PDF Blob received from S3:", { size: blob.size, type: blob.type });
          setPdfFile(blob);
        })
        .catch((err) => {
          console.error("PDF Fetch Error:", err);
          setPdfError(
            "Failed to load PDF. This is likely a CORS issue. Please double-check the S3 bucket configuration and the browser console for specific errors."
          );
        })
        .finally(() => setPdfLoading(false));
    }
  }, [document?.url]);

  const signMutation = useMutation({
    mutationFn: (variables: {
      docId: string;
      signature: string;
      visitorId: string;
    }) => trpcClient.document.signDocument.mutate(variables),
    onSuccess: () => {
      toast.success("Document signed successfully!");
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
    },
    onError: (err) => {
      toast.error(`Failed to sign document: ${err.message}`);
    },
  });

  const clearSignature = () => {
    sigPad?.clear();
  };

  const saveSignature = () => {
    if (sigPad) {
      setSignature(sigPad.getTrimmedCanvas().toDataURL("image/png"));
      setIsSigning(false);
    }
  };

  const placeSignature = () => {
    if (signature && document) {
      const visitorId = getVisitorId();
      signMutation.mutate({ docId: document._id, signature, visitorId });
    } else {
      toast.error("Please create a signature and ensure the document is loaded.");
    }
  };

  if (isDocInfoLoading) {
    return <div className="p-4 text-center">Loading document details...</div>;
  }

  if (!document) {
    return <div className="p-4 text-center">Document not found.</div>;
  }

  return (
    <div className="flex h-full">
      {/* Tools Sidebar */}
      <div className="w-64 bg-gray-100 dark:bg-gray-800 p-4 space-y-4">
        <h2 className="text-xl font-bold">Tools</h2>
        <Button onClick={() => setIsSigning(true)} className="w-full">
          Sign Document
        </Button>
        {signature && (
          <div className="space-y-2">
            <h3 className="font-semibold">Your Signature:</h3>
            <img src={signature} alt="Your signature" className="border rounded" />
            <Button onClick={placeSignature} className="w-full">
              Place Signature
            </Button>
          </div>
        )}
      </div>

      {/* Document Viewer */}
      <div className="flex-1 flex justify-center items-center p-4 bg-gray-200 dark:bg-gray-900">
        {pdfLoading && <div>Loading PDF...</div>}
        {pdfError && <div className="text-red-500 text-center">{pdfError}</div>}
        {pdfFile && (
          <Document file={pdfFile} onLoadError={console.error}>
            <Page pageNumber={1} />
          </Document>
        )}
      </div>

      {/* Signature Modal */}
      {isSigning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Create Signature</h2>
            <div className="border rounded">
              <SignatureCanvas
                ref={(ref) => { sigPad = ref; }}
                penColor="black"
                canvasProps={{ width: 500, height: 200, className: "sigCanvas" }}
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="ghost" onClick={() => setIsSigning(false)}>Cancel</Button>
              <Button variant="outline" onClick={clearSignature}>Clear</Button>
              <Button onClick={saveSignature}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 