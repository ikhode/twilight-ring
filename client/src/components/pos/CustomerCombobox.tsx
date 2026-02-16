import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerComboboxProps {
    value: string;
    setValue: (val: string) => void;
    customers: any[];
    labels: { default: string; client: string;[key: string]: any };
}

export function CustomerCombobox({ value, setValue, customers, labels }: CustomerComboboxProps) {
    const [open, setOpen] = useState(false);

    // Find selected name
    const selectedName = value
        ? customers.find((c) => c.id === value)?.name
        : labels.default;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal bg-background border-input hover:bg-accent hover:text-accent-foreground h-10 px-3 py-2"
                >
                    <div className="flex flex-col items-start truncate">
                        <span className="truncate">{value ? selectedName : labels.default}</span>
                        {!value && <span className="text-[10px] text-muted-foreground opacity-70">RFC: XAXX010101000</span>}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Buscar ${labels.client.toLowerCase()}...`} />
                    <CommandList>
                        <CommandEmpty>No se encontró.</CommandEmpty>
                        <CommandGroup heading="Opciones Rápidas">
                            <CommandItem
                                value="generic"
                                onSelect={() => {
                                    setValue("");
                                    setOpen(false);
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === "" ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <div className="flex flex-col">
                                    <span>{labels.default}</span>
                                    <span className="text-[10px] text-muted-foreground">XAXX010101000</span>
                                </div>
                            </CommandItem>
                        </CommandGroup>
                        <CommandGroup heading="Registrados">
                            {customers.map((customer) => (
                                <CommandItem
                                    key={customer.id}
                                    value={customer.name}
                                    onSelect={() => {
                                        setValue(customer.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === customer.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {customer.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
