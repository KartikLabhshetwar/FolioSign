import {
  protectedProcedure, publicProcedure,
  router,
} from "../lib/trpc";
import { documentRouter } from "./document";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  document: documentRouter,
});
export type AppRouter = typeof appRouter;
