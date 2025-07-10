import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { faker } from "@faker-js/faker";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { Prisma } from "@prisma/client";

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
            value: "",
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
    .input(
      z.object({
        tableId: z.string(),
        hiddenColumns: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const table = await ctx.db.table.findUnique({
        where: { id: input.tableId },
        include: { columns: true },
      });

      if (!table) return null;

      // Filter out hidden columns if provided
      if (input.hiddenColumns && input.hiddenColumns.length > 0) {
        table.columns = table.columns.filter(
          (col) => !input.hiddenColumns!.includes(col.id),
        );
      }

      return table;
    }),

  // Infinite query for table data
  getTableWithDataInfinite: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        limit: z.number().default(1000),
        cursor: z.string().optional(),
        filters: z.record(z.any()).optional(),
        sort: z.record(z.any()).optional(),
        hiddenColumns: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tableId, limit, cursor, filters, sort } = input;

      // Get columns for this table
      const columns = await ctx.db.column.findMany({
        where: { tableId },
        select: { id: true, name: true, type: true },
      });

      // Build SQL query with JOINs for efficient filtering and sorting
      let sql = `
        SELECT r.id, r."tableId", r."createdAt"
        FROM "Row" r
      `;

      const params: (string | number)[] = [];
      let paramIndex = 1;

      // Add JOINs for filtering
      if (filters && Object.keys(filters).length > 0) {
        const filterEntries = Object.entries(filters);
        filterEntries.forEach(([columnName, filterConfig], index) => {
          const column = columns.find((col) => col.name === columnName);
          if (!column) return;

          const alias = `c${index}`;
          sql += ` LEFT JOIN "Cell" ${alias} ON r.id = ${alias}."rowId" AND ${alias}."columnId" = $${paramIndex++}`;
          params.push(column.id);
        });
      }

      // Add JOINs for sorting
      if (sort && Object.keys(sort).length > 0) {
        const sortEntries = Object.entries(sort);
        const firstSortEntry = sortEntries[0];
        if (firstSortEntry) {
          const [columnName, sortConfig] = firstSortEntry as [
            string,
            { direction: "asc" | "desc" },
          ];
          const column = columns.find((col) => col.name === columnName);
          if (column) {
            sql += ` LEFT JOIN "Cell" sort_cell ON r.id = sort_cell."rowId" AND sort_cell."columnId" = $${paramIndex++}`;
            params.push(column.id);
          }
        }
      }

      // WHERE clause
      sql += ` WHERE r."tableId" = $${paramIndex++}`;
      params.push(tableId);

      // Add filter conditions
      if (filters && Object.keys(filters).length > 0) {
        const filterEntries = Object.entries(filters);
        filterEntries.forEach(([columnName, filterConfig], index) => {
          const column = columns.find((col) => col.name === columnName);
          if (!column) return;

          const alias = `c${index}`;
          const filterOp = (filterConfig as { op: string }).op;
          const filterValue = (filterConfig as { value?: string }).value;

          if (filterOp === "is_empty") {
            sql += ` AND ${alias}.id IS NULL`;
          } else if (filterOp === "is_not_empty") {
            sql += ` AND ${alias}.id IS NOT NULL`;
          } else if (filterOp === "contains") {
            sql += ` AND ${alias}.value ILIKE $${paramIndex++}`;
            params.push(`%${filterValue}%`);
          } else if (filterOp === "not_contains") {
            sql += ` AND (${alias}.id IS NULL OR ${alias}.value NOT ILIKE $${paramIndex++})`;
            params.push(`%${filterValue}%`);
          } else if (filterOp === "equal") {
            sql += ` AND ${alias}.value = $${paramIndex++}`;
            params.push(filterValue ?? "");
          } else if (filterOp === "greater") {
            sql += ` AND ${alias}.value > $${paramIndex++}`;
            params.push(filterValue ?? "");
          } else if (filterOp === "smaller") {
            sql += ` AND ${alias}.value < $${paramIndex++}`;
            params.push(filterValue ?? "");
          }
        });
      }

      // Add cursor condition
      if (cursor) {
        sql += ` AND r.id > $${paramIndex++}`;
        params.push(cursor);
      }

      // ORDER BY clause
      if (sort && Object.keys(sort).length > 0) {
        const sortEntries = Object.entries(sort);
        const firstSortEntry = sortEntries[0];
        if (firstSortEntry) {
          const [columnName, sortConfig] = firstSortEntry as [
            string,
            { direction: "asc" | "desc" },
          ];
          const sortDirection = sortConfig?.direction ?? "asc";
          sql += ` ORDER BY LOWER(sort_cell.value) ${sortDirection.toUpperCase()}, r.id`;
        }
      } else {
        sql += ` ORDER BY r.id`;
      }

      // LIMIT clause
      sql += ` LIMIT $${paramIndex++}`;
      params.push(limit + 1);

      // Execute the query
      const result = await ctx.db.$queryRawUnsafe(sql, ...params);
      const rows = result as { id: string; tableId: string; createdAt: Date }[];

      // Get the actual row data with cells
      const rowIds = rows.map((row) => row.id);
      const rowsWithCells = await ctx.db.row.findMany({
        where: { id: { in: rowIds } },
        include: { cells: true },
      });

      // Preserve the sort order from the SQL query
      const sortedRowsWithCells = rowIds.map(
        (id) => rowsWithCells.find((row) => row.id === id)!,
      );

      // Determine next cursor
      let nextCursor: string | undefined = undefined;
      if (rows.length > limit) {
        const nextItem = rows.pop();
        nextCursor = nextItem!.id;
      }

      return {
        rows: sortedRowsWithCells,
        nextCursor,
      };
    }),
  getMatchingCellIds: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        searchValue: z.string(),
        hiddenColumns: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tableId, searchValue, hiddenColumns = [] } = input;
      if (!searchValue || searchValue.trim() === "") return [];

      const cells = await ctx.db.cell.findMany({
        where: {
          row: { tableId },
          columnId: {
            notIn: hiddenColumns,
          },
          value: {
            contains: searchValue.trim(),
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          rowId: true,
          columnId: true,
        },
      });
      return cells;
    }),
});
