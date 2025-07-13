import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import PaymentForm from '@/components/PaymentForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Initialize Stripe with your public key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

export default function PaymentPage() {
  const { serviceRequestId } = useParams<{ serviceRequestId: string }>();
  const [, navigate] = useLocation();

  const { data: serviceRequest, isLoading, error } = useQuery({
    queryKey: ['/api/service-requests', serviceRequestId],
    enabled: !!serviceRequestId,
  });

  const handlePaymentSuccess = () => {
    navigate('/dashboard');
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !serviceRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Service Request Not Found
            </CardTitle>
            <CardDescription>
              The service request you're trying to pay for could not be found.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if payment is already made
  if (serviceRequest.status === 'payment_held' || serviceRequest.status === 'work_completed' || serviceRequest.status === 'completed_and_paid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Payment Already Made
            </CardTitle>
            <CardDescription>
              Payment for this service request has already been processed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your payment is being held in escrow until the service is completed.
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold">Complete Payment</h1>
            <p className="text-muted-foreground">
              Secure payment for your service request
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Service Request Details */}
            <Card>
              <CardHeader>
                <CardTitle>Service Request Details</CardTitle>
                <CardDescription>Review your service request</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Service</label>
                  <p className="text-sm text-muted-foreground">{serviceRequest.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground">{serviceRequest.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <p className="text-sm text-muted-foreground">{serviceRequest.location}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Budget</label>
                  <p className="text-sm text-muted-foreground">
                    ${serviceRequest.budget?.toFixed(2) || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-muted-foreground capitalize">
                    {serviceRequest.status.replace('_', ' ')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Form */}
            <Elements stripe={stripePromise}>
              <PaymentForm
                serviceRequestId={parseInt(serviceRequestId!)}
                amount={serviceRequest.budget || 100} // Default to $100 if no budget
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  );
}