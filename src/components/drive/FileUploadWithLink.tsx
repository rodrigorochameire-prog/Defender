"use client";

import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  Loader2,
  Check,
  ChevronsUpDown,
  X,
  Link,
  User,
  Scale,
  FolderOpen,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileUploadWithLinkProps {
  folderId: string;
  onUploadComplete?: (file: { id: string; name: string }) => void;
  defaultProcessoId?: number;
  defaultAssistidoId?: number;
  trigger?: React.ReactNode;
  className?: string;
}

export function FileUploadWithLink({
  folderId,
  onUploadComplete,
  defaultProcessoId,
  defaultAssistidoId,
  trigger,
  className,
}: FileUploadWithLinkProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Vinculação
  const [processoId, setProcessoId] = useState<number | undefined>(defaultProcessoId);
  const [assistidoId, setAssistidoId] = useState<number | undefined>(defaultAssistidoId);
  const [processoSearch, setProcessoSearch] = useState("");
  const [assistidoSearch, setAssistidoSearch] = useState("");
  const [processoOpen, setProcessoOpen] = useState(false);
  const [assistidoOpen, setAssistidoOpen] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState<{
    id: number;
    numero: string;
    assistidoNome: string | null;
  } | null>(null);
  const [selectedAssistido, setSelectedAssistido] = useState<{
    id: number;
    nome: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries para busca
  const { data: processos } = trpc.drive.searchProcessosForLink.useQuery(
    { search: processoSearch },
    { enabled: processoSearch.length >= 2 }
  );

  const { data: assistidosData } = trpc.drive.searchAssistidosForLink.useQuery(
    { search: assistidoSearch },
    { enabled: assistidoSearch.length >= 2 }
  );

  // Mutation de upload
  const uploadMutation = trpc.drive.uploadWithLink.useMutation({
    onSuccess: (data) => {
      toast.success("Arquivo enviado com sucesso!");
      setOpen(false);
      resetForm();
      onUploadComplete?.(data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFile(null);
    setDescription("");
    setUploadProgress(0);
    if (!defaultProcessoId) {
      setProcessoId(undefined);
      setSelectedProcesso(null);
    }
    if (!defaultAssistidoId) {
      setAssistidoId(undefined);
      setSelectedAssistido(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      // Converter para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
          setUploadProgress(50);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setUploadProgress(70);

      await uploadMutation.mutateAsync({
        folderId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileBase64: base64,
        description: description || undefined,
        processoId,
        assistidoId,
      });

      setUploadProgress(100);
    } catch (error) {
      console.error("Erro no upload:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSelectProcesso = (processo: {
    id: number;
    numero: string;
    assistidoNome: string | null;
    assistidoId: number | null;
  }) => {
    setProcessoId(processo.id);
    setSelectedProcesso(processo);
    // Auto-preenche o assistido se o processo tiver um
    if (processo.assistidoId && processo.assistidoNome) {
      setAssistidoId(processo.assistidoId);
      setSelectedAssistido({
        id: processo.assistidoId,
        nome: processo.assistidoNome,
      });
    }
    setProcessoOpen(false);
  };

  const handleSelectAssistido = (assistido: { id: number; nome: string }) => {
    setAssistidoId(assistido.id);
    setSelectedAssistido(assistido);
    setAssistidoOpen(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className={className}>
            <Upload className="h-4 w-4 mr-2" />
            Upload com Vinculação
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Enviar Arquivo para o Drive
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo e vincule a um processo ou assistido
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Área de drop */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              file
                ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
            )}
          >
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-12 w-12 text-green-600" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {file.name}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remover
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-zinc-500">
                <Upload className="h-12 w-12" />
                <p>Arraste um arquivo ou clique para selecionar</p>
                <p className="text-xs">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              placeholder="Adicione uma descrição ao arquivo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Vinculação ao Processo */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Vincular a Processo
            </Label>
            <Popover open={processoOpen} onOpenChange={setProcessoOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={processoOpen}
                  className="w-full justify-between"
                  disabled={!!defaultProcessoId}
                >
                  {selectedProcesso ? (
                    <span className="flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      {selectedProcesso.numero}
                      {selectedProcesso.assistidoNome && (
                        <Badge variant="outline" className="text-xs">
                          {selectedProcesso.assistidoNome}
                        </Badge>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Buscar processo...
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput
                    placeholder="Digite o número ou nome do assistido..."
                    value={processoSearch}
                    onValueChange={setProcessoSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {processoSearch.length < 2
                        ? "Digite pelo menos 2 caracteres..."
                        : "Nenhum processo encontrado."}
                    </CommandEmpty>
                    <CommandGroup>
                      {processos?.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={`${p.numero} ${p.assistidoNome || ""}`}
                          onSelect={() => handleSelectProcesso(p)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              processoId === p.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-mono text-sm">{p.numero}</span>
                            {p.assistidoNome && (
                              <span className="text-xs text-muted-foreground">
                                {p.assistidoNome}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedProcesso && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setProcessoId(undefined);
                  setSelectedProcesso(null);
                }}
                disabled={!!defaultProcessoId}
              >
                <X className="h-3 w-3 mr-1" />
                Remover vinculação
              </Button>
            )}
          </div>

          {/* Vinculação ao Assistido */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Vincular a Assistido
            </Label>
            <Popover open={assistidoOpen} onOpenChange={setAssistidoOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={assistidoOpen}
                  className="w-full justify-between"
                  disabled={!!defaultAssistidoId}
                >
                  {selectedAssistido ? (
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedAssistido.nome}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Buscar assistido...
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput
                    placeholder="Digite o nome ou CPF..."
                    value={assistidoSearch}
                    onValueChange={setAssistidoSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {assistidoSearch.length < 2
                        ? "Digite pelo menos 2 caracteres..."
                        : "Nenhum assistido encontrado."}
                    </CommandEmpty>
                    <CommandGroup>
                      {assistidosData?.map((a) => (
                        <CommandItem
                          key={a.id}
                          value={`${a.nome} ${a.cpf || ""}`}
                          onSelect={() => handleSelectAssistido(a)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              assistidoId === a.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{a.nome}</span>
                            {a.cpf && (
                              <span className="text-xs text-muted-foreground">
                                CPF: {a.cpf}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedAssistido && !processoId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAssistidoId(undefined);
                  setSelectedAssistido(null);
                }}
                disabled={!!defaultAssistidoId}
              >
                <X className="h-3 w-3 mr-1" />
                Remover vinculação
              </Button>
            )}
          </div>

          {/* Resumo da vinculação */}
          {(processoId || assistidoId) && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <Link className="h-4 w-4" />
                O arquivo será vinculado a:
              </p>
              <ul className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                {selectedProcesso && (
                  <li className="flex items-center gap-1">
                    <Scale className="h-3 w-3" />
                    Processo: {selectedProcesso.numero}
                  </li>
                )}
                {selectedAssistido && (
                  <li className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Assistido: {selectedAssistido.nome}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Progresso do upload */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                Enviando arquivo... {uploadProgress}%
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Enviar Arquivo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
