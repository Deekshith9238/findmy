import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, X } from "lucide-react";
import { uploadFile, getFilePreview } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      // Show preview
      const previewUrl = await getFilePreview(file);
      setPreview(previewUrl);
      
      // Upload file
      const result = await uploadFile(file, 'profile');
      
      if (result.success && result.url) {
        onPictureChange(result.url);
        toast({
          title: "Profile picture updated",
          description: "Your profile picture has been updated successfully.",
        });
      } else {
        toast({
          title: "Upload failed",
          description: result.error || "Failed to upload image",
          variant: "destructive",
        });
        setPreview(null);
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading your image",
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

  return (
    <div className="flex flex-col items-center space-y-4">
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
    </div>
  );
}