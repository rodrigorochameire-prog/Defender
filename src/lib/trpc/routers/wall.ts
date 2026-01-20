import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db, users, pets, petTutors } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { safeAsync, Errors } from "@/lib/errors";
import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

// Schema para posts do mural
export const wallPosts = pgTable("wall_posts", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull(),
  petId: integer("pet_id"),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  visibility: varchar("visibility", { length: 50 }).default("all").notNull(), // 'all' | 'tutors' | 'admin'
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schema para comentários
export const wallComments = pgTable("wall_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  authorId: integer("author_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema para curtidas
export const wallLikes = pgTable("wall_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wallRouter = router({
  /**
   * Lista posts do mural
   */
  posts: protectedProcedure
    .input(
      z.object({
        petId: z.number().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return safeAsync(async () => {
        let conditions: ReturnType<typeof eq>[] = [];

        // Filtrar por visibilidade baseado no role
        if (ctx.user.role !== "admin") {
          conditions.push(eq(wallPosts.visibility, "all"));
        }

        if (input?.petId) {
          conditions.push(eq(wallPosts.petId, input.petId));
        }

        const posts = await db
          .select({
            post: wallPosts,
            author: {
              id: users.id,
              name: users.name,
            },
            pet: {
              id: pets.id,
              name: pets.name,
              photoUrl: pets.photoUrl,
              breed: pets.breed,
            },
          })
          .from(wallPosts)
          .innerJoin(users, eq(wallPosts.authorId, users.id))
          .leftJoin(pets, eq(wallPosts.petId, pets.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(wallPosts.isPinned), desc(wallPosts.createdAt))
          .limit(input?.limit || 20)
          .offset(input?.offset || 0);

        // Buscar likes e comentários de cada post
        const postsWithMeta = await Promise.all(
          posts.map(async (p) => {
            const [likesCount] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(wallLikes)
              .where(eq(wallLikes.postId, p.post.id));

            const [commentsCount] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(wallComments)
              .where(eq(wallComments.postId, p.post.id));

            const userLiked = await db.query.wallLikes?.findFirst?.({
              where: and(
                eq(wallLikes.postId, p.post.id),
                eq(wallLikes.userId, ctx.user.id)
              ),
            });

            return {
              ...p.post,
              author: p.author,
              pet: p.pet,
              likesCount: likesCount?.count || 0,
              commentsCount: commentsCount?.count || 0,
              userLiked: !!userLiked,
            };
          })
        );

        return postsWithMeta;
      }, "Erro ao buscar posts do mural");
    }),

  /**
   * Cria post
   */
  createPost: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(2000),
        petId: z.number().optional(),
        imageUrl: z.string().url().optional(),
        visibility: z.enum(["all", "tutors", "admin"]).default("all"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const [post] = await db
          .insert(wallPosts)
          .values({
            authorId: ctx.user.id,
            petId: input.petId || null,
            content: input.content,
            imageUrl: input.imageUrl || null,
            visibility: input.visibility,
          })
          .returning();

        return post;
      }, "Erro ao criar post");
    }),

  /**
   * Atualiza post
   */
  updatePost: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        content: z.string().min(1).max(2000).optional(),
        imageUrl: z.string().url().optional().nullable(),
        visibility: z.enum(["all", "tutors", "admin"]).optional(),
        isPinned: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const existing = await db.query.wallPosts?.findFirst?.({
          where: eq(wallPosts.id, input.id),
        });

        // Verificar permissão
        if (existing?.authorId !== ctx.user.id && ctx.user.role !== "admin") {
          throw Errors.forbidden();
        }

        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (data.content !== undefined) updateData.content = data.content;
        if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
        if (data.visibility !== undefined) updateData.visibility = data.visibility;
        if (data.isPinned !== undefined && ctx.user.role === "admin") {
          updateData.isPinned = data.isPinned;
        }

        const [post] = await db
          .update(wallPosts)
          .set(updateData)
          .where(eq(wallPosts.id, id))
          .returning();

        return post;
      }, "Erro ao atualizar post");
    }),

  /**
   * Remove post
   */
  deletePost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const existing = await db.query.wallPosts?.findFirst?.({
          where: eq(wallPosts.id, input.id),
        });

        if (existing?.authorId !== ctx.user.id && ctx.user.role !== "admin") {
          throw Errors.forbidden();
        }

        // Remove likes e comentários primeiro
        await db.delete(wallLikes).where(eq(wallLikes.postId, input.id));
        await db.delete(wallComments).where(eq(wallComments.postId, input.id));
        await db.delete(wallPosts).where(eq(wallPosts.id, input.id));

        return { success: true };
      }, "Erro ao remover post");
    }),

  /**
   * Curtir/Descurtir post
   */
  toggleLike: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const existing = await db.query.wallLikes?.findFirst?.({
          where: and(
            eq(wallLikes.postId, input.postId),
            eq(wallLikes.userId, ctx.user.id)
          ),
        });

        if (existing) {
          await db.delete(wallLikes).where(eq(wallLikes.id, existing.id));
          return { liked: false };
        } else {
          await db.insert(wallLikes).values({
            postId: input.postId,
            userId: ctx.user.id,
          });
          return { liked: true };
        }
      }, "Erro ao curtir post");
    }),

  /**
   * Adiciona comentário
   */
  addComment: protectedProcedure
    .input(
      z.object({
        postId: z.number(),
        content: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const [comment] = await db
          .insert(wallComments)
          .values({
            postId: input.postId,
            authorId: ctx.user.id,
            content: input.content,
          })
          .returning();

        return comment;
      }, "Erro ao adicionar comentário");
    }),

  /**
   * Lista comentários de um post
   */
  comments: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const result = await db
          .select({
            comment: wallComments,
            author: {
              id: users.id,
              name: users.name,
            },
          })
          .from(wallComments)
          .innerJoin(users, eq(wallComments.authorId, users.id))
          .where(eq(wallComments.postId, input.postId))
          .orderBy(wallComments.createdAt);

        return result.map(r => ({
          ...r.comment,
          author: r.author,
        }));
      }, "Erro ao buscar comentários");
    }),

  /**
   * Remove comentário
   */
  deleteComment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return safeAsync(async () => {
        const existing = await db.query.wallComments?.findFirst?.({
          where: eq(wallComments.id, input.id),
        });

        if (existing?.authorId !== ctx.user.id && ctx.user.role !== "admin") {
          throw Errors.forbidden();
        }

        await db.delete(wallComments).where(eq(wallComments.id, input.id));

        return { success: true };
      }, "Erro ao remover comentário");
    }),
});
