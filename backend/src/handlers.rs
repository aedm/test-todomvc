use crate::todo::{validate_title, validate_update, CreateTodo, Todo, TodoError, UpdateTodo};
use worker::*;

const DB_BINDING: &str = "DB";

fn cors_headers() -> Result<Headers> {
    let mut h = Headers::new();
    h.set("access-control-allow-origin", "*")?;
    h.set("access-control-allow-methods", "GET, POST, PATCH, DELETE, OPTIONS")?;
    h.set("access-control-allow-headers", "content-type")?;
    Ok(h)
}

fn json_response<T: serde::Serialize>(value: &T, status: u16) -> Result<Response> {
    let body = serde_json::to_string(value)?;
    let mut headers = cors_headers()?;
    headers.set("content-type", "application/json")?;
    Ok(Response::ok(body)?.with_status(status).with_headers(headers))
}

fn error_response(err: TodoError) -> Result<Response> {
    let body = serde_json::json!({ "error": err.message() }).to_string();
    let mut headers = cors_headers()?;
    headers.set("content-type", "application/json")?;
    Ok(Response::ok(body)?.with_status(err.status()).with_headers(headers))
}

fn bad_request(msg: &str) -> Result<Response> {
    let body = serde_json::json!({ "error": msg }).to_string();
    let mut headers = cors_headers()?;
    headers.set("content-type", "application/json")?;
    Ok(Response::ok(body)?.with_status(400).with_headers(headers))
}

#[derive(serde::Deserialize)]
struct TodoRow {
    id: String,
    title: String,
    completed: i64,
    created_at: i64,
}

impl From<TodoRow> for Todo {
    fn from(r: TodoRow) -> Todo {
        Todo {
            id: r.id,
            title: r.title,
            completed: r.completed != 0,
            created_at: r.created_at,
        }
    }
}

fn db(ctx: &RouteContext<()>) -> Result<D1Database> {
    ctx.env.d1(DB_BINDING)
}

pub async fn list_todos(ctx: RouteContext<()>) -> Result<Response> {
    let db = db(&ctx)?;
    let stmt = db.prepare(
        "SELECT id, title, completed, created_at FROM todos ORDER BY created_at DESC",
    );
    let result = stmt.all().await?;
    let rows: Vec<TodoRow> = result.results()?;
    let todos: Vec<Todo> = rows.into_iter().map(Todo::from).collect();
    json_response(&todos, 200)
}

pub async fn create_todo(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let payload: CreateTodo = match req.json().await {
        Ok(p) => p,
        Err(_) => return bad_request("invalid JSON body"),
    };
    let title = match validate_title(&payload.title) {
        Ok(t) => t,
        Err(e) => return error_response(e),
    };
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = Date::now().as_millis() as i64;
    let created_at_f = created_at as f64;

    let db = db(&ctx)?;
    let stmt = db
        .prepare("INSERT INTO todos (id, title, completed, created_at) VALUES (?1, ?2, 0, ?3)")
        .bind_refs(&[
            D1Type::Text(&id),
            D1Type::Text(&title),
            D1Type::Real(created_at_f),
        ])?;
    stmt.run().await?;

    let todo = Todo {
        id,
        title,
        completed: false,
        created_at,
    };
    json_response(&todo, 201)
}

pub async fn update_todo(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let id = match ctx.param("id") {
        Some(id) => id.clone(),
        None => return bad_request("missing id"),
    };
    let payload: UpdateTodo = match req.json().await {
        Ok(p) => p,
        Err(_) => return bad_request("invalid JSON body"),
    };
    let validated = match validate_update(&payload) {
        Ok(v) => v,
        Err(e) => return error_response(e),
    };

    let db = db(&ctx)?;

    // Build dynamic UPDATE preserving fields not provided. Owned strings keep
    // bind_refs lifetimes simple.
    let title_owned = validated.title.clone();
    let completed_int: Option<i32> = validated.completed.map(|c| if c { 1 } else { 0 });

    let mut sets: Vec<&str> = Vec::new();
    let mut binds: Vec<D1Type> = Vec::new();
    if let Some(t) = title_owned.as_deref() {
        sets.push("title = ?");
        binds.push(D1Type::Text(t));
    }
    if let Some(c) = completed_int.as_ref() {
        sets.push("completed = ?");
        binds.push(D1Type::Integer(*c));
    }
    binds.push(D1Type::Text(&id));

    let sql = format!(
        "UPDATE todos SET {} WHERE id = ? RETURNING id, title, completed, created_at",
        sets.join(", ")
    );
    let stmt = db.prepare(&sql).bind_refs(binds.iter())?;
    let row: Option<TodoRow> = stmt.first(None).await?;
    match row {
        Some(r) => json_response::<Todo>(&r.into(), 200),
        None => error_response(TodoError::NotFound),
    }
}

pub async fn delete_todo(ctx: RouteContext<()>) -> Result<Response> {
    let id = match ctx.param("id") {
        Some(id) => id.clone(),
        None => return bad_request("missing id"),
    };
    let db = db(&ctx)?;
    let stmt = db
        .prepare("DELETE FROM todos WHERE id = ?")
        .bind_refs(&[D1Type::Text(&id)])?;
    let result = stmt.run().await?;
    let changes = result.meta()?.and_then(|m| m.changes).unwrap_or(0);
    if changes == 0 {
        return error_response(TodoError::NotFound);
    }
    let mut headers = cors_headers()?;
    headers.set("content-type", "application/json")?;
    Ok(Response::ok("")?.with_status(204).with_headers(headers))
}
