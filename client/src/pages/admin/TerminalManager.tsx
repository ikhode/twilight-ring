
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Monitor, Trash2, RefreshCw, XCircle, RotateCw } from "lucide-react";
import { AppLayout as Layout } from "@/components/layout/AppLayout";
import { apiRequest } from "@/lib/queryClient";

interface Terminal {
    id: string;
    name: string;
    location: string;
    status: string;
    deviceId: string | null;
    capabilities: string[];
    lastActiveAt: string | null;
    provisioningToken: string | null;
}

export default function TerminalManager() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const { data: terminals, isLoading } = useQuery<Terminal[]>({
        queryKey: ["/api/kiosks"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/kiosks", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/kiosks"] });
            setIsCreateOpen(false);
            toast({ title: "Terminal created" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("PATCH", `/api/kiosks/${selectedTerminal?.id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/kiosks"] });
            setIsEditOpen(false);
            toast({ title: "Terminal updated" });
        },
    });

    const provisionMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await apiRequest("POST", `/api/kiosks/${id}/provisioning`);
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/kiosks"] }); // To show token if we saved it (optional)
            // Show token in a dialog or alert
            toast({
                title: "Provisioning Token Generated",
                description: `Token: ${data.token} (Expires in 15m)`,
                duration: 10000
            });
        },
    });

    const revokeBindingMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/kiosks/${id}/binding`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/kiosks"] });
            toast({ title: "Device unbound", variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/kiosks/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/kiosks"] });
            toast({ title: "Terminal deleted" });
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const capabilities = [];
        if (formData.get("cap_production")) capabilities.push("production");
        if (formData.get("cap_sales")) capabilities.push("sales");
        if (formData.get("cap_logistics")) capabilities.push("logistics");

        createMutation.mutate({
            name: formData.get("name"),
            location: formData.get("location"),
            capabilities
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const capabilities = [];
        if (formData.get("cap_production")) capabilities.push("production");
        if (formData.get("cap_sales")) capabilities.push("sales");
        if (formData.get("cap_logistics")) capabilities.push("logistics");

        updateMutation.mutate({
            name: formData.get("name"),
            location: formData.get("location"),
            capabilities
        });
    };

    return (
        <Layout title="Kiosk Manager">
            <div className="container mx-auto p-6 space-y-6 max-w-7xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Kiosk Manager</h1>
                        <p className="text-muted-foreground">Provision and manage physical terminals</p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Terminal
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Registered Terminals</CardTitle>
                        <CardDescription>Devices that have access to the Kiosk Interface</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Device ID</TableHead>
                                        <TableHead>Capabilities</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {terminals?.map((term) => (
                                        <TableRow key={term.id}>
                                            <TableCell className="font-medium">{term.name}</TableCell>
                                            <TableCell>{term.location}</TableCell>
                                            <TableCell>
                                                <Badge variant={term.status === "online" ? "default" : "secondary"}>
                                                    {term.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {term.deviceId ? (
                                                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                                        {term.deviceId.substring(0, 8)}...
                                                    </code>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm italic">Not Bound</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1 flex-wrap">
                                                    {term.capabilities?.map(c => (
                                                        <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right flex justify-end gap-2">
                                                {!term.deviceId && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => provisionMutation.mutate(term.id)}
                                                    >
                                                        <RefreshCw className="h-4 w-4 mr-1 text-blue-500" /> Bind
                                                    </Button>
                                                )}
                                                {term.deviceId && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            if (confirm("Revoke access for this device?")) {
                                                                revokeBindingMutation.mutate(term.id);
                                                            }
                                                        }}
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1 text-orange-500" /> Unlink
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setSelectedTerminal(term);
                                                        setIsEditOpen(true);
                                                    }}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-destructive"
                                                    onClick={() => {
                                                        if (confirm("Delete this terminal configuration?")) {
                                                            deleteMutation.mutate(term.id);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {terminals?.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No terminals found. Create one to get started.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Create Dialog */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Terminal</DialogTitle>
                            <DialogDescription>Create a configuration placeholder. You will need to bind a physical device later.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Friendly Name</Label>
                                <Input id="name" name="name" required placeholder="Main Entrance Kiosk" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <Input id="location" name="location" placeholder="Building A, Floor 1" />
                            </div>
                            <div className="space-y-2">
                                <Label>Capabilities</Label>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="cap_production" name="cap_production" />
                                        <Label htmlFor="cap_production">Production (Face Auth & Tasks)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="cap_sales" name="cap_sales" />
                                        <Label htmlFor="cap_sales">Sales (POS)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="cap_logistics" name="cap_logistics" />
                                        <Label htmlFor="cap_logistics">Logistics (Driver Terminal)</Label>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Terminal
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Terminal</DialogTitle>
                        </DialogHeader>
                        {selectedTerminal && (
                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Friendly Name</Label>
                                    <Input id="name" name="name" defaultValue={selectedTerminal.name} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">Location</Label>
                                    <Input id="location" name="location" defaultValue={selectedTerminal.location} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Capabilities</Label>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="cap_production"
                                                name="cap_production"
                                                defaultChecked={selectedTerminal.capabilities?.includes("production")}
                                            />
                                            <Label htmlFor="cap_production">Production</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="cap_sales"
                                                name="cap_sales"
                                                defaultChecked={selectedTerminal.capabilities?.includes("sales")}
                                            />
                                            <Label htmlFor="cap_sales">Sales</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="cap_logistics"
                                                name="cap_logistics"
                                                defaultChecked={selectedTerminal.capabilities?.includes("logistics")}
                                            />
                                            <Label htmlFor="cap_logistics">Logistics</Label>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={updateMutation.isPending}>
                                        Save Changes
                                    </Button>
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}

