# 🚀 Google Gemini Mod for Ferdium

![Version](https://img.shields.io/badge/Version-0.6.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Platform](https://img.shields.io/badge/Platform-Ferdium-brightgreen.svg)

A powerful enhancement script for the Google Gemini web interface, designed to run as a Ferdium recipe. This mod introduces a suite of features aimed at improving productivity and organization, including a customizable quick-access toolbar, drag-and-drop chat folders, and a content download utility.

---

## ✨ Key Features

* **📌 Customizable Toolbar:** A floating toolbar at the top of the screen for quick access to predefined text snippets, clipboard content, and other actions.
* **🗂️ Drag & Drop Folders:** Organize your Gemini conversations into collapsible, color-coded folders directly in the chat history sidebar.
* **⚙️ Graphical Settings Manager:** An intuitive interface to add, remove, and reorder toolbar buttons and dropdowns. No more manual JSON editing!
* **💾 Canvas Downloader:** A one-click tool to download the content from an active "code canvas" or "document canvas" as a text file.
* **🎨 Folder Customization:** Rename folders, assign custom colors, and easily manage your chat organization.
* **🖱️ Lightweight D&D:** Uses a custom, zero-dependency drag-and-drop implementation for smooth and reliable performance within the Gemini interface.

---

## 🔧 Installation

You can install this recipe either manually or by using Git.

### Method 1: Using Git (Recommended)

This method allows for easy updates.

1.  Open a terminal or command prompt.
2.  Navigate to your Ferdium recipes directory:
    * **Windows:** `cd %APPDATA%\Ferdium\recipes\`
    * **macOS:** `cd ~/Library/Application\ Support/Ferdium/recipes/`
    * **Linux:** `cd ~/.config/Ferdium/recipes/`
3.  Clone the repository into a new folder. **Note:** Replace `gemini-mod` with your actual repository name if it's different.
    ```bash
    git clone https://github.com/adromir/gemini-mod.git
    ```
4.  Restart Ferdium. The "Gemini Mod" service will now be available to add from the Ferdium settings.

### Method 2: Manual Installation

1.  Navigate to your Ferdium recipes directory (see paths above).
2.  Create a new folder for the recipe, e.g., `gemini-mod`.
3.  Download the project files (`index.js`, `webview.js`, `Sortable.js`) and place them inside this new folder.
4.  Restart Ferdium.

---

## 📖 Usage

### The Toolbar

The toolbar appears at the top-center of the Gemini window and provides several functions:

* **Custom Buttons/Dropdowns:** Click any of the custom buttons or select an option from a dropdown to instantly insert your predefined text into the Gemini input field.
* **📋 Paste:** Clicks this button to paste the current content from your clipboard into the input field.
* **💾 Download:** When a code or document canvas is open, click this button to download its content. The script automatically determines a suitable filename.
* **⚙️ Settings:** Opens the settings panel where you can customize the toolbar and manage other mod settings.

### Folder Management

The folder UI is injected at the top of the chat history list.

* **➕ Create a Folder:** Click the "**＋ New Folder**" button. You will be prompted to enter a name for the new folder.
* **📂 Organize Chats:** Simply drag any conversation from the main list and drop it into a folder. You can also move conversations between folders.
* **▶️ Toggle Folders:** Click on a folder's header to expand or collapse its content.
* **⋮ Folder Options:** Click the vertical ellipsis (`⋮`) on a folder to open its context menu, which allows you to:
    * **Rename:** Change the folder's name.
    * **Change Color:** Select a new color from a predefined palette or enter a custom hex code.
    * **Delete Folder:** Remove the folder. Conversations within it will be moved back to the main chat list.

### The Settings Panel

The settings panel allows for easy, code-free customization.

* **Toolbar Items:**
    * **Reorder:** Drag and drop toolbar items to change their order.
    * **Add:** Click "**Add Toolbar Item**" and choose between a "Button" or a "Dropdown".
    * **Edit:** Modify the labels, text snippets, and options for any item.
    * **Remove:** Click the "**Remove**" button on an item to delete it.
* **Folder Settings:**
    * **Reset All Folder Data:** This option will permanently delete all your created folders and chat-to-folder assignments. A confirmation is required.
* **Saving:** Click "**Save & Close**" to apply your changes or "**Cancel**" to discard them.

---

##  Disclaimer

This script is provided "as is", without warranty of any kind, express or implied. The author, Adromir, is not responsible for any damage or data loss that may result from its use. You use this script at your own risk. This project is not affiliated with, endorsed by, or sponsored by Google.

---

## 📜 License

This project is licensed under the MIT License.

**MIT License**

Copyright (c) 2025 Adromir

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---
*Created by [Adromir](https://github.com/adromir)*