import { Button } from "@/components/ui/button";
import { useSignature } from "@/contexts/SignatureContext";
import { 
  Hand, 
  MousePointer, 
  PenTool, 
  Calendar, 
  Type, 
  CheckSquare, 
  Download,
  ZoomIn,
  ZoomOut,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface DocumentToolbarProps {
  activeTool: string;
  setActiveTool: (tool: string) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  signMutationSuccess: boolean;
  onDownload: () => void;
}

export function DocumentToolbar({
  activeTool,
  setActiveTool,
  zoom,
  setZoom,
  currentPage,
  totalPages,
  onPageChange,
  signMutationSuccess,
  onDownload,
}: DocumentToolbarProps) {
  const {
    signature,
    isSignatureMode,
    setIsSigning,
    setIsEditingSignature,
    editSignature,
    deleteSignature,
    startSignatureMode,
    cancelSignatureMode,
  } = useSignature();

  const handleSignClick = () => {
    setActiveTool("signature");
    if (signature) {
      // If signature exists, immediately start signature mode
      startSignatureMode();
    } else {
      // If no signature, open creation modal
      setIsSigning(true);
      setIsEditingSignature(false);
    }
  };

  const handleZoomOut = () => setZoom(Math.max(0.5, zoom - 0.1));
  const handleZoomIn = () => setZoom(Math.min(2, zoom + 0.1));

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <Button
            variant={activeTool === "select" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTool("select")}
            className="flex items-center gap-2"
          >
            <MousePointer className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "hand" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTool("hand")}
            className="flex items-center gap-2"
          >
            <Hand className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
          <Button
            variant={activeTool === "signature" ? "default" : "ghost"}
            size="sm"
            onClick={handleSignClick}
            className="flex items-center gap-2"
          >
            <PenTool className="h-4 w-4" />
            Sign
          </Button>
          <Button
            variant={activeTool === "text" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTool("text")}
            className="flex items-center gap-2"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "date" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTool("date")}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "checkbox" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTool("checkbox")}
            className="flex items-center gap-2"
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Page Navigation */}
          {totalPages > 1 && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[80px] text-center">
                Page {currentPage} of {totalPages}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
            </>
          )}
          
          {/* Zoom Controls */}
          <Button variant="ghost" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
          
          {signature && !isSignatureMode && (
            <div className="flex items-center space-x-1">
              <Button variant="outline" size="sm" onClick={editSignature}>
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={deleteSignature}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
          
          {isSignatureMode && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  Click anywhere on the document to place your signature
                </span>
              </div>
              <Button onClick={cancelSignatureMode} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          )}
          
          {signMutationSuccess && (
            <Button onClick={onDownload} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 