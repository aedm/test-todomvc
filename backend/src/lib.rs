pub mod todo;

#[cfg(feature = "worker")]
mod handlers;

#[cfg(feature = "worker")]
mod entry {
    use crate::handlers;
    use worker::*;

    #[event(fetch)]
    pub async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
        let router = Router::new();
        router
            .get_async("/api/todos", |_, ctx| async move {
                handlers::list_todos(ctx).await
            })
            .post_async("/api/todos", |req, ctx| async move {
                handlers::create_todo(req, ctx).await
            })
            .patch_async("/api/todos/:id", |req, ctx| async move {
                handlers::update_todo(req, ctx).await
            })
            .delete_async("/api/todos/:id", |_, ctx| async move {
                handlers::delete_todo(ctx).await
            })
            .get("/api/health", |_, _| Response::ok("ok"))
            .or_else_any_method_async("/api/*catchall", |_, _| async move {
                Response::error("Not Found", 404)
            })
            .run(req, env)
            .await
    }
}
