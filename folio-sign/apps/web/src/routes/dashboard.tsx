import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc, trpcClient } from "@/utils/trpc";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FolderPlus,
  MoreHorizontal,
  PlusCircle,
  FileText,
  File,
  Crop,
  RotateCw,
  Trash2,
  Plus,
  Upload,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/src/routers";
import Loader from "@/components/loader";
import { Document, Page, pdfjs } from "react-pdf";

// Import PDF.js CSS
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type RouterOutput = inferRouterOutputs<AppRouter>;
type Document = {
  _id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

// PDF Preview Component
function PDFPreview({ documentId, fileName }: { documentId: string; fileName: string }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPdfUrl = async () => {
      try {
        setIsLoading(true);
        const documentData = await trpcClient.document.get.query({ id: documentId });
        setPdfUrl(documentData.url);
      } catch (err) {
        console.error('Error fetching PDF URL:', err);
        setError('Failed to load preview');
      } finally {
        setIsLoading(false);
      }
    };

    if (documentId && !pdfUrl) {
      fetchPdfUrl();
    }
  }, [documentId, pdfUrl]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center flex-col space-y-2">
        {getFileIcon(fileName)}
        <div className="text-xs text-gray-500">{error || 'No preview'}</div>
      </div>
    );
  }

  // For PDF files, try to show actual preview
  if (fileName.toLowerCase().endsWith('.pdf')) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Document
          file={pdfUrl}
          onLoadError={(error) => {
            setError('Failed to load PDF');
          }}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          }
        >
          <Page 
            pageNumber={1} 
            width={180}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            }
          />
        </Document>
      </div>
    );
  }

  // For non-PDF files, show file icon
  return (
    <div className="w-full h-full flex items-center justify-center flex-col space-y-2">
      {getFileIcon(fileName)}
      <div className="text-xs text-gray-500">{fileName}</div>
    </div>
  );
}

function getFileIcon(fileName: string) {
  const isPdf = fileName.toLowerCase().endsWith('.pdf');
  return isPdf ? (
    <FileText className="h-8 w-8 text-red-500" />
  ) : (
    <File className="h-8 w-8 text-blue-500" />
  );
}

function RouteComponent() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => trpcClient.document.list.query(),
  });

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or DOCX file");
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    try {
      // Get presigned URL
      const { presignedUrl, key } = await trpcClient.document.createPresignedUrl.mutate({
        name: file.name
      });

      // Upload file to S3
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Create document record
      const documentResult = await trpcClient.document.createDocument.mutate({
        name: file.name,
        key: key
      }) as { _id: string };

      toast.success("Document uploaded successfully!");
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });
      
      // Navigate to document signing page
      navigate({ to: `/document/${documentResult._id}` });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Failed to upload document. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await trpcClient.document.deleteDocument.mutate({ id: documentId });
      toast.success("Document deleted successfully!");
      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            accept=".pdf,.docx"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Upload Document
          </Button>
          <Button variant="outline">
            <FolderPlus className="mr-2 h-4 w-4" /> Create Folder
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">Total documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Documents pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Documents completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">Documents in draft</p>
          </CardContent>
        </Card>
      </div>
      {/* Document Previews */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Document Previews</CardTitle>
            <CardDescription>Manage your documents with preview and actions.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader />
              </div>
            ) : documents && documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(documents as Document[]).map((doc, index) => (
                  <Card key={doc._id} className="relative">
                    <CardContent className="p-4">
                      {/* Document Preview */}
                      <div className="aspect-[8.5/11] bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg mb-3 overflow-hidden relative">
                        <div className="w-full h-full">
                          <PDFPreview documentId={doc._id} fileName={doc.name} />
                        </div>
                        <div className="absolute bottom-2 right-2 text-xs font-medium text-blue-600 bg-white dark:bg-gray-800 px-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                      
                      {/* File Info */}
                      <div className="text-center mb-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-center space-x-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Crop className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteDocument(doc._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* View Document Button */}
                      <div className="mt-3">
                        <Link to="/document/$documentId" params={{ documentId: doc._id }}>
                          <Button size="sm" className="w-full">
                            View & Sign
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Add New Document Card */}
                <Card className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                  <CardContent className="p-4 h-full flex flex-col items-center justify-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="aspect-[8.5/11] w-full flex items-center justify-center mb-3">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                        <Plus className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    
                    <div className="text-center mb-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Add New Document
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Click to upload
                      </p>
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={isUploading}
                      className="w-full"
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Plus className="h-8 w-8 text-white" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-4">No documents yet. Upload your first document to get started.</p>
                <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}
