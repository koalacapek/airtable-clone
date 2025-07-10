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
      });

      if (columns.length === 0) {
        throw new Error("No columns found for table");
      }

      // Get current row count to determine starting row numbers
      const currentRowCount = await ctx.db.row.count({
        where: { tableId: input.tableId },
      });

      // Create rows in batches to avoid memory issues

      // Create rows for this batch
      const rowsToCreate = Array.from({ length: input.count }, () => ({
        tableId: input.tableId,
      }));

      // Create the rows
      const createdRows = await ctx.db.row.createManyAndReturn({
        data: rowsToCreate,
      });

      // Create cells for each row in this batch
      const cellsToCreate: {
        rowId: string;
        columnId: string;
        value: string;
      }[] = [];

      createdRows.forEach((row, rowIndex) => {
        const globalRowIndex = currentRowCount + rowIndex;

        columns.forEach((col) => {
          let value = "";

          if (col.name === "#") {
            value = (globalRowIndex + 1).toString();
          } else if (col.type === "TEXT") {
            // Generate fake text data for text columns
            value = faker.person.fullName();
          } else if (col.type === "NUMBER") {
            // Generate fake number data for number columns
            value = faker.number.int({ min: 1, max: 1000 }).toString();
          }

          cellsToCreate.push({
            rowId: row.id,
            columnId: col.id,
            value,
          });
        });
      });

      // Create all cells for this batch
      await ctx.db.cell.createMany({
        data: cellsToCreate,
      });

      return { success: true, rowsCreated: input.count };
    }),
});
