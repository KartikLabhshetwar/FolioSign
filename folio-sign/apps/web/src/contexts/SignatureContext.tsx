import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { trpcClient } from '@/utils/trpc';
import { getVisitorId } from '@/lib/analytics';
import { toast } from 'sonner';

interface SignatureState {
  signature: string | null;
  signaturePreview: string | null;
  isSignatureMode: boolean;
  signatureSize: { width: number; height: number };
  signatureColor: string;
  typedSignature: string;
  uploadedSignature: string | null;
  activeTab: string;
  isEditingSignature: boolean;
  isSigning: boolean;
}

interface SignatureActions {
  setSignature: (signature: string | null) => void;
  setSignaturePreview: (preview: string | null) => void;
  setIsSignatureMode: (mode: boolean) => void;
  setSignatureSize: (size: { width: number; height: number }) => void;
  setSignatureColor: (color: string) => void;
  setTypedSignature: (text: string) => void;
  setUploadedSignature: (signature: string | null) => void;
  setActiveTab: (tab: string) => void;
  setIsSigning: (signing: boolean) => void;
  setIsEditingSignature: (editing: boolean) => void;
  
  // Operations
  handleUploadSignature: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saveSignature: () => void;
  deleteSignature: () => void;
  editSignature: () => void;
  clearCurrentTab: () => void;
  updateSignaturePreview: () => void;
  startSignatureMode: () => void;
  cancelSignatureMode: () => void;
  placeSignatureAtPosition: (position: { x: number; y: number; page?: number }, documentId: string, onSuccess?: () => void) => Promise<void>;
}

interface SignatureContextType extends SignatureState, SignatureActions {
  sigPad: React.RefObject<SignatureCanvas | null>;
  uploadInputRef: React.RefObject<HTMLInputElement | null>;
  documentContainerRef: React.RefObject<HTMLDivElement | null>;
}

const SignatureContext = createContext<SignatureContextType | undefined>(undefined);

export default function SignatureProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SignatureState>({
    signature: null,
    signaturePreview: null,
    isSignatureMode: false,
    signatureSize: { width: 200, height: 80 },
    signatureColor: '#000000',
    typedSignature: '',
    uploadedSignature: null,
    activeTab: 'draw',
    isEditingSignature: false,
    isSigning: false,
  });

  const sigPad = useRef<SignatureCanvas | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const documentContainerRef = useRef<HTMLDivElement | null>(null);

  const updateState = useCallback((updates: Partial<SignatureState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Basic setters
  const setSignature = useCallback((signature: string | null) => {
    updateState({ signature });
  }, [updateState]);

  const setSignaturePreview = useCallback((preview: string | null) => {
    updateState({ signaturePreview: preview });
  }, [updateState]);

  const setIsSignatureMode = useCallback((mode: boolean) => {
    updateState({ isSignatureMode: mode });
  }, [updateState]);

  const setSignatureSize = useCallback((size: { width: number; height: number }) => {
    updateState({ signatureSize: size });
  }, [updateState]);

  const setSignatureColor = useCallback((color: string) => {
    updateState({ signatureColor: color });
    // Update signature preview with new color if we have typed signature
    if (state.activeTab === 'type' && state.typedSignature) {
      generateTypedSignaturePreview(state.typedSignature, color);
    }
  }, [updateState, state.activeTab, state.typedSignature]);



  const setTypedSignature = useCallback((text: string) => {
    updateState({ typedSignature: text });
    if (text.trim()) {
      generateTypedSignaturePreview(text, state.signatureColor);
    } else {
      updateState({ signaturePreview: null });
    }
  }, [updateState, state.signatureColor]);

  const setUploadedSignature = useCallback((signature: string | null) => {
    updateState({ uploadedSignature: signature, signaturePreview: signature });
  }, [updateState]);

  const setActiveTab = useCallback((tab: string) => {
    updateState({ activeTab: tab });
  }, [updateState]);

  const setIsSigning = useCallback((signing: boolean) => {
    updateState({ isSigning: signing });
  }, [updateState]);

  const setIsEditingSignature = useCallback((editing: boolean) => {
    updateState({ isEditingSignature: editing });
  }, [updateState]);

  // Generate signature previews
  const generateTypedSignaturePreview = useCallback((text: string, color: string = '#000000'): void => {
    if (!text.trim()) {
      updateState({ signaturePreview: null });
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 120;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set font style
    ctx.font = '36px Caveat, cursive';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw text
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const dataURL = canvas.toDataURL('image/png');
    updateState({ signaturePreview: dataURL });
  }, [updateState]);

  const generateDrawnSignaturePreview = useCallback((): void => {
    if (!sigPad.current?.isEmpty()) {
      const dataURL = sigPad.current?.getTrimmedCanvas().toDataURL('image/png');
      updateState({ signaturePreview: dataURL });
    } else {
      updateState({ signaturePreview: null });
    }
  }, [updateState]);

  const updateSignaturePreview = useCallback(() => {
    switch (state.activeTab) {
      case 'draw':
        generateDrawnSignaturePreview();
        break;
      case 'type':
        if (state.typedSignature) {
          generateTypedSignaturePreview(state.typedSignature, state.signatureColor);
        }
        break;
      case 'upload':
        // Preview is already set when upload happens
        break;
    }
  }, [state.activeTab, state.typedSignature, state.signatureColor, generateDrawnSignaturePreview, generateTypedSignaturePreview]);

  // File upload handler
  const handleUploadSignature = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedSignature(result);
      };
      reader.readAsDataURL(file);
    }
  }, [setUploadedSignature]);

  // Main operations
  const saveSignature = useCallback(() => {
    if (state.signaturePreview) {
      setSignature(state.signaturePreview);
      setIsSigning(false);
      setIsEditingSignature(false);
      // Automatically start signature mode after saving
      setTimeout(() => {
        setIsSignatureMode(true);
        toast.success("Signature ready! Click anywhere on the document to place it.");
      }, 100);
    }
  }, [state.signaturePreview, setSignature, setIsSigning, setIsEditingSignature, setIsSignatureMode]);

  const deleteSignature = useCallback(() => {
    updateState({
      signature: null,
      signaturePreview: null,
      isSignatureMode: false,
      typedSignature: '',
      uploadedSignature: null,
    });
    sigPad.current?.clear();
    toast.success("Signature deleted.");
  }, [updateState]);

  const editSignature = useCallback(() => {
    setIsSigning(true);
    setIsEditingSignature(true);
  }, [setIsSigning, setIsEditingSignature]);

  const clearCurrentTab = useCallback(() => {
    switch (state.activeTab) {
      case 'draw':
        sigPad.current?.clear();
        break;
      case 'type':
        setTypedSignature('');
        break;
      case 'upload':
        setUploadedSignature(null);
        if (uploadInputRef.current) {
          uploadInputRef.current.value = '';
        }
        break;
    }
    updateState({ signaturePreview: null });
  }, [state.activeTab, setTypedSignature, setUploadedSignature, updateState]);

  const startSignatureMode = useCallback(() => {
    if (state.signature) {
      setIsSignatureMode(true);
      toast.success("Click anywhere on the document to place your signature.");
    }
  }, [state.signature, setIsSignatureMode]);

  const cancelSignatureMode = useCallback(() => {
    setIsSignatureMode(false);
  }, [setIsSignatureMode]);

  const placeSignatureAtPosition = useCallback(async (position: { x: number; y: number; page?: number }, documentId: string, onSuccess?: () => void) => {
    if (!state.signature) {
      toast.error("No signature to place.");
      return;
    }

    // Immediately disable signature mode for smooth UX
    setIsSignatureMode(false);

    try {
      const visitorId = getVisitorId();
      await trpcClient.document.signDocument.mutate({
        docId: documentId,
        signature: state.signature,
        visitorId,
        x: position.x,
        y: position.y,
        page: position.page || 1, // Default to page 1 if not specified
        width: state.signatureSize.width,
        height: state.signatureSize.height,
      });
      
      // Call success callback to refresh PDF only when needed
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Re-enable signature mode if placement failed
      setIsSignatureMode(true);
      toast.error(`Failed to place signature: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [state.signature, state.signatureSize, setIsSignatureMode]);

  const contextValue: SignatureContextType = {
    ...state,
    sigPad,
    uploadInputRef,
    documentContainerRef,
    setSignature,
    setSignaturePreview,
    setIsSignatureMode,
    setSignatureSize,
    setSignatureColor,
    setTypedSignature,
    setUploadedSignature,
    setActiveTab,
    setIsSigning,
    setIsEditingSignature,
    handleUploadSignature,
    saveSignature,
    deleteSignature,
    editSignature,
    clearCurrentTab,
    updateSignaturePreview,
    startSignatureMode,
    cancelSignatureMode,
    placeSignatureAtPosition,
  };

  return (
    <SignatureContext.Provider value={contextValue}>
      {children}
    </SignatureContext.Provider>
  );
}

export function useSignature() {
  const context = useContext(SignatureContext);
  if (context === undefined) {
    throw new Error('useSignature must be used within a SignatureProvider');
  }
  return context;
} 