// app/admin/payments/page.tsx
"use client";

import { useEffect, useState, useReducer, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Trash2,
  Edit,
  UserCheck,
  Tag,
  Copy,
  ArrowLeft,
} from "lucide-react";

// Edit mode reducer
const editReducer = (state: any, action: any) => {
  switch (action.type) {
    case 'START_EDIT':
      return { ...state, [action.id]: action.data };
    case 'UPDATE_FIELD':
      return {
        ...state,
        [action.id]: { ...state[action.id], [action.field]: action.value }
      };
    case 'SAVE_EDIT':
      return { ...state, [action.id]: undefined };
    case 'CANCEL_EDIT':
      return { ...state, [action.id]: undefined };
    default:
      return state;
  }
};

export default function AdminPaymentsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  
  const currentUser = useQuery(api.users.getCurrentUser);
  const workspaces = useQuery(
    api.workspaces.getAllWorkspaces,
    currentUser?.role === "admin" ? {} : "skip"
  );
  const payments = useQuery(
    api.payments.getPayments,
    currentUser?.role === "admin" ? {} : "skip"
  );
  
  const getStripeProducts = useAction(api.payments.getStripeProducts);
  const createStripePaymentLink = useAction(api.payments.createStripePaymentLink);
  const deletePayment = useMutation(api.payments.deletePayment);
  const updatePayment = useMutation(api.payments.updatePayment);
  const createUser = useMutation(api.users.createOrUpdateUser);

  const [products, setProducts] = useState<any>({ products: [], prices: [] });
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const [selectedPrice, setSelectedPrice] = useState<string>("");
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editMode, editDispatch] = useReducer(editReducer, {});
  const [couponCode, setCouponCode] = useState<string>("");

  // Create/update user on first load
  useEffect(() => {
    if (user && !currentUser && isLoaded) {
      createUser({
        clerkId: user.id,
        email: user.emailAddresses[0].emailAddress,
        name: user.fullName || undefined,
        imageUrl: user.imageUrl || undefined,
      });
    }
  }, [user, currentUser, isLoaded, createUser]);

  // Load Stripe products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await getStripeProducts();
        setProducts(data);
      } catch (error) {
        console.error("Failed to load products:", error);
      }
    };
    loadProducts();
  }, [getStripeProducts]);

  const handleCreatePaymentLink = async () => {
    if (!selectedWorkspace || !selectedPrice) {
      toast.error("Please select both workspace and product");
      return;
    }

    setLoading(true);
    try {
      const result = await createStripePaymentLink({
        workspaceId: selectedWorkspace as Id<"workspaces">,
        priceId: selectedPrice,
        serviceName: getProductName(selectedPrice),
        serviceDescription: "Professional service",
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      });
      
      toast.success("Payment link created!");
      setShowDialog(false);
      setSelectedWorkspace("");
      setSelectedPrice("");
    } catch (error) {
      toast.error("Failed to create payment link");
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (priceId: string) => {
    const product = products.products.find((p: any) => {
      const id = typeof p.default_price === 'object' ? p.default_price?.id : p.default_price;
      return id === priceId;
    });
    return product?.name || "Service";
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePayment({ id: id as Id<"payments"> });
      toast.success("Payment deleted");
    } catch (error) {
      toast.error("Failed to delete payment");
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedRows) {
      await handleDelete(id);
    }
    setSelectedRows(new Set());
  };

  const handleSaveEdit = async (id: string) => {
    const editData = editMode[id];
    if (!editData) return;

    try {
      await updatePayment({
        id: id as Id<"payments">,
        updates: {
          serviceName: editData.serviceName,
          amount: parseFloat(editData.amount) * 100,
          workspaceId: editData.workspaceId,
        }
      });
      toast.success("Payment updated");
      editDispatch({ type: 'SAVE_EDIT', id });
    } catch (error) {
      toast.error("Failed to update payment");
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === payments?.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(payments?.map(p => p._id) || []));
    }
  };

  if (!isLoaded || currentUser === undefined) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (currentUser && currentUser.role !== "admin") {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Manage payment links and invoices</p>
        </div>
        <div className="flex gap-2">
          {selectedRows.size > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedRows.size})
            </Button>
          )}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Payment
            </Button>
            <Button onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Payment Link</DialogTitle>
                <DialogDescription>
                  Generate a Stripe payment link for a workspace
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Workspace</Label>
                  <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces?.map((ws) => (
                        <SelectItem key={ws._id} value={ws._id}>
                          {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Product</Label>
                  <Select value={selectedPrice} onValueChange={setSelectedPrice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.products.map((product: any) => {
                        const priceId = typeof product.default_price === 'object' ? 
                          product.default_price?.id : product.default_price;
                        return (
                          <SelectItem key={priceId || product.id} value={priceId || ""}>
                            {product.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Coupon Code (Optional)</Label>
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="SAVE20"
                  />
                </div>

                <Button 
                  onClick={handleCreatePaymentLink} 
                  className="w-full"
                  disabled={loading || !selectedWorkspace || !selectedPrice}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Payment Link"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedRows.size === payments?.length && payments?.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments?.map((payment) => {
              const isEditing = editMode[payment._id];
              return (
                <TableRow key={payment._id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.has(payment._id)}
                      onCheckedChange={() => handleToggleSelect(payment._id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {payment.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={isEditing.workspaceId}
                        onValueChange={(value) => 
                          editDispatch({ 
                            type: 'UPDATE_FIELD', 
                            id: payment._id, 
                            field: 'workspaceId', 
                            value 
                          })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {workspaces?.map((ws) => (
                            <SelectItem key={ws._id} value={ws._id}>
                              {ws.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      payment.workspace?.name
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={isEditing.serviceName}
                        onChange={(e) => 
                          editDispatch({ 
                            type: 'UPDATE_FIELD', 
                            id: payment._id, 
                            field: 'serviceName', 
                            value: e.target.value 
                          })
                        }
                        className="h-8"
                      />
                    ) : (
                      payment.serviceName
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={isEditing.amount}
                        onChange={(e) => 
                          editDispatch({ 
                            type: 'UPDATE_FIELD', 
                            id: payment._id, 
                            field: 'amount', 
                            value: e.target.value 
                          })
                        }
                        className="h-8 w-24"
                      />
                    ) : (
                      <span className="font-semibold">
                        ${(payment.amount / 100).toFixed(2)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveEdit(payment._id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => editDispatch({ type: 'CANCEL_EDIT', id: payment._id })}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              navigator.clipboard.writeText(payment.stripeLink);
                              toast.success("Link copied");
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={payment.stripeLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open Link
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => 
                              editDispatch({ 
                                type: 'START_EDIT', 
                                id: payment._id, 
                                data: {
                                  serviceName: payment.serviceName,
                                  amount: (payment.amount / 100).toFixed(2),
                                  workspaceId: payment.workspaceId,
                                }
                              })
                            }
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(payment._id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}