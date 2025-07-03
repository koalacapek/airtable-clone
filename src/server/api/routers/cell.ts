import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  // publicProcedure,
} from "~/server/api/trpc";

export const cellRouter = createTRPCRouter({
  updateCell: protectedProcedure
    .input(
      z.object({
        cellId: z.string(),
        value: z.string().optional(),
        tableId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.cell.update({
        where: { id: input.cellId },
        data: {
          value: input.value,
        },
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cell not found",
        });
      }
    }),
  getAll: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      const cells = await ctx.db.cell.findMany({
        where: {
          row: { tableId: input.tableId },
        },
        include: {
          row: true,
          column: true,
        },
      });

      return cells;
    }),
});
