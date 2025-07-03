import { createRow } from "@tanstack/react-table";
import { TRPCError } from "@trpc/server";
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
      const columns = await ctx.db.column.findMany({
        where: { tableId: input.tableId },
      });

      const newRow = await ctx.db.row.create({
        data: {
          tableId: input.tableId,
        },
      });

      //   Create cells according to num of columns
      await ctx.db.cell.createMany({
        data: columns.map((col) => ({
          rowId: newRow.id,
          columnId: col.id,
          value: "",
        })),
      });

      const fullRow = await ctx.db.row.findUnique({
        where: { id: newRow.id },
        include: { cells: true },
      });

      return fullRow;
    }),
});
