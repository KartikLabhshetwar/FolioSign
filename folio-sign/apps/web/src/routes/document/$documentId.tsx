import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpcClient } from "@/utils/trpc";
import { Document, Page, pdfjs } from "react-pdf";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { addToCleanupQueue, removeFromCleanupQueue } from "@/lib/cleanup";
import { authClient } from "@/lib/auth-client";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/src/routers/index";

// Context
import SignatureProvider, { useSignature } from "@/contexts/SignatureContext";

// Custom hooks
import { usePdfDocument } from "@/hooks/usePdfDocument";

// Components
import { DocumentToolbar } from "@/components/document/DocumentToolbar";
import { DocumentSidebar } from "@/components/document/DocumentSidebar";
import { SignatureModal } from "@/components/document/SignatureModal";
import { CursorSignature } from "@/components/document/CursorSignature";
import { TextFormattingPanel } from "@/components/document/TextFormattingPanel";
import { SavePrompt } from "@/components/save-prompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ArrowLeft, Save, X } from "lucide-react";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const Route = createFileRoute("/document/$documentId")({
  component: () => (
    <SignatureProvider>
      <RouteComponent />
    </SignatureProvider>
  ),
});

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  isEditing: boolean;
  fontFamily: string;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
}

type DocumentGetData = inferRouterOutputs<AppRouter>["document"]["get"];

interface DocumentViewProps {
  documentId: string;
  documentData: DocumentGetData;
}

function DocumentView({ documentId, documentData }: DocumentViewProps) {
  const navigate = useNavigate();

  // PDF document management - memoize URL to prevent unnecessary reloads
  const memoizedDocumentUrl = useMemo(() => documentData?.url, [
    documentData.url,
  ]);

  const { pdfFile, pdfLoading, pdfError } = usePdfDocument({
    documentUrl: memoizedDocumentUrl,
  });

  // Signature management from context
  const signature = useSignature();

  // Download handler
  const downloadDocument = (documentUrl: string, documentName: string) => {
    const a = window.document.createElement("a");
    a.href = documentUrl;
    a.download = documentName;
    a.click();
  };

  // Document container ref for cursor tracking
  const documentContainerRef = useRef<HTMLDivElement>(null);

  // UI state
  const [activeTool, setActiveTool] = useState("select");
  const [zoom, setZoom] = useState(1);
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  // Page state for multi-page support
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfKey, setPdfKey] = useState(0); // Forcing PDF reload

  // Refs for page scroll tracking
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const documentScrollRef = useRef<HTMLDivElement>(null);

  // Text elements state
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedTextElement, setSelectedTextElement] = useState<string | null>(
    null
  );

  // Debug logging for PDF reloads
  useEffect(() => {
    if (memoizedDocumentUrl) {
      console.log(
        `[PDF Debug] Document URL changed: ${memoizedDocumentUrl.substring(
          0,
          100
        )}...`
      );
    }
  }, [memoizedDocumentUrl]);

  useEffect(() => {
    console.log(`[PDF Debug] PDF Key changed to: ${pdfKey}`);
  }, [pdfKey]);

  useEffect(() => {
    console.log(`[PDF Debug] Total pages changed to: ${totalPages}`);
  }, [totalPages]);

  // Auto-cleanup on page unload (only for guest users)
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  // Scroll to specific page
  const scrollToPage = useCallback((pageNumber: number) => {
    const pageElement = pageRefs.current[pageNumber - 1];
    if (pageElement && documentScrollRef.current) {
      pageElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  // Handle page change from toolbar or sidebar
  const handlePageChange = useCallback(
    (pageNumber: number) => {
      setCurrentPage(pageNumber);
      scrollToPage(pageNumber);
    },
    [scrollToPage]
  );

  // Redirect logic on page reload
  useEffect(() => {
    if (isSessionPending) return; // Wait for session check

    // If user is not authenticated and page is reloaded, redirect to upload
    if (!isAuthenticated && !documentData) {
      console.log(
        "User not authenticated and no document data, redirecting to upload..."
      );
      navigate({ to: "/upload" });
    }
  }, [isAuthenticated, isSessionPending, documentData, navigate]);

  // Scroll tracking with IntersectionObserver
  useEffect(() => {
    if (totalPages === 0 || !documentScrollRef.current) return;

    let timeoutId: NodeJS.Timeout;

    const observer = new IntersectionObserver(
      (entries) => {
        // Debounce page updates to prevent rapid changes
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const pageNumber = parseInt(
                entry.target.getAttribute("data-page-number") || "1"
              );
              setCurrentPage((prev) => (prev !== pageNumber ? pageNumber : prev));
            }
          });
        }, 100);
      },
      {
        root: documentScrollRef.current,
        rootMargin: "-20% 0px -20% 0px",
        threshold: 0.5,
      }
    );

    // Delay observation to ensure elements are rendered
    const observeElements = () => {
      pageRefs.current.forEach((pageElement) => {
        if (pageElement) {
          observer.observe(pageElement);
        }
      });
    };

    // Small delay to ensure DOM is ready
    const delayedObservation = setTimeout(observeElements, 100);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(delayedObservation);
      observer.disconnect();
    };
  }, [totalPages]); // Remove pdfKey dependency - not needed for scroll tracking

  useEffect(() => {
    // Only set up cleanup for guest users (non-authenticated users)
    if (isAuthenticated || isSessionPending) {
      return;
    }

    console.log(`[Cleanup Debug] Setting up cleanup for document: ${documentId}`);

    const handleBeforeUnload = () => {
      // Add to cleanup queue only when user is leaving the page
      if (documentId) {
        console.log(
          `[Cleanup Debug] Adding to cleanup queue on beforeunload: ${documentId}`
        );
        addToCleanupQueue(documentId);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Add to cleanup queue when page becomes hidden
        if (documentId) {
          console.log(
            `[Cleanup Debug] Adding to cleanup queue on visibility change: ${documentId}`
          );
          addToCleanupQueue(documentId);
        }
      } else {
        // Remove from cleanup queue when page becomes visible again
        if (documentId) {
          console.log(
            `[Cleanup Debug] Removing from cleanup queue on visibility change: ${documentId}`
          );
          removeFromCleanupQueue(documentId);
        }
      }
    };

    // Set up event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      // Clean up event listeners
      console.log(
        `[Cleanup Debug] Cleaning up event listeners for: ${documentId}`
      );
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [documentId, isAuthenticated, isSessionPending]);

  // Add text element
  const addTextElement = useCallback((x: number, y: number) => {
    const newTextElement: TextElement = {
      id: Date.now().toString(),
      text: "",
      x,
      y,
      fontSize: 16,
      isEditing: true,
      fontFamily: "Arial",
      color: "#000000",
      isBold: false,
      isItalic: false,
      isUnderline: false,
    };
    setTextElements((prev) => [...prev, newTextElement]);
    setSelectedTextElement(newTextElement.id);
  }, []);

  // Update text element
  const updateTextElement = (id: string, updates: Partial<TextElement>) => {
    setTextElements((prev) =>
      prev.map((element) =>
        element.id === id ? { ...element, ...updates } : element
      )
    );
  };

  // Delete text element
  const deleteTextElement = (id: string) => {
    setTextElements((prev) => prev.filter((element) => element.id !== id));
  };

  // Handle document click for different tools
  const handleDocumentClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      // Don't place if clicking on existing elements
      const target = e.target as HTMLElement;
      if (target.closest(".drag-handle") || target.closest(".text-element")) {
        return;
      }

      // Find which page was clicked by checking the clicked element
      const pageElement = target.closest(".react-pdf__Page");
      if (!pageElement) return;

      const pageNumber = parseInt(
        pageElement.getAttribute("data-page-number") || "1"
      );
      const pageRect = pageElement.getBoundingClientRect();
      const x = (e.clientX - pageRect.left) / zoom;
      const y = (e.clientY - pageRect.top) / zoom;

      if (activeTool === "text") {
        // Add text element
        addTextElement(x, y);
      } else if (
        signature.isSignatureMode &&
        signature.signature &&
        documentData?._id
      ) {
        // Immediately show feedback to user
        const toastId = toast.loading(
          `Placing signature on page ${pageNumber}...`
        );

        try {
          // Place signature at clicked position on the clicked page
          await signature.placeSignatureAtPosition(
            { x, y, page: pageNumber },
            documentData._id,
            () => {
              // Force PDF reload by updating key
              setPdfKey((prev) => prev + 1);
              toast.success(`Signature placed on page ${pageNumber}!`, {
                id: toastId,
              });
            }
          );
        } catch (error) {
          toast.error("Failed to place signature", { id: toastId });
        }
      }
    },
    [activeTool, signature, documentData, zoom, addTextElement]
  );

  // Handle text input change
  const handleTextChange = (id: string, text: string) => {
    updateTextElement(id, { text });
  };

  // Handle text input blur (finish editing)
  const handleTextBlur = (id: string) => {
    const element = textElements.find((el) => el.id === id);
    if (element && element.text.trim() === "") {
      // Remove empty text elements
      deleteTextElement(id);
    } else {
      updateTextElement(id, { isEditing: false });
    }
  };

  // Handle text element double click (start editing)
  const handleTextDoubleClick = (id: string) => {
    updateTextElement(id, { isEditing: true });
    setSelectedTextElement(id);
  };

  // Handle text element click (select)
  const handleTextClick = (id: string) => {
    setSelectedTextElement(id);
  };

  // Duplicate text element
  const duplicateTextElement = (id: string) => {
    const element = textElements.find((el) => el.id === id);
    if (element) {
      const newElement: TextElement = {
        ...element,
        id: Date.now().toString(),
        x: element.x + 20,
        y: element.y + 20,
        isEditing: false,
      };
      setTextElements((prev) => [...prev, newElement]);
      setSelectedTextElement(newElement.id);
    }
  };

  // Update text formatting
  const updateTextFormatting = (
    id: string,
    formatting: Partial<
      Omit<TextElement, "id" | "text" | "x" | "y" | "isEditing">
    >
  ) => {
    updateTextElement(id, formatting);
  };

  // Download handler
  const handleDownload = () => {
    if (documentData?.url && documentData?.name) {
      downloadDocument(documentData.url, documentData.name);
      toast.success("Document downloaded successfully!");
    }
  };

  // Delete document handler
  const handleDeleteDocument = async () => {
    if (!documentData?._id) return;

    try {
      await trpcClient.document.deleteDocument.mutate({ id: documentData._id });
      toast.success("Document deleted successfully!");
      navigate({ to: "/upload" });
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  // Save document handler (for authenticated users)
  const handleSaveDocument = () => {
    setShowSavePrompt(true);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header with navigation and actions */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate({ to: "/upload" })}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Upload
            </Button>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {documentData.name}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDocument}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteDocument}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <DocumentToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        zoom={zoom}
        setZoom={setZoom}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        signMutationSuccess={false}
        onDownload={handleDownload}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <DocumentSidebar
          signature={signature.signature}
          showSignature={signature.isSignatureMode}
          setShowSignature={signature.setIsSignatureMode}
          editSignature={signature.editSignature}
          deleteSignature={signature.deleteSignature}
          pdfFile={pdfFile}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />

        {/* Document Viewer */}
        <div
          ref={documentScrollRef}
          className="flex-1 bg-gray-100 dark:bg-gray-800 overflow-auto flex"
        >
          <div className="flex-1">
            <div className="flex justify-center p-8">
              {pdfLoading && <div className="text-center">Loading PDF...</div>}
              {pdfError && (
                <div className="text-red-500 text-center">{pdfError}</div>
              )}
              {pdfFile && (
                <div
                  id="pdf-container"
                  ref={documentContainerRef}
                  className={`relative ${
                    signature.isSignatureMode
                      ? "cursor-crosshair"
                      : activeTool === "text"
                      ? "cursor-text"
                      : "cursor-default"
                  }`}
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "top center",
                  }}
                  onClick={handleDocumentClick}
                >
                  <Document
                    key={pdfKey} // Force reload when pdfKey changes
                    file={pdfFile}
                    onLoadError={console.error}
                    onLoadSuccess={useCallback(
                      (pdf: any) => {
                        if (pdf.numPages !== totalPages) {
                          setTotalPages(pdf.numPages);
                          console.log(
                            "PDF loaded with",
                            pdf.numPages,
                            "pages"
                          );
                        }
                      },
                      [totalPages]
                    )}
                  >
                    {/* Render all pages in a scrollable view */}
                    {totalPages > 0 &&
                      Array.from({ length: totalPages }, (_, index) => {
                        const pageNumber = index + 1;
                        return (
                          <div
                            key={pageNumber}
                            ref={(el) => {
                              pageRefs.current[pageNumber - 1] = el;
                            }}
                            data-page-number={pageNumber}
                            className="mb-4 bg-white shadow-lg"
                          >
                            <Page
                              pageNumber={pageNumber}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              className="mx-auto"
                            />
                          </div>
                        );
                      })}
                  </Document>

                  {/* Cursor Following Signature */}
                  <CursorSignature
                    containerRef={documentContainerRef}
                    zoom={zoom}
                  />

                  {/* Text Elements */}
                  {textElements.map((textElement) => (
                    <div
                      key={textElement.id}
                      className={`absolute text-element group cursor-pointer ${
                        selectedTextElement === textElement.id
                          ? "ring-2 ring-blue-500 ring-offset-2"
                          : ""
                      }`}
                      style={{
                        left: textElement.x,
                        top: textElement.y,
                        zIndex: 100,
                      }}
                      onClick={() => handleTextClick(textElement.id)}
                    >
                      {textElement.isEditing ? (
                        <Input
                          type="text"
                          value={textElement.text}
                          onChange={(e) =>
                            handleTextChange(textElement.id, e.target.value)
                          }
                          onBlur={() => handleTextBlur(textElement.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleTextBlur(textElement.id);
                            }
                          }}
                          className="min-w-[100px] h-auto p-1 text-base border-2 border-blue-500"
                          style={{
                            fontSize: textElement.fontSize,
                            fontFamily: textElement.fontFamily,
                            color: textElement.color,
                            fontWeight: textElement.isBold ? "bold" : "normal",
                            fontStyle: textElement.isItalic
                              ? "italic"
                              : "normal",
                            textDecoration: textElement.isUnderline
                              ? "underline"
                              : "none",
                          }}
                          autoFocus
                        />
                      ) : (
                        <div className="relative">
                          <span
                            className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950 px-1 rounded select-none"
                            onDoubleClick={() =>
                              handleTextDoubleClick(textElement.id)
                            }
                            style={{
                              fontSize: textElement.fontSize,
                              fontFamily: textElement.fontFamily,
                              color: textElement.color,
                              fontWeight: textElement.isBold
                                ? "bold"
                                : "normal",
                              fontStyle: textElement.isItalic
                                ? "italic"
                                : "normal",
                              textDecoration: textElement.isUnderline
                                ? "underline"
                                : "none",
                            }}
                          >
                            {textElement.text || "Click to edit"}
                          </span>
                          {selectedTextElement === textElement.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-white dark:bg-gray-800 border shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTextElement(textElement.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Text Formatting Panel */}
        {activeTool === "text" && (
          <TextFormattingPanel
            selectedElement={
              selectedTextElement
                ? textElements.find((el) => el.id === selectedTextElement) ||
                  null
                : null
            }
            onUpdateFormatting={updateTextFormatting}
            onDuplicate={duplicateTextElement}
            onDelete={deleteTextElement}
          />
        )}
      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={signature.isSigning}
        onClose={() => signature.setIsSigning(false)}
      />

      {/* Save Prompt Modal */}
      <SavePrompt
        isOpen={showSavePrompt}
        onClose={() => setShowSavePrompt(false)}
        documentName={documentData?.name || "Document"}
        onDownload={handleDownload}
      />
    </div>
  );
}

function RouteComponent() {
  const { documentId } = Route.useParams();

  // Document data fetching
  const { data: documentData, isLoading: isDocInfoLoading } = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => trpcClient.document.get.query({ id: documentId }),
    staleTime: 30 * 60 * 1000, // 30 minutes - prevent unnecessary refetches
    gcTime: 60 * 60 * 1000, // 1 hour - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch on component mount if we have cached data
    refetchInterval: false, // Disable automatic refetching
  });

  // Loading and error states
  if (isDocInfoLoading) {
    return <div className="p-4 text-center">Loading document details...</div>;
  }

  if (!documentData) {
    return <div className="p-4 text-center">Document not found.</div>;
  }

  return <DocumentView documentId={documentId} documentData={documentData} />;
} 