import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MapPin, 
  DollarSign, 
  Clock, 
  Calendar, 
  Users, 
  Eye,
  TrendingUp,
  Wrench,
  Building,
  Phone,
  Mail
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface WorkOrderCardProps {
  workOrder: {
    id: number;
    title: string;
    description: string;
    jobType: string;
    budget: number;
    isBudgetFlexible: boolean;
    siteAddress: string;
    siteCity: string;
    siteState: string;
    preferredStartDate?: string;
    estimatedDuration?: number;
    experienceLevel: string;
    status: string;
    createdAt: string;
    allowBidding: boolean;
    skillsRequired?: string;
    distance?: number;
    client?: {
      firstName: string;
      lastName: string;
    };
    category?: {
      name: string;
    };
    bids?: Array<{
      id: number;
      bidAmount: number;
      status: string;
    }>;
  };
  onViewDetails?: (workOrderId: number) => void;
  onSubmitBid?: (workOrderId: number) => void;
  showBidButton?: boolean;
  variant?: 'provider' | 'client';
}

export default function WorkOrderCard({ 
  workOrder, 
  onViewDetails, 
  onSubmitBid, 
  showBidButton = false,
  variant = 'provider'
}: WorkOrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500';
      case 'bidding': return 'bg-blue-500';
      case 'assigned': return 'bg-yellow-500';
      case 'in_progress': return 'bg-orange-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getExperienceBadgeColor = (level: string) => {
    switch (level) {
      case 'entry': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'expert': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatJobType = (jobType: string) => {
    return jobType.charAt(0).toUpperCase() + jobType.slice(1).replace('_', ' ');
  };

  const pendingBids = workOrder.bids?.filter(bid => bid.status === 'pending') || [];
  const averageBid = pendingBids.length > 0 
    ? pendingBids.reduce((sum, bid) => sum + bid.bidAmount, 0) / pendingBids.length 
    : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`${getStatusColor(workOrder.status)} text-white border-none`}>
                {workOrder.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge variant="outline">
                {formatJobType(workOrder.jobType)}
              </Badge>
              {workOrder.category && (
                <Badge variant="secondary">
                  {workOrder.category.name}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg leading-tight">{workOrder.title}</CardTitle>
            <CardDescription className="mt-1">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {workOrder.siteCity}, {workOrder.siteState}
                  {workOrder.distance && (
                    <span className="text-blue-600 font-medium">
                      • {workOrder.distance.toFixed(1)}km away
                    </span>
                  )}
                </span>
              </div>
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              ${workOrder.budget.toLocaleString()}
              {workOrder.isBudgetFlexible && (
                <span className="text-sm text-muted-foreground ml-1">(flexible)</span>
              )}
            </div>
            {variant === 'client' && pendingBids.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {pendingBids.length} bid{pendingBids.length !== 1 ? 's' : ''}
                {averageBid > 0 && (
                  <div className="text-xs">
                    Avg: ${averageBid.toFixed(0)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Description */}
          <div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {workOrder.description}
            </p>
          </div>

          {/* Key Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {workOrder.estimatedDuration && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{workOrder.estimatedDuration}h</span>
              </div>
            )}
            
            {workOrder.preferredStartDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{new Date(workOrder.preferredStartDate).toLocaleDateString()}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              <Badge variant="outline" className={getExperienceBadgeColor(workOrder.experienceLevel)}>
                {workOrder.experienceLevel}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Posted {formatDistanceToNow(new Date(workOrder.createdAt))} ago
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="space-y-3 pt-3 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-1">Full Address</h4>
                  <p className="text-muted-foreground">{workOrder.siteAddress}</p>
                </div>
                
                {workOrder.skillsRequired && (
                  <div>
                    <h4 className="font-medium mb-1">Required Skills</h4>
                    <p className="text-muted-foreground">{workOrder.skillsRequired}</p>
                  </div>
                )}
              </div>
              
              {variant === 'client' && workOrder.client && (
                <div>
                  <h4 className="font-medium mb-1">Posted by</h4>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {workOrder.client.firstName[0]}{workOrder.client.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {workOrder.client.firstName} {workOrder.client.lastName}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {workOrder.allowBidding && workOrder.status === 'open' && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Accepting Bids
                </Badge>
              )}
              
              {variant === 'client' && pendingBids.length > 0 && (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  <Users className="w-3 h-3 mr-1" />
                  {pendingBids.length} Active Bid{pendingBids.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Less Info' : 'More Info'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails?.(workOrder.id)}
              >
                <Eye className="w-4 h-4 mr-1" />
                View Details
              </Button>
              
              {showBidButton && workOrder.allowBidding && workOrder.status === 'open' && (
                <Button
                  size="sm"
                  onClick={() => onSubmitBid?.(workOrder.id)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Submit Bid
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}