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

      // If we have sorting, use raw SQL for efficient global sorting
      if (sort && Object.keys(sort).length > 0) {
        const [columnName, sortConfig] = Object.entries(sort)[0] as [
          string,
          { direction: "asc" | "desc" },
        ];
        const sortColumn = columns.find((col) => col.name === columnName);

        if (sortColumn) {
          // Build the SQL query for global sorting
          let sql = `
            SELECT r.id, r."tableId", c.value as sort_value
            FROM "Row" r
            LEFT JOIN "Cell" c ON r.id = c."rowId" AND c."columnId" = $1
            WHERE r."tableId" = $2
          `;

          const params: (string | number | null)[] = [sortColumn.id, tableId];
          let paramIndex = 3;

          // Add cursor condition for pagination - this is the key fix
          if (cursor) {
            const sortDirection =
              sortConfig.direction === "asc" ? "ASC" : "DESC";

            if (cursor.value !== null) {
              if (sortColumn.type === "NUMBER") {
                // For number columns: (sort_value, id) > (cursor_value, cursor_id)
                if (sortDirection === "ASC") {
                  sql += ` AND (
                    CAST(COALESCE(c.value, '0') AS DECIMAL) > CAST($${paramIndex} AS DECIMAL) OR 
                    (CAST(COALESCE(c.value, '0') AS DECIMAL) = CAST($${paramIndex} AS DECIMAL) AND r.id > $${paramIndex + 1})
                  )`;
                } else {
                  sql += ` AND (
                    CAST(COALESCE(c.value, '0') AS DECIMAL) < CAST($${paramIndex} AS DECIMAL) OR 
                    (CAST(COALESCE(c.value, '0') AS DECIMAL) = CAST($${paramIndex} AS DECIMAL) AND r.id > $${paramIndex + 1})
                  )`;
                }
                params.push(cursor.value, cursor.id);
                paramIndex += 2;
              } else {
                // For text columns: (sort_value, id) > (cursor_value, cursor_id)
                if (sortDirection === "ASC") {
                  sql += ` AND (
                    COALESCE(c.value, '') > $${paramIndex} OR 
                    (COALESCE(c.value, '') = $${paramIndex} AND r.id > $${paramIndex + 1})
                  )`;
                } else {
                  sql += ` AND (
                    COALESCE(c.value, '') < $${paramIndex} OR 
                    (COALESCE(c.value, '') = $${paramIndex} AND r.id > $${paramIndex + 1})
                  )`;
                }
                params.push(cursor.value, cursor.id);
                paramIndex += 2;
              }
            } else {
              // If cursor.value is null, we need to handle null values properly
              if (sortDirection === "ASC") {
                // For ASC with null cursor, we want non-null values or null values with id > cursor.id
                sql += ` AND (c.value IS NOT NULL OR r.id > $${paramIndex})`;
              } else {
                // For DESC with null cursor, we want values < null (which doesn't exist) or null values with id > cursor.id
                sql += ` AND r.id > $${paramIndex}`;
              }
              params.push(cursor.id);
              paramIndex += 1;
            }
          }

          // Add sorting with consistent tie-breaking
          const sortDirection = sortConfig.direction.toUpperCase();
          if (sortColumn.type === "NUMBER") {
            // For number columns, cast to numeric for proper numerical sorting
            sql += ` ORDER BY CAST(COALESCE(c.value, '0') AS DECIMAL) ${sortDirection === "ASC" ? "ASC" : "DESC"}, r.id ASC`;
          } else {
            // For text columns, use string sorting
            sql += ` ORDER BY COALESCE(c.value, '') ${sortDirection === "ASC" ? "ASC" : "DESC"}, r.id ASC`;
          }

          // Add limit
          sql += ` LIMIT $${paramIndex}`;
          params.push(limit + 1); // Get one extra to check if there are more

          // Execute the query to get sorted row IDs
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          const sortedRows = (await ctx.db.$queryRawUnsafe(sql, ...params)) as {
            id: string;
            tableId: string;
            sort_value: string | null;
          }[];

          // Check if there are more rows
          const hasMore = sortedRows.length > limit;
          const resultRowIds = sortedRows.slice(0, limit).map((r) => r.id);

          if (resultRowIds.length === 0) {
            return {
              rows: [],
              nextCursor: undefined,
            };
          }

          // Now get full row data with all cells
          const fullRows = await ctx.db.row.findMany({
            where: {
              id: { in: resultRowIds },
            },
            include: {
              cells: {
                include: {
                  column: {
                    select: { name: true, type: true },
                  },
                },
              },
            },
          });

          // Maintain the sorted order
          const orderedRows = resultRowIds.map(
            (id) => fullRows.find((row) => row.id === id)!,
          );

          // Apply filters if needed
          let filteredRows = orderedRows;
          if (filters && Object.keys(filters).length > 0) {
            filteredRows = orderedRows.filter((row) => {
              const cellData: Record<string, string | null> = {};
              row.cells.forEach((cell) => {
                cellData[cell.column.name] = cell.value;
              });

              return Object.entries(filters).every(
                ([columnName, filterConfig]) => {
                  const { op, value } = filterConfig as {
                    op: string;
                    value?: string;
                  };
                  const cellValue = cellData[columnName];

                  switch (op) {
                    case "is_empty":
                      return !cellValue || cellValue === "";
                    case "is_not_empty":
                      return cellValue && cellValue !== "";
                    case "contains":
                      return cellValue
                        ?.toLowerCase()
                        .includes(value?.toLowerCase() ?? "");
                    case "not_contains":
                      return !cellValue
                        ?.toLowerCase()
                        .includes(value?.toLowerCase() ?? "");
                    case "equal":
                      return cellValue === value;
                    case "greater":
                      return (
                        parseFloat(cellValue ?? "0") > parseFloat(value ?? "0")
                      );
                    case "smaller":
                      return (
                        parseFloat(cellValue ?? "0") < parseFloat(value ?? "0")
                      );
                    default:
                      return true;
                  }
                },
              );
            });
          }

          // Determine next cursor using the last row from the ORIGINAL query result
          let nextCursor: typeof input.cursor | undefined = undefined;
          if (hasMore) {
            const lastRowFromQuery = sortedRows[limit - 1]; // Use the last row before we sliced
            nextCursor = {
              id: lastRowFromQuery?.id ?? "",
              value: lastRowFromQuery?.sort_value ?? null,
            };
          }

          return {
            rows: filteredRows,
            nextCursor,
          };
        }
      }

      // If no sorting, use the simpler approach
      const rowWhereClause: Prisma.RowWhereInput = {
        tableId,
      };

      // Handle cursor pagination
      if (cursor) {
        rowWhereClause.id = {
          gt: cursor.id,
        };
      }

      const rows = await ctx.db.row.findMany({
        where: rowWhereClause,
        include: {
          cells: {
            include: {
              column: {
                select: { name: true, type: true },
              },
            },
          },
        },
        take: limit + 1,
        orderBy: {
          id: "asc",
        },
      });

      // Apply filters if needed
      let filteredRows = rows;
      if (filters && Object.keys(filters).length > 0) {
        filteredRows = rows.filter((row) => {
          const cellData: Record<string, string | null> = {};
          row.cells.forEach((cell) => {
            cellData[cell.column.name] = cell.value;
          });

          return Object.entries(filters).every(([columnName, filterConfig]) => {
            const { op, value } = filterConfig as {
              op: string;
              value?: string;
            };
            const cellValue = cellData[columnName];

            switch (op) {
              case "is_empty":
                return !cellValue || cellValue === "";
              case "is_not_empty":
                return cellValue && cellValue !== "";
              case "contains":
                return cellValue
                  ?.toLowerCase()
                  .includes(value?.toLowerCase() ?? "");
              case "not_contains":
                return !cellValue
                  ?.toLowerCase()
                  .includes(value?.toLowerCase() ?? "");
              case "equal":
                return cellValue === value;
              case "greater":
                return parseFloat(cellValue ?? "0") > parseFloat(value ?? "0");
              case "smaller":
                return parseFloat(cellValue ?? "0") < parseFloat(value ?? "0");
              default:
                return true;
            }
          });
        });
      }

      // Handle pagination
      const hasMore = filteredRows.length > limit;
      const resultRows = filteredRows.slice(0, limit);

      // Determine next cursor
      let nextCursor: typeof input.cursor | undefined = undefined;
      if (hasMore && resultRows.length > 0) {
        const lastRow = resultRows[resultRows.length - 1];

        nextCursor = {
          id: lastRow?.id ?? "",
          value: null,
        };
      }

      return {
        rows: resultRows,
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
