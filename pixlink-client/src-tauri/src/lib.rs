use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::process::{Child, Command};
use std::sync::Mutex;

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

#[tauri::command]
async fn start_ztm_agent(hub_address: String, endpoint: String, port: String) -> Result<String, String> {
  let ztm_path = std::env::current_exe()
    .map_err(|e| format!("Failed to get executable path: {}", e))?
    .parent()
    .ok_or("Failed to get parent directory")?
    .join("ztm");
  
  if !ztm_path.exists() {
    return Err(format!("ZTM binary not found at {:?}", ztm_path));
  }
  
  let data_dir = std::env::var("HOME")
    .map_err(|e| format!("Failed to get HOME directory: {}", e))?
    + "/.ztm";
  
  std::fs::create_dir_all(&data_dir)
    .map_err(|e| format!("Failed to create data directory: {}", e))?;
  
  let output = Command::new(&ztm_path)
    .args([
      "run",
      "agent",
      "--listen",
      &format!("0.0.0.0:{}", port),
      "--join",
      &hub_address,
      "--join-as",
      &endpoint,
      "--data",
      &data_dir,
    ])
    .spawn()
    .map_err(|e| format!("Failed to start ZTM agent: {}", e))?;
  
  Ok(format!("ZTM agent started with PID: {:?}", output.id()))
}

#[tauri::command]
async fn stop_ztm_agent() -> Result<String, String> {
  let output = Command::new("pkill")
    .args(["-f", "ztm run agent"])
    .output()
    .map_err(|e| format!("Failed to stop ZTM agent: {}", e))?;
  
  if output.status.success() {
    Ok("ZTM agent stopped successfully".to_string())
  } else {
    Ok("No ZTM agent process found".to_string())
  }
}

#[tauri::command]
async fn check_ztm_status() -> Result<bool, String> {
  let output = Command::new("pgrep")
    .args(["-f", "ztm run agent"])
    .output()
    .map_err(|e| format!("Failed to check ZTM status: {}", e))?;
  
  Ok(output.status.success())
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
    .invoke_handler(tauri::generate_handler![
      http_request,
      start_ztm_agent,
      stop_ztm_agent,
      check_ztm_status
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
