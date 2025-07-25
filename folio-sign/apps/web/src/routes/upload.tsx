import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/upload")({
  component: UploadComponent,
});

function UploadComponent() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setSelectedFile(file);
    toast.success("File selected successfully!");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setIsUploading(true);
    try {
      // Get presigned URL
      const { presignedUrl, key } = await trpcClient.document.createPresignedUrl.mutate({
        name: selectedFile.name
      });

      // Upload file to S3
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Create document record
      const documentResult = await trpcClient.document.createDocument.mutate({
        name: selectedFile.name,
        key: key
      }) as { _id: string };

      toast.success("Document uploaded successfully!");
      
      // Navigate to document signing page
      navigate({ to: `/document/${documentResult._id}` });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Failed to upload document. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or DOCX file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    toast.success("File selected successfully!");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate({ to: "/" })}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Upload Documents
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Upload your PDF or DOCX files to get started with digital signing
          </p>
        </div>

        {/* Upload Area */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Document Upload
            </CardTitle>
            <CardDescription>
              Drag and drop your file here or click to browse. Supports PDF and DOCX files up to 10MB.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                selectedFile
                  ? 'border-green-500 bg-green-50 dark:bg-green-950' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Upload className="h-8 w-8 text-green-600" />
                    <span className="text-lg font-medium">{selectedFile.name}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 mx-auto bg-blue-600 rounded-full flex items-center justify-center">
                      <Plus className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Drop your file here
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      or click to browse
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose File
                  </Button>
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Upload Button */}
            {selectedFile && (
              <Button 
                onClick={handleUpload} 
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Continue to Sign
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">What happens next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Upload your documents</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your files are securely uploaded and ready for signing
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Sign your documents</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use our intuitive tools to add your signature
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Download signed documents</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get your signed documents instantly
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 