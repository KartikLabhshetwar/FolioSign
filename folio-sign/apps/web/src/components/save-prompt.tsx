import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X, User, Download, CheckCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

interface SavePromptProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  onDownload: () => void;
}

export function SavePrompt({ isOpen, onClose, documentName, onDownload }: SavePromptProps) {
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Save Document
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Choose how you'd like to handle your signed document
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {isAuthenticated ? (
              <div className="flex items-start gap-3 p-3 border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-800 dark:text-green-200">Document Saved</h4>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Your document has been saved to your account and will be available anytime
                  </p>
                  <div className="mt-2">
                    <Link to="/dashboard">
                      <Button size="sm" variant="outline" className="text-green-700 border-green-300">
                        View My Documents
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <User className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium">Save for Later</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Create an account to save your documents and access them anytime
                  </p>
                  <div className="mt-2">
                    <Link to="/login">
                      <Button size="sm" className="mr-2">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/">
                      <Button variant="outline" size="sm">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Download className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium">Download Now</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Download your signed document immediately
                </p>
                <div className="mt-2">
                  <Button size="sm" onClick={onDownload}>
                    Download {documentName}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {isAuthenticated 
              ? "Your document is permanently saved to your account"
              : "Note: Documents are automatically cleaned up when you leave this page"
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 