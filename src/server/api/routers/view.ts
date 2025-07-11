import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const viewRouter = createTRPCRouter({
  getAllByTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      // First verify the table belongs to the user
      const table = await ctx.db.table.findFirst({
        where: {
          id: input.tableId,
          base: {
            userId: ctx.session.user.id,
          },
        },
      });

      if (!table) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table not found or unauthorized",
        });
      }

      const views = await ctx.db.view.findMany({
        where: { tableId: input.tableId },
        orderBy: { createdAt: "asc" },
      });

      return views;
    }),

  getAllByBase: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
      // First verify the base belongs to the user
      const base = await ctx.db.base.findFirst({
        where: {
          id: input.baseId,
          userId: ctx.session.user.id,
        },
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Base not found or unauthorized",
        });
      }

      const views = await ctx.db.view.findMany({
        where: { baseId: input.baseId },
        orderBy: { createdAt: "asc" },
      });

      return views;
    }),

  create: protectedProcedure
    .input(
      z.object({
        tableId: z.string().optional(),
        baseId: z.string().optional(),
        name: z.string(),
        filters: z.record(z.any()).optional(),
        sort: z.record(z.any()).optional(),
        hiddenColumns: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify either table or base belongs to the user
      if (input.tableId) {
        const table = await ctx.db.table.findFirst({
          where: {
            id: input.tableId,
            base: {
              userId: ctx.session.user.id,
            },
          },
        });

        if (!table) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Table not found or unauthorized",
          });
        }
      } else if (input.baseId) {
        const base = await ctx.db.base.findFirst({
          where: {
            id: input.baseId,
            userId: ctx.session.user.id,
          },
        });

        if (!base) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Base not found or unauthorized",
          });
        }
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either tableId or baseId must be provided",
        });
      }

      const view = await ctx.db.view.create({
        data: {
          name: input.name.trim() || "Untitled View",
          baseId: input.baseId,
          filters: input.filters ?? {},
          sort: input.sort ?? {},
          hiddenColumns: input.hiddenColumns ?? [],
        },
      });

      return view;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        filters: z.record(z.any()).optional(),
        sort: z.record(z.any()).optional(),
        hiddenColumns: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the view belongs to the user
      const view = await ctx.db.view.findFirst({
        where: {
          id: input.id,
          OR: [
            {
              table: {
                base: {
                  userId: ctx.session.user.id,
                },
              },
            },
            {
              base: {
                userId: ctx.session.user.id,
              },
            },
          ],
        },
      });

      if (!view) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "View not found or unauthorized",
        });
      }

      const updatedView = await ctx.db.view.update({
        where: { id: input.id },
        data: {
          name: input.name?.trim(),
          filters: input.filters,
          sort: input.sort,
          hiddenColumns: input.hiddenColumns,
        },
      });

      return updatedView;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the view belongs to the user
      const view = await ctx.db.view.findFirst({
        where: {
          id: input.id,
          OR: [
            {
              table: {
                base: {
                  userId: ctx.session.user.id,
                },
              },
            },
            {
              base: {
                userId: ctx.session.user.id,
              },
            },
          ],
        },
      });

      if (!view) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "View not found or unauthorized",
        });
      }

      await ctx.db.view.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
  getDetails: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const view = await ctx.db.view.findFirst({
        where: { id: input.id },
      });

      return view;
    }),
});
