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
      const rowData = Array.from({ length: 137 }).map(() => ({
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
        limit: z.number().max(100).default(50),
        cursor: z.string().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
        filters: z.record(z.any()).optional(),
        sort: z.record(z.any()).optional(),
        hiddenColumns: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tableId, limit, cursor, filters, sort } = input;
      // Build where conditions for filtering
      let whereConditions: Prisma.RowWhereInput = { tableId };
      // If filter conditions exist

      if (filters && Object.keys(filters).length > 0) {
        const columns = await ctx.db.column.findMany({
          where: { tableId },
        });

        // For each filter, we need to check if the row has a cell with the matching value
        const filterConditions: Prisma.RowWhereInput[] = Object.entries(filters)
          .map(([columnName, filterConfig]) => {
            const column = columns.find((col) => col.name === columnName);
            if (!column) return null;
            console.log("lol", columnName, filterConfig);

            if (
              filterConfig &&
              typeof filterConfig === "object" &&
              filterConfig !== null &&
              "op" in filterConfig
            ) {
              const filterOp = (filterConfig as { op: string }).op;

              if (filterOp === "is_empty") {
                return {
                  cells: {
                    none: {
                      columnId: column.id,
                    },
                  },
                } as Prisma.RowWhereInput;
              } else if (filterOp === "is_not_empty") {
                return {
                  cells: {
                    some: {
                      columnId: column.id,
                    },
                  },
                } as Prisma.RowWhereInput;
              } else if (filterOp === "contains") {
                return {
                  cells: {
                    some: {
                      columnId: column.id,
                      value: {
                        contains: (filterConfig as { value: string }).value,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                } as Prisma.RowWhereInput;
              } else if (filterOp === "not_contains") {
                return {
                  AND: [
                    {
                      cells: {
                        some: {
                          columnId: column.id,
                        },
                      },
                    },
                    {
                      cells: {
                        none: {
                          columnId: column.id,
                          value: {
                            contains: (filterConfig as { value: string }).value,
                            mode: "insensitive" as const,
                          },
                        },
                      },
                    },
                  ],
                } as Prisma.RowWhereInput;
              } else if (filterOp === "equal") {
                return {
                  cells: {
                    some: {
                      columnId: column.id,
                      value: {
                        equals: (filterConfig as { value: string }).value,
                      },
                    },
                  },
                } as Prisma.RowWhereInput;
              } else if (filterOp === "greater") {
                return {
                  cells: {
                    some: {
                      columnId: column.id,
                      value: {
                        gt: (filterConfig as { value: string }).value,
                      },
                    },
                  },
                } as Prisma.RowWhereInput;
              } else if (filterOp === "smaller") {
                return {
                  cells: {
                    some: {
                      columnId: column.id,
                      value: {
                        lt: (filterConfig as { value: string }).value,
                      },
                    },
                  },
                } as Prisma.RowWhereInput;
              }
            }
            return null;
          })
          .filter(
            (condition): condition is Prisma.RowWhereInput =>
              condition !== null,
          );

        if (filterConditions.length > 0) {
          whereConditions = {
            ...whereConditions,
            AND: filterConditions,
          };
        }
      }

      // If sort conditions exist
      if (sort && Object.keys(sort).length > 0) {
        const sortEntries = Object.entries(sort);

        if (sortEntries.length > 0) {
          const firstSortEntry = sortEntries[0];
          if (firstSortEntry) {
            const [columnName, sortConfig] = firstSortEntry as [
              string,
              { direction: "asc" | "desc" },
            ];
            const sortDirection = sortConfig?.direction ?? "asc";

            // Get the column for sorting
            const columns = await ctx.db.column.findMany({
              where: { tableId: tableId },
            });
            const column = columns.find((col) => col.name === columnName);

            if (column) {
              // For sorting by cell values, we need to use a different approach
              // Since we can't directly sort by related table values in Prisma,
              // we'll fetch all rows and sort them in memory, but with proper pagination
              const allRows = await ctx.db.row.findMany({
                where: whereConditions,
                include: { cells: true },
              });

              // Sort by the specific column
              allRows.sort((a, b) => {
                const aCell = a.cells.find((c) => c.columnId === column.id);
                const bCell = b.cells.find((c) => c.columnId === column.id);

                const aValue = aCell?.value ?? "";
                const bValue = bCell?.value ?? "";

                if (sortDirection === "asc") {
                  return aValue.localeCompare(bValue);
                } else {
                  return bValue.localeCompare(aValue);
                }
              });

              // Apply pagination
              let startIndex = 0;
              if (cursor) {
                // Find the cursor position in the sorted array
                const cursorIndex = allRows.findIndex(
                  (row) => row.id === cursor,
                );
                if (cursorIndex >= 0) {
                  // Start AFTER the cursor position
                  startIndex = cursorIndex + 1;
                }
              }

              // Get the next batch of rows
              const paginatedRows = allRows.slice(
                startIndex,
                startIndex + limit,
              );

              // Determine if there are more rows after this batch
              const hasMore = startIndex + limit < allRows.length;
              let nextCursor: string | undefined = undefined;

              if (hasMore && paginatedRows.length > 0) {
                // The cursor should be the ID of the last row in the current batch
                nextCursor = paginatedRows[paginatedRows.length - 1]?.id;
              }

              return {
                rows: paginatedRows,
                nextCursor,
              };
            }
          }
        }
      }
      // If no sorting is applied, use regular pagination
      const rows = await ctx.db.row.findMany({
        where: whereConditions,
        cursor: cursor ? { id: cursor } : undefined,
        include: { cells: true },
        take: limit + 1,
      });

      let nextCursor: string | undefined = undefined;
      if (rows.length > limit) {
        const nextItem = rows.pop();
        nextCursor = nextItem!.id;
        // console.log("lol", nextCursor);
      }

      return {
        rows,
        nextCursor,
      };
    }),
});
