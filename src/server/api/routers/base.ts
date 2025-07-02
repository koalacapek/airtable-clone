import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  // publicProcedure,
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
          tables: {
            create: [
              {
                name: "Table 1",
              },
            ],
          },
        },
        include: {
          tables: true,
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

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const base = await ctx.db.base.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
        });
      }

      return base;
    }),

  createTable: protectedProcedure
    .input(z.object({ baseId: z.string(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.base.findFirst({
        where: { id: input.baseId, userId: ctx.session.user.id },
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Base not found",
        });
      }

      const count = await ctx.db.table.count({
        where: { baseId: input.baseId },
      });

      const table = await ctx.db.table.create({
        data: {
          name: input.name?.trim() ?? `Table ${count + 1}`,
          baseId: input.baseId,
        },
      });

      return table;
    }),
});
