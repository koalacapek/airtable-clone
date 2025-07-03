import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  // publicProcedure,
} from "~/server/api/trpc";

export const cellRouter = createTRPCRouter({
  createCell: protectedProcedure
    .input(z.object({ cellId: z.string(), value: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.cell.update({
        where: { id: input.cellId },
        data: {
          value: input.value,
        },
      });

      if (!base) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cell not found",
        });
      }
    }),
});
