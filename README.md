# Ferdium Recipe: Google Gemini Mod 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Ferdium Recipe](https://img.shields.io/badge/Ferdium-Recipe-blueviolet)](https://ferdium.org/)

This recipe enhances the Google Gemini service within the [Ferdium](https://ferdium.org/) application by adding a customizable toolbar for quick insertion of predefined text snippets and a feature to download the content of an active Gemini "Canvas".

![](https://raw.githubusercontent.com/adromir/assets/refs/heads/main/screenshot-gemeni-mod.png)
*(A screenshot of the toolbar being on the upper border)*

## ✨ Features

* **📌 Fixed Toolbar:** Adds a persistent toolbar at the top of the Google Gemini interface.
* **⚡ Quick Snippets:** Define buttons for frequently used phrases or commands. Click a button to instantly append its text to the Gemini input field.
* **📚 Dropdown Menus:** Organize snippets into multiple dropdown menus for better categorization (e.g., Actions, Translations, Custom Prompts).
* **📋 Paste from Clipboard:** A dedicated button in the toolbar to paste content from your system clipboard directly into the Gemini input field.
* **💾 Download Canvas Content:** A new button in the toolbar that allows you to download the content of the currently active/visible Gemini "Canvas".
    * It cleverly uses the Canvas's own "Copy to Clipboard" functionality.
    * The filename is automatically derived from the Canvas title.
    * It attempts to preserve existing file extensions from the Canvas title (e.g., `myScript.js` will be saved as `myScript.js`, not `myScript_js.txt`).
* **🖱️ Smart Insertion (for Snippets/Paste):** Automatically appends text to the input field, placing the cursor correctly.
* **🎨 Customizable:** Easily modify the buttons, dropdowns, and snippet text directly within the recipe's `webview.js` file.
* **🌓 Dark Mode Sync:** Attempts to respect Ferdium's dark mode setting by interacting with `localStorage`.
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

    * <a href="https://github.com/adromir/google-gemini-mod/archive/refs/heads/main.zip" target="_blank">Download the recipe files</a> (assuming they are provided as a ZIP archive, e.g., `main.zip`).
    * Extract the ZIP file. You should get a folder named `google-gemini-mod` (or similar, containing `package.json`, `webview.js`, `index.js`).
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

    * **Fork** the repository containing this recipe to your own GitHub/GitLab account (if available).
    * **Clone** your forked repository to your local machine:
        ```bash
        git clone <your-fork-repository-url>
        ```
    * Navigate into the cloned directory and find the specific recipe folder (e.g., `google-gemini-mod`).
    * **Copy** this recipe folder into the Ferdium `dev` directory located in Step 1.

        *Alternatively*, you can clone the repository *directly* into the `dev` directory:

        ```bash
        # Navigate to Ferdium's dev recipes directory
        cd <path_to_ferdium_dev_recipes>

        # Clone the specific recipe repository (or your fork) into a folder named 'google-gemini-mod'
        git clone <repository-url> google-gemini-mod
        ```
        *(Ensure the final folder inside `dev` is named `google-gemini-mod` or matches the `id` in `package.json`)*

**3. Restart or Reload Ferdium:**

    * Completely quit and restart Ferdium.
    * *Or*, if Ferdium is running, use `Ctrl+Shift+R` / `Cmd+Shift+R` to reload Ferdium.

**4. Add the Custom Service:**

    * In Ferdium, click the "+" button to add a new service.
    * Click the "Own Services" Button (or search for the recipe name).
    * You should see your custom recipe listed (e.g., "Google Gemini Mod").
    * Select it and add the service as usual.

    The Google Gemini service should now load with the custom snippet toolbar at the top! 🎉

## ⚙️ Customization

You can easily tailor the toolbar buttons and dropdowns to your needs by editing the `webview.js` file within the recipe's folder (`.../Ferdium/recipes/dev/google-gemini-mod/webview.js`).

Open `webview.js` in a text editor. Look for these sections near the top:

**1. Customizing Buttons:**

    Find the `buttonSnippets` array:
    ```javascript
    const buttonSnippets = [
      { label: "Greeting", text: "Hello Gemini!" },
      { label: "Explain", text: "Could you please explain ... in more detail?" },
      // Add more button snippets here
      // Example: { label: "My Button", text: "My snippet text..." }
    ];
    ```
    * **Edit:** Change the `label` (what appears on the button) and `text` (what gets inserted).
    * **Add:** Copy an existing line `{ label: "...", text: "..." },` and modify it.
    * **Remove:** Delete the line corresponding to the button you want to remove.

**2. Customizing Dropdowns:**

    Find the `dropdownConfigurations` array:
    ```javascript
    const dropdownConfigurations = [
      {
        placeholder: "Actions...", // Text shown before selection
        options: [
          { label: "Summarize", text: "Please summarize the following text:\n" },
          { label: "Ideas", text: "Give me 5 ideas for ..." },
          // Add more options here: { label: "Option Name", text: "Snippet..." }
        ]
      },
      {
        placeholder: "Translations",
        options: [
          { label: "DE -> EN", text: "Translate the following into English:\n" },
          { label: "EN -> DE", text: "Translate the following into German:\n" },
        ]
      },
      // Add more dropdown objects here
      // Example:
      // {
      //   placeholder: "My Prompts",
      //   options: [
      //     { label: "Blog Post Idea", text: "Generate 5 blog post ideas about..." },
      //     { label: "Email Draft", text: "Draft a polite email regarding..." }
      //   ]
      // }
    ];
    ```
    * **Edit Options:** Modify the `label` and `text` within the `options` array of a specific dropdown.
    * **Add Options:** Add more `{ label: "...", text: "..." }` objects to an existing `options` array.
    * **Edit Placeholder:** Change the `placeholder` text for a dropdown.
    * **Add Dropdowns:** Copy an entire dropdown object `{ placeholder: "...", options: [...] },` and customize it.
    * **Remove Dropdowns/Options:** Delete the relevant lines or objects.

**3. Customizing Download Behavior (Advanced):**

    The download functionality relies on specific CSS selectors to find the active Gemini "Canvas" and its internal "Copy to Clipboard" button. These are defined as constants in `webview.js`:
    ```javascript
    const GEMINI_CANVAS_WRAPPER_SELECTOR = "..."; // Identifies the main canvas container
    const GEMINI_CANVAS_TITLE_TEXT_SELECTOR = "..."; // Finds the title text within the canvas
    const GEMINI_CANVAS_COPY_BUTTON_SELECTOR = "..."; // CRITICAL: Finds the "Copy" button within the canvas
    ```
    If the download feature stops working after a Gemini UI update, these selectors (especially `GEMINI_CANVAS_COPY_BUTTON_SELECTOR`) might need to be updated by inspecting the Gemini webpage elements with browser developer tools.

**Important:** After saving changes to `webview.js`, you must reload the recipe in Ferdium for the changes to take effect:
* Right-click on the Gemini service tab in Ferdium and select "Reload service".
* Or, use the Development menu: "Reload Recipes" / "Reload Ferdium" (`Ctrl+Shift+R` / `Cmd+Shift+R`).

## 📝 Notes
* The CSS styles are embedded directly in `webview.js` for compatibility with Google's security policies. You can modify the `embeddedCSS` constant within the script if you need to adjust the toolbar's appearance.
* Ensure you have a stable internet connection when using the service.
* The download feature relies on programmatic clicking of the canvas's "Copy" button and then reading from the clipboard. This requires clipboard permissions to be granted to the browser/Ferdium.

## 📜 Disclaimer

This recipe is a community-driven effort and is not officially supported by Google or Ferdium. It modifies the Gemini web interface, and future updates to Gemini might break its functionality. Use at your own risk.

The author, Adromir, and contributors are not responsible for any issues or data loss that may arise from using this recipe.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details (though one is not explicitly provided, the MIT terms apply).

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
