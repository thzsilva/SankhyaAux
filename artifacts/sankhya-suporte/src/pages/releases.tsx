import { useState } from "react";
import { Plus, Search, Filter, MoreHorizontal, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { 
  useListReleases, 
  useCreateRelease,
  useUpdateRelease,
  getListReleasesQueryKey,
  useListClients
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
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  clientId: z.string().min(1, { message: "Selecione um cliente" }),
  requestedBy: z.string().min(3, { message: "Nome do solicitante é obrigatório" }),
  description: z.string().min(10, { message: "Descrição deve ter no mínimo 10 caracteres" }),
  status: z.string().optional(),
});

type ReleaseFormValues = z.infer<typeof formSchema>;

export default function Releases() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: releases, isLoading } = useListReleases();
  const { data: clients } = useListClients();
  const createRelease = useCreateRelease();
  const updateRelease = useUpdateRelease();

  const form = useForm<ReleaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      requestedBy: "",
      description: "",
      status: "pendente",
    },
  });

  const onSubmit = (values: ReleaseFormValues) => {
    createRelease.mutate({
      data: {
        clientId: parseInt(values.clientId),
        requestedBy: values.requestedBy,
        description: values.description,
        status: values.status || "pendente",
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReleasesQueryKey() });
        toast.success("Liberação solicitada com sucesso!");
        setIsDialogOpen(false);
        form.reset();
      },
      onError: () => {
        toast.error("Erro ao solicitar liberação.");
      }
    });
  };

  const handleUpdateStatus = (id: number, status: string) => {
    updateRelease.mutate({
      id,
      data: { status }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListReleasesQueryKey() });
        toast.success(`Status da liberação alterado para ${status}.`);
      },
      onError: () => {
        toast.error("Erro ao alterar status da liberação.");
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "aprovada": return <Badge variant="default" className="bg-primary hover:bg-primary/90">Aprovada</Badge>;
      case "pendente": return <Badge variant="outline" className="text-chart-3 border-chart-3 bg-chart-3/10">Pendente</Badge>;
      case "rejeitada": return <Badge variant="destructive">Rejeitada</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredReleases = releases?.filter(release => {
    const matchesSearch = release.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          release.requestedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          release.id.toString().includes(searchQuery);
    
    const matchesStatus = statusFilter === "all" || release.status.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liberações</h1>
          <p className="text-muted-foreground mt-1">Controle de solicitações de liberação no sistema.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Liberação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Solicitar Nova Liberação</DialogTitle>
              <DialogDescription>
                Preencha os dados para registrar uma nova solicitação de liberação.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.map(client => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name} - {client.sankhyaCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requestedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Solicitante</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome de quem solicitou a liberação" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo / Descrição da Liberação</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detalhes da solicitação..."
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
                  <Button type="submit" disabled={createRelease.isPending}>
                    {createRelease.isPending ? "Salvando..." : "Solicitar Liberação"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID, cliente ou solicitante..."
            className="pl-9 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Status</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovada">Aprovada</SelectItem>
              <SelectItem value="rejeitada">Rejeitada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Solicitação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : filteredReleases?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Nenhuma liberação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredReleases?.map((release) => (
                <TableRow key={release.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">#{release.id}</TableCell>
                  <TableCell className="font-medium text-foreground">
                    {release.clientName}
                  </TableCell>
                  <TableCell>
                    {release.requestedBy}
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate text-muted-foreground" title={release.description}>
                    {release.description}
                  </TableCell>
                  <TableCell>{getStatusBadge(release.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(release.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
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
                        <DropdownMenuLabel>Mudar Status</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(release.id, "pendente")}>
                          <Clock className="mr-2 h-4 w-4 text-chart-3" />
                          Pendente
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUpdateStatus(release.id, "aprovada")}>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
                          Aprovar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(release.id, "rejeitada")}>
                          <XCircle className="mr-2 h-4 w-4 text-destructive" />
                          Rejeitar
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