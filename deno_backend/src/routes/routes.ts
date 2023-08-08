import { Router, send } from "../deps.ts";
import * as indexCtrl from "../controllers/user_controller.ts";

const router = new Router();

router.get("/", async (ctx) => {
  await send(ctx, ctx.request.url.pathname, {
    root: `${Deno.cwd()}/deno_backend/static`,
    index: "index.html",
  });
});

router
  .get("/users", indexCtrl.getUsers)
  .post("/users", indexCtrl.createUser)
  .get("/users/:id", indexCtrl.getUser)
  .put("/users/:id", indexCtrl.updateUser)
  .delete("/users/:id", indexCtrl.deleteUser);

export default router;