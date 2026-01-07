import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, MessageCircle, Smile, Laugh, Frown, Send, Image as ImageIcon, X, Trash2, Users, User, Dog } from "lucide-react";
import { toast } from "sonner";

interface WallFeedProps {
  petId?: number;
}

export function WallFeed({ petId }: WallFeedProps) {
  const { data: user } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [targetType, setTargetType] = useState<"general" | "tutor" | "pet">("general");
  const [targetId, setTargetId] = useState<number | undefined>();
  const [filterType, setFilterType] = useState<"all" | "general" | "tutor" | "pet">("all");
  
  const { data: tutors } = trpc.tutors.list.useQuery({ page: 1, limit: 100 });
  const { data: pets } = trpc.pets.list.useQuery();
  
  const { data: posts, isLoading } = trpc.wall.getPosts.useQuery({ 
    petId, 
    limit: 20,
    targetType: filterType === "all" ? undefined : filterType 
  });
  
  const createPostMutation = trpc.wall.createPost.useMutation({
    onSuccess: () => {
      utils.wall.getPosts.invalidate();
      setNewPostContent("");
      setSelectedFiles([]);
      toast.success("Post publicado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao publicar: ${error.message}`);
    },
  });
  
  const addCommentMutation = trpc.wall.addComment.useMutation({
    onSuccess: () => {
      utils.wall.getPosts.invalidate();
      setCommentText("");
      toast.success("Comentário adicionado!");
    },
  });
  
  const addReactionMutation = trpc.wall.addReaction.useMutation({
    onSuccess: () => {
      utils.wall.getPosts.invalidate();
    },
  });
  
  const deletePostMutation = trpc.wall.deletePost.useMutation({
    onSuccess: () => {
      utils.wall.getPosts.invalidate();
      setSelectedPost(null);
      toast.success("Post excluído!");
    },
  });
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 10) {
      toast.error("Máximo de 10 fotos por post");
      return;
    }
    setSelectedFiles([...selectedFiles, ...files]);
  };
  
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };
  
  const handleCreatePost = async () => {
    if (!newPostContent.trim() && selectedFiles.length === 0) {
      toast.error("Adicione texto ou fotos ao post");
      return;
    }

    try {
      const mediaData: string[] = [];

      for (const file of selectedFiles) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`Arquivo ${file.name} não é uma imagem válida`);
          return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Arquivo ${file.name} é muito grande (máx. 10MB)`);
          return;
        }

        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
          reader.readAsDataURL(file);
        });
        mediaData.push(base64);
      }

      await createPostMutation.mutateAsync({
        petId,
        content: newPostContent || undefined,
        mediaData: mediaData.length > 0 ? mediaData : undefined,
        postType: mediaData.length > 0 ? "photo" : "text",
        targetType,
        targetId,
      });

      // Reset target after post
      setTargetType("general");
      setTargetId(undefined);
    } catch (error) {
      toast.error("Erro ao processar as imagens");
      console.error("Upload error:", error);
    }
  };
  
  const handleAddComment = (postId: number) => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate({ postId, comment: commentText });
  };
  
  const handleReaction = (postId: number, reactionType: "like" | "love" | "laugh" | "wow" | "sad") => {
    addReactionMutation.mutate({ postId, reactionType });
  };
  
  const handleDeletePost = (postId: number) => {
    if (confirm("Tem certeza que deseja excluir este post?")) {
      deletePostMutation.mutate({ postId });
    }
  };
  
  const reactionIcons = {
    like: "❤️",
    love: "🐾",
    laugh: "😂",
    wow: "😮",
    sad: "😢",
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Create Post Card */}
      {user && (
        <Card className="p-6">
          <div className="space-y-4">
            <Textarea
              placeholder="Compartilhe algo sobre o dia na creche..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="min-h-[100px]"
            />
                     {selectedFiles.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      className="w-full h-24 object-cover rounded"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Target Selector */}
            {user?.role === "admin" && (
              <div className="flex gap-2 items-center p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Destinatário:</span>
                <Select value={targetType} onValueChange={(v: any) => { setTargetType(v); setTargetId(undefined); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Geral (Todos)
                      </div>
                    </SelectItem>
                    <SelectItem value="tutor">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Tutor Específico
                      </div>
                    </SelectItem>
                    <SelectItem value="pet">
                      <div className="flex items-center gap-2">
                        <Dog className="h-4 w-4" />
                        Pet Específico
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {targetType === "tutor" && tutors && (
                  <Select value={targetId?.toString()} onValueChange={(v) => setTargetId(parseInt(v))}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Selecione o tutor" />
                    </SelectTrigger>
                    <SelectContent>
                      {tutors.tutors?.map((tutor: any) => (
                        <SelectItem key={tutor.id} value={tutor.id.toString()}>
                          {tutor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {targetType === "pet" && pets && (
                  <Select value={targetId?.toString()} onValueChange={(v) => setTargetId(parseInt(v))}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Selecione o pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet: any) => (
                        <SelectItem key={pet.id} value={pet.id.toString()}>
                          {pet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between gap-2">
              <div>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  id="post-media"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => document.getElementById('post-media')?.click()}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Adicionar Fotos/Vídeos
                </Button>
              </div>
              
              <Button
                onClick={handleCreatePost}
                disabled={createPostMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Publicar
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {/* Filter Buttons */}
      <div className="flex gap-2 items-center p-4 bg-card rounded-lg border">
        <span className="text-sm font-medium text-muted-foreground">Filtrar:</span>
        <div className="flex gap-2">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
          >
            <Users className="h-4 w-4 mr-2" />
            Todos
          </Button>
          <Button
            variant={filterType === "general" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("general")}
          >
            <Users className="h-4 w-4 mr-2" />
            Gerais
          </Button>
          {user?.role === "admin" && (
            <>
              <Button
                variant={filterType === "tutor" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("tutor")}
              >
                <User className="h-4 w-4 mr-2" />
                Privados (Tutor)
              </Button>
              <Button
                variant={filterType === "pet" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("pet")}
              >
                <Dog className="h-4 w-4 mr-2" />
                Privados (Pet)
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Posts Feed */}
      <div className="space-y-4">
        {posts && posts.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum post ainda. Seja o primeiro a compartilhar!</p>
          </Card>
        )}
        
        {posts?.map((post: any) => (
          <Card key={post.id} className="p-6">
            {/* Post Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 bg-orange-100 flex items-center justify-center">
                  <span className="text-orange-600 font-semibold">
                    {post.authorName?.charAt(0) || "U"}
                  </span>
                </Avatar>
                <div>
                  <p className="font-semibold">{post.authorName || "Usuário"}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{new Date(post.createdAt).toLocaleDateString("pt-BR")}</span>
                    {post.petName && (
                      <>
                        <span>•</span>
                        <Badge variant="secondary">{post.petName}</Badge>
                      </>
                    )}
                    {post.targetType !== "general" && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {post.targetType === "tutor" ? "Privado (Tutor)" : "Privado (Pet)"}
                        </Badge>
                      </>
                    )}
                    {post.authorRole === "admin" && (
                      <Badge variant="default" className="bg-orange-500">Creche</Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {(user?.role === "admin" || user?.id === post.authorId) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletePost(post.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Post Content */}
            {post.content && (
              <p className="mb-4 whitespace-pre-wrap">{post.content}</p>
            )}
            
            {/* Post Media */}
            {post.mediaUrls && post.mediaUrls.length > 0 && (
              <div className={`grid gap-2 mb-4 ${
                post.mediaUrls.length === 1 ? "grid-cols-1" :
                post.mediaUrls.length === 2 ? "grid-cols-2" :
                post.mediaUrls.length === 3 ? "grid-cols-3" :
                "grid-cols-2 md:grid-cols-3"
              }`}>
                {post.mediaUrls.slice(0, 6).map((url: string, index: number) => (
                  <img
                    key={index}
                    src={url}
                    alt="Post media"
                    className="w-full h-48 object-cover rounded cursor-pointer hover:opacity-90 transition"
                    onClick={() => setSelectedPost(post)}
                  />
                ))}
                {post.mediaUrls.length > 6 && (
                  <div className="relative">
                    <img
                      src={post.mediaUrls[5]}
                      alt="More"
                      className="w-full h-48 object-cover rounded opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        +{post.mediaUrls.length - 6}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Reactions Summary */}
            <div className="flex items-center gap-4 py-3 border-y">
              <div className="flex items-center gap-1">
                {Object.entries(post.reactionCounts || {}).map(([type, count]: any) => (
                  <span key={type} className="text-sm">
                    {reactionIcons[type as keyof typeof reactionIcons]} {count}
                  </span>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {post.commentCount} comentários
              </span>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReaction(post.id, "like")}
                className="hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <Heart className="h-4 w-4 mr-2" />
                Curtir
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPost(post)}
                className="hover:bg-blue-50 hover:text-blue-500 transition-colors"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Comentar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReaction(post.id, "laugh")}
                className="hover:bg-yellow-50 transition-colors"
              >
                😂 Rir
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReaction(post.id, "sad")}
                className="hover:bg-gray-50 transition-colors"
              >
                😢 Triste
              </Button>
            </div>
            
            {/* Comments Preview */}
            {post.comments && post.comments.length > 0 && (
              <div className="mt-4 space-y-3 pt-3 border-t">
                {post.comments.slice(0, 2).map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-600 text-sm">
                        {comment.authorName?.charAt(0) || "U"}
                      </span>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-lg p-3">
                        <p className="font-semibold text-sm">{comment.authorName}</p>
                        <p className="text-sm">{comment.comment}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(comment.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
                {post.comments.length > 2 && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setSelectedPost(post)}
                    className="text-orange-500"
                  >
                    Ver todos os {post.comments.length} comentários
                  </Button>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
      
      {/* Post Detail Modal */}
      {selectedPost && (
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Post de {selectedPost.authorName}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedPost.content && (
                <p className="whitespace-pre-wrap">{selectedPost.content}</p>
              )}
              
              {selectedPost.mediaUrls && selectedPost.mediaUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedPost.mediaUrls.map((url: string, index: number) => (
                    <img
                      key={index}
                      src={url}
                      alt="Media"
                      className="w-full rounded"
                    />
                  ))}
                </div>
              )}
              
              {/* All Comments */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold">Comentários</h3>
                {selectedPost.comments?.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-600 text-sm">
                        {comment.authorName?.charAt(0) || "U"}
                      </span>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-lg p-3">
                        <p className="font-semibold text-sm">{comment.authorName}</p>
                        <p className="text-sm">{comment.comment}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(comment.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Add Comment */}
                {user && (
                  <div className="flex gap-2 pt-3">
                    <Input
                      placeholder="Escreva um comentário..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment(selectedPost.id);
                        }
                      }}
                    />
                    <Button
                      onClick={() => handleAddComment(selectedPost.id)}
                      disabled={addCommentMutation.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
