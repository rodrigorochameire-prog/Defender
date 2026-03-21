"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Upload, FileJson, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ImportarWhatsAppPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    contactsCreated: number;
    contactsUpdated: number;
    messagesImported: number;
    messagesSkipped: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: configs } = trpc.whatsappChat.listConfigs.useQuery();
  const configId = configs?.[0]?.id;

  const importMutation = trpc.whatsappChat.importHistory.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const f = acceptedFiles[0];
    if (f) {
      setFile(f);
      setResult(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/json": [".json"] },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!file || !configId) return;
    const content = await file.text();
    importMutation.mutate({ configId, jsonContent: content });
  };

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/whatsapp/chat">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Importar Histórico WhatsApp</h1>
          <p className="text-sm text-zinc-500">Importe conversas do backup do seu iPhone</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como gerar o arquivo de exportação</CardTitle>
          <CardDescription>Execute os passos abaixo no seu Mac antes de importar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-1">
            <p className="font-medium">1. Fazer backup do iPhone</p>
            <p className="text-zinc-500">
              Conecte o iPhone ao Mac → abra o Finder → selecione o iPhone → clique em{" "}
              <strong>&ldquo;Fazer backup agora&rdquo;</strong> → sem senha (não criptografado).
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-medium">2. Executar o script de extração</p>
            <pre className="bg-zinc-950 text-zinc-100 rounded-md p-3 text-xs overflow-x-auto">
              python3 scripts/extract_whatsapp_ios.py
            </pre>
            <p className="text-zinc-500">
              O arquivo <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">whatsapp-ombuds-export.json</code> será gerado na sua Área de Trabalho.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-medium">3. Fazer upload abaixo</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileJson className="h-10 w-10 text-emerald-600" />
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-zinc-500">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm font-medium">
                  {isDragActive ? "Solte o arquivo aqui" : "Arraste o JSON ou clique para selecionar"}
                </p>
                <p className="text-xs text-zinc-400">whatsapp-ombuds-export.json</p>
              </div>
            )}
          </div>

          {file && !result && (
            <Button
              onClick={handleImport}
              disabled={!configId || importMutation.isPending}
              className="w-full"
            >
              {importMutation.isPending ? "Importando..." : "Iniciar importação"}
            </Button>
          )}

          {!configId && configs !== undefined && (
            <p className="text-xs text-zinc-400 text-center">
              Nenhuma instância WhatsApp configurada
            </p>
          )}

          {importMutation.isPending && (
            <p className="text-xs text-center text-zinc-500 animate-pulse">
              Processando mensagens...
            </p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card className="border-emerald-200 dark:border-emerald-900">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
              <p className="font-medium">Importação concluída</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                <p className="text-2xl font-bold">{result.messagesImported}</p>
                <p className="text-zinc-500 text-xs">mensagens importadas</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                <p className="text-2xl font-bold">{result.contactsCreated}</p>
                <p className="text-zinc-500 text-xs">contatos criados</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                <p className="text-2xl font-bold">{result.contactsUpdated}</p>
                <p className="text-zinc-500 text-xs">contatos atualizados</p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
                <p className="text-2xl font-bold">{result.messagesSkipped}</p>
                <p className="text-zinc-500 text-xs">duplicatas ignoradas</p>
              </div>
            </div>
            <Link href="/admin/whatsapp/chat">
              <Button className="w-full" variant="outline">
                Ver conversas importadas
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
