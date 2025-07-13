import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentFormProps {
  serviceRequestId: number;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export default function PaymentForm({ serviceRequestId, amount, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentBreakdown, setPaymentBreakdown] = useState<{
    amount: number;
    platformFee: number;
    tax: number;
    totalAmount: number;
    payoutAmount: number;
  } | null>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);

  // Calculate payment breakdown for display
  const platformFee = amount * 0.15; // 15% platform fee
  const tax = amount * 0.08; // 8% tax
  const totalAmount = amount + platformFee + tax;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceRequestId,
          amount
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment intent');
      }

      const { clientSecret, paymentId: createdPaymentId, breakdown } = await response.json();
      setPaymentBreakdown(breakdown);
      setPaymentId(createdPaymentId);

      // Confirm payment with Stripe
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      // Confirm payment on our backend
      const confirmResponse = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: createdPaymentId
        }),
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.message || 'Failed to confirm payment');
      }

      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Secure Payment
        </CardTitle>
        <CardDescription>
          Pay safely with our escrow protection system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Breakdown */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Payment Breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Service Amount:</span>
              <span>${amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Platform Fee (15%):</span>
              <span>${platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax (8%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total Amount:</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Your payment is held securely until the service is completed and approved.
          </AlertDescription>
        </Alert>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Details</label>
            <PaymentElement />
          </div>

          <Button
            type="submit"
            disabled={!stripe || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Pay ${totalAmount.toFixed(2)} Securely
              </>
            )}
          </Button>
        </form>

        {/* Terms Notice */}
        <div className="text-xs text-muted-foreground text-center">
          <AlertCircle className="w-3 h-3 inline mr-1" />
          Payment will be held in escrow until service completion
        </div>
      </CardContent>
    </Card>
  );
}