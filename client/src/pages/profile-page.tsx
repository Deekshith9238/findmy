import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, BriefcaseBusiness, FileText, Settings } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";
import DocumentVerification from "@/components/DocumentVerification";
import { useAuth } from "@/hooks/use-auth";

// Validation schemas
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().optional(),
});

const providerProfileSchema = z.object({
  categoryId: z.coerce.number().min(1, "Please select a service category"),
  hourlyRate: z.coerce.number().min(1, "Hourly rate must be at least $1"),
  bio: z.string().min(1, "Bio is required"),
  experience: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type ProviderProfileFormValues = z.infer<typeof providerProfileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");

  // Fetch user profile data
  const { data: userProfile, isLoading: userLoading } = useQuery({
    queryKey: ["/api/user"],
  });

  // Fetch service categories
  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Fetch provider profile if user is a service provider
  const { data: providerProfile, isLoading: providerLoading } = useQuery({
    queryKey: ["/api/provider/profile"],
    enabled: user?.role === "service_provider",
  });

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: userProfile?.firstName || "",
      lastName: userProfile?.lastName || "",
      email: userProfile?.email || "",
      phoneNumber: userProfile?.phoneNumber || "",
    },
  });

  // Provider profile form
  const providerForm = useForm<ProviderProfileFormValues>({
    resolver: zodResolver(providerProfileSchema),
    defaultValues: {
      categoryId: providerProfile?.categoryId || 0,
      hourlyRate: providerProfile?.hourlyRate || 0,
      bio: providerProfile?.bio || "",
      experience: providerProfile?.experience || "",
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest("PUT", "/api/user/profile", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated successfully",
        description: "Your profile information has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update provider profile mutation
  const updateProviderMutation = useMutation({
    mutationFn: async (data: ProviderProfileFormValues) => {
      const res = await apiRequest("PUT", "/api/provider/profile", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Provider profile updated successfully",
        description: "Your service provider information has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/provider/profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update provider profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmitProfile(values: ProfileFormValues) {
    updateProfileMutation.mutate(values);
  }

  function onSubmitProviderProfile(values: ProviderProfileFormValues) {
    updateProviderMutation.mutate(values);
  }

  // Update form default values when data loads using useEffect
  useEffect(() => {
    if (userProfile) {
      profileForm.reset({
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        email: userProfile.email || "",
        phoneNumber: userProfile.phoneNumber || "",
      });
    }
  }, [userProfile?.firstName, userProfile?.lastName, userProfile?.email, userProfile?.phoneNumber]);

  useEffect(() => {
    if (providerProfile) {
      providerForm.reset({
        categoryId: providerProfile.categoryId || 0,
        hourlyRate: providerProfile.hourlyRate || 0,
        bio: providerProfile.bio || "",
        experience: providerProfile.experience || "",
      });
    }
  }, [providerProfile?.categoryId, providerProfile?.hourlyRate, providerProfile?.bio, providerProfile?.experience]);

  if (userLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Profile Settings
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Manage your account settings and profile information
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex gap-6">
            {/* Left sidebar with navigation */}
            <div className="w-80">
              <Card>
                <CardContent className="p-6">
                  <TabsList className="flex flex-col w-full h-auto bg-transparent space-y-1">
                    <TabsTrigger
                      value="general"
                      className="w-full justify-start px-3 py-2"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile Info
                    </TabsTrigger>
                    <TabsTrigger
                      value="provider"
                      className="w-full justify-start px-3 py-2"
                    >
                      <BriefcaseBusiness className="h-4 w-4 mr-2" />
                      Provider Settings
                    </TabsTrigger>
                    {user?.role === "service_provider" && (
                      <TabsTrigger
                        value="documents"
                        className="w-full justify-start px-3 py-2"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Document Verification
                      </TabsTrigger>
                    )}
                    <TabsTrigger
                      value="account"
                      className="w-full justify-start px-3 py-2"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </TabsTrigger>
                  </TabsList>
                </CardContent>
              </Card>
            </div>

            {/* Main content */}
            <div className="flex-1">
              <TabsContent value="general" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Profile Picture Upload */}
                      <div className="flex justify-center mb-6">
                        <ProfilePictureUpload
                          currentPicture={userProfile?.profilePicture}
                          onPictureChange={async (pictureUrl) => {
                            try {
                              const res = await apiRequest("PUT", "/api/user/profile-picture", {
                                profilePicture: pictureUrl
                              });
                              const updatedUser = await res.json();
                              queryClient.setQueryData(["/api/user"], updatedUser);
                            } catch (error) {
                              toast({
                                title: "Failed to update profile picture",
                                description: "Please try again later",
                                variant: "destructive",
                              });
                            }
                          }}
                          userName={`${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`}
                        />
                      </div>
                      
                      <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={profileForm.control}
                              name="firstName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>First Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter your first name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={profileForm.control}
                              name="lastName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Last Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter your last name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="Enter your email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="phoneNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your phone number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button 
                            type="submit"
                            disabled={updateProfileMutation.isPending}
                          >
                            {updateProfileMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save Changes"
                            )}
                          </Button>
                        </form>
                      </Form>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="provider" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Service Provider Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {providerLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <Form {...providerForm}>
                        <form onSubmit={providerForm.handleSubmit(onSubmitProviderProfile)} className="space-y-6">
                          <FormField
                            control={providerForm.control}
                            name="categoryId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Service Category</FormLabel>
                                <Select 
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  value={field.value?.toString()}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a service category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {categories?.map((category: any) => (
                                      <SelectItem key={category.id} value={category.id.toString()}>
                                        {category.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={providerForm.control}
                            name="hourlyRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Hourly Rate ($)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    placeholder="Enter your hourly rate"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={providerForm.control}
                            name="bio"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bio</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Describe your services and experience"
                                    className="min-h-[120px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={providerForm.control}
                            name="experience"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Experience (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Share your relevant experience and qualifications"
                                    className="min-h-[100px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button 
                            type="submit"
                            disabled={updateProviderMutation.isPending}
                          >
                            {updateProviderMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save Provider Settings"
                            )}
                          </Button>
                        </form>
                      </Form>
                    )}
                    
                    {user?.role === "service_provider" && !providerProfile && (
                      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                          Complete Your Provider Profile
                        </h3>
                        <p className="text-blue-700 dark:text-blue-300 text-sm">
                          Complete the form above to set up your service provider profile and start offering your services to clients.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {user?.role === "service_provider" && (
                <TabsContent value="documents" className="mt-0">
                  {providerProfile ? (
                    <DocumentVerification providerId={providerProfile.id} />
                  ) : (
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center text-gray-500">
                          Please complete your provider profile first to access document verification.
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}

              <TabsContent value="account" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-1">Change Password</h3>
                        <p className="text-neutral-600 text-sm mb-4">
                          Update your password to keep your account secure
                        </p>
                        <Button variant="outline">Change Password</Button>
                      </div>
                      
                      <div className="border-t pt-4 mt-6">
                        <h3 className="font-medium text-red-600 mb-1">Danger Zone</h3>
                        <p className="text-neutral-600 text-sm mb-4">
                          Delete your account and all associated data
                        </p>
                        <Button variant="destructive">Delete Account</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
}