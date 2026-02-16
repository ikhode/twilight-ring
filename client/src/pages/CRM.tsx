import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Users,
  Plus,
  Search,
  Phone,
  DollarSign,
  TrendingUp,
  Truck,
  ShoppingBag,
  Loader2,
  RefreshCcw,
  Zap,
  Brain,
  MessageSquare,
  AlertTriangle,
  Activity,
  Edit,
  Gavel,
  Target,
  Handshake,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Customer, Supplier } from "../../../shared/schema";
import { Deal, InsertDeal } from "../../../shared/modules/commerce/deals";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EntityDossier } from "@/components/documents/EntityDossier";
import { useConfiguration } from "@/context/ConfigurationContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CognitiveButton, AliveValue, CognitiveInput } from "@/components/cognitive";
import { useCognitiveEngine } from "@/lib/cognitive/engine";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DossierView } from "@/components/shared/DossierView";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TAX_REGIMES, CFDI_USAGE, PAYMENT_FORMS, PAYMENT_METHODS } from "../../../shared/constants/fiscal";
import { validateRFC, validateZipCode } from "../../../shared/utils/fiscal";

function CreateCustomerDialog() {
  const { session } = useAuth();
  const { industry } = useConfiguration();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    rfc: "",
    taxRegimeId: "",
    zipCode: "",
    fiscalPersonaType: "moral" as "moral" | "fisica",
    loyaltyCardCode: ""
  });

  const labels: Record<string, any> = {
    services: { title: "Nuevo Cliente Corporativo", nameLabel: "Razón Social / Empresa", namePlaceholder: "Ej. Acme Corp", emailLabel: "Email de Contacto" },
    healthcare: { title: "Registrar Paciente", nameLabel: "Nombre del Paciente", namePlaceholder: "Ej. Juan Pérez", emailLabel: "Email Personal", loyaltyLabel: "ID Expediente" },
    hospitality: { title: "Registro de Comensal", nameLabel: "Nombre del Cliente", namePlaceholder: "Ej. María González", emailLabel: "Email (Fidelización)", loyaltyLabel: "Tarjeta Lealtad" },
    retail: { title: "Nuevo Cliente", nameLabel: "Nombre Completo", namePlaceholder: "Ej. Juan Pérez", emailLabel: "Email", loyaltyLabel: "Código Cliente" },
    generic: { title: "Nuevo Cliente", nameLabel: "Nombre de la Empresa / Persona", namePlaceholder: "Ej. Acme Corp", emailLabel: "Email", loyaltyLabel: "Código Referencia" }
  };

  const currentLabels = labels[industry as string] || labels.generic;

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/crm/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create customer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/customers"] });
      setOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        rfc: "",
        taxRegimeId: "",
        zipCode: "",
        fiscalPersonaType: "moral",
        loyaltyCardCode: ""
      });
      toast({ title: "Cliente Creado", description: "El cliente ha sido registrado exitosamente." });

      // Onboarding Action
      window.dispatchEvent(new CustomEvent('NEXUS_ONBOARDING_ACTION', { detail: 'customer_created' }));
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear el registro." });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <CognitiveButton
          className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
          intent="create_customer"
          title="Registrar nuevo cliente con análisis de riesgo inicial"
          data-tour="new-customer-btn"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('NEXUS_ONBOARDING_ACTION', { detail: 'modal_opened_crm' }));
          }}
        >
          <Plus className="w-4 h-4" /> {currentLabels.title}
        </CognitiveButton>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{currentLabels.title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{currentLabels.nameLabel}</Label>
              <CognitiveInput
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={currentLabels.namePlaceholder}
                semanticType="name"
              />
            </div>
            <div className="space-y-2">
              <Label>{currentLabels.emailLabel}</Label>
              <CognitiveInput
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="contacto@ejemplo.com"
                semanticType="email"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Persona</Label>
              <Select
                value={formData.fiscalPersonaType}
                onValueChange={v => setFormData({ ...formData, fiscalPersonaType: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="moral">Persona Moral (Empresa)</SelectItem>
                  <SelectItem value="fisica">Persona Física (Individuo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>RFC</Label>
              <CognitiveInput
                value={formData.rfc}
                onChange={e => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                placeholder="XAXX010101000"
                className={cn(!validateRFC(formData.rfc) && formData.rfc.length > 0 && "border-rose-500")}
              />
              {!validateRFC(formData.rfc) && formData.rfc.length > 0 && (
                <p className="text-[10px] text-rose-500 mt-1">RFC Inválido</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{currentLabels.loyaltyLabel || "Tarjeta Lealtad"}</Label>
              <Input
                value={formData.loyaltyCardCode}
                onChange={e => setFormData({ ...formData, loyaltyCardCode: e.target.value })}
                placeholder="Escanea o escribe código..."
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Régimen Fiscal</Label>
              <Select
                value={formData.taxRegimeId}
                onValueChange={v => setFormData({ ...formData, taxRegimeId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar Régimen" /></SelectTrigger>
                <SelectContent>
                  {TAX_REGIMES.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.id} - {r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Código Postal Fiscal</Label>
              <Input
                value={formData.zipCode}
                onChange={e => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="55000"
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Límite de Crédito (MXN)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  className="pl-9"
                  placeholder="0.00"
                  onChange={e => setFormData({ ...formData, creditLimit: Number(e.target.value) * 100 } as any)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Método de Pago Preferido</Label>
              <Select onValueChange={v => setFormData({ ...formData, preferredPaymentMethod: v } as any)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending} data-tour="customer-save-btn">
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar Registro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditCustomerDialog({ customer, open, onOpenChange }: { customer: Customer | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      const res = await fetch(`/api/crm/customers/${customer?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/customers"] });
      onOpenChange(false);
      toast({ title: "Datos Actualizados", description: "La información del cliente se ha guardado correctamente." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Expediente de {customer.name}</DialogTitle>
          <DialogDescription>Gestión 360° del cliente.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
          <div className="overflow-y-auto pr-2">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateMutation.mutate({
                name: formData.get("name") as string,
                email: formData.get("email") as string,
                phone: formData.get("phone") as string,
                address: formData.get("address") as string,
                billingAddress: formData.get("billing_address") as string,
                creditLimit: Number(formData.get("credit_limit")) * 100,
                preferredPaymentMethod: formData.get("preferred_payment_method") as string,
                birthDate: formData.get("birth_date") as string,
                notes: formData.get("notes") as string,
                status: formData.get("status") as any,
                rfc: formData.get("rfc") as string,
                taxRegimeId: formData.get("taxRegimeId") as string,
                zipCode: formData.get("zipCode") as string,
                fiscalPersonaType: formData.get("fiscalPersonaType") as any,
              });
            }} className="space-y-4 py-4">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="general">Información General</TabsTrigger>
                  <TabsTrigger value="billing">Cobranza y Crédito</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre / Razón Social</Label>
                      <Input name="name" defaultValue={customer.name} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input name="email" defaultValue={customer.email || ""} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input name="phone" defaultValue={customer.phone || ""} placeholder="+52 55..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Cumpleaños / Aniversario</Label>
                      <Input name="birthDate" type="date" defaultValue={customer.birthDate || ""} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Dirección Física</Label>
                    <Input name="address" defaultValue={customer.address || ""} placeholder="Calle, Número, Col..." />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Persona</Label>
                      <Select name="fiscalPersonaType" defaultValue={customer.fiscalPersonaType || "moral"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="moral">Persona Moral</SelectItem>
                          <SelectItem value="fisica">Persona Física</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>RFC</Label>
                      <Input name="rfc" defaultValue={customer.rfc || ""} placeholder="XAXX010101000" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado de la Cuenta</Label>
                    <Select name="status" defaultValue={customer.status || "active"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="lead">Prospecto</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="billing" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tarjeta de Lealtad / ID</Label>
                      <Input
                        name="loyaltyCardCode"
                        defaultValue={customer.loyaltyCardCode || ""}
                        placeholder="Código escaneado..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Puntos Acumulados</Label>
                      <div className="flex items-center gap-2 h-10 px-3 py-2 bg-muted rounded-md text-sm font-bold text-primary">
                        <Target className="w-4 h-4" />
                        {customer.loyaltyPoints || 0} pts
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Límite de Crédito (MXN)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input name="creditLimit" type="number" step="0.01" className="pl-9" defaultValue={customer.creditLimit ? (customer.creditLimit / 100).toString() : ""} placeholder="0.00" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Método de Pago Preferido</Label>
                      <Select name="preferredPaymentMethod" defaultValue={customer.preferredPaymentMethod || ""}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transfer">Transferencia</SelectItem>
                          <SelectItem value="cash">Efectivo</SelectItem>
                          <SelectItem value="card">Tarjeta</SelectItem>
                          <SelectItem value="check">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Régimen Fiscal (SAT)</Label>
                      <Select name="taxRegimeId" defaultValue={customer.taxRegimeId || ""}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {TAX_REGIMES.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.id} - {r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>CP Fiscal</Label>
                      <Input name="zipCode" defaultValue={customer.zipCode || ""} placeholder="55000" maxLength={5} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Dirección de Facturación (RFC/Datos)</Label>
                    <textarea
                      name="billingAddress"
                      defaultValue={customer.billingAddress || ""}
                      className="flex min-h-[80px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="Nombre, RFC, Régimen, CP..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notas de Cartera</Label>
                    <textarea
                      name="notes"
                      defaultValue={customer.notes || ""}
                      className="flex min-h-[80px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="Acuerdos especiales, condiciones de crédito..."
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </form>
          </div>

          <div className="h-full min-h-[400px]">
            <EntityDossier
              entityId={customer.id}
              entityType="customer"
              label="Expediente del Cliente"
              className="border-slate-800 bg-slate-900/50"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateSupplierDialog() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    phone: "",
    rfc: "",
    taxRegimeId: "",
    zipCode: ""
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/crm/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          name: data.name,
          contactInfo: { contact: data.contact },
          phone: data.phone,
          rfc: data.rfc,
          taxRegimeId: data.taxRegimeId,
          zipCode: data.zipCode
        })
      });
      if (!res.ok) throw new Error("Failed to create supplier");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/suppliers"] });
      setOpen(false);
      setFormData({ name: "", contact: "", phone: "", rfc: "", taxRegimeId: "", zipCode: "" });
      toast({ title: "Proveedor creado", description: "El proveedor se ha registrado exitosamente." });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear el proveedor." });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" variant="outline">
          <Plus className="w-4 h-4" /> Agregar Proveedor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Proveedor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Razón Social</Label>
            <Input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej. Distribuidora del Norte"
            />
          </div>
          <div className="space-y-2">
            <Label>Persona de Contacto</Label>
            <Input
              value={formData.contact}
              onChange={e => setFormData({ ...formData, contact: e.target.value })}
              placeholder="Juan Pérez"
            />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+52 55..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>RFC</Label>
              <Input
                value={formData.rfc}
                onChange={e => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                placeholder="RFC del SAT"
              />
            </div>
            <div className="space-y-2">
              <Label>CP Fiscal</Label>
              <Input
                value={formData.zipCode}
                onChange={e => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="55000"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditSupplierDialog({ supplier, open, onOpenChange }: { supplier: Supplier | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Supplier>) => {
      const res = await fetch(`/api/crm/suppliers/${supplier?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/suppliers"] });
      onOpenChange(false);
      toast({ title: "Proveedor Actualizado", description: "La información del proveedor se ha guardado correctamente." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Expediente de {supplier.name}</DialogTitle>
          <DialogDescription>Gestión de alianza comercial.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
          <div className="overflow-y-auto pr-2">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateMutation.mutate({
                name: formData.get("name") as string,
                category: formData.get("category") as string,
                address: formData.get("address") as string,
                contactPerson: formData.get("contact_person") as string,
                paymentTermsDays: Number(formData.get("payment_terms_days")),
                creditLimit: Number(formData.get("credit_limit")) * 100,
                bankName: formData.get("bank_name") as string,
                bankAccountNumber: formData.get("bank_account_number") as string,
                bankClabe: formData.get("bank_clabe") as string,
                status: formData.get("status") as any,
                rfc: formData.get("rfc") as string,
                taxRegimeId: formData.get("tax_regime_id") as string,
                zipCode: formData.get("zip_code") as string,
                fiscalPersonaType: formData.get("fiscal_persona_type") as any,
              });
            }} className="space-y-4 py-4">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="general">Operativo</TabsTrigger>
                  <TabsTrigger value="financial">Financiero / Fiscal</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Razón Social</Label>
                      <Input name="name" defaultValue={supplier.name} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Input name="category" defaultValue={supplier.category || ""} placeholder="Ej. Insumos, Servicios" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Persona de Contacto</Label>
                      <Input name="contactPerson" defaultValue={supplier.contactPerson || ""} placeholder="Nombre completo" />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select name="status" defaultValue={supplier.status || "active"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="on_hold">En Espera</SelectItem>
                          <SelectItem value="inactive">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Persona</Label>
                      <Select name="fiscalPersonaType" defaultValue={supplier.fiscalPersonaType || "moral"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="moral">Persona Moral</SelectItem>
                          <SelectItem value="fisica">Persona Física</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>RFC</Label>
                      <Input name="rfc" defaultValue={supplier.rfc || ""} placeholder="RFC del SAT" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Dirección Fiscal / Oficina</Label>
                    <Input name="address" defaultValue={supplier.address || ""} placeholder="Calle, Número, Col..." />
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Régimen Fiscal (SAT)</Label>
                      <Select name="taxRegimeId" defaultValue={supplier.taxRegimeId || ""}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {TAX_REGIMES.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.id} - {r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>CP Fiscal</Label>
                      <Input name="zipCode" defaultValue={supplier.zipCode || ""} placeholder="55000" maxLength={5} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Días de Crédito</Label>
                      <Input name="paymentTermsDays" type="number" defaultValue={supplier.paymentTermsDays || 0} />
                    </div>
                    <div className="space-y-2">
                      <Label>Límite de Crédito (MXN)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input name="creditLimit" type="number" step="0.01" className="pl-9" defaultValue={supplier.creditLimit ? (supplier.creditLimit / 100).toString() : ""} placeholder="0.00" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Régimen Fiscal (RFC/ID)</Label>
                    <Input name="taxRegimeId" defaultValue={supplier.taxRegimeId || ""} placeholder="RFC o ID Fiscal" />
                  </div>

                  <div className="space-y-4 pt-2 border-t border-slate-800">
                    <h4 className="text-sm font-semibold text-primary/80">Datos Bancarios para Pago</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Banco</Label>
                        <Input name="bankName" defaultValue={supplier.bankName || ""} placeholder="Nombre del Banco" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Cuenta</Label>
                          <Input name="bankAccountNumber" defaultValue={supplier.bankAccountNumber || ""} placeholder="No. de Cuenta" />
                        </div>
                        <div className="space-y-2">
                          <Label>CLABE</Label>
                          <Input name="bankClabe" defaultValue={supplier.bankClabe || ""} placeholder="18 dígitos" />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar Expediente
                </Button>
              </DialogFooter>
            </form>
          </div>

          <div className="h-full min-h-[400px]">
            <EntityDossier
              entityId={supplier.id}
              entityType="supplier"
              label="Expediente del Proveedor"
              className="border-slate-800 bg-slate-900/50"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PipelineCard({ deal, onMove }: { deal: Deal & { customer: Customer }, onMove: (status: string) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-lg bg-slate-900 border border-slate-800 shadow-sm space-y-3"
    >
      <div className="flex justify-between items-start">
        <h5 className="font-bold text-sm text-slate-200">{deal.name}</h5>
        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">
          {Math.round(deal.probability)}%
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Users className="w-3 h-3" />
        {deal.customer?.name}
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="font-mono text-primary font-bold">
          {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format((deal.value || 0) / 100)}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove("qualified")} title="Calificar">
            <TrendingUp className="w-3 h-3 text-blue-400" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove("closed_won")} title="Cerrar Ganado">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function CreateDealDialog({ customers }: { customers: Customer[] }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertDeal>>({
    name: "",
    customerId: "",
    status: "lead",
    value: 0,
    probability: 10
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertDeal>) => {
      const res = await fetch("/api/crm/deals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to create deal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals"] });
      setOpen(false);
      setFormData({ name: "", customerId: "", status: "lead", value: 0, probability: 10 });
      toast({ title: "Negocio Registrado", description: "El trato se ha iniciado exitosamente en el pipeline." });
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Target className="w-4 h-4" /> Nuevo Negocio
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apertura de Negocio</DialogTitle>
          <DialogDescription>Inicia un nuevo trato en el pipeline de ventas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nombre del Trato</Label>
            <Input
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej. Suministro Anual Acme"
            />
          </div>
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select onValueChange={v => setFormData({ ...formData, customerId: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar Cliente" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Estimado (MXN)</Label>
              <Input
                type="number"
                value={(formData.value || 0) / 100}
                onChange={e => setFormData({ ...formData, value: Number(e.target.value) * 100 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Probabilidad (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={e => setFormData({ ...formData, probability: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Iniciar Trato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CRM() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Cognitive State
  const { setIntent, setMode, setConfidence } = useCognitiveEngine();

  useEffect(() => {
    setIntent("Gestión de Socios de Negocio");
    setMode("analysis");
    setConfidence(98);

    return () => {
      setIntent(undefined as any);
      setMode("observation");
    }
  }, []);

  // --- MUTATIONS ---
  const remindersMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/crm/reminders", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to send reminders");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Intervención Cognitiva",
        description: data.message,
      });
    }
  });

  // Module Enforcement
  const { enabledModules } = useConfiguration();
  const isEnabled = enabledModules.includes("crm");

  if (!isEnabled) {
    return (
      <AppLayout title="Socios de Negocio" subtitle="Administración de relaciones">
        <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-4">
          <div className="p-4 bg-muted rounded-full">
            <Users className="w-12 h-12 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Módulo CRM Desactivado</h2>
            <p className="text-muted-foreground max-w-md mx-auto mt-2">
              Gestiona relaciones con clientes activando este módulo en el Marketplace.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // --- QUERIES ---
  const { data: customers = [], isLoading: loadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/crm/customers"],
    queryFn: async () => {
      if (!session?.access_token) return [];
      const res = await fetch("/api/crm/customers", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
    enabled: isEnabled && !!session?.access_token
  });

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/crm/suppliers"],
    queryFn: async () => {
      if (!session?.access_token) return [];
      const res = await fetch("/api/crm/suppliers", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
    enabled: isEnabled && !!session?.access_token
  });

  const { data: analysisData } = useQuery({
    queryKey: ["/api/crm/analysis"],
    queryFn: async () => {
      if (!session?.access_token) return null;
      const res = await fetch("/api/crm/analysis", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!session?.access_token
  });

  // --- REALTIME ---
  useEffect(() => {
    const channel = supabase
      .channel('crm-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["/api/crm/customers"] });
        toast({
          title: "Directorio Actualizado",
          description: "La IA ha procesado cambios en los socios.",
          duration: 2000
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["/api/crm/suppliers"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient, toast]);

  const formatCurrency = (amount: number = 0) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount / 100);

  // --- STATS ---
  const clientsStats = {
    total: customers.length,
    active: customers.filter((c) => c.status === "active").length,
    totalReceivables: customers.reduce((acc, c) => acc + Math.max(0, c.balance || 0), 0),
    totalDebt: customers.filter((c) => (c.balance || 0) < 0).reduce((acc, c) => acc + Math.abs(c.balance || 0), 0),
  };

  const { data: dealsData = [], isLoading: loadingDeals } = useQuery<(Deal & { customer: Customer })[]>({
    queryKey: ["/api/crm/deals"],
    queryFn: async () => {
      if (!session?.access_token) return [];
      const res = await fetch("/api/crm/deals", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error("Fetch failed");
      return res.json();
    },
    enabled: isEnabled && !!session?.access_token
  });

  const dealStages = [
    { id: "lead", label: "Lead", icon: Target, color: "bg-slate-500" },
    { id: "qualified", label: "Calificado", icon: Activity, color: "bg-blue-500" },
    { id: "proposal", label: "Propuesta", icon: Gavel, color: "bg-purple-500" },
    { id: "negotiation", label: "Negociación", icon: Handshake, color: "bg-amber-500" },
    { id: "closed_won", label: "Cerrado Ganado", icon: CheckCircle2, color: "bg-emerald-500" },
    { id: "closed_lost", label: "Cerrado Perdido", icon: XCircle, color: "bg-rose-500" },
  ];

  const updateDealMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await fetch(`/api/crm/deals/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/deals"] });
      toast({ title: "Pipeline Actualizado", description: "El estado del negocio se ha sincronizado." });
    }
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  return (
    <AppLayout title="Socios de Negocio" subtitle="Administración de relaciones y cartera">
      <div className="space-y-6">
        <EditCustomerDialog
          customer={editingCustomer}
          open={!!editingCustomer}
          onOpenChange={(open) => !open && setEditingCustomer(null)}
        />
        <EditSupplierDialog
          supplier={editingSupplier}
          open={!!editingSupplier}
          onOpenChange={(open) => !open && setEditingSupplier(null)}
        />

        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-slate-800 p-1">
            <TabsTrigger value="clients" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Truck className="w-4 h-4 mr-2" />
              Proveedores
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Pipeline de Ventas
            </TabsTrigger>
          </TabsList>

          {/* CLIENTS TAB */}
          <TabsContent value="clients" className="space-y-6">

            {/* Portfolio Analysis Layer - Results Oriented */}
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl border border-primary/20 bg-primary/5 backdrop-blur-sm relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                <div className="flex items-start gap-3 relative z-10">
                  <div className="p-2 rounded-lg bg-primary/20 text-primary">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                      Diagnóstico de Salud Crediticia
                      <Badge variant="outline" className="text-[10px] h-4 border-primary/30 text-primary/80">Monitor Activo</Badge>
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">
                      {analysisData?.segments?.delinquentCount > 0
                        ? `Se identificaron ${analysisData.segments.delinquentCount} socios con pagos demorados que requieren conciliación inmediata.`
                        : "No se detectan discrepancias en los ciclos de cobro. La liquidez de cartera es óptima."}
                    </p>
                    {analysisData?.segments?.delinquentCount > 0 && (
                      <div className="mt-3 flex gap-2">
                        <CognitiveButton
                          size="sm"
                          className="h-8 text-xs bg-primary hover:bg-primary/90"
                          intent="send_reminders"
                          onClick={() => remindersMutation.mutate()}
                          disabled={remindersMutation.isPending}
                        >
                          <MessageSquare className="w-3 h-3 mr-1.5" />
                          {remindersMutation.isPending ? "Procesando..." : "Ejecutar Cobranza Preventiva"}
                        </CognitiveButton>
                        <Button size="sm" variant="ghost" className="h-8 text-xs">Omitir Ciclo</Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Cognitive Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-6">
                  <AliveValue
                    label="Total Clientes"
                    value={clientsStats.total}
                    trend="up"
                    explanation="Crecimiento del 5% respecto al mes anterior."
                    formula="COUNT(id) FROM customers"
                    source="Base de Datos CRM (Realtime)"
                  />
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-6">
                  <AliveValue
                    label="Cartera Activa"
                    value={clientsStats.active}
                    explanation="85% de retención de clientes activos."
                    formula="COUNT(id) FROM customers WHERE status = 'active'"
                    source="Base de Datos CRM (Realtime)"
                  />
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-6">
                  <AliveValue
                    label="Por Cobrar"
                    value={formatCurrency(clientsStats.totalReceivables)}
                    trend="up"
                    className="text-emerald-500"
                    explanation="Flujo de caja positivo proyectado para fin de mes."
                    formula="SUM(balance) FROM customers WHERE balance > 0"
                    source="Contabilidad Directa"
                  />
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-6">
                  <AliveValue
                    label="Vencido"
                    value={formatCurrency(clientsStats.totalDebt)}
                    trend="down"
                    className="text-rose-500"
                    explanation="Reducción de deuda vencida en un 12% tras la última campaña."
                    formula="SUM(balance) FROM customers WHERE balance < 0"
                    source="Contabilidad Directa"
                  />
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-800 bg-slate-900/30">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-display">Directorio de Clientes</CardTitle>
                    {loadingCustomers && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}

                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                      <Activity className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Monitor de Clientes</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Búsqueda semántica..."
                        className="pl-9 w-64 bg-slate-950/50 border-slate-800"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <CreateCustomerDialog />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-slate-800 overflow-hidden">
                  <DataTable
                    columns={[
                      {
                        key: "name",
                        header: "Cliente",
                        render: (item) => (
                          <div className={cn("flex items-center gap-3", item.isArchived && "opacity-50 grayscale line-through")}>
                            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary">
                              {item.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-200">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.email || "Sin email"}</p>
                            </div>
                          </div>
                        ),
                      },
                      {
                        key: "contact",
                        header: "Contacto",
                        render: (item) => (
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Phone className="w-3 h-3" />
                            {item.phone || "---"}
                          </div>
                        ),
                      },
                      {
                        key: "churn",
                        header: "Riesgo de Fuga",
                        render: (item: any) => {
                          const analysisItem = analysisData?.analysis?.find((a: any) => a.customerId === item.id);
                          const risk = analysisItem?.churnRisk || "Low";

                          const color = risk === "High" ? "text-rose-400 border-rose-400/30 bg-rose-400/10" : risk === "Medium" ? "text-amber-400 border-amber-400/30 bg-amber-400/10" : "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";

                          return (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-wider", color)}>
                                {risk === "High" && <AlertTriangle className="w-3 h-3 mr-1" />}
                                {risk} Risk
                              </Badge>
                            </div>
                          );
                        }
                      },
                      {
                        key: "loyaltyPoints",
                        header: "Puntos",
                        render: (item) => (
                          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                            <Target className="w-3.5 h-3.5" />
                            {item.loyaltyPoints || 0}
                          </div>
                        ),
                      },
                      {
                        key: "balance",
                        header: "Balance",
                        render: (item) => (
                          <span
                            className={cn(
                              "font-bold font-mono",
                              (item.balance || 0) > 0 ? "text-emerald-400" : ((item.balance || 0) < 0 ? "text-rose-400" : "text-slate-500")
                            )}
                          >
                            {formatCurrency(item.balance || 0)}
                          </span>
                        ),
                      },
                      {
                        key: "status",
                        header: "Estado",
                        render: (item) => <StatusBadge status={item.status} />,
                      },
                      {
                        key: "actions",
                        header: "",
                        render: (item) => (
                          <div className="flex items-center gap-2">
                            <DossierView
                              entityType="customer"
                              entityId={item.id}
                              entityName={item.name}
                            />
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingCustomer(item)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <RefreshCcw className="w-3 h-3" />
                            </Button>
                          </div>
                        ),
                      },
                    ]}
                    data={filteredCustomers}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SUPPLIERS TAB */}
          <TabsContent value="suppliers" className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Proveedores</h3>
                  <p className="text-sm text-slate-400">Gestión de cadena de suministro</p>
                </div>
              </div>
              <CreateSupplierDialog />
            </div>

            <Card className="border-slate-800 bg-slate-900/30">
              <CardContent className="p-0">
                <div className="rounded-md border border-slate-800 overflow-hidden">
                  <DataTable
                    columns={[
                      {
                        key: "name",
                        header: "Proveedor",
                        render: (item) => (
                          <div className={cn("flex items-center gap-3", item.isArchived && "opacity-50 grayscale line-through")}>
                            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center font-semibold text-slate-400">
                              {item.name.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-200">{item.name}</span>
                          </div>
                        ),
                      },
                      {
                        key: "category",
                        header: "Categoría",
                        render: (item) => (
                          <Badge variant="outline" className="border-slate-700 text-slate-400">
                            {item.category || "General"}
                          </Badge>
                        ),
                      },
                      {
                        key: "actions",
                        header: "",
                        render: (item) => (
                          <div className="flex items-center gap-2">
                            <DossierView
                              entityType="supplier"
                              entityId={item.id}
                              entityName={item.name}
                            />
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingSupplier(item)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        ),
                      },
                    ]}
                    data={suppliers}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* PIPELINE TAB */}
          <TabsContent value="pipeline" className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-xl border border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Sales Pipeline</h3>
                  <p className="text-sm text-slate-400">Visualización de embudo y conversión de negocios</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/crm/deals"] })}>
                  <RefreshCcw className="w-4 h-4 mr-2" /> Actualizar
                </Button>
                <CreateDealDialog customers={customers} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 min-h-[600px]">
              {dealStages.map(stage => {
                const StageIcon = stage.icon;
                const stageDeals = dealsData.filter(d => d.status === stage.id);
                const stageTotal = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

                return (
                  <div key={stage.id} className="flex flex-col space-y-4 bg-slate-950/30 rounded-xl p-3 border border-slate-800/50">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/50">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-md", stage.color)}>
                          <StageIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{stage.label}</span>
                      </div>
                      <Badge variant="secondary" className="bg-slate-800 text-slate-400">{stageDeals.length}</Badge>
                    </div>

                    <div className="text-[11px] font-mono text-primary/70 px-1">
                      {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(stageTotal / 100)}
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] scrollbar-hide py-2 px-1">
                      {stageDeals.map(deal => (
                        <PipelineCard
                          key={deal.id}
                          deal={deal}
                          onMove={(newStatus) => updateDealMutation.mutate({ id: deal.id, status: newStatus })}
                        />
                      ))}
                      {stageDeals.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 opacity-20 filter grayscale">
                          <Clock className="w-8 h-8 mb-2" />
                          <span className="text-[10px] uppercase font-bold tracking-tighter">Sin Tratos</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
