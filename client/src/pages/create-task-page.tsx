import { useAuth } from "@/hooks/use-auth";
import MainLayout from "@/components/MainLayout";
import CreateTaskForm from "@/components/CreateTaskForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Redirect } from "wouter";

export default function CreateTaskPage() {
  const { user } = useAuth();

  // Redirect if not authenticated
  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Only allow clients to create tasks
  if (user.role !== "client") {
    return <Redirect to="/" />;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Post a New Task</h1>
            <p className="text-neutral-600">
              Describe what you need help with and connect with qualified service providers in your area.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateTaskForm onSuccess={() => window.location.href = '/client-dashboard'} />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}