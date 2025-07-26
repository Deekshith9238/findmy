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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, DollarSign, Calendar, Clock, MessageSquare } from "lucide-react";

// Bid submission schema
const bidFormSchema = z.object({
  bidAmount: z.string().min(1, "Bid amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Bid amount must be a positive number"
  ),
  proposedStartDate: z.string().optional(),
  estimatedDuration: z.string().optional(),
  message: z.string().min(10, "Please provide a brief message explaining your approach"),
});

type BidFormValues = z.infer<typeof bidFormSchema>;

interface BidSubmissionDialogProps {
  workOrder: {
    id: number;
    title: string;
    budget: number;
    isBudgetFlexible: boolean;
    estimatedDuration?: number;
    preferredStartDate?: string;
  };
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export default function BidSubmissionDialog({ 
  workOrder, 
  trigger, 
  onSuccess 
}: BidSubmissionDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<BidFormValues>({
    resolver: zodResolver(bidFormSchema),
    defaultValues: {
      bidAmount: workOrder.budget.toString(),
      proposedStartDate: workOrder.preferredStartDate ? 
        new Date(workOrder.preferredStartDate).toISOString().split('T')[0] : '',
      estimatedDuration: workOrder.estimatedDuration?.toString() || '',
    },
  });
  
  // Submit bid mutation
  const submitBidMutation = useMutation({
    mutationFn: async (data: BidFormValues) => {
      const bidData = {
        bidAmount: parseFloat(data.bidAmount),
        proposedStartDate: data.proposedStartDate ? new Date(data.proposedStartDate) : undefined,
        estimatedDuration: data.estimatedDuration ? parseInt(data.estimatedDuration) : undefined,
        message: data.message,
      };
      
      const res = await apiRequest("POST", `/api/work-orders/${workOrder.id}/bids`, bidData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Bid Submitted Successfully",
        description: "Your bid has been submitted. The client will review it shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider/work-orders"] });
      form.reset();
      setOpen(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit bid",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BidFormValues) => {
    submitBidMutation.mutate(data);
  };

  const budgetDifference = parseFloat(form.watch("bidAmount") || "0") - workOrder.budget;
  const budgetDifferencePercentage = ((budgetDifference / workOrder.budget) * 100);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Submit Your Bid
          </DialogTitle>
          <DialogDescription>
            Submit a competitive bid for "{workOrder.title}"
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Budget Comparison */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Budget Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Client Budget:</span>
                  <div className="font-semibold text-lg">
                    ${workOrder.budget.toLocaleString()}
                    {workOrder.isBudgetFlexible && (
                      <span className="text-xs text-green-600 ml-1">(flexible)</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Your Bid:</span>
                  <div className="font-semibold text-lg">
                    ${parseFloat(form.watch("bidAmount") || "0").toLocaleString()}
                    {budgetDifference !== 0 && (
                      <div className={`text-xs ${budgetDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {budgetDifference > 0 ? '+' : ''}${budgetDifference.toFixed(0)} 
                        ({budgetDifferencePercentage > 0 ? '+' : ''}{budgetDifferencePercentage.toFixed(1)}%)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bid Amount */}
            <FormField
              control={form.control}
              name="bidAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Your Bid Amount ($) *
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="Enter your bid amount"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    {workOrder.isBudgetFlexible ? 
                      "The client is open to budget adjustments. Justify your pricing in your message." :
                      "Try to stay close to the client's budget for better chances of acceptance."
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Proposed Start Date */}
            <FormField
              control={form.control}
              name="proposedStartDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Proposed Start Date
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    When can you start this work?
                    {workOrder.preferredStartDate && (
                      <span className="block text-xs">
                        Client prefers: {new Date(workOrder.preferredStartDate).toLocaleDateString()}
                      </span>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estimated Duration */}
            <FormField
              control={form.control}
              name="estimatedDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Estimated Duration (hours)
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
                    {workOrder.estimatedDuration && (
                      <span className="block text-xs">
                        Client estimate: {workOrder.estimatedDuration} hours
                      </span>
                    )}
                  </FormDescription>
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
                    Sell yourself! Explain your qualifications, approach, and what makes your bid competitive.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Competitive Tips */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-sm text-blue-900 mb-2">💡 Tips for a Winning Bid</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Highlight relevant experience and certifications</li>
                <li>• Be specific about your approach and methodology</li>
                <li>• Mention any specialized tools or equipment you bring</li>
                <li>• Be realistic with timing and pricing</li>
                <li>• Ask clarifying questions if needed</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitBidMutation.isPending}
                className="min-w-[120px]"
              >
                {submitBidMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Bid"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}