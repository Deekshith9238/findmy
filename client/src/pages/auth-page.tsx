import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/MainLayout";
import { Redirect, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

// Login schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Register schema without bank details
const registerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  isServiceProvider: z.boolean(),
  // Service provider specific fields (conditional)
  categoryId: z.number().optional(),
  hourlyRate: z.number().optional(),
  bio: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  availability: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
}).refine(data => {
  if (data.isServiceProvider) {
    return data.categoryId && data.hourlyRate;
  }
  return true;
}, {
  message: "Category and hourly rate are required for service providers",
  path: ["categoryId"]
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

interface AuthPageProps {
  isModal?: boolean;
  onClose?: () => void;
  defaultToProvider?: boolean;
  defaultTab?: 'login' | 'register';
}

function AuthPage({ isModal = false, onClose, defaultToProvider = false, defaultTab = "login" }: AuthPageProps) {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(defaultTab || (defaultToProvider ? "register" : "login"));
  const [accountType, setAccountType] = useState<string>(defaultToProvider ? "provider" : "client");
  const [registrationStep, setRegistrationStep] = useState<"form" | "otp">("form");
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [otp, setOtp] = useState("");
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const { toast } = useToast();
  
  // Fetch service categories for provider signup
  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    enabled: activeTab === "register" && accountType === "provider",
  });

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      isServiceProvider: defaultToProvider,
      // Bank details
      bankAccountHolderName: "",
      bankName: "",
      bankAccountNumber: "",
      bankRoutingNumber: "",
      bankAccountType: 'checking' as const,
      // Service provider fields
      categoryId: undefined,
      hourlyRate: undefined,
      bio: "",
      yearsOfExperience: undefined,
      availability: "",
    },
  });

  // Handle login form submission
  function onLoginSubmit(values: LoginFormValues) {
    loginMutation.mutate(values);
  }

  // Handle register form submission - now sends OTP first
  async function onRegisterSubmit(values: RegisterFormValues) {
    const { confirmPassword, ...userData } = values;
    const finalData = {
      ...userData,
      role: values.isServiceProvider ? "service_provider" : "client",
    };

    try {
      setIsSendingOTP(true);
      
      // Send OTP for email verification
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: finalData.email,
          purpose: 'email_verification'
        }),
      });

      if (response.ok) {
        setRegistrationData(finalData);
        setRegistrationStep("otp");
        toast({
          title: "Verification code sent",
          description: "Please check your email for the verification code",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Failed to send verification code",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingOTP(false);
    }
  }

  // Handle OTP verification and account creation
  async function handleOTPVerification(e: React.FormEvent) {
    e.preventDefault();
    
    if (!otp || !registrationData) return;

    try {
      setIsVerifyingOTP(true);
      
      // Verify OTP and create account
      const response = await fetch('/api/auth/verify-otp-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...registrationData,
          otp
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Account created successfully",
          description: "Welcome to Findmyhelper! You can now login with your credentials.",
        });
        
        // Reset form and go back to login
        setRegistrationStep("form");
        setOtp("");
        setRegistrationData(null);
        setActiveTab("login");
        registerForm.reset();
      } else {
        const error = await response.json();
        toast({
          title: "Registration failed",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingOTP(false);
    }
  }

  // Handle account type change
  const handleAccountTypeChange = (value: string) => {
    setAccountType(value);
    registerForm.setValue("isServiceProvider", value === "provider");
  };

  // Go back to registration form
  const handleBackToForm = () => {
    setRegistrationStep("form");
    setOtp("");
    setRegistrationData(null);
  };

  // If user is already logged in and this is not a modal, redirect to home
  if (user && !isModal) {
    return <Redirect to="/" />;
  }

  // Render the auth page content
  const authContent = (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="login">Login</TabsTrigger>
        <TabsTrigger value="register">Register</TabsTrigger>
      </TabsList>

      {/* Login Form */}
      <TabsContent value="login" className="p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your email below to login to your account
            </p>
          </div>

          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="youremail@example.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="text-right">
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-blue-600 hover:text-blue-500 underline"
                >
                  Forgot your password?
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </TabsContent>

      {/* Register Form */}
      <TabsContent value="register" className="p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {registrationStep === "form" ? "Create an account" : "Verify your email"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {registrationStep === "form" 
                ? "Enter your details below to create your account"
                : "Enter the verification code sent to your email"
              }
            </p>
          </div>

          {registrationStep === "form" && (
            <>
              {/* Account Type Selection */}
              <div>
                <Label>Account Type</Label>
                <RadioGroup
                  value={accountType}
                  onValueChange={handleAccountTypeChange}
                  className="grid grid-cols-2 gap-4 mt-2"
                >
                  <Label
                    htmlFor="client"
                    className={`flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer hover:border-primary ${
                      accountType === "client" ? "border-primary" : "border-neutral-200"
                    }`}
                  >
                    <RadioGroupItem value="client" id="client" className="sr-only" />
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <span className="text-primary text-xl">👤</span>
                    </div>
                    <span className="font-medium">I need services</span>
                    <p className="text-sm text-neutral-500 mt-1">Hire skilled professionals</p>
                  </Label>
                  <Label
                    htmlFor="provider"
                    className={`flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer hover:border-primary ${
                      accountType === "provider" ? "border-primary" : "border-neutral-200"
                    }`}
                  >
                    <RadioGroupItem value="provider" id="provider" className="sr-only" />
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-2">
                      <span className="text-secondary text-xl">💼</span>
                    </div>
                    <span className="font-medium">I provide services</span>
                    <p className="text-sm text-neutral-500 mt-1">Offer skills & earn money</p>
                  </Label>
                </RadioGroup>
              </div>

              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={registerForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="youremail@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Service Provider Specific Fields */}
                  {accountType === "provider" && (
                    <>
                      <FormField
                        control={registerForm.control}
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
                                {categories && categories.map((category: any) => (
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
                        control={registerForm.control}
                        name="hourlyRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hourly Rate ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                placeholder="25"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Tell clients about your experience and expertise..."
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="yearsOfExperience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Years of Experience (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                placeholder="5"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="availability"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Availability (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Weekdays 9am-5pm"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isSendingOTP}
                  >
                    {isSendingOTP ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending verification code...
                      </>
                    ) : (
                      "Send Verification Code"
                    )}
                  </Button>

                  <p className="text-sm text-neutral-600 text-center mt-4">
                    By signing up, you agree to our{" "}
                    <a href="#" className="text-primary hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-primary hover:underline">
                      Privacy Policy
                    </a>
                  </p>
                </form>
              </Form>
            </>
          )}

          {registrationStep === "otp" && (
            <form onSubmit={handleOTPVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  required
                />
                <p className="text-sm text-gray-600">
                  We've sent a verification code to {registrationData?.email}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToForm}
                  className="flex-1"
                >
                  ← Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isVerifyingOTP}>
                  {isVerifyingOTP ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Verify & Create Account"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );

  // If it's a modal, just return the content without custom close button
  if (isModal) {
    return (
      <div className="w-full">
        {authContent}
      </div>
    );
  }

  // Otherwise, wrap it in the main layout
  return (
    <MainLayout>
      <div className="flex min-h-screen bg-neutral-50">
        <div className="flex flex-col justify-center flex-1 px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
          <div className="w-full max-w-md mx-auto lg:w-96">
            {authContent}
          </div>
        </div>
        <div className="relative hidden w-0 flex-1 lg:block">
          <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-primary to-blue-600" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-3xl font-bold mb-4">Join Findmyhelper Today</h2>
              <p className="text-xl opacity-90">Connect with skilled professionals in your area</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default AuthPage;