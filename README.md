# Ferdium Recipe: Google Gemini Mod 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Ferdium Recipe](https://img.shields.io/badge/Ferdium-Recipe-blueviolet)](https://ferdium.org/)

This recipe supercharges the Google Gemini service within the [Ferdium](https://ferdium.org/) application. It adds a powerful, customizable toolbar for quick-access snippets and introduces a complete folder management system to organize your conversations directly within the Gemini sidebar.

![](https://raw.githubusercontent.com/adromir/assets/refs/heads/main/screenshot-gemeni-mod.png)
*(A screenshot showing the top toolbar and the folder organization in the left sidebar)*

## ✨ Features

* **🗂️ Conversation Folders:** Organize your chat history like never before!
    * **Create, Rename, and Delete** folders directly in the sidebar.
    * **Drag & Drop** conversations into your folders for easy organization.
    * **Color-Code** your folders for quick visual identification.
    * **Collapsible** sections to keep your sidebar tidy.
    * **Right-Click Context Menu** on folders for quick actions (Rename, Change Color, Delete).
    * **Persistent State:** Your folder structure and conversation assignments are saved locally.

* **📌 Customizable Toolbar:** A persistent toolbar at the top of the Google Gemini interface.
    * **⚙️ Settings Panel:** No more editing files! A new settings panel allows you to:
        * Add, remove, and edit buttons and dropdown menus.
        * **Drag & Drop** to reorder toolbar items.
        * Configure everything through a user-friendly interface.
    * **⚡ Quick Snippets:** Create buttons for frequently used phrases or commands. Click a button to instantly append its text to the Gemini input field.
    * **📚 Dropdown Menus:** Group snippets into multiple dropdown menus for better categorization.

* **📋 Paste from Clipboard:** A dedicated button in the toolbar to paste content from your system clipboard directly into the Gemini input field.

* **💾 Smart Download Canvas Content:** A powerful download button in the toolbar.
    * It intelligently detects the type of active "Canvas" (Code or Document).
    * For **Code Canvases**, it programmatically uses the "Share" and "Copy" functions to get the full, clean code.
    * For **Document Canvases**, it extracts the text content.
    * The filename is automatically and safely derived from the Canvas title, preserving existing file extensions (e.g., `myScript.js` is saved correctly).

* **🖱️ Smart Insertion:** Automatically appends text from snippets or the clipboard to the input field, placing the cursor at the end.

* **🔒 CSP Compliant:** Uses safe methods for CSS injection to work with Google's Content Security Policy.

## 🛠️ Installation Guide

To use this custom recipe in your Ferdium application, follow these steps:

**1. Locate your Ferdium `dev` Recipe Directory:**

    The location depends on your operating system:

    * **Windows:** `%APPDATA%\Ferdium\recipes\dev\`
        (Usually `C:\Users\<YourUsername>\AppData\Roaming\Ferdium\recipes\dev\`)
    * **macOS:** `~/Library/Application Support/Ferdium/recipes/dev/`
        (You might need to press `Cmd+Shift+G` in Finder and paste the path)
    * **Linux:** `~/.config/Ferdium/recipes/dev/`

    If the `dev` directory doesn't exist, create it.

**2. Get the Recipe Files:**

    You have two options:

    **Option A: Download ZIP Method (Simpler)**

    * <a href="https://github.com/adromir/google-gemini-mod/archive/refs/heads/main.zip" target="_blank">Download the recipe files as a ZIP archive</a>.
    * Extract the ZIP file. You should get a folder named `google-gemini-mod` (or similar).
    * Move this extracted folder **directly** into the `dev` directory you located in Step 1.

        *Example Structure:*
        ```
        .../Ferdium/recipes/dev/
                                └── google-gemini-mod/
                                    ├── package.json
                                    ├── webview.js
                                    ├── index.js
                                    └── (Optional: icon.svg/png if included)
        ```

    **Option B: Using Git (Fork & Clone - Advanced)**

    * **Clone** the repository directly into your `dev` directory:

        ```bash
        # Navigate to Ferdium's dev recipes directory
        cd <path_to_ferdium_dev_recipes>

        # Clone the repository into a folder named 'google-gemini-mod'
        git clone [https://github.com/adromir/google-gemini-mod.git](https://github.com/adromir/google-gemini-mod.git) google-gemini-mod
        ```
        *(Ensure the final folder inside `dev` matches the `id` in `package.json`)*

**3. Restart or Reload Ferdium:**

    * Completely quit and restart Ferdium.
    * *Or*, if Ferdium is running, use `Ctrl+Shift+R` / `Cmd+Shift+R` to reload Ferdium.

**4. Add the Custom Service:**

    * In Ferdium, click the "+" button to add a new service.
    * Click the "Own Services" Button (or search for the recipe name).
    * You should see your custom recipe listed (e.g., "Google Gemini Mod").
    * Select it and add the service as usual.

    The Google Gemini service should now load with the custom folder UI and toolbar! 🎉

## ⚙️ Customization

### 1. Using the Settings Panel (Recommended)

The easiest way to customize the toolbar is through the built-in settings panel.

* **Open the Panel:** Click the **⚙️ Settings** button on the far right of the toolbar.
* **Add Items:** Click "Add Toolbar Item" and choose between a "Button" or a "Dropdown".
* **Edit Items:**
    * Change the `label`, `placeholder`, and `snippet text` for any item.
    * For dropdowns, you can add or remove individual options.
* **Reorder Items:** Simply **drag and drop** the item groups within the settings panel to change their order on the toolbar.
* **Remove Items:** Click the "Remove" button on any item.
* **Save:** Click "Save & Close" to apply your changes.

### 2. Customizing Download Behavior (Advanced)

The download functionality relies on specific CSS selectors to find the active Gemini "Canvas" and its buttons. These are defined as constants at the top of `webview.js`.

If the download feature stops working after a Gemini UI update, these selectors might need to be updated by inspecting the Gemini webpage elements with browser developer tools.

**Important:** After making any manual changes to `webview.js`, you must reload the recipe in Ferdium for the changes to take effect:
* Right-click on the Gemini service tab in Ferdium and select "Reload service".
* Or, use the Development menu: "Reload Recipes" / "Reload Ferdium" (`Ctrl+Shift+R` / `Cmd+Shift+R`).

## 📝 Notes
* The CSS styles are embedded directly in `webview.js` for compatibility with Google's security policies.
* The folder and toolbar configurations are saved in your browser's `localStorage`. Clearing your Ferdium cache may reset your settings.
* The download feature relies on programmatic clicking and clipboard access. This requires clipboard permissions to be granted to the browser/Ferdium.

## 📜 Disclaimer

This recipe is a community-driven effort and is not officially supported by Google or Ferdium. It modifies the Gemini web interface, and future updates to Gemini might break its functionality. Use at your own risk.

The author, Adromir, and contributors are not responsible for any issues or data loss that may arise from using this recipe.

## 📄 License

This project is licensed under the MIT License.

Copyright (c) 2024 Adromir - <https://github.com/adromir>

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