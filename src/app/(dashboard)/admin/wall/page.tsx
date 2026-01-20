"use client";

import { useState, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Heart,
  MessageCircle,
  Pin,
  Trash2,
  Send,
  Image as ImageIcon,
  Grid3X3,
  List,
  Camera,
  X,
  ZoomIn,
  Paperclip,
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { WallSkeleton } from "@/components/shared/skeletons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

const NEUTRAL_COLORS = ["#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

export default function AdminWall() {
  const [mainTab, setMainTab] = useState("feed");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [viewMode, setViewMode] = useState<"feed" | "gallery">("feed");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: posts, isLoading, refetch } = trpc.wall.posts.useQuery({});
  const { data: pets } = trpc.pets.list.useQuery();

  // Dados para infográficos
  const chartData = useMemo(() => {
    if (!posts) return { timeline: [], engagement: [], stats: { total: 0, likes: 0, comments: 0, images: 0 } };

    // Stats
    let totalLikes = 0;
    let totalComments = 0;
    let totalImages = 0;
    const dailyData: Record<string, { posts: number; likes: number; comments: number }> = {};

    posts.forEach((p: any) => {
      totalLikes += p.post.likesCount || 0;
      totalComments += p.post.commentsCount || 0;
      if (p.post.images && p.post.images.length > 0) totalImages++;

      // Por dia
      const date = new Date(p.post.createdAt);
      const dateKey = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { posts: 0, likes: 0, comments: 0 };
      }
      dailyData[dateKey].posts += 1;
      dailyData[dateKey].likes += p.post.likesCount || 0;
      dailyData[dateKey].comments += p.post.commentsCount || 0;
    });

    const timeline = Object.entries(dailyData).slice(-7).map(([date, data]) => ({
      date,
      posts: data.posts,
      likes: data.likes,
      comments: data.comments,
    }));

    // Engagement por post (top 5)
    const engagement = posts
      .map((p: any) => ({
        title: p.post.content?.slice(0, 20) + "..." || "Post",
        likes: p.post.likesCount || 0,
        comments: p.post.commentsCount || 0,
      }))
      .sort((a: any, b: any) => (b.likes + b.comments) - (a.likes + a.comments))
      .slice(0, 5);

    return {
      timeline,
      engagement,
      stats: {
        total: posts.length,
        likes: totalLikes,
        comments: totalComments,
        images: totalImages,
      }
    };
  }, [posts]);

  const createPost = trpc.wall.createPost.useMutation({
    onSuccess: () => {
      toast.success("Post criado com sucesso!");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao criar post: " + error.message);
    },
  });

  const toggleLike = trpc.wall.toggleLike.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deletePost = trpc.wall.deletePost.useMutation({
    onSuccess: () => {
      toast.success("Post removido!");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao remover post: " + error.message);
    },
  });

  const addComment = trpc.wall.addComment.useMutation({
    onSuccess: () => {
      setComment("");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao adicionar comentário: " + error.message);
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 5) {
      toast.error("Máximo de 5 imagens por post");
      return;
    }
    
    const validFiles = files.filter(file => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} não é uma imagem válida`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} é muito grande (máx. 10MB)`);
        return false;
      }
      return true;
    });

    setSelectedImages(prev => [...prev, ...validFiles]);
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setSelectedImages([]);
    setImagePreviews([]);
  };

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    setIsUploading(true);
    
    try {
      let imageUrl: string | undefined;

      if (selectedImages.length > 0) {
        const file = selectedImages[0];
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        const petId = formData.get("petId") && formData.get("petId") !== "none" 
          ? formData.get("petId") 
          : "0";
        uploadFormData.append("petId", petId as string);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (response.ok) {
          const data = await response.json();
          imageUrl = data.url;
        } else {
          toast.error("Erro ao fazer upload da imagem");
          setIsUploading(false);
          return;
        }
      }

      createPost.mutate({
        content: formData.get("content") as string,
        petId: formData.get("petId") && formData.get("petId") !== "none" 
          ? Number(formData.get("petId")) 
          : undefined,
        visibility: formData.get("visibility") as "all" | "tutors" | "admin",
        imageUrl,
      });
      
      resetForm();
    } catch (error) {
      toast.error("Erro ao processar arquivos");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <WallSkeleton />;
  }

  // Filtrar posts com imagens para a galeria
  const postsWithImages = posts?.filter(p => p.imageUrl) || [];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <MessageCircle />
          </div>
          <div className="page-header-info">
            <h1>Mural</h1>
            <p>Comunicação com tutores</p>
          </div>
        </div>
        <div className="page-header-actions">
          <div className="flex items-center border rounded-lg p-0.5 mr-2">
            <Button
              variant={viewMode === "feed" ? "default" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("feed")}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "gallery" ? "default" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("gallery")}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="btn-sm btn-primary rounded-lg">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Post
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Posts</CardTitle>
            <FileText className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chartData.stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Curtidas</CardTitle>
            <Heart className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chartData.stats.likes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comentários</CardTitle>
            <MessageCircle className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chartData.stats.comments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Imagens</CardTitle>
            <Camera className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chartData.stats.images}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="feed" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Análises
          </TabsTrigger>
        </TabsList>

        {/* Tab: Feed */}
        <TabsContent value="feed" className="space-y-4">
          {/* Gallery View */}
      {viewMode === "gallery" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Galeria de Fotos
            </CardTitle>
            <CardDescription>
              {postsWithImages.length} foto{postsWithImages.length !== 1 ? "s" : ""} compartilhada{postsWithImages.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {postsWithImages.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma foto compartilhada ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {postsWithImages.map((post) => (
                  <div
                    key={post.id}
                    className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer border hover:shadow-lg transition-all"
                    onClick={() => setLightboxImage(post.imageUrl!)}
                  >
                    <img
                      src={post.imageUrl!}
                      alt={post.pet?.name || "Foto"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white font-medium truncate">
                          {post.pet?.name || "Post"}
                        </p>
                        <div className="flex items-center gap-3 text-white/80 text-sm">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {post.likesCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {post.commentsCount}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/90 rounded-full p-1">
                        <ZoomIn className="h-4 w-4 text-gray-700" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Feed View - Posts */}
      {viewMode === "feed" && (!posts || posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhum post no mural
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Criar primeiro post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 max-w-2xl mx-auto">
          {/* Pinned posts first */}
          {posts.map((post) => (
            <Card key={post.id} className={post.isPinned ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{getInitials(post.author?.name || "A")}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{post.author?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.isPinned && (
                      <Badge variant="secondary">
                        <Pin className="h-3 w-3 mr-1" />
                        Fixado
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {post.visibility === "all" ? "Público" : 
                       post.visibility === "tutors" ? "Tutores" : "Admin"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Remover este post?")) {
                          deletePost.mutate({ id: post.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {post.pet && (
                  <Badge variant="secondary" className="mb-2">
                    🐕 {post.pet.name}
                  </Badge>
                )}
                <p className="whitespace-pre-wrap">{post.content}</p>
                {post.imageUrl && (
                  <div 
                    className="mt-3 rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => setLightboxImage(post.imageUrl!)}
                  >
                    <img 
                      src={post.imageUrl} 
                      alt="Post" 
                      className="w-full max-h-96 object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLike.mutate({ postId: post.id })}
                    className={post.userLiked ? "text-red-500" : ""}
                  >
                    <Heart className={`h-4 w-4 mr-1 ${post.userLiked ? "fill-current" : ""}`} />
                    {post.likesCount}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPost(selectedPost === post.id ? null : post.id)}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {post.commentsCount}
                  </Button>
                </div>

                {/* Comments */}
                {selectedPost === post.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Escreva um comentário..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      <Button
                        size="icon"
                        onClick={() => {
                          if (comment.trim()) {
                            addComment.mutate({ postId: post.id, content: comment });
                          }
                        }}
                        disabled={addComment.isPending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setLightboxImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={lightboxImage}
            alt="Foto ampliada"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Create Post Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreatePost}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Novo Post
              </DialogTitle>
              <DialogDescription>
                Crie um post com texto e fotos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo *</Label>
                <Textarea
                  id="content"
                  name="content"
                  placeholder="O que você quer compartilhar?"
                  rows={4}
                  required
                />
              </div>

              {/* Upload de Imagens */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Fotos
                </Label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Adicionar Fotos ({selectedImages.length}/5)
                </Button>
                
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-16 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="petId">Pet relacionado</Label>
                <Select name="petId">
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {pets?.map((pet) => (
                      <SelectItem key={pet.id} value={String(pet.id)}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibilidade *</Label>
                <Select name="visibility" defaultValue="all">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Público (todos)</SelectItem>
                    <SelectItem value="tutors">Apenas tutores</SelectItem>
                    <SelectItem value="admin">Apenas admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPost.isPending || isUploading}>
                {createPost.isPending || isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Publicando...
                  </>
                ) : (
                  "Publicar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
        </TabsContent>

        {/* Tab: Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Atividade por Dia */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Atividade nos Últimos 7 Dias
              </CardTitle>
              <CardDescription>Posts, curtidas e comentários por dia</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.timeline.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                      <Line type="monotone" dataKey="posts" name="Posts" stroke="#475569" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="likes" name="Curtidas" stroke="#64748b" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="comments" name="Comentários" stroke="#94a3b8" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Engajamento por Post */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Posts com Mais Engajamento
              </CardTitle>
              <CardDescription>Top 5 posts por curtidas e comentários</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.engagement.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.engagement} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                      <YAxis type="category" dataKey="title" width={100} stroke="#94a3b8" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="likes" name="Curtidas" fill="#475569" stackId="a" />
                      <Bar dataKey="comments" name="Comentários" fill="#94a3b8" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Métricas de Engajamento */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Heart className="h-6 w-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Média de Curtidas</p>
                    <p className="text-2xl font-bold">
                      {chartData.stats.total > 0 
                        ? (chartData.stats.likes / chartData.stats.total).toFixed(1) 
                        : 0}
                    </p>
                    <p className="text-xs text-muted-foreground">por post</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <MessageCircle className="h-6 w-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Média de Comentários</p>
                    <p className="text-2xl font-bold">
                      {chartData.stats.total > 0 
                        ? (chartData.stats.comments / chartData.stats.total).toFixed(1) 
                        : 0}
                    </p>
                    <p className="text-xs text-muted-foreground">por post</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Camera className="h-6 w-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Imagens</p>
                    <p className="text-2xl font-bold">
                      {chartData.stats.total > 0 
                        ? ((chartData.stats.images / chartData.stats.total) * 100).toFixed(0) 
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">dos posts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
