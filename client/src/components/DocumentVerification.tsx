import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Check, X, Clock, AlertCircle } from "lucide-react";
import { uploadFile } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import DocumentCropper from "./DocumentCropper";
import { readFile } from "@/lib/cropImage";

interface Document {
  id: number;
  documentType: string;
  documentUrl: string;
  originalName: string;
  uploadedAt: string;
  verificationStatus: string;
  verifiedBy?: number;
  verifiedAt?: string;
  notes?: string;
}

interface DocumentVerificationProps {
  providerId: number;
}

const documentTypes = [
  { value: "identity", label: "Government ID" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "license", label: "Professional License" },
  { value: "certificate", label: "Certificate" },
  { value: "experience", label: "Experience Letter" },
  { value: "banking_details", label: "Banking Details" },
  { value: "other", label: "Other" },
];

export default function DocumentVerification({ providerId }: DocumentVerificationProps) {
  const [selectedType, setSelectedType] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reuploadDocumentId, setReuploadDocumentId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch documents
  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/user/provider/documents"],
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; documentType: string }) => {
      const { file, documentType } = data;
      
      // Upload file
      const uploadResult = await uploadFile(file, 'document');
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      // Save document to database
      const res = await apiRequest("POST", "/api/provider/documents", {
        providerId,
        documentType,
        documentUrl: uploadResult.url,
        originalName: file.name,
      });
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/provider/documents"] });
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded and is pending verification.",
      });
      setSelectedType("");
      setSelectedFile(null);
      setSelectedImage(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reupload document mutation
  const reuploadMutation = useMutation({
    mutationFn: async (data: { file: File; documentId: number; documentType: string }) => {
      const { file, documentId, documentType } = data;
      
      // Upload file
      const uploadResult = await uploadFile(file, 'document');
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      // Update document in database
      const res = await apiRequest("PUT", `/api/provider/documents/${documentId}`, {
        documentUrl: uploadResult.url,
        originalName: file.name,
        verificationStatus: 'pending', // Reset to pending
        notes: null, // Clear previous notes
      });
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/provider/documents"] });
      // Also invalidate pending verification queries for service verifiers
      queryClient.invalidateQueries({ queryKey: ["/api/providers/pending-verification"] });
      toast({
        title: "Document reuploaded",
        description: "Your document has been reuploaded and is pending verification.",
      });
      setSelectedType("");
      setSelectedFile(null);
      setSelectedImage(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Reupload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedType) return;


    try {
      // Validate file size
      const maxSize = 5 * 1024 * 1024; // 5MB for documents
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Document must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      // Check if it's an image that needs cropping
      const isImage = file.type.startsWith('image/');
      
      if (isImage) {
        // For images, show cropper
        const imageDataUrl = await readFile(file);
        setSelectedImage(imageDataUrl);
        setSelectedFile(file);
        setShowCropper(true);
      } else {
        // For PDFs and other files, upload directly
        uploadMutation.mutate({ file, documentType: selectedType });
      }
    } catch (error) {
      console.error('Error handling file selection:', error);
      toast({
        title: "Error reading file",
        description: "Failed to read the selected file",
        variant: "destructive",
      });
    }
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    try {
      // Convert cropped image to file
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], selectedFile.name, { type: selectedFile.type });
      
      // Upload the cropped image
      await uploadMutation.mutateAsync({ file, documentType: selectedType });
    } catch (error) {
      console.error('Error uploading cropped image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload the cropped image.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setShowCropper(false);
    }
  };

  const handleReuploadFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, documentId: number, documentType: string) => {
    const file = event.target.files?.[0];
    if (!file) return;


    // Check if file is an image
    if (file.type.startsWith('image/')) {
      try {
        const imageUrl = await readFile(file);
        setSelectedImage(imageUrl);
        setSelectedFile(file);
        setShowCropper(true);
        
        // Store document info for reupload
        setSelectedType(documentType);
        setReuploadDocumentId(documentId);
      } catch (error) {
        console.error('Error reading image file:', error);
        toast({
          title: "File error",
          description: "Failed to read the image file.",
          variant: "destructive",
        });
      }
    } else {
      // For non-image files, upload directly
      try {
        await reuploadMutation.mutateAsync({ file, documentId, documentType });
      } catch (error) {
        console.error('Error reuploading file:', error);
      }
    }
    
    // Clear the input
    event.target.value = '';
  };

  const handleReuploadCropComplete = async (croppedImageUrl: string) => {
    if (!selectedFile || !reuploadDocumentId) return;
    
    setIsUploading(true);
    try {
      // Convert cropped image to file
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], selectedFile.name, { type: selectedFile.type });
      
      // Reupload the cropped image
      await reuploadMutation.mutateAsync({ file, documentId: reuploadDocumentId, documentType: selectedType });
    } catch (error) {
      console.error('Error reuploading cropped image:', error);
      toast({
        title: "Reupload failed",
        description: "Failed to reupload the cropped image.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setShowCropper(false);
      setReuploadDocumentId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <Check className="w-4 h-4 text-green-600" />;
      case "rejected":
        return <X className="w-4 h-4 text-red-600" />;
      case "under_review":
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "under_review":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "under_review":
        return "Under Review";
      default:
        return "Pending";
    }
  };

  const approvedDocs = documents?.filter(doc => doc.verificationStatus === "approved") || [];
  
  // Check for specific required document types
  const hasApprovedIdentity = approvedDocs.some(doc => 
    doc.documentType === "identity" || doc.documentType === "drivers_license"
  );
  const hasApprovedBankingDetails = approvedDocs.some(doc => 
    doc.documentType === "banking_details"
  );
  const hasApprovedLicense = approvedDocs.some(doc => 
    doc.documentType === "license" || doc.documentType === "certificate"
  );
  
  const totalRequiredDocs = 3; // Government ID/Driver's License + Banking Details + Professional License/Certificate
  const isFullyVerified = hasApprovedIdentity && hasApprovedBankingDetails && hasApprovedLicense;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Document Verification
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={isFullyVerified ? "default" : "secondary"}>
            {isFullyVerified ? "Verified" : "Pending Verification"}
          </Badge>
          <span className="text-sm text-gray-600">
            {approvedDocs.length}/{totalRequiredDocs} documents approved
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isFullyVerified && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Verification Required</h4>
            <p className="text-sm text-blue-800 mb-3">
              You need to upload and get approved all {totalRequiredDocs} required documents to start receiving tasks:
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className={`flex items-center gap-2 ${hasApprovedIdentity ? 'text-green-700' : ''}`}>
                {hasApprovedIdentity ? '✓' : '○'} Government ID or Driver's License
              </li>
              <li className={`flex items-center gap-2 ${hasApprovedBankingDetails ? 'text-green-700' : ''}`}>
                {hasApprovedBankingDetails ? '✓' : '○'} Banking Details (Mandatory)
              </li>
              <li className={`flex items-center gap-2 ${hasApprovedLicense ? 'text-green-700' : ''}`}>
                {hasApprovedLicense ? '✓' : '○'} Professional License or Certificate
              </li>
            </ul>
          </div>
        )}

        {/* Upload new document */}
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium">Upload New Document</h4>
          <div className="flex gap-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              disabled={!selectedType || uploadMutation.isPending || isUploading}
              onClick={() => document.getElementById('document-upload')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadMutation.isPending || isUploading ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
          
          <Input
            id="document-upload"
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Existing documents */}
        <div className="space-y-3">
          <h4 className="font-medium">Uploaded Documents</h4>
          {isLoading ? (
            <div className="text-center py-4">Loading documents...</div>
          ) : documents && documents.length > 0 ? (
            documents.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">
                      {documentTypes.find(t => t.value === doc.documentType)?.label || doc.documentType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(doc.verificationStatus)}
                    <Badge className={getStatusColor(doc.verificationStatus)}>
                      {getStatusText(doc.verificationStatus)}
                    </Badge>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  <div>File: {doc.originalName}</div>
                  <div>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</div>
                  {doc.verifiedAt && (
                    <div>Verified: {new Date(doc.verifiedAt).toLocaleDateString()}</div>
                  )}
                </div>
                
                {doc.notes && (
                  <div className="text-sm bg-gray-50 rounded p-2 mt-2">
                    <strong>Notes:</strong> {doc.notes}
                  </div>
                )}

                {doc.verificationStatus === "rejected" && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h5 className="font-medium text-red-900 mb-2">Document Rejected</h5>
                    <p className="text-sm text-red-800 mb-2">
                      This document was rejected by the verification team. Please reupload a corrected version.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        id={`reupload-${doc.id}`}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleReuploadFileSelect(e, doc.id, doc.documentType)}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`reupload-${doc.id}`)?.click()}
                        disabled={reuploadMutation.isPending || isUploading}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {reuploadMutation.isPending || isUploading ? "Reuploading..." : "Reupload Document"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No documents uploaded yet
            </div>
          )}
        </div>

        {/* Document Cropper Modal */}
        {selectedImage && selectedFile && (
          <DocumentCropper
            imageSrc={selectedImage}
            isOpen={showCropper}
            onClose={() => {
              setShowCropper(false);
              setSelectedImage(null);
              setSelectedFile(null);
              setReuploadDocumentId(null);
            }}
            onCropComplete={reuploadDocumentId ? handleReuploadCropComplete : handleCropComplete}
            documentType={selectedType}
            fileName={selectedFile.name}
          />
        )}
      </CardContent>
    </Card>
  );
}