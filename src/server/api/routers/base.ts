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

    const base = await ctx.db.base.create({
      data: {
        name,
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

    // 🟨 Include Row Number as first column
    const defaultColumns = [
      { name: "#", type: "TEXT" as const, tableId: table.id },
      { name: "Name", type: "TEXT" as const, tableId: table.id },
      { name: "Age", type: "NUMBER" as const, tableId: table.id },
    ];

    await ctx.db.column.createMany({ data: defaultColumns });

    // Refetch columns to get their IDs
    const columns = await ctx.db.column.findMany({
      where: { tableId: table.id },
    });

    const rowNumberCol = columns.find((c) => c.name === "#");
    const nameCol = columns.find((c) => c.name === "Name");
    const ageCol = columns.find((c) => c.name === "Age");

    if (!rowNumberCol || !nameCol || !ageCol) {
      throw new Error("Default columns not found");
    }

    // 🟨 Create initial row with value "1" for the row number
    await ctx.db.row.create({
      data: {
        tableId: table.id,
        cells: {
          create: [
            { columnId: rowNumberCol.id, value: "1" },
            { columnId: nameCol.id, value: "John Doe" },
            { columnId: ageCol.id, value: "30" },
          ],
        },
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
      const base = await ctx.db.base.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      return base;
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

  // createTable: protectedProcedure
  //   .input(z.object({ baseId: z.string(), name: z.string().optional() }))
  //   .mutation(async ({ ctx, input }) => {
  //     const base = await ctx.db.base.findFirst({
  //       where: { id: input.baseId, userId: ctx.session.user.id },
  //     });

  //     if (!base) {
  //       throw new TRPCError({
  //         code: "NOT_FOUND",
  //         message: "Base not found",
  //       });
  //     }

  //     const count = await ctx.db.table.count({
  //       where: { baseId: input.baseId },
  //     });

  //     const table = await ctx.db.table.create({
  //       data: {
  //         name: input.name?.trim() ?? `Table ${count + 1}`,
  //         baseId: input.baseId,
  //       },
  //     });

  //     return table;
  //   }),
});
