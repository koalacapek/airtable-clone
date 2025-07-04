import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  // publicProcedure,
} from "~/server/api/trpc";

export const columnRouter = createTRPCRouter({
  createColumn: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        name: z.string(),
        type: z.enum(["TEXT", "NUMBER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rows = await ctx.db.row.findMany({
        where: { tableId: input.tableId },
      });

      const newCol = await ctx.db.column.create({
        data: {
          tableId: input.tableId,
          name: input.name.trim() || `Column ${rows.length + 1}`,
          type: input.type,
        },
      });

      // Create cells according to num of columns
      await ctx.db.cell.createMany({
        data: rows.map((col) => ({
          rowId: newCol.id,
          columnId: col.id,
          value: "",
        })),
      });

      const fullCol = await ctx.db.row.findUnique({
        where: { id: newCol.id },
        include: { cells: true },
      });

      return fullCol;
    }),
});
