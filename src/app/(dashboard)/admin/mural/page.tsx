"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Pin,
  ThumbsUp,
  CheckCircle2,
  Eye,
  Send,
  Link2,
  BookOpen,
  Newspaper,
  Scale,
  Filter,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ============================================
// TIPOS
// ============================================

type CategoriaPost = "aviso" | "pergunta" | "lembrete" | "compartilhamento";
type SubcategoriaPost = "artigo" | "jurisprudencia" | "noticia" | null;

interface MuralPost {
  id: number;
  autor: { nome: string; iniciais: string };
  categoria: CategoriaPost;
  subcategoria: SubcategoriaPost;
  conteudo: string;
  metadata?: {
    url?: string;
    titulo?: string;
    trecho?: string;
    tribunal?: string;
    numero?: string;
    ementa?: string;
    fonte?: string;
  };
  isPinned: boolean;
  reacoes: { like: number; check: number; eye: number };
  createdAt: Date;
}

// ============================================
// DADOS MOCK (será substituído por tRPC)
// ============================================

const MOCK_POSTS: MuralPost[] = [
  {
    id: 1,
    autor: { nome: "Rodrigo Meire", iniciais: "RM" },
    categoria: "aviso",
    subcategoria: null,
    conteudo: "Lembrem-se: audiencias de custodia voltam ao formato presencial a partir de marco. Verifiquem as pautas.",
    isPinned: true,
    reacoes: { like: 3, check: 1, eye: 2 },
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 2,
    autor: { nome: "Maria Santos", iniciais: "MS" },
    categoria: "compartilhamento",
    subcategoria: "jurisprudencia",
    conteudo: "Olhem essa decisao, relevante para casos de trafico privilegiado.",
    metadata: {
      tribunal: "STJ",
      numero: "REsp 1.234.567/BA",
      ementa: "Trafico de drogas. Dosimetria. Natureza e quantidade da droga. Minorante do art. 33, par. 4o, da Lei 11.343/2006.",
    },
    isPinned: false,
    reacoes: { like: 5, check: 2, eye: 3 },
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: 3,
    autor: { nome: "Pedro Alves", iniciais: "PA" },
    categoria: "pergunta",
    subcategoria: null,
    conteudo: "@Rodrigo O assistido Joao Silva ligou sobre a execucao penal. Pode orientar sobre o pedido de progressao?",
    isPinned: false,
    reacoes: { like: 0, check: 0, eye: 1 },
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: 4,
    autor: { nome: "Rodrigo Meire", iniciais: "RM" },
    categoria: "compartilhamento",
    subcategoria: "noticia",
    conteudo: "Nova lei sancionada sobre monitoramento eletronico.",
    metadata: {
      url: "https://exemplo.com/noticia",
      titulo: "Governo sanciona lei que altera regras de monitoramento eletronico",
      fonte: "Agencia Brasil",
    },
    isPinned: false,
    reacoes: { like: 2, check: 0, eye: 4 },
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
];

// ============================================
// COMPONENTES
// ============================================

const CATEGORIA_CONFIG: Record<CategoriaPost, { label: string; color: string; bgColor: string }> = {
  aviso: { label: "Aviso", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  pergunta: { label: "Pergunta", color: "text-sky-600 dark:text-sky-400", bgColor: "bg-sky-100 dark:bg-sky-900/30" },
  lembrete: { label: "Lembrete", color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-100 dark:bg-violet-900/30" },
  compartilhamento: { label: "Compartilhamento", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
};

function PostCard({ post }: { post: MuralPost }) {
  const catConfig = CATEGORIA_CONFIG[post.categoria];
  const timeAgo = formatTimeAgo(post.createdAt);

  return (
    <Card className={cn(
      "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden transition-all duration-200",
      "hover:border-emerald-200/50 dark:hover:border-emerald-800/30",
      post.isPinned && "ring-1 ring-amber-200 dark:ring-amber-800/50"
    )}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                {post.autor.iniciais}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", catConfig.bgColor, catConfig.color)}>
                  {catConfig.label}
                </span>
                {post.subcategoria && (
                  <span className="text-[10px] text-zinc-400">
                    ({post.subcategoria === "jurisprudencia" ? "Jurisprudencia" : post.subcategoria === "artigo" ? "Artigo" : "Noticia"})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{post.autor.nome}</span>
                <span className="text-[10px] text-zinc-400">·</span>
                <span className="text-[10px] text-zinc-400">{timeAgo}</span>
              </div>
            </div>
          </div>
          {post.isPinned && (
            <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          )}
        </div>

        {/* Metadata card (jurisprudencia/noticia) */}
        {post.metadata && post.subcategoria === "jurisprudencia" && (
          <div className="mb-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50">
            <div className="flex items-center gap-2 mb-1.5">
              <Scale className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {post.metadata.tribunal} - {post.metadata.numero}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
              {post.metadata.ementa}
            </p>
          </div>
        )}

        {post.metadata && post.subcategoria === "noticia" && (
          <div className="mb-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Newspaper className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {post.metadata.titulo}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">{post.metadata.fonte}</p>
          </div>
        )}

        {/* Content */}
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          {post.conteudo}
        </p>

        {/* Reactions */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
          <button className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-emerald-500 transition-colors cursor-pointer">
            <ThumbsUp className="w-3 h-3" />
            {post.reacoes.like > 0 && <span>{post.reacoes.like}</span>}
          </button>
          <button className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-emerald-500 transition-colors cursor-pointer">
            <CheckCircle2 className="w-3 h-3" />
            {post.reacoes.check > 0 && <span>{post.reacoes.check}</span>}
          </button>
          <button className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-emerald-500 transition-colors cursor-pointer">
            <Eye className="w-3 h-3" />
            {post.reacoes.eye > 0 && <span>{post.reacoes.eye}</span>}
          </button>
        </div>
      </div>
    </Card>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `ha ${diffMin}min`;
  if (diffH < 24) return `ha ${diffH}h`;
  if (diffD < 7) return `ha ${diffD} dia${diffD > 1 ? "s" : ""}`;
  return format(date, "dd/MM", { locale: ptBR });
}

// ============================================
// PAGE
// ============================================

export default function MuralPage() {
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaPost | "todos">("todos");
  const [novoPost, setNovoPost] = useState("");
  const [novaCategoria, setNovaCategoria] = useState<CategoriaPost>("aviso");

  const pinnedPosts = MOCK_POSTS.filter(p => p.isPinned);
  const recentPosts = MOCK_POSTS
    .filter(p => !p.isPinned)
    .filter(p => filtroCategoria === "todos" || p.categoria === filtroCategoria);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <MessageSquare className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight font-serif">Mural da Equipe</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Comunicacao e compartilhamento</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
        {/* Novo Post */}
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1">
              {(["aviso", "pergunta", "lembrete", "compartilhamento"] as CategoriaPost[]).map((cat) => {
                const config = CATEGORIA_CONFIG[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setNovaCategoria(cat)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer",
                      novaCategoria === cat
                        ? `${config.bgColor} ${config.color}`
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    )}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="O que deseja compartilhar com a equipe?"
              value={novoPost}
              onChange={(e) => setNovoPost(e.target.value)}
              rows={2}
              className="flex-1 text-sm bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 resize-none focus:ring-emerald-500/20 focus:border-emerald-300 dark:focus:border-emerald-700"
            />
            <Button
              size="sm"
              className="h-auto px-3 bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-emerald-500 text-white"
              disabled={!novoPost.trim()}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
          {novaCategoria === "compartilhamento" && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-emerald-500 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <BookOpen className="w-3 h-3" />
                Artigo
              </button>
              <button className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-emerald-500 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <Scale className="w-3 h-3" />
                Jurisprudencia
              </button>
              <button className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-emerald-500 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <Newspaper className="w-3 h-3" />
                Noticia
              </button>
            </div>
          )}
        </Card>

        {/* Filtros */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-400" />
          {(["todos", "aviso", "pergunta", "compartilhamento"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFiltroCategoria(cat)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer",
                filtroCategoria === cat
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                  : "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              {cat === "todos" ? "Todos" : CATEGORIA_CONFIG[cat].label}
            </button>
          ))}
        </div>

        {/* Fixados */}
        {pinnedPosts.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Fixados</p>
            <div className="space-y-3">
              {pinnedPosts.map(post => <PostCard key={post.id} post={post} />)}
            </div>
          </div>
        )}

        {/* Recentes */}
        <div>
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Recentes</p>
          <div className="space-y-3">
            {recentPosts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
