import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Key, User, Phone } from "lucide-react";

// Schema for OTP login
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  otp: z.string().optional(),
});

// Schema for OTP registration
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  role: z.enum(["client", "service_provider"]),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function OTPLogin() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [registrationEmail, setRegistrationEmail] = useState("");

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      otp: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      username: "",
      role: "client",
      otp: "",
    },
  });

  // Send OTP for email verification (registration)
  const sendRegistrationOTP = async (email: string) => {
    try {
      setIsLoading(true);
      await apiRequest("POST", "/api/auth/send-otp", {
        email,
        purpose: "email_verification"
      });
      
      setOtpSent(true);
      setRegistrationEmail(email);
      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${email}. Please check your email.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Send OTP",
        description: error.message || "Could not send verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Send OTP for login verification (optional 2FA)
  const sendLoginOTP = async (email: string) => {
    try {
      setIsLoading(true);
      await apiRequest("POST", "/api/auth/send-otp", {
        email,
        purpose: "login_verification"
      });
      
      toast({
        title: "Login OTP Sent",
        description: `Security code sent to ${email} for additional verification.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to Send OTP",
        description: error.message || "Could not send security code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login
  const onLogin = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      await apiRequest("POST", "/api/auth/login-otp", data);
      
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      
      // Redirect to dashboard
      window.location.href = "/";
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle registration with OTP verification
  const onRegister = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      await apiRequest("POST", "/api/auth/verify-otp-register", data);
      
      toast({
        title: "Registration Successful",
        description: "Your account has been created. You can now login.",
      });
      
      // Switch to login tab
      setActiveTab("login");
      loginForm.setValue("email", data.email);
      setOtpSent(false);
      registerForm.reset();
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            FindMyHelper
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Email + OTP Authentication
          </p>
        </div>

        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>
                  Enter your email and password to access your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10"
                        {...loginForm.register("email")}
                      />
                    </div>
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-red-600 mt-1">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Password"
                        className="pl-10"
                        {...loginForm.register("password")}
                      />
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-600 mt-1">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="loginOtp">OTP (Optional for 2FA)</Label>
                      <Input
                        id="loginOtp"
                        type="text"
                        placeholder="6-digit code"
                        maxLength={6}
                        {...loginForm.register("otp")}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-6"
                      onClick={() => {
                        const email = loginForm.getValues("email");
                        if (email) {
                          sendLoginOTP(email);
                        } else {
                          toast({
                            title: "Email Required",
                            description: "Please enter your email first",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={isLoading}
                    >
                      Send OTP
                    </Button>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="register">
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  {!otpSent 
                    ? "Enter your details to create a new account"
                    : `Enter the OTP sent to ${registrationEmail}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!otpSent ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const email = registerForm.getValues("email");
                    const firstName = registerForm.getValues("firstName");
                    const lastName = registerForm.getValues("lastName");
                    
                    if (!email || !firstName || !lastName) {
                      toast({
                        title: "Required Fields",
                        description: "Please fill in email, first name, and last name",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    sendRegistrationOTP(email);
                  }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="firstName"
                            placeholder="John"
                            className="pl-10"
                            {...registerForm.register("firstName")}
                          />
                        </div>
                        {registerForm.formState.errors.firstName && (
                          <p className="text-sm text-red-600 mt-1">
                            {registerForm.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          {...registerForm.register("lastName")}
                        />
                        {registerForm.formState.errors.lastName && (
                          <p className="text-sm text-red-600 mt-1">
                            {registerForm.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="regEmail">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="regEmail"
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10"
                          {...registerForm.register("email")}
                        />
                      </div>
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-red-600 mt-1">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        placeholder="johndoe"
                        {...registerForm.register("username")}
                      />
                      {registerForm.formState.errors.username && (
                        <p className="text-sm text-red-600 mt-1">
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="regPassword">Password</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="regPassword"
                          type="password"
                          placeholder="Password"
                          className="pl-10"
                          {...registerForm.register("password")}
                        />
                      </div>
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-red-600 mt-1">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="role">Account Type</Label>
                      <select
                        id="role"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        {...registerForm.register("role")}
                      >
                        <option value="client">Client (Need Services)</option>
                        <option value="service_provider">Service Provider (Offer Services)</option>
                      </select>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Sending OTP..." : "Send Verification Code"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <div>
                      <Label htmlFor="regOtp">Verification Code</Label>
                      <Input
                        id="regOtp"
                        type="text"
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className="text-center text-2xl tracking-widest"
                        {...registerForm.register("otp")}
                      />
                      {registerForm.formState.errors.otp && (
                        <p className="text-sm text-red-600 mt-1">
                          {registerForm.formState.errors.otp.message}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={isLoading}>
                        {isLoading ? "Verifying..." : "Verify & Create Account"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setOtpSent(false);
                          registerForm.setValue("otp", "");
                        }}
                      >
                        Back
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}