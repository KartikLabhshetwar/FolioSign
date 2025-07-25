import { useMutation, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "@/utils/trpc";
import { getVisitorId } from "@/lib/analytics";
import { toast } from "sonner";

interface UseDocumentSigningProps {
  documentId: string;
}

interface SignMutationVariables {
  docId: string;
  signature: string;
  visitorId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseDocumentSigningReturn {
  signMutation: {
    mutate: (variables: SignMutationVariables) => void;
    isPending: boolean;
    isSuccess: boolean;
    error: Error | null;
  };
  placeSignature: (params: {
    signature: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
  }) => void;
  downloadDocument: (documentUrl: string, documentName: string) => void;
}

export function useDocumentSigning({ documentId }: UseDocumentSigningProps): UseDocumentSigningReturn {
  const queryClient = useQueryClient();

  const signMutation = useMutation({
    mutationFn: (variables: {
      docId: string;
      signature: string;
      visitorId: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }) => trpcClient.document.signDocument.mutate(variables),
    onSuccess: () => {
      toast.success("Signature placed successfully! Document is ready for download.");
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
    },
    onError: (err) => {
      toast.error(`Failed to sign document: ${err.message}`);
    },
  });

  const placeSignature = ({ signature, position, size }: {
    signature: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
  }) => {
    const visitorId = getVisitorId();
    signMutation.mutate({
      docId: documentId,
      signature,
      visitorId,
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
    });
  };

  const downloadDocument = (documentUrl: string, documentName: string) => {
    const a = window.document.createElement('a');
    a.href = documentUrl;
    a.download = documentName;
    a.click();
  };

  return {
    signMutation: {
      mutate: signMutation.mutate,
      isPending: signMutation.isPending,
      isSuccess: signMutation.isSuccess,
      error: signMutation.error,
    },
    placeSignature,
    downloadDocument,
  };
} 