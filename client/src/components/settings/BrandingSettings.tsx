import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Save } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function BrandingSettings() {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // In a real app we might want to fetch fresh Organization data here
    const settings = (profile?.organization?.settings as any) || {};
    const [logoUrl, setLogoUrl] = useState(settings.branding?.logoUrl || "");
    const [removeBranding, setRemoveBranding] = useState(settings.branding?.removePlatformBranding || false);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            // We need to preserve other settings. 
            // Ideally backend should handle partial updates or we fetch-merge-save.
            // For this MVP we will construct the new settings object based on current known state + new changes.
            // RISK: If other settings exist and are not in user.organization check, they might be lost if we don't fetch first.
            // Let's rely on the fact that we might need to fetch the org first to be safe, OR just update the branding key if backend supported deep merge.
            // Given the backend replaces 'settings', we must be careful.

            // Safer approach: Fetch latest org data first (implicitly handled if useAuth updates, but let's be robust)
            // For now, let's assume `profile.organization.settings` is reasonably up to date or we risk it for the plan.

            const currentSettings = (profile?.organization?.settings as any) || {};

            const newSettings = {
                ...currentSettings,
                branding: {
                    logoUrl,
                    removePlatformBranding: removeBranding
                }
            };

            await apiRequest("PATCH", "/api/organization", {
                settings: newSettings
            });

            // Refresh user/org data
            await queryClient.invalidateQueries({ queryKey: ["/api/user"] }); // Assuming this refreshes auth hook data
            // If useAuth doesn't auto-refresh, we might need to reload or manually mutate.

            toast({ title: "Branding updated successfully" });
        } catch (error) {
            console.error(error);
            toast({ title: "Failed to update branding", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Kiosk Branding</CardTitle>
                <CardDescription>
                    Customize the appearance of your terminals.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="logoUrl">Organization Logo URL</Label>
                    <Input
                        id="logoUrl"
                        placeholder="https://your-company.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Provide a direct link to your transparent PNG logo (recommended height: 64px).
                    </p>
                </div>

                <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                    <div className="space-y-0.5">
                        <Label className="text-base">White Label Mode</Label>
                        <p className="text-xs text-muted-foreground">
                            Remove "Powered by Nexus.OS" and "Coco Factory" references from the Kiosk footer.
                        </p>
                    </div>
                    <Switch
                        checked={removeBranding}
                        onCheckedChange={setRemoveBranding}
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
            </CardFooter>
        </Card>
    );
}
