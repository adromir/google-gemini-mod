<div align="center">

# 🚀 Google Gemini Mod for Ferdium

![Version](https://img.shields.io/badge/version-2.5.0-blue?style=for-the-badge&logo=google-gemini)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/status-Active-success?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Ferdium-orange?style=for-the-badge)

**Supercharge your Google Gemini experience within Ferdium with a customizable toolbar, chat folders, and powerful export tools.**

[Report Bug](https://github.com/adromir/issues) · [Request Feature](https://github.com/adromir/issues)

</div>

---

## ✨ Features

### 🛠️ customizable Toolbar
Access your most-used prompts and actions instantly.
- **Snippet Buttons**: Insert pre-defined text with a single click.
- **Native Dropdowns**: Group related prompts into robust, native menus.
- **Drag & Drop Reordering**: Fully customize your toolbar layout.
- **Visibility Control**: Show or hide standard action buttons like Copy or PDF.

### 📂 Chat Organization
Keep your workspace clean and organized.
- **Folders**: Create named, colored folders to group your conversations.
- **Drag & Drop**: Easily drag chats into folders.
- **Context Menu**: Right-click folders to rename, recolor, or delete.
- **Persistence**: Your folder structure is saved automatically.

### ⚡ Productivity Actions
- **📋 Paste**: Quickly paste clipboard content.
- **📄 Copy**: Smart copy that prioritizes code blocks/Monaco editors.
- **💾 Download**: Download the active code or canvas content as a file.
- **📑 PDF Export**: Export the current view or code to a formatted PDF.

### ☁️ Secure Cloud Sync (Supabase)
- **Multi-User Security & Isolation**: Individual user accounts powered by Supabase Auth with Row-Level Security (RLS). Your configuration is strictly protected and isolated to your account.
- **Cross-App Synchronization**: Seamlessly sync your toolbar, folders, and conversation mappings between Ferdium and the browser Userscript.
- **Instant Signup & Login**: Enter your email and password to instantly create an account and backup/sync across all your machines.
- **Manual File Backup**: Export and import complete configuration `.json` files locally anytime as an offline fallback.

---

## ⚙️ Configuration

Click the **⚙️ Settings** button in the toolbar to open the configuration panel.

### Managing Toolbar Items
1.  **Add New**: Choose "Button" or "Dropdown" and click "Add Item".
2.  **Edit**: Change labels, snippet text, or placeholder names directly.
3.  **Reorder**: Drag items (including the Settings button) to change their position.
4.  **Show/Hide**: Toggle visibility for default actions (Copy, PDF, etc.).
5.  **Remove**: Click "Remove" to delete custom items.

### Managing Folders
1.  **Create**: Click "New Folder" in the chat sidebar.
2.  **Color**: Right-click a folder -> "Change Color".
3.  **Toggle**: Click the folder header to expand/collapse.

---

## 🔧 Technical Details

This mod uses a **Bridge Pattern** to overcome Electron's context isolation.
- **`webview.js`**: Handles UI rendering, events, and user settings.
- **`bridge.js`**: Runs in the main world context to access:
    - `window.monaco` (for code extraction)
    - `Sortable.js` (for drag-and-drop)
    - `jspdf` (for PDF generation)

---

## ⚠️ Disclaimer
This project is a community modification for Ferdium and is **not affiliated with, endorsed by, or connected to Google LLC**. "Google Gemini" is a trademark of Google LLC. Use this mod at your own risk.

## 📜 License
Distributed under the **MIT License**. See `LICENSE` for more information.

Copyright © 2025 [Adromir](https://github.com/adromir).

---

    Made with ❤️ by [Adromir](https://github.com/adromir)
