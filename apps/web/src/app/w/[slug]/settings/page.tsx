"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@telera/convex/_generated/api";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Save,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Building2,
} from "lucide-react";

export default function ClientSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Convex queries and mutations
  const workspace = useQuery(api.workspaces.getWorkspaceBySlug, { slug });
  const updateWorkspace = useMutation(api.workspaces.updateWorkspace);

  // tRPC mutations for validation
  const validateEmailMutation = trpc.validation.validateEmail.useMutation();
  const validateWebsiteMutation = trpc.validation.validateWebsite.useMutation();

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Form state
  const [formData, setFormData] = useState({
    // General
    name: "",
    businessName: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    
    // Appearance
    theme: "notebook" as "notebook" | "coffee" | "mono" | "graphite",
    darkMode: false,
    
    // Notifications
    emailNotifications: false,
    smsNotifications: false,
    pushNotifications: false,
    
    // Privacy
    analytics: false,
    dataSharing: false,
  });

  // Validation state
  const [validation, setValidation] = useState({
    email: { valid: true, message: "" },
    website: { valid: true, message: "" },
  });

  // Initialize form data when workspace loads
  useEffect(() => {
    if (workspace) {
      const newFormData = {
        name: workspace.name || "",
        businessName: workspace.businessInfo?.businessName || "",
        contactPerson: workspace.businessInfo?.contactPerson || "",
        email: workspace.businessInfo?.email || workspace.invitedEmail || "",
        phone: workspace.businessInfo?.phone || "",
        address: workspace.businessInfo?.address || "",
        website: workspace.businessInfo?.website || "",
        theme: workspace.theme || "notebook",
        darkMode: workspace.darkMode || false,
        emailNotifications: workspace.policies?.enableNotifications || false,
        smsNotifications: false,
        pushNotifications: false,
        analytics: workspace.policies?.enableAnalytics || false,
        dataSharing: false,
      };
      setFormData(newFormData);
    }
  }, [workspace]);

  // Check for changes
  useEffect(() => {
    if (workspace) {
      const hasFormChanges = 
        formData.name !== (workspace.name || "") ||
        formData.businessName !== (workspace.businessInfo?.businessName || "") ||
        formData.contactPerson !== (workspace.businessInfo?.contactPerson || "") ||
        formData.email !== (workspace.businessInfo?.email || workspace.invitedEmail || "") ||
        formData.phone !== (workspace.businessInfo?.phone || "") ||
        formData.address !== (workspace.businessInfo?.address || "") ||
        formData.website !== (workspace.businessInfo?.website || "") ||
        formData.theme !== (workspace.theme || "notebook") ||
        formData.darkMode !== (workspace.darkMode || false) ||
        formData.emailNotifications !== (workspace.policies?.enableNotifications || false) ||
        formData.analytics !== (workspace.policies?.enableAnalytics || false);
      
      setHasChanges(hasFormChanges);
    }
  }, [formData, workspace]);

  // Email validation
  const validateEmail = async (email: string) => {
    if (!email) {
      setValidation(v => ({ ...v, email: { valid: true, message: "" } }));
      return;
    }

    try {
      const result = await validateEmailMutation.mutateAsync({ email });
      setValidation(v => ({
        ...v,
        email: {
          valid: result.valid,
          message: result.valid ? "✓ Email verified" : result.message
        }
      }));
    } catch {
      setValidation(v => ({
        ...v,
        email: { valid: true, message: "" }
      }));
    }
  };

  // Website validation
  const validateWebsite = async (url: string) => {
    if (!url) {
      setValidation(v => ({ ...v, website: { valid: true, message: "" } }));
      return;
    }

    try {
      const urlToCheck = url.startsWith('http') ? url : `https://${url}`;
      const result = await validateWebsiteMutation.mutateAsync({ url: urlToCheck });
      setValidation(v => ({
        ...v,
        website: {
          valid: result.valid,
          message: result.valid ? "✓ Website is active" : result.error || "Website not reachable"
        }
      }));
    } catch {
      setValidation(v => ({
        ...v,
        website: { valid: true, message: "" }
      }));
    }
  };

  const handleSave = async () => {
    if (!workspace) return;

    setIsLoading(true);
    try {
      // Update workspace with all changes
      await updateWorkspace({
        workspaceId: workspace._id,
        updates: {
          name: formData.name,
          theme: formData.theme,
          darkMode: formData.darkMode,
          businessInfo: {
            businessName: formData.businessName,
            contactPerson: formData.contactPerson,
            email: formData.email,
            phone: formData.phone || undefined,
            address: formData.address || undefined,
            website: formData.website || undefined,
          },
          policies: {
            enableNotifications: formData.emailNotifications,
            enableAnalytics: formData.analytics,
            dataConsent: workspace.policies?.dataConsent || false,
          },
        },
      });

      toast.success("Settings updated successfully");
      setHasChanges(false);
    } catch (error) {
      toast.error("Failed to update settings", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!workspace) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Client Settings</h1>
            <p className="text-muted-foreground">
              Manage your workspace settings and preferences
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                General Information
              </CardTitle>
              <CardDescription>
                Basic workspace settings and information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Workspace Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Workspace"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Primary Email *</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        // Debounced validation would go here
                      }}
                      onBlur={() => validateEmail(formData.email)}
                      placeholder="contact@example.com"
                      className={validation.email.valid ? "" : "border-destructive"}
                    />
                    {validation.email.message && (
                      <div className={`text-xs mt-1 flex items-center gap-1 ${
                        validation.email.valid ? "text-green-600" : "text-destructive"
                      }`}>
                        {validation.email.valid ? 
                          <CheckCircle className="w-3 h-3" /> : 
                          <AlertTriangle className="w-3 h-3" />
                        }
                        {validation.email.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    onBlur={() => validateWebsite(formData.website)}
                    placeholder="https://example.com"
                    className={validation.website.valid ? "" : "border-warning"}
                  />
                  {validation.website.message && (
                    <div className={`text-xs mt-1 flex items-center gap-1 ${
                      validation.website.valid ? "text-green-600" : "text-warning"
                    }`}>
                      {validation.website.valid ? 
                        <CheckCircle className="w-3 h-3" /> : 
                        <AlertTriangle className="w-3 h-3" />
                      }
                      {validation.website.message}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Your business details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Acme Corporation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main St, City, State 12345"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select
                  value={formData.theme}
                  onValueChange={(value: "notebook" | "coffee" | "mono" | "graphite") => setFormData({ ...formData, theme: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coffee">Coffee</SelectItem>
                    <SelectItem value="mono">Monochrome</SelectItem>
                    <SelectItem value="graphite">Graphite</SelectItem>
                    <SelectItem value="notebook">Notebook</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Use dark theme for better visibility</p>
                </div>
                <Switch
                  checked={formData.darkMode}
                  onCheckedChange={(checked) => setFormData({ ...formData, darkMode: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified about updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch
                  checked={formData.emailNotifications}
                  onCheckedChange={(checked) => setFormData({ ...formData, emailNotifications: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get text message alerts</p>
                </div>
                <Switch
                  checked={formData.smsNotifications}
                  onCheckedChange={(checked) => setFormData({ ...formData, smsNotifications: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Browser notifications</p>
                </div>
                <Switch
                  checked={formData.pushNotifications}
                  onCheckedChange={(checked) => setFormData({ ...formData, pushNotifications: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Data
              </CardTitle>
              <CardDescription>
                Control how your data is used and shared
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Analytics</Label>
                  <p className="text-sm text-muted-foreground">Help improve our service with usage data</p>
                </div>
                <Switch
                  checked={formData.analytics}
                  onCheckedChange={(checked) => setFormData({ ...formData, analytics: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Data Sharing</Label>
                  <p className="text-sm text-muted-foreground">Share anonymized data with partners</p>
                </div>
                <Switch
                  checked={formData.dataSharing}
                  onCheckedChange={(checked) => setFormData({ ...formData, dataSharing: checked })}
                />
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Your data is encrypted and stored securely. We never share your personal information without your explicit consent.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
