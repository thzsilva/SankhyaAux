import { useState } from "react";
import { Plus, Search, Building2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { 
  useListClients, 
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  getListClientsQueryKey
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  name: z.string().min(3, { message: "Nome deve ter no mínimo 3 caracteres" }),
  sankhyaCode: z.string().min(1, { message: "Código Sankhya é obrigatório" }),
  cnpj: z.string().min(14, { message: "CNPJ inválido" }),
  phone: z.string().min(10, { message: "Telefone inválido" }),
  email: z.string().email({ message: "E-mail inválido" }),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof formSchema>;

export default function Clients() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<number | null>(null);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);

  const { data: clients, isLoading } = useListClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sankhyaCode: "",
      cnpj: "",
      phone: "",
      email: "",
      notes: "",
    },
  });

  const handleEdit = (client: any) => {
    setEditingClient(client.id);
    form.reset({
      name: client.name,
      sankhyaCode: client.sankhyaCode,
      cnpj: client.cnpj,
      phone: client.phone,
      email: client.email,
      notes: client.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenDialog = () => {
    setEditingClient(null);
    form.reset({
      name: "",
      sankhyaCode: "",
      cnpj: "",
      phone: "",
      email: "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: ClientFormValues) => {
    if (editingClient) {
      updateClient.mutate({
        id: editingClient,
        data: values
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          toast.success("Cliente atualizado com sucesso!");
          setIsDialogOpen(false);
        },
        onError: () => {
          toast.error("Erro ao atualizar cliente.");
        }
      });
    } else {
      createClient.mutate({
        data: values
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          toast.success("Cliente criado com sucesso!");
          setIsDialogOpen(false);
        },
        onError: () => {
          toast.error("Erro ao criar cliente.");
        }
      });
    }
  };

  const handleDelete = () => {
    if (!clientToDelete) return;
    
    deleteClient.mutate({ id: clientToDelete }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        toast.success("Cliente excluído com sucesso!");
        setClientToDelete(null);
      },
      onError: () => {
        toast.error("Erro ao excluir cliente.");
        setClientToDelete(null);
      }
    });
  };

  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    client.sankhyaCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.cnpj.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gestão de clientes integrados ao Sankhya.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={handleOpenDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Editar Cliente" : "Cadastrar Cliente"}</DialogTitle>
              <DialogDescription>
                Preencha os dados do cliente para integração com o ERP.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social / Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Empresa S/A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sankhyaCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cód. Parceiro (Sankhya)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 1045" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <Input placeholder="00.000.000/0000-00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail Contato</FormLabel>
                        <FormControl>
                          <Input placeholder="contato@empresa.com.br" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 0000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Internas (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detalhes sobre SLA, ambiente, versão do banco..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createClient.isPending || updateClient.isPending}>
                    {(createClient.isPending || updateClient.isPending) ? "Salvando..." : "Salvar Cliente"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza? Isso removerá o cliente e pode afetar chamados e liberações vinculadas a ele. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Confirmar Exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="bg-card p-4 rounded-lg border shadow-sm flex items-center">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código ou CNPJ..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Cód. Sankhya</TableHead>
              <TableHead>Razão Social</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[150px] mb-1" />
                    <Skeleton className="h-3 w-[100px]" />
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : filteredClients?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <Building2 className="h-8 w-8 text-muted-foreground mb-2" />
                    Nenhum cliente encontrado.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredClients?.map((client) => (
                <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">#{client.id}</TableCell>
                  <TableCell>
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                      {client.sankhyaCode}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {client.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {client.cnpj}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{client.email}</div>
                    <div className="text-xs text-muted-foreground">{client.phone}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(client.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(client)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          onClick={() => setClientToDelete(client.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}