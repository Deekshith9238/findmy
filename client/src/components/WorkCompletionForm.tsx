import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Camera, Upload, Check, X, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface WorkCompletionFormProps {
  serviceRequestId: number;
  onSuccess: () => void;
}

interface PhotoUpload {
  file: File;
  url: string;
  originalName: string;
  description: string;
}

export default function WorkCompletionForm({ serviceRequestId, onSuccess }: WorkCompletionFormProps) {
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      workDescription: '',
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        setUploadingPhotos(prev => [...prev, file.name]);
        
        try {
          // Convert file to base64 for upload
          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64 = e.target?.result as string;
            
            // In a real app, you'd upload to a cloud service like AWS S3
            // For now, we'll use base64 data URLs
            const photoUpload: PhotoUpload = {
              file,
              url: base64,
              originalName: file.name,
              description: ''
            };
            
            setPhotos(prev => [...prev, photoUpload]);
            setUploadingPhotos(prev => prev.filter(name => name !== file.name));
          };
          reader.readAsDataURL(file);
        } catch (error) {
          toast({
            title: "Upload Error",
            description: `Failed to upload ${file.name}`,
            variant: "destructive",
          });
          setUploadingPhotos(prev => prev.filter(name => name !== file.name));
        }
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const updatePhotoDescription = (index: number, description: string) => {
    setPhotos(prev => prev.map((photo, i) => 
      i === index ? { ...photo, description } : photo
    ));
  };

  const onSubmit = async (data: { workDescription: string }) => {
    if (photos.length === 0) {
      toast({
        title: "Photos Required",
        description: "Please upload at least one photo of the completed work",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/payments/submit-work', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceRequestId,
          photos: photos.map(photo => ({
            url: photo.url,
            originalName: photo.originalName,
            description: photo.description || data.workDescription
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit work completion');
      }

      const result = await response.json();

      toast({
        title: "Work Submitted Successfully",
        description: `Your work completion has been submitted for approval. ${result.notificationsSent} payment approvers have been notified.`,
      });

      onSuccess();
    } catch (error) {
      toast({
        title: "Submission Error",
        description: error instanceof Error ? error.message : 'Failed to submit work completion',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Submit Work Completion
        </CardTitle>
        <CardDescription>
          Upload photos of your completed work to request payment release
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Photo Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Work Photos</label>
            <div className="relative">
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button type="button" variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload Photos
              </Button>
            </div>
          </div>

          {/* Uploading Indicators */}
          {uploadingPhotos.map(fileName => (
            <div key={fileName} className="flex items-center gap-2 p-2 bg-muted rounded">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Uploading {fileName}...</span>
            </div>
          ))}

          {/* Photo Preview Grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="space-y-2">
                  <div className="relative group">
                    <img
                      src={photo.url}
                      alt={`Work photo ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Describe this photo (optional)"
                    value={photo.description}
                    onChange={(e) => updatePhotoDescription(index, e.target.value)}
                    className="text-sm"
                    rows={2}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Work Description Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="workDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Summary</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Briefly describe the work completed..."
                      {...field}
                      rows={4}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a summary of the work completed for the client
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Notice */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Once you submit, payment approvers will review your work and release payment if approved.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              disabled={isSubmitting || photos.length === 0}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting Work...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Submit Work for Payment
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}