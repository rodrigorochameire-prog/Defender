"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Heart,
  MessageCircle,
  Pin,
  Send,
  Dog
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { WallSkeleton } from "@/components/shared/skeletons";

export default function TutorWall() {
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const { data: posts, isLoading, refetch } = trpc.wall.posts.useQuery({});
  const { data: comments } = trpc.wall.comments.useQuery(
    { postId: selectedPost! },
    { enabled: !!selectedPost }
  );

  const toggleLike = trpc.wall.toggleLike.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const addComment = trpc.wall.addComment.useMutation({
    onSuccess: () => {
      setComment("");
      refetch();
    },
  });

  if (isLoading) {
    return <WallSkeleton />;
  }

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
            <p>Novidades e atualizações da creche</p>
          </div>
        </div>
      </div>

      {/* Posts */}
      {!posts || posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhuma novidade no momento
            </p>
            <p className="text-sm text-muted-foreground">
              Volte mais tarde para ver atualizações
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 max-w-2xl mx-auto">
          {posts.map((post) => (
            <Card key={post.id} className={post.isPinned ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-white">
                        {getInitials(post.author?.name || "A")}
                      </AvatarFallback>
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
                  {post.isPinned && (
                    <Badge variant="secondary">
                      <Pin className="h-3 w-3 mr-1" />
                      Fixado
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {post.pet && (
                  <Badge variant="secondary" className="mb-2">
                    <Dog className="h-3 w-3 mr-1" />
                    {post.pet.name}
                  </Badge>
                )}
                <p className="whitespace-pre-wrap">{post.content}</p>
                {post.imageUrl && (
                  <img 
                    src={post.imageUrl} 
                    alt="Post" 
                    className="mt-3 rounded-lg max-h-96 object-cover w-full"
                  />
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

                {/* Comments Section */}
                {selectedPost === post.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {/* Comment Input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Escreva um comentário..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && comment.trim()) {
                            addComment.mutate({ postId: post.id, content: comment });
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        onClick={() => {
                          if (comment.trim()) {
                            addComment.mutate({ postId: post.id, content: comment });
                          }
                        }}
                        disabled={addComment.isPending || !comment.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Comments List */}
                    {comments && comments.length > 0 && (
                      <div className="space-y-2">
                        {comments.map((c) => (
                          <div key={c.id} className="flex gap-2 p-2 rounded-lg bg-muted/50">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(c.author?.name || "U")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{c.author?.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                              <p className="text-sm">{c.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
