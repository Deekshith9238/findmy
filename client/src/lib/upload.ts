// Simple file upload utility for profile pictures and documents
// Using base64 encoding for simplicity in this implementation

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadFile(file: File, type: 'profile' | 'document'): Promise<UploadResult> {
  try {
    // Validate file size - stricter limit for profile pictures due to base64 encoding
    const maxSize = type === 'profile' ? 2 * 1024 * 1024 : 5 * 1024 * 1024; // 2MB for profile, 5MB for documents
    if (file.size > maxSize) {
      return { 
        success: false, 
        error: `File size too large. Maximum ${maxSize / (1024 * 1024)}MB allowed for ${type} pictures.` 
      };
    }

    // Validate file type
    const allowedTypes = type === 'profile' 
      ? ['image/jpeg', 'image/png', 'image/gif']
      : ['image/jpeg', 'image/png', 'application/pdf', 'image/gif'];
    
    if (!allowedTypes.includes(file.type)) {
      return { 
        success: false, 
        error: `Invalid file type. ${type === 'profile' ? 'Images only' : 'Images and PDFs only'}.` 
      };
    }

    // Convert file to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // For this implementation, we'll store the base64 data directly
    // In a production app, you'd upload to a cloud storage service
    return { success: true, url: base64 };
  } catch (error) {
    return { success: false, error: 'Failed to upload file' };
  }
}

export function getFilePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}