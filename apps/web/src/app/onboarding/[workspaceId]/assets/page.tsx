// app/onboarding/[workspaceId]/assets/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "convex/react";
import { api } from "@telera/convex/_generated/api";
import { Id } from "@telera/convex";
import { Upload, FileImage, Palette, X, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function AssetsPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  
  const updateStep = useMutation(api.workspaces.updateOnboardingStep);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);
  const getOrCreateOnboardingFolder = useMutation(api.folders.getOrCreateOnboardingFolder);
  const currentUser = useQuery(api.users.getCurrentUser);
  
  const [uploadLater, setUploadLater] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [secondaryColor, setSecondaryColor] = useState("#666666");
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAdditionalFiles([...additionalFiles, ...files]);
  };

  const removeFile = (index: number) => {
    setAdditionalFiles(additionalFiles.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File, fileType: string) => {
    const uploadUrl = await generateUploadUrl();
    
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    
    const { storageId } = await result.json();
    
    // Get or create onboarding folder
    const onboardingFolderId = await getOrCreateOnboardingFolder({
      workspaceId: workspaceId as Id<"workspaces">,
    });
    
    const fileData = await saveFile({
      storageId,
      workspaceId: workspaceId as Id<"workspaces">,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      fileType,
      folderId: onboardingFolderId,
    });
    
    return fileData;
  };

  const handleSubmit = async () => {
    setUploading(true);
    
    try {
      let logoId = undefined;
      const additionalFileIds: string[] = [];
      
      if (!uploadLater) {
        // Upload logo if provided
        if (logo) {
          const logoData = await uploadFile(logo, "logo");
          logoId = logoData.customId;
        }
        
        // Upload additional files
        for (const file of additionalFiles) {
          const fileData = await uploadFile(file, "brandAsset");
          additionalFileIds.push(fileData.customId);
        }
      }
      
      await updateStep({
        workspaceId: workspaceId as Id<"workspaces">,
        step: 6,
        fieldToUpdate: "brandAssets",
        data: {
          logoId,
          primaryColor: !uploadLater ? primaryColor : undefined,
          secondaryColor: !uploadLater ? secondaryColor : undefined,
          additionalFiles: additionalFileIds.length > 0 ? additionalFileIds : undefined,
          uploadLater,
        },
      });
      
      router.push(`/onboarding/${workspaceId}/policies`);
    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Brand Assets
          </h1>
          <p className="text-muted-foreground">
            Upload your brand assets here. Don't worry if you don't have them yet — 
            we'll use placeholder stock photos until you provide final ones.
          </p>
        </div>

        {currentUser && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Your Client Code: <span className="font-mono font-bold">{currentUser.clientCode}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All your files will be prefixed with this unique code for security
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Upload Later Option */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-6">
                <Button
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all group",
                    !uploadLater ? "border-primary bg-primary/5 hover:bg-primary/10" : "border-border hover:border-primary/50 hover:bg-primary/5"
                  )}
                  onClick={() => setUploadLater(false)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      !uploadLater ? "border-primary bg-primary" : "border-muted-foreground group-hover:border-primary group-hover:bg-primary/10"
                    )}>
                      {!uploadLater && (
                        <CheckCircle className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <p className={cn(
                        "font-medium transition-colors",
                        !uploadLater ? "text-foreground" : "text-foreground group-hover:text-foreground"
                      )}>Upload Now</p>
                    </div>
                  </div>
                </Button>
                
                <Button
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all group",
                    uploadLater ? "border-primary bg-primary/5 hover:bg-primary/10" : "border-border hover:border-primary/50 hover:bg-foreground/5"
                  )}
                  onClick={() => setUploadLater(true)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      uploadLater ? "border-primary bg-primary" : "border-muted-foreground group-hover:border-primary group-hover:bg-primary/10"
                    )}>
                      {uploadLater && (
                        <CheckCircle className="w-3 h-3 text-primary-foreground group-hover:text-white" />
                      )}
                    </div>
                    <div>
                      <p className={cn(
                        "font-medium transition-colors",
                        uploadLater ? "text-foreground" : "text-accent group-hover:text-foreground"
                      )}>Upload Later</p>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {!uploadLater && (
            <>
              {/* Logo Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileImage className="w-5 h-5" />
                    Logo
                  </CardTitle>
                  <CardDescription>
                    Upload your company logo (PNG, JPG, or SVG)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {logoPreview ? (
                      <div className="relative w-32 h-32 border rounded-lg p-2">
                        <Image
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-full h-full object-contain"
                          width={128}
                          height={128}
                        />
                        <Button
                          onClick={() => {
                            setLogo(null);
                            setLogoPreview("");
                          }}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Label
                        htmlFor="logo"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/5 transition-colors"
                      >
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">
                          Click to upload logo
                        </span>
                        <Input
                          id="logo"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoChange}
                        />
                      </Label>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Colors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Brand Colors
                  </CardTitle>
                  <CardDescription>
                    Select your primary and secondary brand colors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primary-color"
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondary-color">Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondary-color"
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          placeholder="#ffffff"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Files */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Files</CardTitle>
                  <CardDescription>
                    Upload any other brand assets (images, documents, etc.)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Label
                      htmlFor="additional"
                      className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/5 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload files
                      </span>
                      <Input
                        id="additional"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleAdditionalFiles}
                      />
                    </Label>
                    
                    {additionalFiles.length > 0 && (
                      <div className="space-y-2">
                        {additionalFiles.map((file, index) => (
                          <div
                            key={file.name}
                            className="flex items-center justify-between p-2 border rounded-lg"
                          >
                            <span className="text-sm truncate">{file.name}</span>
                            <Button
                              onClick={() => removeFile(index)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push(`/onboarding/${workspaceId}/theme`)}
              disabled={uploading}
            >
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={uploading}>
              {uploading ? "Uploading..." : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}