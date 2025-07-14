import { z } from "zod";
import { faker } from "@faker-js/faker";

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
      // Only fetch columns, not rows
      const columns = await ctx.db.column.findMany({
        where: { tableId: input.tableId },
        select: { id: true },
      });

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

      return { success: true, rowId: newRow.id };
    }),

  createBulkRows: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        count: z.number().min(1).max(100000).default(100000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch columns to create cells for each row
      const columns = await ctx.db.column.findMany({
        where: { tableId: input.tableId },
        select: { id: true, name: true, type: true },
      });

      if (columns.length === 0) {
        throw new Error("No columns found for table");
      }

      // Get current row count once
      const currentRowCount = await ctx.db.row.count({
        where: { tableId: input.tableId },
      });

      // Much smaller batch size to avoid transaction timeouts
      const BATCH_SIZE = input.count / 10;

      let totalCreated = 0;

      // Process in very small batches to avoid transaction timeouts
      for (let i = 0; i < input.count; i += BATCH_SIZE) {
        const batchSize = Math.min(BATCH_SIZE, input.count - i);
        const batchStartIndex = currentRowCount + totalCreated;

        // Use a separate transaction for each batch with shorter timeout

        // Create rows for this batch
        const rowsToCreate = Array.from({ length: batchSize }, () => ({
          tableId: input.tableId,
        }));

        const rows = await ctx.db.row.createManyAndReturn({
          data: rowsToCreate,
        });

        // Generate cells for this batch
        const cellsToCreate = rows.flatMap((row, rowIndex) => {
          const globalRowIndex = batchStartIndex + rowIndex;

          return columns.map((col) => {
            let value = "";

            if (col.name === "#") {
              value = (globalRowIndex + 1).toString();
            } else if (col.name === "Name") {
              // Generate fake data on-demand to reduce memory usage
              value = faker.person.fullName();
            } else if (col.name === "Age") {
              value = faker.number.int({ min: 1, max: 1000 }).toString();
            }

            return {
              rowId: row.id,
              columnId: col.id,
              value,
            };
          });
        });

        // Create all cells for this batch
        await ctx.db.cell.createMany({
          data: cellsToCreate,
        });

        totalCreated += batchSize;
      }

      return { success: true, rowsCreated: totalCreated };
    }),
});
