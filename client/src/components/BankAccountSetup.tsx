import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Shield, CheckCircle, AlertCircle, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const bankAccountSchema = z.object({
  accountHolderName: z.string().min(2, 'Account holder name is required'),
  bankName: z.string().min(2, 'Bank name is required'),
  accountNumber: z.string().min(4, 'Account number must be at least 4 digits'),
  routingNumber: z.string().length(9, 'Routing number must be exactly 9 digits'),
  accountType: z.enum(['checking', 'savings']),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

interface BankAccount {
  id: number;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  isVerified: boolean;
  isActive: boolean;
}

export default function BankAccountSetup() {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      routingNumber: '',
      accountType: 'checking',
    },
  });

  const { data: bankAccount, isLoading } = useQuery({
    queryKey: ['/api/payments/bank-account'],
    retry: false,
  });

  const createBankAccountMutation = useMutation({
    mutationFn: async (data: BankAccountFormData) => {
      return await apiRequest('POST', '/api/payments/bank-account', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments/bank-account'] });
      toast({
        title: "Bank Account Added",
        description: "Your bank account has been successfully added and is being verified",
      });
      setShowForm(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Setup Error",
        description: error.message || "Failed to add bank account",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BankAccountFormData) => {
    createBankAccountMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Bank Account Setup</h2>
        <p className="text-muted-foreground">Configure your bank account to receive payments</p>
      </div>

      {bankAccount ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Bank Account
            </CardTitle>
            <CardDescription>Your payment account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Account Holder</label>
                <p className="text-sm text-muted-foreground">{bankAccount.accountHolderName}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Bank Name</label>
                <p className="text-sm text-muted-foreground">{bankAccount.bankName}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Account Number</label>
                <p className="text-sm text-muted-foreground">{bankAccount.accountNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Verification Status</label>
                <div className="flex items-center gap-2">
                  <Badge variant={bankAccount.isVerified ? "success" : "secondary"}>
                    {bankAccount.isVerified ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Pending
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            {!bankAccount.isVerified && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your bank account is being verified. This process typically takes 1-2 business days.
                </AlertDescription>
              </Alert>
            )}

            {bankAccount.isVerified && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Your bank account is verified and ready to receive payments.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Add Bank Account
            </CardTitle>
            <CardDescription>
              Set up your bank account to receive payments from completed services
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showForm ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <Building className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">No Bank Account Added</h3>
                  <p className="text-sm text-muted-foreground">
                    Add your bank account to receive payments from completed services
                  </p>
                </div>
                <Button onClick={() => setShowForm(true)}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Add Bank Account
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Your banking information is encrypted and secure. We use bank-level security to protect your data.
                  </AlertDescription>
                </Alert>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="accountHolderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Holder Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Chase, Bank of America, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="routingNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Routing Number</FormLabel>
                            <FormControl>
                              <Input placeholder="123456789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="accountNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Number</FormLabel>
                            <FormControl>
                              <Input placeholder="1234567890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="accountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="checking">Checking</SelectItem>
                              <SelectItem value="savings">Savings</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createBankAccountMutation.isPending}
                        className="flex-1"
                      >
                        {createBankAccountMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding Account...
                          </>
                        ) : (
                          <>
                            <Shield className="mr-2 h-4 w-4" />
                            Add Secure Account
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}