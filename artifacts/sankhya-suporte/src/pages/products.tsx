import { useState } from "react";
import { Plus, Search, Filter, PackageOpen, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { 
  useListProducts, 
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  code: z.string().min(1, { message: "Código é obrigatório" }),
  name: z.string().min(3, { message: "Nome deve ter no mínimo 3 caracteres" }),
  description: z.string().optional(),
  unit: z.string().min(1, { message: "Unidade é obrigatória" }),
  unitPrice: z.coerce.number().min(0, { message: "Preço deve ser maior ou igual a 0" }),
  stock: z.coerce.number().min(0, { message: "Estoque deve ser maior ou igual a 0" }),
  category: z.string().min(1, { message: "Categoria é obrigatória" }),
  sankhyaCode: z.string().optional(),
});

type ProductFormValues = z.infer<typeof formSchema>;

export default function Products() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);

  const { data: products, isLoading } = useListProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      unit: "UN",
      unitPrice: 0,
      stock: 0,
      category: "Geral",
      sankhyaCode: "",
    },
  });

  const categories = Array.from(new Set(products?.map(p => p.category) || [])).filter(Boolean);

  const handleEdit = (product: any) => {
    setEditingProduct(product.id);
    form.reset({
      code: product.code,
      name: product.name,
      description: product.description || "",
      unit: product.unit,
      unitPrice: product.unitPrice,
      stock: product.stock,
      category: product.category,
      sankhyaCode: product.sankhyaCode || "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenDialog = () => {
    setEditingProduct(null);
    form.reset({
      code: "",
      name: "",
      description: "",
      unit: "UN",
      unitPrice: 0,
      stock: 0,
      category: "Geral",
      sankhyaCode: "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: ProductFormValues) => {
    if (editingProduct) {
      updateProduct.mutate({
        id: editingProduct,
        data: values
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          toast.success("Produto atualizado com sucesso!");
          setIsDialogOpen(false);
        },
        onError: () => {
          toast.error("Erro ao atualizar produto.");
        }
      });
    } else {
      createProduct.mutate({
        data: values
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          toast.success("Produto criado com sucesso!");
          setIsDialogOpen(false);
        },
        onError: () => {
          toast.error("Erro ao criar produto.");
        }
      });
    }
  };

  const handleDelete = () => {
    if (!productToDelete) return;
    
    deleteProduct.mutate({ id: productToDelete }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        toast.success("Produto excluído com sucesso!");
        setProductToDelete(null);
      },
      onError: () => {
        toast.error("Erro ao excluir produto.");
        setProductToDelete(null);
      }
    });
  };

  const filteredProducts = products?.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground mt-1">Catálogo e movimentações de produtos integrados.</p>
        </div>
        
        <Button onClick={handleOpenDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Produto" : "Cadastrar Produto"}</DialogTitle>
            <DialogDescription>
              Preencha os dados do produto para sincronização.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Interno</FormLabel>
                      <FormControl>
                        <Input placeholder="PRD-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sankhyaCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cód. Sankhya (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 5020" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome descritivo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Hardware" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade</FormLabel>
                      <FormControl>
                        <Input placeholder="UN, KG, PC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estoque</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Unitário (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
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
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detalhes adicionais..."
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
                <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                  {(createProduct.isPending || updateProduct.isPending) ? "Salvando..." : "Salvar Produto"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
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

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código..."
            className="pl-9 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Categoria</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-border">
              <TableHead className="w-[100px]">Código</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[200px] mb-1" />
                    <Skeleton className="h-3 w-[150px]" />
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : filteredProducts?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <PackageOpen className="h-8 w-8 text-muted-foreground mb-2" />
                    Nenhum produto encontrado.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts?.map((product) => (
                <TableRow key={product.id} className="hover:bg-muted/30 transition-colors border-b-border/50">
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">
                      {product.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{product.name}</div>
                    {product.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">
                        {product.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground">
                      {product.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(product.unitPrice)}
                    <span className="text-xs text-muted-foreground ml-1">/{product.unit}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-medium ${product.stock <= 0 ? 'text-destructive' : 'text-primary'}`}>
                      {product.stock}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(product)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:bg-destructive/10"
                          onClick={() => setProductToDelete(product.id)}
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card p-4 rounded-lg border">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))
        ) : filteredProducts?.length === 0 ? (
          <div className="bg-card p-8 rounded-lg border text-center text-muted-foreground">
            <PackageOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Nenhum produto encontrado.
          </div>
        ) : (
          filteredProducts?.map((product) => (
            <div key={product.id} className="bg-card p-4 rounded-lg border relative group">
              <div className="flex justify-between items-start mb-2">
                <div className="pr-8">
                  <div className="font-mono text-[10px] text-muted-foreground mb-1">{product.code}</div>
                  <h3 className="font-semibold text-foreground">{product.name}</h3>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 absolute top-3 right-3">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(product)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive focus:bg-destructive/10"
                      onClick={() => setProductToDelete(product.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {product.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{product.description}</p>
              )}
              
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-secondary text-secondary-foreground text-[10px] px-2 py-0.5 rounded-full font-medium">
                  {product.category}
                </span>
              </div>
              
              <div className="flex justify-between items-end pt-3 border-t border-border/50">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Estoque</span>
                  <span className={`text-sm font-bold ${product.stock <= 0 ? 'text-destructive' : 'text-primary'}`}>
                    {product.stock} {product.unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Preço Unit.</span>
                  <span className="text-sm font-bold">{formatCurrency(product.unitPrice)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
