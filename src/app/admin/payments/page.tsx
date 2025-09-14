// app/admin/payments/page.tsx
"use client";

import { useReducer, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
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
  Copy,
} from "lucide-react";

// Types for edit mode and state management
interface EditState {
  [key: string]: {
    serviceName: string;
    amount: string;
    workspaceId: string;
  };
}

type EditAction =
  | { type: "START_EDIT"; id: string; data: EditState[string] }
  | { type: "UPDATE_FIELD"; id: string; field: keyof EditState[string]; value: string }
  | { type: "SAVE_EDIT"; id: string }
  | { type: "CANCEL_EDIT"; id: string };

interface DialogState {
  isOpen: boolean;
  selectedWorkspace: string;
  selectedPrice: string;
  couponCode: string;
}

type DialogAction =
  | { type: "OPEN_DIALOG" }
  | { type: "CLOSE_DIALOG" }
  | { type: "SET_WORKSPACE"; payload: string }
  | { type: "SET_PRICE"; payload: string }
  | { type: "SET_COUPON"; payload: string }
  | { type: "RESET" };

interface StripeProduct {
  id: string;
  name: string;
  default_price?: string | { id: string } | null;
}

interface PaymentWithWorkspace extends Doc<"payments"> {
  workspace?: Doc<"workspaces"> | null;
}

// Reducers
const editReducer = (state: EditState, action: EditAction): EditState => {
  switch (action.type) {
    case "START_EDIT":
      return { ...state, [action.id]: action.data };
    case "UPDATE_FIELD":
      return {
        ...state,
        [action.id]: { ...state[action.id], [action.field]: action.value },
      };
    case "SAVE_EDIT":
    case "CANCEL_EDIT": {
      const newState = { ...state };
      delete newState[action.id];
      return newState;
    }
    default:
      return state;
  }
};

const dialogReducer = (state: DialogState, action: DialogAction): DialogState => {
  switch (action.type) {
    case "OPEN_DIALOG":
      return { ...state, isOpen: true };
    case "CLOSE_DIALOG":
      return { ...state, isOpen: false };
    case "SET_WORKSPACE":
      return { ...state, selectedWorkspace: action.payload };
    case "SET_PRICE":
      return { ...state, selectedPrice: action.payload };
    case "SET_COUPON":
      return { ...state, couponCode: action.payload };
    case "RESET":
      return { isOpen: false, selectedWorkspace: "", selectedPrice: "", couponCode: "" };
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

  const [products, setProducts] = useReducer(
    (_state: { products: StripeProduct[]; prices: unknown[] }, action: { products: StripeProduct[]; prices: unknown[] }) => action,
    { products: [], prices: [] }
  );
  const [dialog, dialogDispatch] = useReducer(dialogReducer, {
    isOpen: false,
    selectedWorkspace: "",
    selectedPrice: "",
    couponCode: "",
  });
  const [loading, setLoading] = useReducer((state: boolean, action: boolean) => action, false);
  const [selectedRows, setSelectedRows] = useReducer(
    (state: Set<string>, action: { type: "ADD" | "REMOVE" | "TOGGLE" | "CLEAR" | "SELECT_ALL"; payload?: string; all?: string[] }): Set<string> => {
      const newSet = new Set(state);
      switch (action.type) {
        case "ADD":
          if (action.payload) newSet.add(action.payload);
          return newSet;
        case "REMOVE":
          if (action.payload) newSet.delete(action.payload);
          return newSet;
        case "TOGGLE":
          if (action.payload) {
            if (newSet.has(action.payload)) {
              newSet.delete(action.payload);
            } else {
              newSet.add(action.payload);
            }
          }
          return newSet;
        case "CLEAR":
          return new Set<string>();
        case "SELECT_ALL":
          return new Set<string>(action.all || []);
        default:
          return state;
      }
    },
    new Set<string>()
  );
  const [editMode, editDispatch] = useReducer(editReducer, {});

  // Create/update user on first load
  const handleUserCreation = useCallback(() => {
    if (user && !currentUser && isLoaded) {
      createUser({
        clerkId: user.id,
        email: user.emailAddresses[0].emailAddress,
        name: user.fullName || undefined,
        imageUrl: user.imageUrl || undefined,
      });
    }
  }, [user, currentUser, isLoaded, createUser]);

  useMemo(() => {
    handleUserCreation();
  }, [handleUserCreation]);

  // Load Stripe products
  const loadProducts = useCallback(async () => {
    try {
      const data = await getStripeProducts();
      setProducts(data);
    } catch (error) {
      toast.error("Failed to load products", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [getStripeProducts]);

  useMemo(() => {
    loadProducts();
  }, [loadProducts]);

  const getProductName = useCallback((priceId: string) => {
    const product = products.products.find((p) => {
      const id = typeof p.default_price === "object" ? p.default_price?.id : p.default_price;
      return id === priceId;
    });
    return product?.name || "Service";
  }, [products]);

  const handleCreatePaymentLink = useCallback(async () => {
    if (!dialog.selectedWorkspace || !dialog.selectedPrice) {
      toast.error("Please select both workspace and product");
      return;
    }

    setLoading(true);
    try {
      const result = await createStripePaymentLink({
        workspaceId: dialog.selectedWorkspace as Id<"workspaces">,
        priceId: dialog.selectedPrice,
        serviceName: getProductName(dialog.selectedPrice),
        serviceDescription: "Professional service",
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      });

      toast.success("Payment link created!", {
        description: `Link: ${result.url}`,
      });
      dialogDispatch({ type: "RESET" });
      return result;
    } catch (error) {
      toast.error("Failed to create payment link", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [dialog, createStripePaymentLink, getProductName]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deletePayment({ id: id as Id<"payments"> });
      toast.success("Payment deleted");
    } catch (error) {
      toast.error("Failed to delete payment", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [deletePayment]);

  const handleBulkDelete = useCallback(async () => {
    for (const id of selectedRows) {
      await handleDelete(id);
    }
    setSelectedRows({ type: "CLEAR" });
  }, [selectedRows, handleDelete]);

  const handleSaveEdit = useCallback(async (id: string) => {
    const editData = editMode[id];
    if (!editData) return;

    try {
      await updatePayment({
        id: id as Id<"payments">,
        updates: {
          serviceName: editData.serviceName,
          amount: parseFloat(editData.amount) * 100,
          workspaceId: editData.workspaceId as Id<"workspaces">,
        },
      });
      toast.success("Payment updated");
      editDispatch({ type: "SAVE_EDIT", id });
    } catch (error) {
      toast.error("Failed to update payment", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [editMode, updatePayment]);

  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === payments?.length) {
      setSelectedRows({ type: "CLEAR" });
    } else {
      setSelectedRows({ type: "SELECT_ALL", all: payments?.map((p) => p._id) || [] });
    }
  }, [selectedRows, payments]);

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
    router.push("/access-denied");
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
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
          <Button onClick={() => dialogDispatch({ type: "OPEN_DIALOG" })}>
            <Plus className="w-4 h-4 mr-2" />
            New Payment
          </Button>
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
            {payments?.map((payment: PaymentWithWorkspace) => {
              const isEditing = editMode[payment._id];
              return (
                <TableRow key={payment._id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.has(payment._id)}
                      onCheckedChange={() => setSelectedRows({ type: "TOGGLE", payload: payment._id })}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{payment.invoiceNumber}</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={isEditing.workspaceId}
                        onValueChange={(value) =>
                          editDispatch({
                            type: "UPDATE_FIELD",
                            id: payment._id,
                            field: "workspaceId",
                            value,
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
                            type: "UPDATE_FIELD",
                            id: payment._id,
                            field: "serviceName",
                            value: e.target.value,
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
                            type: "UPDATE_FIELD",
                            id: payment._id,
                            field: "amount",
                            value: e.target.value,
                          })
                        }
                        className="h-8 w-24"
                      />
                    ) : (
                      <span className="font-semibold">${(payment.amount / 100).toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.status === "paid" ? "default" : "secondary"}>
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(payment._id)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => editDispatch({ type: "CANCEL_EDIT", id: payment._id })}
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
                                type: "START_EDIT",
                                id: payment._id,
                                data: {
                                  serviceName: payment.serviceName,
                                  amount: (payment.amount / 100).toFixed(2),
                                  workspaceId: payment.workspaceId,
                                },
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

      <Dialog open={dialog.isOpen} onOpenChange={(open) => dialogDispatch({ type: open ? "OPEN_DIALOG" : "CLOSE_DIALOG" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Payment Link</DialogTitle>
            <DialogDescription>Generate a Stripe payment link for a workspace</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label>Workspace</Label>
              <Select
                value={dialog.selectedWorkspace}
                onValueChange={(value) => dialogDispatch({ type: "SET_WORKSPACE", payload: value })}
              >
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
              <Select
                value={dialog.selectedPrice}
                onValueChange={(value) => dialogDispatch({ type: "SET_PRICE", payload: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.products.map((product) => {
                    const priceId = typeof product.default_price === "object" ? product.default_price?.id : product.default_price;
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
                value={dialog.couponCode}
                onChange={(e) => dialogDispatch({ type: "SET_COUPON", payload: e.target.value })}
                placeholder="SAVE20"
              />
            </div>

            <Button
              onClick={handleCreatePaymentLink}
              className="w-full"
              disabled={loading || !dialog.selectedWorkspace || !dialog.selectedPrice}
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
  );
}