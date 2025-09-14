// app/onboarding/[workspaceId]/business-info/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { trpc } from "@/lib/trpc-client";
import { 
  Building2, 
  Globe, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  CheckCircle,
  AlertCircle,
  Loader2,
  MapPin
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";

// Phone formatting helper
function formatPhoneNumber(value: string): string {
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
}

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// URL validation helper
async function validateWebsite(url: string, validateWebsiteMutation: ReturnType<typeof trpc.validation.validateWebsite.useMutation>): Promise<{ valid: boolean; error?: string }> {
  if (!url) return { valid: true }; // Optional field
  
  try {
    // Ensure URL has protocol
    const urlToCheck = url.startsWith('http') ? url : `https://${url}`;
    const result = await validateWebsiteMutation.mutateAsync({ url: urlToCheck });
    return result;
  } catch (error) {
    return { valid: false, error: `Could not validate website: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

export default function BusinessInfoPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  
  const updateStep = useMutation(api.workspaces.updateOnboardingStep);
  const currentUser = useQuery(api.users.getCurrentUser);
  
  // tRPC mutations
  const validateEmailMutation = trpc.validation.validateEmail.useMutation();
  const validateWebsiteMutation = trpc.validation.validateWebsite.useMutation();
  const placesAutocompleteMutation = trpc.validation.placesAutocomplete.useMutation();
  
  // Use refs to avoid dependency issues
  const validateEmailMutationRef = useRef(validateEmailMutation);
  const validateWebsiteMutationRef = useRef(validateWebsiteMutation);
  
  validateEmailMutationRef.current = validateEmailMutation;
  validateWebsiteMutationRef.current = validateWebsiteMutation;

  const [formData, setFormData] = useState({
    businessName: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    socialLinks: {
      facebook: "",
      twitter: "",
      instagram: "",
      linkedin: "",
    }
  });

  const [validation, setValidation] = useState({
    email: { valid: true, message: "" },
    phone: { valid: true, message: "" },
    website: { valid: true, message: "", checking: false },
    address: { valid: true, message: "", suggestions: [] as Array<{ place_id: string; description: string }> }
  });

  const [isValidating, setIsValidating] = useState(false);
  const debouncedEmail = useDebounce(formData.email, 500);
  const debouncedWebsite = useDebounce(formData.website, 1000);

  // Populate email field with current user's email
  useEffect(() => {
    if (currentUser?.email && !formData.email) {
      setFormData(prev => ({ ...prev, email: currentUser.email }));
    }
  }, [currentUser?.email, formData.email]);

  // Email validation with deliverability check
  const validateEmail = useCallback(async (email: string) => {
    if (!email) {
      setValidation(v => ({ ...v, email: { valid: true, message: "" } }));
      return;
    }

    // Basic format check
    if (!emailRegex.test(email)) {
      setValidation(v => ({ 
        ...v, 
        email: { valid: false, message: "Invalid email format" } 
      }));
      return;
    }

    // Check deliverability via tRPC
    try {
      const result = await validateEmailMutationRef.current.mutateAsync({ email });
      setValidation(v => ({ 
        ...v, 
        email: { 
          valid: result.valid, 
          message: result.valid ? "✓ Email verified" : result.message 
        } 
      }));
    } catch (error) {
      setValidation(v => ({ 
        ...v, 
        email: { valid: true, message: "" } 
      }));
      toast.error("Failed to validate email", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, []);

  useEffect(() => {
    validateEmail(debouncedEmail);
  }, [debouncedEmail, validateEmail]);

  // Website validation
  const checkWebsite = useCallback(async (website: string) => {
    if (!website) {
      setValidation(v => ({ ...v, website: { valid: true, message: "", checking: false } }));
      return;
    }

    setValidation(v => ({ ...v, website: { ...v.website, checking: true } }));
    
    const result = await validateWebsite(website, validateWebsiteMutationRef.current);
    
    setValidation(v => ({ 
      ...v, 
      website: { 
        valid: result.valid, 
        message: result.valid ? "✓ Website is active" : result.error || "Website not reachable",
        checking: false
      } 
    }));
  }, []);

  useEffect(() => {
    checkWebsite(debouncedWebsite);
  }, [debouncedWebsite, checkWebsite]);

  // Handle phone input with formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
    
    // Validate phone length
    const digits = formatted.replace(/[^\d]/g, '');
    if (digits.length > 0 && digits.length !== 10) {
      setValidation(v => ({ 
        ...v, 
        phone: { valid: false, message: "Phone number must be 10 digits" } 
      }));
    } else {
      setValidation(v => ({ 
        ...v, 
        phone: { valid: true, message: digits.length === 10 ? "✓ Valid phone number" : "" } 
      }));
    }
  };

  // Google Places Autocomplete for address
  const handleAddressSearch = async (query: string) => {
    if (query.length < 3) {
      setValidation(v => ({ ...v, address: { ...v.address, suggestions: [] } }));
      return;
    }

    try {
      const result = await placesAutocompleteMutation.mutateAsync({ query });
      setValidation(v => ({ 
        ...v, 
        address: { 
          ...v.address, 
          suggestions: (result.predictions || []) as Array<{ place_id: string; description: string }>
        } 
      }));
    } catch (error) {
      console.error('Address search error:', error);
    }
  };

  const selectAddress = (place: { place_id: string; description: string }) => {
    setFormData({ ...formData, address: place.description });
    setValidation(v => ({ 
      ...v, 
      address: { 
        valid: true, 
        message: "✓ Valid address", 
        suggestions: [] 
      } 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation check
    if (!validation.email.valid || !validation.phone.valid || !validation.website.valid) {
      alert('Please fix validation errors before continuing');
      return;
    }
    
    setIsValidating(true);
    
    const socialLinks = Object.entries(formData.socialLinks)
      .filter(([_, url]) => url)
      .map(([platform, url]) => ({ platform, url }));
  
    await updateStep({
      workspaceId: workspaceId as Id<"workspaces">,
      step: 3,
      fieldToUpdate: "businessInfo",
      data: {
        businessName: formData.businessName,
        contactPerson: formData.contactPerson,
        email: formData.email,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        website: formData.website || undefined,
        socialLinks: socialLinks.length > 0 ? socialLinks : undefined,
      },
    });
    
    router.push(`/onboarding/${workspaceId}/goals`);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Business Information
          </h1>
          <p className="text-muted-foreground">
            Tell us the basics about your business. We'll validate your information to ensure accuracy.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Your verified business details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business / Practice Name *</Label>
                  <Input
                    id="businessName"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Acme Corporation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input
                    id="contactPerson"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@example.com"
                      className={validation.email.valid ? "" : "border-destructive"}
                    />
                    {currentUser?.email === formData.email && (
                      <div className="text-xs mt-1 text-muted-foreground">
                        Pre-filled from your account
                      </div>
                    )}
                    {validation.email.message && (
                      <div className={`text-xs mt-1 flex items-center gap-1 ${
                        validation.email.valid ? "text-green-600" : "text-destructive"
                      }`}>
                        {validation.email.valid ? 
                          <CheckCircle className="w-3 h-3" /> : 
                          <AlertCircle className="w-3 h-3" />
                        }
                        {validation.email.message}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="(555) 000-0000"
                      maxLength={14}
                      className={validation.phone.valid ? "" : "border-destructive"}
                    />
                    {validation.phone.message && (
                      <div className={`text-xs mt-1 flex items-center gap-1 ${
                        validation.phone.valid ? "text-green-600" : "text-destructive"
                      }`}>
                        {validation.phone.valid ? 
                          <CheckCircle className="w-3 h-3" /> : 
                          <AlertCircle className="w-3 h-3" />
                        }
                        {validation.phone.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Business Address</Label>
                <div className="relative">
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => {
                      setFormData({ ...formData, address: e.target.value });
                      handleAddressSearch(e.target.value);
                    }}
                    placeholder="Start typing to search..."
                    className="pr-10"
                  />
                  <MapPin className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                  
                  {validation.address.suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
                      {validation.address.suggestions.map((place) => (
                        <button
                          key={place.place_id}
                          type="button"
                          onClick={() => selectAddress(place)}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        >
                          {place.description}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {validation.address.message && (
                    <div className="text-xs mt-1 text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {validation.address.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website (Optional)</Label>
                <div className="relative">
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                    className={validation.website.valid ? "" : "border-warning"}
                  />
                  {validation.website.checking && (
                    <div className="absolute right-3 top-3">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {validation.website.message && !validation.website.checking && (
                    <div className={`text-xs mt-1 flex items-center gap-1 ${
                      validation.website.valid ? "text-green-600" : "text-warning"
                    }`}>
                      {validation.website.valid ? 
                        <CheckCircle className="w-3 h-3" /> : 
                        <AlertCircle className="w-3 h-3" />
                      }
                      {validation.website.message}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media Links Card remains the same */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Social Media Links
              </CardTitle>
              <CardDescription>
                Optional: Add your social media profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook" className="flex items-center gap-2">
                    <Facebook className="w-4 h-4" /> Facebook
                  </Label>
                  <Input
                    id="facebook"
                    value={formData.socialLinks.facebook}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      socialLinks: { ...formData.socialLinks, facebook: e.target.value }
                    })}
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter" className="flex items-center gap-2">
                    <Twitter className="w-4 h-4" /> Twitter
                  </Label>
                  <Input
                    id="twitter"
                    value={formData.socialLinks.twitter}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      socialLinks: { ...formData.socialLinks, twitter: e.target.value }
                    })}
                    placeholder="https://twitter.com/yourhandle"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="flex items-center gap-2">
                    <Instagram className="w-4 h-4" /> Instagram
                  </Label>
                  <Input
                    id="instagram"
                    value={formData.socialLinks.instagram}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      socialLinks: { ...formData.socialLinks, instagram: e.target.value }
                    })}
                    placeholder="https://instagram.com/yourhandle"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4" /> LinkedIn
                  </Label>
                  <Input
                    id="linkedin"
                    value={formData.socialLinks.linkedin}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      socialLinks: { ...formData.socialLinks, linkedin: e.target.value }
                    })}
                    placeholder="https://linkedin.com/company/yourcompany"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/onboarding/${workspaceId}/welcome`)}
            >
              Back
            </Button>
            <Button type="submit" disabled={isValidating}>
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}