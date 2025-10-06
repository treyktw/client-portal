// app/w/[slug]/payment/page.tsx
"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@telera/convex/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Banknote,
  FileCheck,
  Info,
  Loader2,
} from "lucide-react";

export default function ClientPaymentPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const workspace = useQuery(api.workspaces.getWorkspaceBySlug, { slug });
  const payment = useQuery(
    api.payments.getActivePayment,
    workspace?._id ? { workspaceId: workspace._id } : "skip"
  );

  const formattedAmount = useMemo(() => {
    if (!payment?.amount) return "$0.00";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: payment.currency || 'USD',
    }).format(payment.amount / 100);
  }, [payment]);

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No active payments at this time
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Badge variant="outline" className="mb-2">
            Invoice #{payment.invoiceNumber}
          </Badge>
          <h1 className="text-3xl font-bold">Payment</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {/* Service Details */}
            <Card>
              <CardHeader>
                <CardTitle>{payment.serviceName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {payment.serviceDescription}
                </p>
                {payment.deliveryTime && (
                  <p className="text-sm">
                    Delivery: {payment.deliveryTime}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Payment Options */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {payment.stripeLink && (
                  <Button 
                    className="w-full" 
                    onClick={() => window.open(payment.stripeLink, '_blank')}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay Online
                  </Button>
                )}
                
                <div className="flex gap-4">
                  <Alert className="flex-1">
                    <Banknote className="w-4 h-4" />
                    <AlertDescription>
                      Cash payment available for local clients
                    </AlertDescription>
                  </Alert>
                  
                  <Alert className="flex-1">
                    <FileCheck className="w-4 h-4" />
                    <AlertDescription>
                      Check payment accepted
                    </AlertDescription>
                  </Alert>
                </div>

                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Contact us for cash or check payment instructions
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Service</span>
                    <span>{payment.serviceName}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="text-xl font-bold">{formattedAmount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}