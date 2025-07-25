import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ClientDashboard from "@/pages/client-dashboard";
import ProviderDashboard from "@/pages/provider-dashboard";
import ServiceCategories from "@/pages/service-categories";
import ServiceProviderProfile from "@/pages/service-provider-profile";
import ProfilePage from "@/pages/profile-page";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminUserManagement from "@/pages/admin-user-management";
import DemoPage from "@/pages/demo-page";
import ServiceMapPage from "@/pages/service-map";
import CreateTaskPage from "@/pages/create-task-page";
import PaymentPage from "@/pages/payment-page";
import PaymentApprovalsPage from "@/pages/payment-approvals";
import PaymentApproverDashboard from "@/pages/payment-approver-dashboard";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/service-categories" component={ServiceCategories} />
      <Route path="/provider/:id" component={ServiceProviderProfile} />
      <Route path="/demo" component={DemoPage} />
      <Route path="/map" component={ServiceMapPage} />
      <ProtectedRoute path="/create-task" component={CreateTaskPage} />
      <ProtectedRoute path="/client-dashboard" component={ClientDashboard} />
      <ProtectedRoute path="/provider-dashboard" component={ProviderDashboard} />
      <ProtectedRoute path="/admin-dashboard" component={AdminDashboard} />
      <ProtectedRoute path="/admin/users" component={AdminUserManagement} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/payment/:serviceRequestId" component={PaymentPage} />
      <ProtectedRoute path="/payment-approvals" component={PaymentApprovalsPage} />
      <ProtectedRoute path="/payment-approver-dashboard" component={PaymentApproverDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
