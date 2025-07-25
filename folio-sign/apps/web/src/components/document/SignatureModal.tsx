import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SignatureCanvas from "react-signature-canvas";
import { useSignature } from "@/contexts/SignatureContext";
import { 
  PenTool, 
  Type, 
  Download,
  RotateCcw,
  Trash2,
  Check,
  X,
  Palette
} from "lucide-react";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignatureModal({
  isOpen,
  onClose,
}: SignatureModalProps) {
  const {
    activeTab,
    setActiveTab,
    isEditingSignature,
    signaturePreview,
    typedSignature,
    setTypedSignature,
    signatureColor,
    setSignatureColor,
    sigPad,
    uploadInputRef,
    handleUploadSignature,
    updateSignaturePreview,
    clearCurrentTab,
    saveSignature,
  } = useSignature();

  if (!isOpen) return null;

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Don't clear everything when switching tabs during editing
    if (!isEditingSignature) {
      sigPad.current?.clear();
      setTypedSignature("");
    }
  };

  const handleClearSignaturePad = () => {
    sigPad.current?.clear();
    updateSignaturePreview();
  };

  const handleColorChange = (color: string) => {
    setSignatureColor(color);
    // The pen color will be applied through the SignatureCanvas props
  };

  const SIGNATURE_COLORS = [
    '#000000', // Black
    '#0000FF', // Blue
    '#008000', // Green
    '#FF0000', // Red
    '#800080', // Purple
    '#FF8C00', // Dark Orange
    '#4B0082', // Indigo
    '#8B4513', // Saddle Brown
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-[700px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            {isEditingSignature ? "Edit Your Signature" : "Create Your Signature"}
          </h2>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Color Selection */}
        <div className="mb-6">
          <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Signature Color
          </Label>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {SIGNATURE_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                    signatureColor === color 
                      ? 'border-gray-800 dark:border-gray-200 ring-2 ring-blue-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                  title={`Select ${color}`}
                />
              ))}
            </div>
            <input
              type="color"
              value={signatureColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              title="Custom color"
            />
          </div>
        </div>

        <Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="draw" className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="type" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Type
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Upload
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="draw" className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <SignatureCanvas
                ref={sigPad}
                penColor={signatureColor}
                backgroundColor="rgba(0,0,0,0)"
                canvasProps={{ 
                  width: 600, 
                  height: 200, 
                  className: "sigCanvas rounded border bg-white",
                  onMouseUp: updateSignaturePreview,
                  onTouchEnd: updateSignaturePreview
                }}
              />
            </div>
            <div className="flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={handleClearSignaturePad}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
              {signaturePreview && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-green-600 dark:text-green-400">✓ Signature ready</span>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="type" className="space-y-4">
            <div className="space-y-4">
              <Input 
                type="text" 
                placeholder="Type your full name" 
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
                className="text-3xl font-[Caveat] h-20 text-center border-2"
              />
              {signaturePreview && (
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Preview:</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-green-600 dark:text-green-400">✓ Ready</span>
                      <Button variant="ghost" size="sm" onClick={clearCurrentTab}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded bg-white p-3 flex justify-center">
                    <img src={signaturePreview} alt="Signature preview" className="max-h-20" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}/>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 dark:bg-gray-900">
              <Button onClick={() => uploadInputRef.current?.click()} size="lg" variant="outline">
                <Download className="h-5 w-5 mr-2" />
                Choose Image File
              </Button>
              <p className="text-sm text-gray-500 mt-2">PNG, JPEG, or SVG format</p>
              <p className="text-xs text-gray-400 mt-1">Maximum size: 5MB</p>
            </div>
            <input
              type="file"
              ref={uploadInputRef}
              onChange={handleUploadSignature}
              className="hidden"
              accept="image/png, image/jpeg, image/svg+xml"
            />
            {signaturePreview && (
              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Preview:</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-green-600 dark:text-green-400">✓ Ready</span>
                    <Button variant="ghost" size="sm" onClick={clearCurrentTab}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="border rounded bg-white p-3 flex justify-center">
                  <img src={signaturePreview} alt="Uploaded signature" className="max-h-32" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}/>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex space-x-3">
            {signaturePreview && (
              <Button variant="outline" onClick={clearCurrentTab}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
            <Button 
              onClick={saveSignature} 
              disabled={!signaturePreview}
              className="min-w-[120px]"
            >
              <Check className="h-4 w-4 mr-2" />
              {isEditingSignature ? "Update" : "Add"} Signature
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 