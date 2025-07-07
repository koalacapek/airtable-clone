import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { faker } from "@faker-js/faker";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const tableRouter = createTRPCRouter({
  getAllByBase: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
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

      const tables = await ctx.db.table.findMany({
        where: { baseId: input.baseId },
        orderBy: { createdAt: "asc" },
      });

      return tables;
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

      // Create cells
      const defaultColumns = [
        { name: "#", type: "TEXT" as const },
        { name: "Name", type: "TEXT" as const },
        { name: "Age", type: "NUMBER" as const },
      ];

      await ctx.db.column.createMany({
        data: defaultColumns.map((col) => ({
          name: col.name,
          type: col.type,
          tableId: table.id,
        })),
      });

      // Fetch inserted columns with IDs
      const columns = await ctx.db.column.findMany({
        where: { tableId: table.id },
      });

      const rowNumberCol = columns.find((c) => c.name === "#");
      const nameCol = columns.find((c) => c.name === "Name");
      const ageCol = columns.find((c) => c.name === "Age");

      if (!rowNumberCol || !nameCol || !ageCol) {
        throw new Error("Default columns not found");
      }

      // Create rows and cells
      const rowData = Array.from({ length: 200 }).map(() => ({
        name: faker.person.fullName(),
        age: faker.number.int({ min: 18, max: 65 }).toString(),
      }));

      const createdRows = await ctx.db.row.createManyAndReturn({
        data: rowData.map(() => ({ tableId: table.id })),
      });

      const cellsToCreate: {
        columnId: string;
        value: string;
        rowId: string;
      }[] = [];

      rowData.forEach((data, index) => {
        const row = createdRows[index];
        const cells = [
          {
            columnId: rowNumberCol.id,
            value: (index + 1).toString(),
            rowId: row!.id,
          },
          { columnId: nameCol.id, value: data.name, rowId: row!.id },
          { columnId: ageCol.id, value: data.age, rowId: row!.id },
        ];
        cellsToCreate.push(...cells);
      });

      await ctx.db.cell.createMany({
        data: cellsToCreate,
      });
      return table;
    }),
  getTableWithData: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      const table = await ctx.db.table.findUnique({
        where: { id: input.tableId },
        include: {
          columns: true,
          rows: {
            include: {
              cells: true,
            },
          },
        },
      });

      if (!table) throw new TRPCError({ code: "NOT_FOUND" });

      return table;
    }),
  getTableMetadata: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.table.findUnique({
        where: { id: input.tableId },
        include: { columns: true },
      });
    }),

  // Infinite query for table data
  getTableWithDataInfinite: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        limit: z.number().max(100).default(50),
        cursor: z.string().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // const { tableId, limit, cursor, sortBy, sortOrder } = input;
      const { tableId, limit, cursor } = input;

      const rows = await ctx.db.row.findMany({
        where: {
          tableId,
        },
        cursor: cursor ? { id: cursor } : undefined,
        include: { cells: true },
        take: limit + 1,
        // orderBy: sortBy
        //   ? { [sortBy]: sortOrder ?? "asc" }
        //   : { createdAt: "asc" as const },
      });

      let nextCursor: string | undefined = undefined;
      if (rows.length > limit) {
        const nextItem = rows.pop();
        nextCursor = nextItem!.id;
      }

      return {
        rows,
        nextCursor,
      };
    }),
});
