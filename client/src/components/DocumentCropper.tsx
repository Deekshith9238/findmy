import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw, Check, X } from "lucide-react";
import getCroppedImg from "@/lib/cropImage";

interface DocumentCropperProps {
  imageSrc: string;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageUrl: string) => void;
  documentType: string;
  fileName: string;
}

// Define aspect ratios for different document types
const getAspectRatio = (documentType: string): number => {
  switch (documentType) {
    case "identity":
    case "drivers_license":
      return 1.586; // ID card ratio (85.6mm x 54mm)
    case "license":
    case "certificate":
      return 1.414; // A4 ratio (√2)
    case "experience":
      return 1.414; // A4 ratio
    case "banking_details":
      return 1.586; // Bank statement ratio
    default:
      return 1.414; // Default to A4 ratio
  }
};

const getDocumentTypeLabel = (documentType: string): string => {
  const labels: { [key: string]: string } = {
    identity: "Government ID",
    drivers_license: "Driver's License",
    license: "Professional License",
    certificate: "Certificate",
    experience: "Experience Letter",
    banking_details: "Banking Details",
    other: "Other Document"
  };
  return labels[documentType] || documentType;
};

export default function DocumentCropper({ 
  imageSrc, 
  isOpen, 
  onClose, 
  onCropComplete,
  documentType,
  fileName
}: DocumentCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const aspectRatio = getAspectRatio(documentType);
  const documentTypeLabel = getDocumentTypeLabel(documentType);

  console.log('DocumentCropper render:', { isOpen, imageSrc: !!imageSrc, documentType, aspectRatio });

  const handleCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    console.log('Document crop complete callback:', { croppedArea, croppedAreaPixels });
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    if (!croppedAreaPixels) return;
    
    try {
      setIsCropping(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
      onClose();
    } catch (error) {
      console.error('Error cropping document:', error);
    } finally {
      setIsCropping(false);
    }
  };

  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Crop {documentTypeLabel}</DialogTitle>
          <p className="text-sm text-gray-600">File: {fileName}</p>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Cropper Container */}
          <div className="relative flex-1 min-h-[300px] max-h-[450px] bg-gray-100 rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
              showGrid={true}
              objectFit="contain"
              style={{
                containerStyle: {
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#f3f4f6',
                },
                cropAreaStyle: {
                  border: '2px solid #3b82f6',
                  color: 'rgba(59, 130, 246, 0.5)',
                },
                mediaStyle: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                },
              }}
            />
          </div>

          {/* Document Type Info */}
          <div className="flex-shrink-0 p-2 bg-blue-50 border-t">
            <div className="text-xs text-blue-700">
              <strong>Document Type:</strong> {documentTypeLabel} 
              <span className="ml-2">•</span>
              <span className="ml-2">Aspect Ratio: {aspectRatio.toFixed(3)}</span>
            </div>
          </div>

          {/* Controls - Make this scrollable */}
          <div className="flex-shrink-0 p-4 space-y-4 max-h-[200px] overflow-y-auto">
            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                  disabled={zoom <= 1}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Slider
                  value={[zoom]}
                  onValueChange={(value) => setZoom(value[0])}
                  min={1}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Rotation Control */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRotation((prev) => prev - 90)}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Rotate Left
              </Button>
              <span className="text-sm">{rotation}°</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRotation((prev) => prev + 90)}
              >
                <RotateCcw className="w-4 h-4 mr-2 rotate-180" />
                Rotate Right
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleCrop}
                disabled={isCropping || !croppedAreaPixels}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-2" />
                {isCropping ? "Cropping..." : "Crop & Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 