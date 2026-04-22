import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MessageSquare, 
  User, 
  Building, 
  Tag, 
  AlertCircle,
  Save,
  Trash2
} from "lucide-react";

import { 
  useGetTicket, 
  useUpdateTicket, 
  useDeleteTicket,
  getGetTicketQueryKey,
  getListTicketsQueryKey
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function TicketDetail() {
  const [, params] = useRoute("/chamados/:id");
  const [, setLocation] = useLocation();
  const ticketId = params?.id ? parseInt(params.id) : 0;
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    status: string;
    priority: string;
    sector: string;
    assignedTo: string;
    description: string;
  } | null>(null);

  const { data: ticket, isLoading } = useGetTicket(ticketId, {
    query: {
      enabled: !!ticketId,
      queryKey: getGetTicketQueryKey(ticketId)
    }
  });

  const updateTicket = useUpdateTicket();
  const deleteTicket = useDeleteTicket();

  const handleEdit = () => {
    if (ticket) {
      setEditForm({
        status: ticket.status,
        priority: ticket.priority,
        sector: ticket.sector,
        assignedTo: ticket.assignedTo || "",
        description: ticket.description,
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!editForm) return;

    updateTicket.mutate({
      id: ticketId,
      data: {
        status: editForm.status,
        priority: editForm.priority,
        sector: editForm.sector,
        assignedTo: editForm.assignedTo || null,
        description: editForm.description,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTicketQueryKey(ticketId) });
        queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
        toast.success("Chamado atualizado com sucesso!");
        setIsEditing(false);
      },
      onError: () => {
        toast.error("Erro ao atualizar chamado.");
      }
    });
  };

  const handleDelete = () => {
    deleteTicket.mutate({ id: ticketId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTicketsQueryKey() });
        toast.success("Chamado excluído com sucesso!");
        setLocation("/chamados");
      },
      onError: () => {
        toast.error("Erro ao excluir chamado.");
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "aberto": return <Badge variant="destructive">Aberto</Badge>;
      case "em_andamento": return <Badge variant="default" className="bg-primary hover:bg-primary/90">Em Andamento</Badge>;
      case "aguardando": return <Badge variant="outline" className="text-chart-3 border-chart-3">Aguardando</Badge>;
      case "fechado": return <Badge variant="secondary" className="bg-chart-4/20 text-chart-4 hover:bg-chart-4/30">Fechado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "baixa": return <Badge variant="outline" className="text-chart-4 border-chart-4">Baixa</Badge>;
      case "media": return <Badge variant="outline" className="text-chart-3 border-chart-3">Média</Badge>;
      case "alta": return <Badge variant="outline" className="text-chart-2 border-chart-2">Alta</Badge>;
      case "urgente": return <Badge variant="destructive">Urgente</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[400px] w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Chamado não encontrado</h2>
        <p className="text-muted-foreground mt-2 mb-6">O chamado que você está tentando acessar não existe ou foi excluído.</p>
        <Button onClick={() => setLocation("/chamados")}>Voltar para a lista</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/chamados")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">#{ticket.id} - {ticket.title}</h1>
            {!isEditing && getStatusBadge(ticket.status)}
            {!isEditing && getPriorityBadge(ticket.priority)}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Aberto em {format(new Date(ticket.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })} por {ticket.openedBy}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {!isEditing ? (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Chamado</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir este chamado? Esta ação não pode ser desfeita.
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
              <Button onClick={handleEdit}>Editar Chamado</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={updateTicket.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateTicket.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card rounded-lg border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Descrição do Problema
            </h2>
            {isEditing && editForm ? (
              <Textarea 
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                className="min-h-[200px]"
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.description}</p>
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Atualizações e Comentários</h2>
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhum comentário adicionado.</p>
              <Button variant="outline" className="mt-4" size="sm">Adicionar Comentário</Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-lg border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Detalhes</h2>
            
            <div className="space-y-4">
              {isEditing && editForm ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="h-3 w-3" /> Status
                    </label>
                    <Select value={editForm.status} onValueChange={(v) => setEditForm({...editForm, status: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="aguardando">Aguardando</SelectItem>
                        <SelectItem value="fechado">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <Tag className="h-3 w-3" /> Prioridade
                    </label>
                    <Select value={editForm.priority} onValueChange={(v) => setEditForm({...editForm, priority: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <Building className="h-3 w-3" /> Setor
                    </label>
                    <Select value={editForm.sector} onValueChange={(v) => setEditForm({...editForm, sector: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Suporte">Suporte</SelectItem>
                        <SelectItem value="Implantação">Implantação</SelectItem>
                        <SelectItem value="Desenvolvimento">Desenvolvimento</SelectItem>
                        <SelectItem value="Infraestrutura">Infraestrutura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <User className="h-3 w-3" /> Atribuído a
                    </label>
                    <Input 
                      value={editForm.assignedTo} 
                      onChange={(e) => setEditForm({...editForm, assignedTo: e.target.value})}
                      placeholder="Nome do técnico"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-2 mb-1">
                      <Building className="h-3 w-3" /> Cliente
                    </span>
                    <p className="text-sm font-medium">{ticket.clientName || "Cliente Interno"}</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-2 mb-1">
                      <Tag className="h-3 w-3" /> Setor Responsável
                    </span>
                    <p className="text-sm font-medium">{ticket.sector}</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-2 mb-1">
                      <User className="h-3 w-3" /> Atribuído a
                    </span>
                    <p className="text-sm font-medium">{ticket.assignedTo || "Não atribuído"}</p>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-2 mb-1">
                      <Calendar className="h-3 w-3" /> Última Atualização
                    </span>
                    <p className="text-sm font-medium">{format(new Date(ticket.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                  </div>
                  {ticket.closedAt && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-2 mb-1">
                          <Clock className="h-3 w-3" /> Fechado em
                        </span>
                        <p className="text-sm font-medium">{format(new Date(ticket.closedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}