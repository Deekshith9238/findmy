import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, X } from "lucide-react";
import { uploadFile, getFilePreview } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";
import ImageCropper from "./ImageCropper";
import { readFile } from "@/lib/cropImage";

interface ProfilePictureUploadProps {
  currentPicture?: string;
  onPictureChange: (pictureUrl: string) => void;
  userName: string;
}

export default function ProfilePictureUpload({ 
  currentPicture, 
  onPictureChange, 
  userName 
}: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('File selected:', file.name, file.size, file.type);

    try {
      // Validate file size and type first
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        console.log('File too large:', file.size);
        toast({
          title: "File too large",
          description: "Profile picture must be less than 2MB",
          variant: "destructive",
        });
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        console.log('Invalid file type:', file.type);
        toast({
          title: "Invalid file type",
          description: "Please select a JPEG, PNG, or GIF image",
          variant: "destructive",
        });
        return;
      }

      // Read file and show cropper
      console.log('Reading file...');
      const imageDataUrl = await readFile(file);
      console.log('File read successfully, setting selected image and showing cropper');
      setSelectedImage(imageDataUrl);
      setShowCropper(true);
      console.log('showCropper set to true, selectedImage set');
    } catch (error) {
      console.error('Error in handleFileSelect:', error);
      toast({
        title: "Error reading file",
        description: "Failed to read the selected image",
        variant: "destructive",
      });
    }
  };

  const handleCropComplete = async (croppedImageUrl: string) => {
    try {
      setIsUploading(true);
      
      // Show preview of cropped image
      setPreview(croppedImageUrl);
      
      // Convert blob URL to base64 for upload
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      
      // Create a new file from the cropped blob
      const croppedFile = new File([blob], 'cropped-profile.jpg', { type: 'image/jpeg' });
      
      // Upload the cropped image
      const result = await uploadFile(croppedFile, 'profile');
      
      if (result.success && result.url) {
        onPictureChange(result.url);
        toast({
          title: "Profile picture updated",
          description: "Your profile picture has been cropped and updated successfully.",
        });
      } else {
        toast({
          title: "Upload failed",
          description: result.error || "Failed to upload cropped image",
          variant: "destructive",
        });
        setPreview(null);
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading your cropped image",
        variant: "destructive",
      });
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePicture = () => {
    setPreview(null);
    onPictureChange("");
    toast({
      title: "Profile picture removed",
      description: "Your profile picture has been removed.",
    });
  };

  const displayPicture = preview || currentPicture;
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

  // Debug logging
  console.log('Render state:', { showCropper, selectedImage: !!selectedImage, isUploading });

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Debug info - remove this later */}
      <div className="text-xs text-gray-500">
        Debug: showCropper={showCropper.toString()}, hasImage={!!selectedImage}
      </div>
      
      <div className="relative">
        <Avatar className="w-24 h-24">
          <AvatarImage src={displayPicture} alt={userName} />
          <AvatarFallback className="text-lg font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {displayPicture && (
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0"
            onClick={handleRemovePicture}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={isUploading}
          onClick={() => document.getElementById('profile-picture-input')?.click()}
        >
          <Camera className="w-4 h-4 mr-2" />
          {isUploading ? "Uploading..." : "Change Picture"}
        </Button>
      </div>

      <Input
        id="profile-picture-input"
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Cropper Modal */}
      {selectedImage && (
        <ImageCropper
          imageSrc={selectedImage}
          isOpen={showCropper}
          onClose={() => {
            console.log('Closing cropper');
            setShowCropper(false);
            setSelectedImage(null);
          }}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}