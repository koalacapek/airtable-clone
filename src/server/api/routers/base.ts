import { faker } from "@faker-js/faker";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  // publicProcedure,
} from "~/server/api/trpc";

export const baseRouter = createTRPCRouter({
  create: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const name = "Untitled Base";

    // Pastel color palette for bases
    const pastelColors = [
      "bg-red-200/80",
      "bg-orange-200/80",
      "bg-amber-200/80",
      "bg-lime-200/80",
      "bg-emerald-200/80",
      "bg-cyan-200/80",
      "bg-sky-200/80",
      "bg-indigo-200/80",
      "bg-fuchsia-200/80",
      "bg-rose-200/80",
    ] as const;

    const color = pastelColors[Math.floor(Math.random() * pastelColors.length)];

    const base = await ctx.db.base.create({
      data: {
        name,
        color,
        userId,
        tables: {
          create: [
            {
              name: "Table 1",
            },
          ],
        },
      },
      include: {
        tables: true,
      },
    });

    const table = base.tables[0];
    if (!table) throw new Error("Failed to create default table");

    // Default columns including #
    const defaultColumns = [
      { name: "#", type: "TEXT" as const, tableId: table.id },
      { name: "Name", type: "TEXT" as const, tableId: table.id },
      { name: "Age", type: "NUMBER" as const, tableId: table.id },
    ];

    await ctx.db.column.createMany({ data: defaultColumns });

    const columns = await ctx.db.column.findMany({
      where: { tableId: table.id },
    });

    const rowNumberCol = columns.find((c) => c.name === "#");
    const nameCol = columns.find((c) => c.name === "Name");
    const ageCol = columns.find((c) => c.name === "Age");

    if (!rowNumberCol || !nameCol || !ageCol) {
      throw new Error("Default columns not found");
    }

    // Generate 5 rows with faker
    const rowsToCreate = Array.from({ length: 20 }).map((_) => ({
      tableId: table.id,
      cells: {
        create: [
          { columnId: rowNumberCol.id, value: "" },
          { columnId: nameCol.id, value: faker.person.fullName() },
          {
            columnId: ageCol.id,
            value: faker.number.int({ min: 18, max: 65 }).toString(),
          },
        ],
      },
    }));

    await ctx.db.row.createMany({
      data: rowsToCreate.map((r) => ({ tableId: r.tableId })),
    });

    const createdRows = await ctx.db.row.findMany({
      where: { tableId: table.id },
      orderBy: { createdAt: "asc" },
    });

    const cellsToCreate = createdRows.flatMap((row) => [
      { rowId: row.id, columnId: rowNumberCol.id, value: "" },
      { rowId: row.id, columnId: nameCol.id, value: faker.person.fullName() },
      {
        rowId: row.id,
        columnId: ageCol.id,
        value: faker.number.int({ min: 18, max: 65 }).toString(),
      },
    ]);

    await ctx.db.cell.createMany({ data: cellsToCreate });

    // Create a default "Grid View" for the table
    await ctx.db.view.create({
      data: {
        name: "Grid View",
        tableId: table.id,
        filters: {},
        sort: {},
        hiddenColumns: [],
      },
    });

    return base;
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const bases = await ctx.db.base.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return bases;
  }),

  rename: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.base.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: {
          name: input.name?.trim() ?? "Untitled Base",
        },
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cell not found",
        });
      }

      return base;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.base.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      return { success: true };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const base = await ctx.db.base.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
        });
      }

      return base;
    }),
});
