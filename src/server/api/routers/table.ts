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

      // Also create default views
      await ctx.db.view.create({
        data: {
          name: "Grid View",
          tableId: table.id,
          filters: {},
          sort: {},
          hiddenColumns: [],
        },
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
        cursor: z
          .object({
            value: z.string().nullable(),
            id: z.string(),
          })
          .optional(),
        filters: z.record(z.any()).optional(),
        sort: z.record(z.any()).optional(),
        hiddenColumns: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tableId, limit, cursor, filters, sort } = input;

      const columns = await ctx.db.column.findMany({
        where: { tableId },
        select: { id: true, name: true, type: true },
      });

      let sql = `
      SELECT r.id, r."tableId", r."createdAt"
      FROM "Row" r
    `;

      const params: (string | number | null)[] = [];
      let paramIndex = 1;

      // Filter JOINs
      if (filters && Object.keys(filters).length > 0) {
        Object.entries(filters).forEach(([columnName, _], index) => {
          const column = columns.find((col) => col.name === columnName);
          if (!column) return;

          const alias = `c${index}`;
          sql += ` LEFT JOIN "Cell" ${alias} ON r.id = ${alias}."rowId" AND ${alias}."columnId" = $${paramIndex++}`;
          params.push(column.id);
        });
      }

      // Sort JOIN
      let sortColumnId: string | undefined;
      let sortColumnType: string | undefined;
      if (sort && Object.keys(sort).length > 0) {
        const [columnName, sortConfig] = Object.entries(sort)[0] as [
          string,
          { direction: "asc" | "desc" },
        ];
        const column = columns.find((col) => col.name === columnName);
        if (column) {
          sortColumnId = column.id;
          sortColumnType = column.type;
          sql += ` LEFT JOIN "Cell" sort_cell ON r.id = sort_cell."rowId" AND sort_cell."columnId" = $${paramIndex++}`;
          params.push(column.id);
          // Add sortValue to SELECT after the join is added
          sql = sql.replace(
            'SELECT r.id, r."tableId", r."createdAt"',
            'SELECT r.id, r."tableId", r."createdAt", sort_cell.value AS "sortValue"',
          );
        }
      }

      // WHERE base
      sql += ` WHERE r."tableId" = $${paramIndex++}`;
      params.push(tableId);

      // Filter conditions
      if (filters && Object.keys(filters).length > 0) {
        Object.entries(filters).forEach(([columnName, filterConfig], index) => {
          const column = columns.find((col) => col.name === columnName);
          if (!column) return;

          const alias = `c${index}`;
          const { op, value } = filterConfig as { op: string; value?: string };

          if (op === "is_empty") {
            sql += ` AND ${alias}.id IS NULL`;
          } else if (op === "is_not_empty") {
            sql += ` AND ${alias}.id IS NOT NULL`;
          } else if (op === "contains") {
            sql += ` AND ${alias}.value ILIKE $${paramIndex++}`;
            params.push(`%${value}%`);
          } else if (op === "not_contains") {
            sql += ` AND (${alias}.id IS NULL OR ${alias}.value NOT ILIKE $${paramIndex++})`;
            params.push(`%${value}%`);
          } else if (op === "equal") {
            sql += ` AND ${alias}.value = $${paramIndex++}`;
            params.push(value ?? "");
          } else if (op === "greater") {
            sql += ` AND ${alias}.value > $${paramIndex++}`;
            params.push(value ?? "");
          } else if (op === "smaller") {
            sql += ` AND ${alias}.value < $${paramIndex++}`;
            params.push(value ?? "");
          }
        });
      }

      // Cursor-based pagination
      if (cursor && sortColumnId) {
        if (sortColumnType === "NUMBER") {
          // For number columns, compare as numbers
          const cursorValue = cursor.value ? parseFloat(cursor.value) : 0;
          const cursorIsNull = cursor.value === null || cursor.value === "";
          sql += ` AND (CASE WHEN sort_cell.value IS NULL OR sort_cell.value = '' THEN 1 ELSE 0 END, COALESCE(CAST(sort_cell.value AS DECIMAL), 0), r.id) > ($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`;
          params.push(cursorIsNull ? 1 : 0, cursorValue, cursor.id);
        } else {
          // For text columns, compare as strings
          const cursorIsNull = cursor.value === null || cursor.value === "";
          sql += ` AND (CASE WHEN sort_cell.value IS NULL OR sort_cell.value = '' THEN 1 ELSE 0 END, COALESCE(LOWER(sort_cell.value), ''), r.id) > ($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`;
          params.push(cursorIsNull ? 1 : 0, cursor.value ?? "", cursor.id);
        }
      } else if (cursor) {
        sql += ` AND r.id > $${paramIndex++}`;
        params.push(cursor.id);
      }

      // ORDER BY
      if (sortColumnId) {
        const sortDirection =
          (Object.values(sort!)[0] as { direction: "asc" | "desc" })
            ?.direction ?? "asc";

        if (sortColumnType === "NUMBER") {
          // For number columns, cast to decimal for proper numeric sorting
          // Handle NULL values by placing them at the end
          sql += ` ORDER BY CASE WHEN sort_cell.value IS NULL OR sort_cell.value = '' THEN 1 ELSE 0 END, CAST(sort_cell.value AS DECIMAL) ${sortDirection.toUpperCase()}, r.id`;
        } else {
          // For text columns, use case-insensitive sorting
          // Handle NULL values by placing them at the end
          sql += ` ORDER BY CASE WHEN sort_cell.value IS NULL OR sort_cell.value = '' THEN 1 ELSE 0 END, LOWER(sort_cell.value) ${sortDirection.toUpperCase()}, r.id`;
        }
      } else {
        sql += ` ORDER BY r.id`;
      }

      // LIMIT
      sql += ` LIMIT $${paramIndex++}`;
      params.push(limit + 1);

      // Run query
      const result = await ctx.db.$queryRawUnsafe(sql, ...params);
      const rows = result as {
        id: string;
        tableId: string;
        createdAt: Date;
        sortValue?: string | null;
      }[];

      const rowIds = rows.map((r) => r.id);
      const rowsWithCells = await ctx.db.row.findMany({
        where: { id: { in: rowIds } },
        include: { cells: true },
      });

      const sortedRows = rowIds.map(
        (id) => rowsWithCells.find((r) => r.id === id)!,
      );

      // Cursor for next page
      let nextCursor: typeof input.cursor | undefined = undefined;
      if (rows.length > limit) {
        const nextItem = rows.pop();
        if (nextItem) {
          nextCursor = {
            id: nextItem.id,
            value: nextItem.sortValue ?? null,
          };
        }
      }

      return {
        rows: sortedRows,
        nextCursor,
      };
    }),

  getMatchingCellIds: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        searchValue: z.string(),
        hiddenColumns: z.array(z.string()).optional(),
        filters: z.record(z.any()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tableId, searchValue, hiddenColumns = [], filters } = input;
      if (!searchValue || searchValue.trim() === "") return [];

      // Get columns for filter processing
      const columns = await ctx.db.column.findMany({
        where: { tableId },
        select: { id: true, name: true, type: true },
      });

      // Build the base query to find rows that match the filters
      let rowIds: string[] = [];

      if (filters && Object.keys(filters).length > 0) {
        // Use the same filtering logic as getTableWithDataInfinite
        let sql = `
        SELECT r.id
        FROM "Row" r
      `;

        const params: (string | number | null)[] = [];
        let paramIndex = 1;

        // Filter JOINs
        Object.entries(filters).forEach(([columnName, _], index) => {
          const column = columns.find((col) => col.name === columnName);
          if (!column) return;

          const alias = `c${index}`;
          sql += ` LEFT JOIN "Cell" ${alias} ON r.id = ${alias}."rowId" AND ${alias}."columnId" = $${paramIndex++}`;
          params.push(column.id);
        });

        // WHERE base
        sql += ` WHERE r."tableId" = $${paramIndex++}`;
        params.push(tableId);

        // Filter conditions
        Object.entries(filters).forEach(([columnName, filterConfig], index) => {
          const column = columns.find((col) => col.name === columnName);
          if (!column) return;

          const alias = `c${index}`;
          const { op, value } = filterConfig as { op: string; value?: string };

          if (op === "is_empty") {
            sql += ` AND ${alias}.id IS NULL`;
          } else if (op === "is_not_empty") {
            sql += ` AND ${alias}.id IS NOT NULL`;
          } else if (op === "contains") {
            sql += ` AND ${alias}.value ILIKE $${paramIndex++}`;
            params.push(`%${value}%`);
          } else if (op === "not_contains") {
            sql += ` AND (${alias}.id IS NULL OR ${alias}.value NOT ILIKE $${paramIndex++})`;
            params.push(`%${value}%`);
          } else if (op === "equal") {
            sql += ` AND ${alias}.value = $${paramIndex++}`;
            params.push(value ?? "");
          } else if (op === "greater") {
            sql += ` AND ${alias}.value > $${paramIndex++}`;
            params.push(value ?? "");
          } else if (op === "smaller") {
            sql += ` AND ${alias}.value < $${paramIndex++}`;
            params.push(value ?? "");
          }
        });

        // Run the filter query to get matching row IDs
        const result = await ctx.db.$queryRawUnsafe(sql, ...params);
        rowIds = (result as { id: string }[]).map((r) => r.id);
      }

      // Now find cells that match the search value within the filtered rows
      const cells = await ctx.db.cell.findMany({
        where: {
          row: {
            tableId,
            ...(rowIds.length > 0 && { id: { in: rowIds } }),
          },
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
