import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const baseRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      let name = input.name?.trim();

      name ??= `Untitled Base`;

      const base = await ctx.db.base.create({
        data: {
          name,
          userId,
        },
      });

      return base;
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const bases = await ctx.db.base.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return bases;
  }),

  rename: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.base.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: {
          name: input.name?.trim() ?? "Untitled Base",
        },
      });

      return base;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.base.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      return base;
    }),
});
