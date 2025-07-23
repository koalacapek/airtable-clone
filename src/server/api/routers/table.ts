import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { faker } from "@faker-js/faker";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { Prisma } from "@prisma/client";
import { processFilters } from "~/server/utils/table";

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

      // Determine default name: "Table N" where N is next integer not already used
      const existingTables = await ctx.db.table.findMany({
        where: { baseId: input.baseId },
        select: { name: true },
      });

      const nextTableNumber = (() => {
        const nums = existingTables
          .map((t) => /^Table\s+(\d+)$/.exec(t.name ?? "")?.[1])
          .filter(Boolean)
          .map(Number);
        return nums.length > 0
          ? Math.max(...nums) + 1
          : existingTables.length + 1;
      })();

      const table = await ctx.db.table.create({
        data: {
          name: input.name?.trim() ?? `Table ${nextTableNumber}`,
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
      const rowData = Array.from({ length: 20 }).map(() => ({
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

  deleteTable: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.table.delete({
        where: { id: input.id, base: { userId: ctx.session.user.id } },
      });
      return { success: true };
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
      });

      if (sort && Object.keys(sort).length > 0) {
        // Support multi-column sorting instead of only the first sort key
        const rawEntries = Object.entries(sort) as [
          string,
          { direction: "asc" | "desc"; order?: number },
        ][];

        // Sort entries by the explicit `order` property if provided, otherwise by original insertion index
        const sortEntries = rawEntries
          .slice() // copy to avoid mutating original
          .sort((a, b) => {
            const orderA =
              (a[1] as { order?: number }).order ?? rawEntries.indexOf(a);
            const orderB =
              (b[1] as { order?: number }).order ?? rawEntries.indexOf(b);
            return orderA - orderB;
          }) as [string, { direction: "asc" | "desc"; order?: number }][];

        // Resolve the Prisma column objects for each sorted entry
        const sortColumns = sortEntries
          .map(([name, cfg]) => {
            const col = columns.find((c) => c.name === name);
            if (!col) return null;
            return { column: col, direction: cfg.direction } as const;
          })
          .filter(Boolean) as {
          column: (typeof columns)[number];
          direction: "asc" | "desc";
        }[];

        if (sortColumns.length > 0) {
          // Build the SELECT part – we alias the first column as sort_value for cursor handling
          let sql = `\n            SELECT r.id, r."tableId", c0.value as sort_value`;
          if (sortColumns.length > 1) {
            for (let i = 1; i < sortColumns.length; i++) {
              sql += `, c${i}.value as sort_value_${i}`;
            }
          }
          sql += `\n            FROM "Row" r`;

          // Build the JOINs for each sort column and collect params for their columnIds
          const params: (string | number | null)[] = [];
          sortColumns.forEach(({ column }, idx) => {
            sql += ` LEFT JOIN "Cell" c${idx} ON r.id = c${idx}."rowId" AND c${idx}."columnId" = $${params.length + 1}`;
            params.push(column.id);
          });

          // Table filter
          sql += ` WHERE r."tableId" = $${params.length + 1}`;
          params.push(tableId);

          // The next available placeholder index
          let paramIndex = params.length + 1;

          // Optional filters
          if (filters && Object.keys(filters).length > 0) {
            const { condition, newParamIndex, moreParams } = processFilters(
              filters,
              columns,
              paramIndex,
            );
            if (condition) {
              sql += ` AND ${condition}`;
              params.push(...moreParams);
              paramIndex = newParamIndex;
            }
          }

          // Cursor based on the PRIMARY (first) sort column – this guarantees deterministic
          // paging while still allowing secondary/tertiary columns for tie-breaking.
          const primarySort = sortColumns[0];
          if (cursor) {
            const sortDir = primarySort?.direction === "asc" ? "ASC" : "DESC";
            if (cursor.value !== null) {
              if (primarySort?.column.type === "NUMBER") {
                if (sortDir === "ASC") {
                  sql += ` AND (\n                    CAST(COALESCE(NULLIF(c0.value, ''), '0') AS DECIMAL) > CAST($${paramIndex} AS DECIMAL) OR\n                    (CAST(COALESCE(NULLIF(c0.value, ''), '0') AS DECIMAL) = CAST($${paramIndex} AS DECIMAL) AND r.id > $${paramIndex + 1})\n                  )`;
                } else {
                  sql += ` AND (\n                    CAST(COALESCE(NULLIF(c0.value, ''), '0') AS DECIMAL) < CAST($${paramIndex} AS DECIMAL) OR\n                    (CAST(COALESCE(NULLIF(c0.value, ''), '0') AS DECIMAL) = CAST($${paramIndex} AS DECIMAL) AND r.id > $${paramIndex + 1})\n                  )`;
                }
              } else {
                if (sortDir === "ASC") {
                  sql += ` AND (\n                    LOWER(COALESCE(c0.value, '')) > LOWER($${paramIndex}) OR\n                    (LOWER(COALESCE(c0.value, '')) = LOWER($${paramIndex}) AND r.id > $${paramIndex + 1})\n                  )`;
                } else {
                  sql += ` AND (\n                    LOWER(COALESCE(c0.value, '')) < LOWER($${paramIndex}) OR\n                    (LOWER(COALESCE(c0.value, '')) = LOWER($${paramIndex}) AND r.id > $${paramIndex + 1})\n                  )`;
                }
              }
              params.push(cursor.value, cursor.id);
              paramIndex += 2;
            } else {
              // Handle null cursor values
              if (sortDir === "ASC") {
                sql += ` AND (c0.value IS NOT NULL OR r.id > $${paramIndex})`;
              } else {
                sql += ` AND r.id > $${paramIndex}`;
              }
              params.push(cursor.id);
              paramIndex += 1;
            }
          }

          // ORDER BY clauses for all sort columns, with row.id as final deterministic tiebreaker
          const orderClauses: string[] = sortColumns.map(
            ({ column, direction }, idx) => {
              const dir = direction.toUpperCase() === "ASC" ? "ASC" : "DESC";
              if (column.type === "NUMBER") {
                return `CAST(COALESCE(NULLIF(c${idx}.value, ''), '0') AS DECIMAL) ${dir}`;
              }
              return `LOWER(COALESCE(c${idx}.value, '')) ${dir}`;
            },
          );
          orderClauses.push("r.id ASC");
          sql += ` ORDER BY ${orderClauses.join(", ")}`;

          // Limit
          sql += ` LIMIT $${paramIndex}`;
          params.push(limit + 1);

          // Execute query
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          const sortedRows = (await ctx.db.$queryRawUnsafe(sql, ...params)) as {
            id: string;
            tableId: string;
            sort_value: string | null;
          }[];

          const hasMore = sortedRows.length > limit;
          const resultRowIds = sortedRows.slice(0, limit).map((r) => r.id);

          if (resultRowIds.length === 0) {
            return {
              rows: [],
              nextCursor: undefined,
            } as const;
          }

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

          const orderedRows = resultRowIds.map(
            (id) => fullRows.find((row) => row.id === id)!,
          );

          let nextCursor: typeof input.cursor | undefined = undefined;
          if (hasMore) {
            const lastRow = sortedRows[limit - 1];
            nextCursor = {
              id: lastRow?.id ?? "",
              value: lastRow?.sort_value ?? null,
            };
          }

          return {
            rows: orderedRows,
            nextCursor,
          } as const;
        }
      }

      // If no sorting, use the simpler approach with proper filtering
      const rowWhereClause: Prisma.RowWhereInput = {
        tableId,
      };

      // Handle cursor pagination
      if (cursor) {
        rowWhereClause.id = {
          gt: cursor.id,
        };
      }

      // For the non-sorted case
      if (filters && Object.keys(filters).length > 0) {
        // Use raw SQL for filtering even in the non-sorted case
        let sql = `
          SELECT DISTINCT r.id, r."tableId"
          FROM "Row" r
          WHERE r."tableId" = $1
        `;

        const params: (string | number | null)[] = [tableId];
        let paramIndex = 2;

        // Add cursor condition
        if (cursor) {
          sql += ` AND r.id > $${paramIndex}`;
          params.push(cursor.id);
          paramIndex++;
        }

        // Add filter conditions
        const {
          condition: filterCondition,
          newParamIndex,
          moreParams,
        } = processFilters(filters, columns, paramIndex);

        if (filterCondition) {
          sql += ` AND ${filterCondition}`;
          params.push(...moreParams);
          paramIndex = newParamIndex;
        }

        sql += ` ORDER BY r.id ASC LIMIT $${paramIndex}`;
        params.push(limit + 1);

        // Execute the query to get filtered row IDs
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const filteredRowIds = (await ctx.db.$queryRawUnsafe(
          sql,
          ...params,
        )) as {
          id: string;
          tableId: string;
        }[];

        // Check if there are more rows
        const hasMore = filteredRowIds.length > limit;
        const resultRowIds = filteredRowIds.slice(0, limit);

        if (resultRowIds.length === 0) {
          return {
            rows: [],
            nextCursor: undefined,
          };
        }

        // Get full row data
        const fullRows = await ctx.db.row.findMany({
          where: {
            id: { in: resultRowIds.map((r) => r.id) },
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
          orderBy: {
            id: "asc",
          },
        });

        // Determine next cursor
        let nextCursor: typeof input.cursor | undefined = undefined;
        if (hasMore && fullRows.length > 0) {
          const lastRow = fullRows[fullRows.length - 1];
          nextCursor = {
            id: lastRow?.id ?? "",
            value: null,
          };
        }

        return {
          rows: fullRows,
          nextCursor,
        };
      }

      // Original simple case (no filters, no sorting)
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

      // Handle pagination
      const hasMore = rows.length > limit;
      const resultRows = rows.slice(0, limit);

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
      });

      // Use single raw SQL to fetch matching cells when filters are applied
      if (filters && Object.keys(filters).length > 0) {
        let sql = `
          SELECT c.id, c."rowId", c."columnId"
          FROM "Row" r
          JOIN "Cell" c ON c."rowId" = r.id
          WHERE r."tableId" = $1
        `;

        const params: (string | number | null)[] = [tableId];
        let paramIndex = 2;

        // Append filter conditions via helper
        const { condition: filterCondition, moreParams } = processFilters(
          filters,
          columns,
          paramIndex,
        );
        if (filterCondition) {
          sql += ` AND ${filterCondition}`;
          params.push(...moreParams);
          paramIndex += moreParams.length;
        }

        // Exclude hidden columns
        if (hiddenColumns.length > 0) {
          const placeholders = hiddenColumns
            .map((_, idx) => `$${paramIndex + idx}`)
            .join(", ");
          sql += ` AND c."columnId" NOT IN (${placeholders})`;
          params.push(...hiddenColumns);
          paramIndex += hiddenColumns.length;
        }

        // Search value match (case-insensitive)
        sql += ` AND c.value ILIKE $${paramIndex}`;
        params.push(`%${searchValue.trim()}%`);

        // Execute query
        const cells = await ctx.db.$queryRawUnsafe<
          { id: string; rowId: string; columnId: string }[]
        >(sql, ...params);

        return cells;
      }

      // If no filters, proceed with existing simple query
      const cells = await ctx.db.cell.findMany({
        where: {
          row: {
            tableId,
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

      // after we
      return cells;
    }),

  getTotalRows: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.row.count({
        where: { tableId: input.tableId },
      });
      return rows;
    }),
});
