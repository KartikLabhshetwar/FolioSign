import { useState, useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "sonner";

interface UseSignatureManagementReturn {
  // State
  signature: string | null;
  signaturePreview: string | null;
  showSignature: boolean;
  signaturePosition: { x: number; y: number };
  signatureSize: { width: number; height: number };
  typedSignature: string;
  uploadedSignature: string | null;
  activeTab: string;
  isEditingSignature: boolean;
  isSigning: boolean;
  
  // Refs
  sigPad: React.RefObject<SignatureCanvas | null>;
  uploadInputRef: React.RefObject<HTMLInputElement | null>;
  draggableRef: React.RefObject<HTMLDivElement | null>;
  
  // Actions
  setSignaturePosition: (position: { x: number; y: number }) => void;
  setSignatureSize: (size: { width: number; height: number }) => void;
  setTypedSignature: (text: string) => void;
  setUploadedSignature: (signature: string | null) => void;
  setActiveTab: (tab: string) => void;
  setShowSignature: (show: boolean) => void;
  setIsSigning: (signing: boolean) => void;
  resetSignaturePosition: () => void;
  
  // Operations
  handleUploadSignature: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saveSignature: () => void;
  deleteSignature: () => void;
  editSignature: () => void;
  clearCurrentTab: () => void;
  updateSignaturePreview: () => void;
}

export function useSignatureManagement(): UseSignatureManagementReturn {
  // State
  const [signature, setSignature] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [signaturePosition, setSignaturePosition] = useState({ x: 50, y: 50 });
  const [signatureSize, setSignatureSize] = useState({ width: 220, height: 110 });
  const [typedSignature, setTypedSignature] = useState("");
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("draw");
  const [isEditingSignature, setIsEditingSignature] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // Refs
  const sigPad = useRef<SignatureCanvas>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const draggableRef = useRef<HTMLDivElement>(null);

  // Helper function to get a good initial position for new signatures
  const getInitialSignaturePosition = () => {
    // Place signature in a consistent, visible position
    return {
      x: 150, // Consistent position that's easily visible
      y: 100, // Higher up on the document for better visibility
    };
  };

  // Function to reset signature position
  const resetSignaturePosition = () => {
    const newPosition = getInitialSignaturePosition();
    console.log("Resetting signature position to:", newPosition);
    setSignaturePosition(newPosition);
  };

  // Signature generation functions
  const generateTypedSignaturePreview = (text: string): string | null => {
    if (!text) return null;
    const canvas = window.document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 400, 100);
      ctx.fillStyle = "black";
      ctx.font = "40px 'Caveat', cursive";
      ctx.fillText(text, 10, 60);
      return canvas.toDataURL("image/png");
    }
    return null;
  };

  const generateDrawnSignaturePreview = (): string | null => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      return sigPad.current.getTrimmedCanvas().toDataURL("image/png");
    }
    return null;
  };

  const updateSignaturePreview = () => {
    let preview = null;
    if (activeTab === "draw") {
      preview = generateDrawnSignaturePreview();
    } else if (activeTab === "type" && typedSignature) {
      preview = generateTypedSignaturePreview(typedSignature);
    } else if (activeTab === "upload" && uploadedSignature) {
      preview = uploadedSignature;
    }
    setSignaturePreview(preview);
  };

  // Event handlers
  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setUploadedSignature(result);
        setSignaturePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSignature = () => {
    if (signaturePreview) {
      setSignature(signaturePreview);
      setShowSignature(true);
      setIsSigning(false);
      setIsEditingSignature(false);
      // Reset position for new signature to ensure it's visible and draggable
      resetSignaturePosition();
      toast.success("Signature ready! Drag and resize it on the document, then click 'Place Signature'.");
    } else {
      toast.error("Please create a signature first.");
    }
  };

  const deleteSignature = () => {
    setSignature(null);
    setSignaturePreview(null);
    setShowSignature(false);
    setTypedSignature("");
    setUploadedSignature(null);
    // Reset position when deleting
    resetSignaturePosition();
    if (sigPad.current) {
      sigPad.current.clear();
    }
    toast.success("Signature deleted.");
  };

  const editSignature = () => {
    setIsSigning(true);
    setIsEditingSignature(true);
    setShowSignature(false); // Hide signature while editing
    if (signature) {
      setSignaturePreview(signature);
    }
  };

  const clearCurrentTab = () => {
    if (activeTab === "draw" && sigPad.current) {
      sigPad.current.clear();
    } else if (activeTab === "type") {
      setTypedSignature("");
    } else if (activeTab === "upload") {
      setUploadedSignature(null);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
    setSignaturePreview(null);
  };

  // Effect to update preview when dependencies change
  useEffect(() => {
    updateSignaturePreview();
  }, [activeTab, typedSignature, uploadedSignature]);

  return {
    // State
    signature,
    signaturePreview,
    showSignature,
    signaturePosition,
    signatureSize,
    typedSignature,
    uploadedSignature,
    activeTab,
    isEditingSignature,
    isSigning,
    
    // Refs
    sigPad,
    uploadInputRef,
    draggableRef,
    
    // Actions
    setSignaturePosition,
    setSignatureSize,
    setTypedSignature,
    setUploadedSignature,
    setActiveTab,
    setShowSignature,
    setIsSigning,
    resetSignaturePosition,
    
    // Operations
    handleUploadSignature,
    saveSignature,
    deleteSignature,
    editSignature,
    clearCurrentTab,
    updateSignaturePreview,
  };
} 