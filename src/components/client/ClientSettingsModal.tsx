// components/ClientSettingsModal.tsx
"use client";

import { useReducer, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings, User, Bell, Shield, Palette } from "lucide-react";

interface ClientSettingsModalProps {
  workspace: Doc<"workspaces">;
  open: boolean;
  onClose: () => void;
}

// Types for settings state and actions
interface SettingsState {
  name: string;
  businessName: string;
  email: string;
  theme: "coffee" | "mono" | "graphite" | "notebook";
  darkMode: boolean;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  privacy: {
    analytics: boolean;
    dataSharing: boolean;
  };
}

type SettingsAction =
  | { type: 'SET_FIELD'; field: keyof Pick<SettingsState, 'name' | 'businessName' | 'theme' | 'darkMode'>; value: string | boolean }
  | { type: 'SET_NESTED'; section: 'notifications' | 'privacy'; field: keyof SettingsState['notifications'] | keyof SettingsState['privacy']; value: boolean }
  | { type: 'RESET'; payload: SettingsState };

// Settings reducer for managing form state
const settingsReducer = (state: SettingsState, action: SettingsAction): SettingsState => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value as never } as SettingsState;
    case 'SET_NESTED':
      return { 
        ...state, 
        [action.section]: { ...(state)[action.section], [action.field]: action.value as never } as never
      };
    case 'RESET':
      return action.payload;
    default:
      return state;
  }
};

export default function ClientSettingsModal({
  workspace,
  open,
  onClose,
}: ClientSettingsModalProps) {
  const updateWorkspace = useMutation(api.workspaces.updateWorkspace);
  
  const initialState = useMemo<SettingsState>(() => ({
    name: workspace.name,
    businessName: workspace.businessInfo?.businessName || "",
    email: workspace.invitedEmail,
    theme: workspace.theme || "default",
    darkMode: workspace.darkMode || false,
    notifications: {
      email: workspace.policies?.enableNotifications || false,
      sms: false,
      push: false,
    },
    privacy: {
      analytics: workspace.policies?.enableAnalytics || false,
      dataSharing: false,
    },
  }), [workspace]);

  const [settings, dispatch] = useReducer(settingsReducer, initialState);

  const hasChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(initialState);
  }, [settings, initialState]);

  const handleSave = async () => {
    try {
      await updateWorkspace({
        workspaceId: workspace._id,
        updates: {
          name: settings.name,
          businessInfo: { 
            ...workspace.businessInfo,
            businessName: settings.businessName 
          },
          theme: settings.theme,
          darkMode: settings.darkMode,
          policies: {
            enableNotifications: settings.notifications.email,
            enableAnalytics: settings.privacy.analytics,
            dataConsent: workspace.policies?.dataConsent || false,
          },
        },
      });
      toast.success("Settings updated successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to update settings", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const themes = [
    { value: "default", label: "Default" },
    { value: "coffee", label: "Coffee" },
    { value: "mono", label: "Monochrome" },
    { value: "graphite", label: "Graphite" },
    { value: "notebook", label: "Notebook" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Client Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="general">
              <User className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Shield className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Workspace Name</Label>
              <Input
                value={settings.name}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'name', value: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input
                value={settings.businessName}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'businessName', value: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={settings.email}
                disabled
                className="opacity-50"
              />
              <p className="text-xs text-muted-foreground">Contact support to change email</p>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="grid grid-cols-2 gap-2">
                {themes.map((theme) => (
                  <Button
                    key={theme.value}
                    variant={settings.theme === theme.value ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => dispatch({ type: 'SET_FIELD', field: 'theme', value: theme.value })}
                  >
                    {theme.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Use dark theme</p>
              </div>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(checked) => dispatch({ type: 'SET_FIELD', field: 'darkMode', value: checked })}
              />
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch
                checked={settings.notifications.email}
                onCheckedChange={(checked) => 
                  dispatch({ type: 'SET_NESTED', section: 'notifications', field: 'email', value: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Get text message alerts</p>
              </div>
              <Switch
                checked={settings.notifications.sms}
                onCheckedChange={(checked) => 
                  dispatch({ type: 'SET_NESTED', section: 'notifications', field: 'sms', value: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Browser notifications</p>
              </div>
              <Switch
                checked={settings.notifications.push}
                onCheckedChange={(checked) => 
                  dispatch({ type: 'SET_NESTED', section: 'notifications', field: 'push', value: checked })
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Analytics</Label>
                <p className="text-sm text-muted-foreground">Help improve our service</p>
              </div>
              <Switch
                checked={settings.privacy.analytics}
                onCheckedChange={(checked) => 
                  dispatch({ type: 'SET_NESTED', section: 'privacy', field: 'analytics', value: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Data Sharing</Label>
                <p className="text-sm text-muted-foreground">Share usage data with partners</p>
              </div>
              <Switch
                checked={settings.privacy.dataSharing}
                onCheckedChange={(checked) => 
                  dispatch({ type: 'SET_NESTED', section: 'privacy', field: 'dataSharing', value: checked })
                }
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}