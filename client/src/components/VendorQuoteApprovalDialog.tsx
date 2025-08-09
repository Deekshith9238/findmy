import { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Loader2, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  AlertTriangle,
  UserCheck,
  FileCheck,
  Shield,
  Briefcase,
  Plus
} from "lucide-react";

// Quote submission schema
const quoteFormSchema = z.object({
  quoteAmount: z.string().min(1, "Quote amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Quote amount must be a positive number"
  ),
  estimatedHours: z.string().min(1, "Estimated hours is required").refine(
    (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
    "Estimated hours must be a positive number"
  ),
  message: z.string().min(10, "Please provide a detailed proposal explaining your approach"),
  toolsProvided: z.string().optional(),
  additionalServices: z.string().optional(),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

// Approval stages enum
export const APPROVAL_STAGES = {
  PRICE_ACCEPTED: 'price_accepted',
  TASK_REVIEWED: 'task_reviewed',
  CUSTOMER_DETAILS_RELEASED: 'customer_details_released'
} as const;

interface VendorQuoteApprovalDialogProps {
  task: {
    id: number;
    title: string;
    description: string;
    budget: number;
    estimatedHours: number;
    toolsRequired: string;
    skillsRequired: string;
    location: string;
  };
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export default function VendorQuoteApprovalDialog({ 
  task, 
  trigger, 
  onSuccess 
}: VendorQuoteApprovalDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>('quote_submission');
  const { toast } = useToast();
  
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      quoteAmount: task.budget.toString(),
      estimatedHours: task.estimatedHours.toString(),
      message: '',
      toolsProvided: '',
      additionalServices: '',
    },
  });
  
  // Submit quote mutation
  const submitQuoteMutation = useMutation({
    mutationFn: async (data: QuoteFormValues) => {
      const quoteData = {
        taskId: task.id,
        quoteAmount: parseFloat(data.quoteAmount),
        estimatedHours: parseInt(data.estimatedHours),
        message: data.message,
        toolsProvided: data.toolsProvided,
        additionalServices: data.additionalServices,
      };
      
      const res = await apiRequest("POST", `/api/tasks/${task.id}/quotes`, quoteData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Quote Submitted Successfully",
        description: "Your quote has been submitted and is awaiting approval.",
      });
      setCurrentStage('price_approval');
      queryClient.invalidateQueries({ queryKey: ["/api/provider/tasks"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit quote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Approve price mutation
  const approvePriceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tasks/${task.id}/quotes/approve-price`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Price Approved",
        description: "Price has been accepted. Moving to task review stage.",
      });
      setCurrentStage('task_review');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve price",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Approve task review mutation
  const approveTaskReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tasks/${task.id}/quotes/approve-task`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Task Review Approved",
        description: "Task has been reviewed and approved. Moving to customer details release.",
      });
      setCurrentStage('customer_details_release');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve task review",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Release customer details mutation
  const releaseCustomerDetailsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tasks/${task.id}/quotes/release-customer-details`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Customer Details Released",
        description: "Customer details have been released to the vendor. Work can commence within 24 hours.",
      });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/provider/tasks"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to release customer details",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: QuoteFormValues) => {
    submitQuoteMutation.mutate(data);
  };

  const quoteAmount = parseFloat(form.watch("quoteAmount") || "0");
  const budgetDifference = quoteAmount - task.budget;
  const budgetDifferencePercentage = ((budgetDifference / task.budget) * 100);

  const renderQuoteSubmission = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-sm text-blue-900 mb-2">📋 Task Requirements</h4>
        <div className="text-sm text-blue-800 space-y-2">
          <div><strong>Tools Required:</strong> {task.toolsRequired}</div>
          <div><strong>Skills Required:</strong> {task.skillsRequired}</div>
          <div><strong>Estimated Hours:</strong> {task.estimatedHours} hours</div>
          <div><strong>Client Budget:</strong> ${task.budget.toLocaleString()}</div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Quote Amount */}
          <FormField
            control={form.control}
            name="quoteAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Your Quote Amount ($) *
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="Enter your quote amount"
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  {budgetDifference !== 0 && (
                    <span className={`text-sm ${budgetDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {budgetDifference > 0 ? '+' : ''}${budgetDifference.toFixed(0)} 
                      ({budgetDifferencePercentage > 0 ? '+' : ''}{budgetDifferencePercentage.toFixed(1)}% from client budget)
                    </span>
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Estimated Hours */}
          <FormField
            control={form.control}
            name="estimatedHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Your Estimated Hours *
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="How many hours will this take?"
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Your realistic time estimate for completing this work.
                  {task.estimatedHours && (
                    <span className="block text-xs">
                      Client estimate: {task.estimatedHours} hours
                    </span>
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tools Provided */}
          <FormField
            control={form.control}
            name="toolsProvided"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Tools You'll Provide
                </FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="List the tools and equipment you'll bring to complete this job"
                    className="min-h-[80px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Additional Services */}
          <FormField
            control={form.control}
            name="additionalServices"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Additional Services (Optional)
                </FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Any additional services or value you can provide beyond the basic requirements"
                    className="min-h-[80px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Message */}
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Your Proposal Message *
                </FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Explain your approach, relevant experience, and why you're the right choice for this job..."
                    className="min-h-[100px]"
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Sell yourself! Explain your qualifications, approach, and what makes your quote competitive.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitQuoteMutation.isPending}
              className="min-w-[120px]"
            >
              {submitQuoteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Quote"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );

  const renderApprovalStage = (stage: string, title: string, description: string, icon: React.ReactNode, action: () => void, actionText: string) => (
    <div className="space-y-6">
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-3 mb-3">
          {icon}
          <div>
            <h4 className="font-medium text-yellow-900">{title}</h4>
            <p className="text-sm text-yellow-800">{description}</p>
          </div>
        </div>
        
        <div className="space-y-2 text-sm text-yellow-800">
          <div><strong>Quote Amount:</strong> ${quoteAmount.toLocaleString()}</div>
          <div><strong>Estimated Hours:</strong> {form.watch("estimatedHours")} hours</div>
          <div><strong>Task:</strong> {task.title}</div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Close
        </Button>
        <Button 
          onClick={action}
          className="min-w-[120px]"
        >
          {actionText}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            {currentStage === 'quote_submission' && 'Submit Quote'}
            {currentStage === 'price_approval' && 'Price Approval'}
            {currentStage === 'task_review' && 'Task Review'}
            {currentStage === 'customer_details_release' && 'Release Customer Details'}
          </DialogTitle>
          <DialogDescription>
            {currentStage === 'quote_submission' && `Submit your quote for "${task.title}"`}
            {currentStage === 'price_approval' && 'Review and approve the vendor quote'}
            {currentStage === 'task_review' && 'Review the task requirements and vendor proposal'}
            {currentStage === 'customer_details_release' && 'Release customer details to vendor'}
          </DialogDescription>
        </DialogHeader>
        
        {currentStage === 'quote_submission' && renderQuoteSubmission()}
        
        {currentStage === 'price_approval' && renderApprovalStage(
          'price_approval',
          'Price Approval Required',
          'Review the vendor quote and approve the price before proceeding to task review.',
          <CheckCircle className="w-5 h-5 text-yellow-600" />,
          () => approvePriceMutation.mutate(),
          'Approve Price'
        )}
        
        {currentStage === 'task_review' && renderApprovalStage(
          'task_review',
          'Task Review Required',
          'Review the task requirements and vendor proposal before releasing customer details.',
          <FileCheck className="w-5 h-5 text-yellow-600" />,
          () => approveTaskReviewMutation.mutate(),
          'Approve Task Review'
        )}
        
        {currentStage === 'customer_details_release' && renderApprovalStage(
          'customer_details_release',
          'Release Customer Details',
          'Release customer contact information to the vendor. Work can commence within 24 hours.',
          <UserCheck className="w-5 h-5 text-yellow-600" />,
          () => releaseCustomerDetailsMutation.mutate(),
          'Release Details'
        )}
      </DialogContent>
    </Dialog>
  );
} 