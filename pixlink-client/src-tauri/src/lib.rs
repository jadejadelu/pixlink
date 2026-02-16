use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize)]
struct HttpRequest {
  url: String,
  method: String,
  headers: Option<Vec<(String, String)>>,
  body: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct HttpResponse {
  status: u16,
  body: String,
}

#[tauri::command]
async fn http_request(request: HttpRequest) -> Result<HttpResponse, String> {
  let client = reqwest::Client::new();
  
  let mut req_builder = match request.method.as_str() {
    "GET" => client.get(&request.url),
    "POST" => client.post(&request.url),
    "PUT" => client.put(&request.url),
    "DELETE" => client.delete(&request.url),
    _ => return Err(format!("Unsupported HTTP method: {}", request.method)),
  };
  
  if let Some(headers) = request.headers {
    for (key, value) in headers {
      req_builder = req_builder.header(&key, &value);
    }
  }
  
  let response = if let Some(body) = request.body {
    req_builder.body(body).send().await
  } else {
    req_builder.send().await
  };
  
  match response {
    Ok(resp) => {
      let status = resp.status().as_u16();
      let body = match resp.text().await {
        Ok(text) => text,
        Err(e) => return Err(format!("Failed to read response body: {}", e)),
      };
      
      Ok(HttpResponse { status, body })
    }
    Err(e) => Err(format!("HTTP request failed: {}", e)),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
