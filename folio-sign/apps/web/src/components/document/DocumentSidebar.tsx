import { Button } from "@/components/ui/button";
import { Edit3, Trash2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { useState, useEffect } from "react";

// Import PDF.js CSS
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentSidebarProps {
  signature: string | null;
  showSignature: boolean;
  setShowSignature: (show: boolean) => void;
  editSignature: () => void;
  deleteSignature: () => void;
  pdfFile?: Blob | null; // Add PDF file prop
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function DocumentSidebar({
  signature,
  showSignature,
  setShowSignature,
  editSignature,
  deleteSignature,
  pdfFile,
  currentPage,
  totalPages,
  onPageChange,
}: DocumentSidebarProps) {
  return (
    <div className="w-72 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          Pages
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Document preview</p>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          {pdfFile && totalPages > 0 ? (
            // Render all page thumbnails
            Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1;
              const isCurrentPage = pageNumber === currentPage;
              
              return (
                <div 
                  key={pageNumber}
                  className={`rounded-lg p-3 cursor-pointer transition-colors ${
                    isCurrentPage 
                      ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900'
                      : 'border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => onPageChange(pageNumber)}
                >
                  <div className="aspect-[8.5/11] bg-white dark:bg-gray-800 rounded-md shadow-sm overflow-hidden border border-gray-200 dark:border-gray-600">
                    <div className="w-full h-full flex items-center justify-center p-1">
                      <Document 
                        file={pdfFile} 
                        onLoadError={(error) => console.error('PDF load error in sidebar:', error)}
                        loading={
                          <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          </div>
                        }
                      >
                        <Page 
                          pageNumber={pageNumber} 
                          width={160}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          loading={
                            <div className="flex items-center justify-center h-full">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            </div>
                          }
                        />
                      </Document>
                    </div>
                  </div>
                  <div className="text-center mt-2">
                    <div className={`text-xs font-semibold ${
                      isCurrentPage 
                        ? 'text-blue-700 dark:text-blue-300' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Page {pageNumber}
                    </div>
                    {isCurrentPage && (
                      <div className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">Current</div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            // Loading state or no PDF
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
              <div className="aspect-[8.5/11] bg-white dark:bg-gray-800 rounded-md shadow-sm overflow-hidden border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-center h-full text-xs text-gray-500 font-medium">
                  <div className="text-center">
                    <div className="text-gray-400 mb-1">📄</div>
                    <div>Loading...</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Signature Status Panel */}
      {signature && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Your Signature
              </p>
              <div className="flex items-center space-x-1">
                <Button variant="ghost" size="sm" onClick={editSignature}>
                  <Edit3 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={deleteSignature}>
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            </div>
            <div className="border rounded bg-white dark:bg-gray-100 p-2 mb-3">
              <img src={signature} alt="Your signature" className="max-h-16 w-full object-contain"/>
            </div>
            {showSignature ? (
              <div className="space-y-2">
                <p className="text-xs text-green-600 dark:text-green-400">
                  ✓ Ready to place on document
                </p>
                <Button onClick={() => setShowSignature(false)} variant="outline" size="sm" className="w-full">
                  Hide from Document
                </Button>
              </div>
            ) : (
              <Button onClick={() => setShowSignature(true)} size="sm" className="w-full">
                Show on Document
              </Button>
            )}
          </div>
        </div>
      )}
      
      {showSignature && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
              Signature Active
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Drag to position, resize as needed, then click anywhere on the document to place it
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 