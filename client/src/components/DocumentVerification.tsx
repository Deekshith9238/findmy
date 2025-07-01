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
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedType) return;

    uploadMutation.mutate({ file, documentType: selectedType });
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
  const totalRequiredDocs = 2; // Government ID + Professional License
  const isFullyVerified = approvedDocs.length >= totalRequiredDocs;

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
            <p className="text-sm text-blue-800">
              You need to upload and get approved at least {totalRequiredDocs} documents 
              (Government ID and Professional License) to start receiving tasks.
            </p>
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
              disabled={!selectedType || uploadMutation.isPending}
              onClick={() => document.getElementById('document-upload')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
          
          <Input
            id="document-upload"
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileUpload}
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
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No documents uploaded yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}