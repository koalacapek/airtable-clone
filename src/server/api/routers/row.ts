import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  // publicProcedure,
} from "~/server/api/trpc";

export const rowRouter = createTRPCRouter({
  createRow: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch columns and current rows to determine the row number
      const [columns] = await Promise.all([
        ctx.db.column.findMany({
          where: { tableId: input.tableId },
        }),
        ctx.db.row.findMany({
          where: { tableId: input.tableId },
        }),
      ]);

      // Create a new row
      const newRow = await ctx.db.row.create({
        data: {
          tableId: input.tableId,
        },
      });

      // Create cells with empty values by default
      const cells = columns.map((col) => ({
        rowId: newRow.id,
        columnId: col.id,
        value: "",
      }));

      await ctx.db.cell.createMany({
        data: cells,
      });

      const fullRow = await ctx.db.row.findUnique({
        where: { id: newRow.id },
        include: { cells: true },
      });

      return fullRow;
    }),
  getInfiniteRows: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        limit: z.number().min(1).max(100),
        cursor: z.string().nullish(), // last row ID
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.row.findMany({
        where: { tableId: input.tableId },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        orderBy: { createdAt: "asc" },
        include: { cells: true },
      });

      let nextCursor: string | null = null;
      if (rows.length > input.limit) {
        nextCursor = rows.pop()!.id;
      }

      return { rows, nextCursor };
    }),
});
