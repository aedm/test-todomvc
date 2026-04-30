use serde::{Deserialize, Serialize};

pub const MAX_TITLE_LEN: usize = 256;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub completed: bool,
    pub created_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateTodo {
    pub title: String,
}

#[derive(Debug, Deserialize, Default)]
pub struct UpdateTodo {
    pub title: Option<String>,
    pub completed: Option<bool>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum TodoError {
    EmptyTitle,
    TitleTooLong,
    NotFound,
    NoChanges,
}

impl TodoError {
    pub fn message(&self) -> &'static str {
        match self {
            TodoError::EmptyTitle => "title must not be empty",
            TodoError::TitleTooLong => "title exceeds 256 characters",
            TodoError::NotFound => "todo not found",
            TodoError::NoChanges => "no fields to update",
        }
    }

    pub fn status(&self) -> u16 {
        match self {
            TodoError::NotFound => 404,
            TodoError::NoChanges => 400,
            _ => 422,
        }
    }
}

pub fn validate_title(title: &str) -> Result<String, TodoError> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err(TodoError::EmptyTitle);
    }
    if trimmed.chars().count() > MAX_TITLE_LEN {
        return Err(TodoError::TitleTooLong);
    }
    Ok(trimmed.to_string())
}

pub fn validate_update(update: &UpdateTodo) -> Result<UpdateTodo, TodoError> {
    if update.title.is_none() && update.completed.is_none() {
        return Err(TodoError::NoChanges);
    }
    let title = match &update.title {
        Some(t) => Some(validate_title(t)?),
        None => None,
    };
    Ok(UpdateTodo {
        title,
        completed: update.completed,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_title_trims_and_accepts() {
        assert_eq!(validate_title("  hello  ").unwrap(), "hello");
    }

    #[test]
    fn validate_title_rejects_empty() {
        assert_eq!(validate_title("").unwrap_err(), TodoError::EmptyTitle);
        assert_eq!(validate_title("   ").unwrap_err(), TodoError::EmptyTitle);
    }

    #[test]
    fn validate_title_rejects_too_long() {
        let long = "x".repeat(MAX_TITLE_LEN + 1);
        assert_eq!(validate_title(&long).unwrap_err(), TodoError::TitleTooLong);
    }

    #[test]
    fn validate_title_accepts_at_max() {
        let max = "x".repeat(MAX_TITLE_LEN);
        assert_eq!(validate_title(&max).unwrap(), max);
    }

    #[test]
    fn validate_title_counts_chars_not_bytes() {
        // 256 multi-byte chars (each 2 bytes) is allowed; 257 is not
        let ok = "ñ".repeat(MAX_TITLE_LEN);
        assert_eq!(validate_title(&ok).unwrap().chars().count(), MAX_TITLE_LEN);
        let bad = "ñ".repeat(MAX_TITLE_LEN + 1);
        assert_eq!(validate_title(&bad).unwrap_err(), TodoError::TitleTooLong);
    }

    #[test]
    fn validate_update_requires_at_least_one_field() {
        let empty = UpdateTodo::default();
        assert_eq!(validate_update(&empty).unwrap_err(), TodoError::NoChanges);
    }

    #[test]
    fn validate_update_validates_title_if_present() {
        let bad = UpdateTodo {
            title: Some("".to_string()),
            completed: None,
        };
        assert_eq!(validate_update(&bad).unwrap_err(), TodoError::EmptyTitle);
    }

    #[test]
    fn validate_update_passes_completed_only() {
        let only_completed = UpdateTodo {
            title: None,
            completed: Some(true),
        };
        let v = validate_update(&only_completed).unwrap();
        assert_eq!(v.completed, Some(true));
        assert_eq!(v.title, None);
    }

    #[test]
    fn validate_update_trims_title() {
        let u = UpdateTodo {
            title: Some("  task  ".to_string()),
            completed: Some(false),
        };
        let v = validate_update(&u).unwrap();
        assert_eq!(v.title.as_deref(), Some("task"));
        assert_eq!(v.completed, Some(false));
    }

    #[test]
    fn error_status_codes() {
        assert_eq!(TodoError::NotFound.status(), 404);
        assert_eq!(TodoError::EmptyTitle.status(), 422);
        assert_eq!(TodoError::TitleTooLong.status(), 422);
        assert_eq!(TodoError::NoChanges.status(), 400);
    }

    #[test]
    fn todo_serializes_to_json() {
        let t = Todo {
            id: "abc".into(),
            title: "buy milk".into(),
            completed: false,
            created_at: 1700000000,
        };
        let s = serde_json::to_string(&t).unwrap();
        assert!(s.contains("\"id\":\"abc\""));
        assert!(s.contains("\"title\":\"buy milk\""));
        assert!(s.contains("\"completed\":false"));
        assert!(s.contains("\"created_at\":1700000000"));
    }

    #[test]
    fn create_todo_deserializes() {
        let c: CreateTodo = serde_json::from_str(r#"{"title":"hello"}"#).unwrap();
        assert_eq!(c.title, "hello");
    }
}
