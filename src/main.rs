// 健康循环提醒 - 桌面版主程序
// 支持自动更新、系统通知、后台运行

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem, CustomMenuItem};
use tauri::api::notification::Notification;

fn main() {
    // 创建系统托盘菜单
    let quit = CustomMenuItem::new("quit".to_string(), "退出");
    let hide = CustomMenuItem::new("hide".to_string(), "隐藏");
    let show = CustomMenuItem::new("show".to_string(), "显示");
    let check_update = CustomMenuItem::new("check_update".to_string(), "检查更新");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(check_update)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            window.show().unwrap();
            
            // 检查更新（异步）
            let app_handle = app.handle();
            tauri::async_runtime::spawn(async move {
                // 延迟5秒后检查更新，避免影响启动速度
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                
                // 使用 Tauri 的 updater API 检查更新
                match tauri::updater::builder(app_handle.clone()).check().await {
                    Ok(update) => {
                        if update.is_update_available() {
                            // 发送事件到前端，显示更新提示
                            app_handle.emit_all("update-available", {
                                let mut map = std::collections::HashMap::new();
                                map.insert("version", update.latest_version().to_string());
                                map.insert("date", update.date().map(|d| d.to_string()).unwrap_or_default());
                                map
                            }).unwrap();
                        }
                    }
                    Err(e) => {
                        println!("检查更新失败: {:?}", e);
                    }
                }
            });
            
            Ok(())
        })
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| {
            match event {
                SystemTrayEvent::LeftClick {
                    position: _,
                    size: _,
                    ..
                } => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                SystemTrayEvent::MenuItemClick { id, .. } => {
                    match id.as_str() {
                        "quit" => {
                            std::process::exit(0);
                        }
                        "hide" => {
                            let window = app.get_window("main").unwrap();
                            window.hide().unwrap();
                        }
                        "show" => {
                            let window = app.get_window("main").unwrap();
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                        "check_update" => {
                            let app_handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                match tauri::updater::builder(app_handle.clone()).check().await {
                                    Ok(update) => {
                                        if update.is_update_available() {
                                            // 提示用户更新
                                            let window = app_handle.get_window("main").unwrap();
                                            window.emit("update-available", {
                                                let mut map = std::collections::HashMap::new();
                                                map.insert("version", update.latest_version().to_string());
                                                map.insert("date", update.date().map(|d| d.to_string()).unwrap_or_default());
                                                map
                                            }).unwrap();
                                        } else {
                                            // 已是最新
                                            let window = app_handle.get_window("main").unwrap();
                                            window.emit("update-not-available", {}).unwrap();
                                        }
                                    }
                                    Err(e) => {
                                        println!("检查更新失败: {:?}", e);
                                    }
                                }
                            });
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        })
        .on_window_event(|event| {
            match event.event() {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    // 点击关闭按钮时最小化到托盘，而不是退出
                    event.window().hide().unwrap();
                    api.prevent_close();
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
