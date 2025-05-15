/**
 * Ferdium Recipe Webview Integration for Custom Google Gemini
 * Version: 0.0.15 (Improved filename sanitization, refined Monaco content extraction, adjusted selectors)
 * Author: Adromir (Original script by user, download feature added)
 */

module.exports = Ferdium => {
  // --- Customizable Elements ---
  const PASTE_BUTTON_LABEL = "📋 Paste";
  const DOWNLOAD_BUTTON_LABEL = "💾 Download Canvas as File";

  // --- Redirect for Workspace Users (if necessary) ---
  if (
    location.hostname === 'workspace.google.com' &&
    location.href.includes('products/gemini/')
  ) {
    location.href =
      'https://accounts.google.com/AccountChooser?continue=https://gemini.google.com/u/0/';
    return;
  }

  // --- Dark Mode Handling ---
  Ferdium.handleDarkMode(isEnabled => {
    localStorage.setItem('theme', isEnabled ? 'dark' : 'light');
  });

  // --- Embedded CSS ---
  const embeddedCSS = `
    #gemini-snippet-toolbar-v0-1 {
      position: fixed !important; top: 0 !important; left: 26% !important; width: 60% !important;
      padding: 12px !important; z-index: 99999 !important; display: flex !important; flex-wrap: wrap !important;
      gap: 8px !important; align-items: center !important; font-family: 'Roboto', 'Arial', sans-serif !important;
      box-sizing: border-box !important; background-color: rgba(40, 42, 44, 0.95) !important;
      border-bottom-right-radius: 16px !important; border-bottom-left-radius: 16px !important;
    }
    #gemini-snippet-toolbar-v0-1 button, #gemini-snippet-toolbar-v0-1 select {
      padding: 4px 10px !important; cursor: pointer !important; background-color: #202122 !important;
      color: #e3e3e3 !important; border-radius: 16px !important; font-size: 13px !important;
      font-family: inherit !important; font-weight: 500 !important; height: 28px !important;
      box-sizing: border-box !important; vertical-align: middle !important;
      transition: background-color 0.2s ease, transform 0.1s ease !important;
      border: none !important; flex-shrink: 0;
    }
    #gemini-snippet-toolbar-v0-1 select {
      padding-right: 25px !important; appearance: none !important;
      background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="%23e3e3e3" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>') !important;
      background-repeat: no-repeat !important; background-position: right 8px center !important;
      background-size: 12px 12px !important;
    }
    #gemini-snippet-toolbar-v0-1 option {
      background-color: #2a2a2a !important; color: #e3e3e3 !important;
      font-weight: normal !important; padding: 5px 10px !important;
    }
    #gemini-snippet-toolbar-v0-1 button:hover, #gemini-snippet-toolbar-v0-1 select:hover {
      background-color: #4a4e51 !important;
    }
    #gemini-snippet-toolbar-v0-1 button:active {
      background-color: #5f6368 !important; transform: scale(0.98) !important;
    }
    .toolbar-spacer { margin-left: auto !important; }
  `;

  function injectCustomCSS() {
    const styleId = 'ferdium-gemini-custom-styles';
    if (document.getElementById(styleId)) return;
    try {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = embeddedCSS;
      document.head.appendChild(style);
      console.log("Ferdium Gemini Recipe: Custom CSS injected successfully.");
    } catch (error) {
      console.error("Ferdium Gemini Recipe: Failed to inject custom CSS:", error);
    }
  }

  const buttonSnippets = [
    { label: "Greeting", text: "Hello Gemini!" },
    { label: "Explain", text: "Could you please explain ... in more detail?" },
  ];
  const dropdownConfigurations = [
    {
      placeholder: "Actions...",
      options: [
        { label: "Summarize", text: "Please summarize the following text:\n" },
        { label: "Ideas", text: "Give me 5 ideas for ..." },
        { label: "Code (JS)", text: "Give me a JavaScript code example for ..." },
      ]
    },
    {
      placeholder: "Translations",
      options: [
        { label: "DE -> EN", text: "Translate the following into English:\n" },
        { label: "EN -> DE", text: "Translate the following into German:\n" },
        { label: "Correct Text", text: "Please correct the grammar and spelling in the following text:\n" }
      ]
    },
  ];

  function moveCursorToEnd(element) {
    try {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(element);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      element.focus();
    } catch (e) {
      console.error("Ferdium Gemini Recipe: Error setting cursor position:", e);
    }
  }

  function findTargetInputElement() {
    const selectorsToTry = ['.ql-editor p', '.ql-editor', 'div[contenteditable="true"]'];
    for (const selector of selectorsToTry) {
      const element = document.querySelector(selector);
      if (element) {
        if (element.classList.contains('ql-editor')) {
          return element.querySelector('p') || element;
        }
        return element;
      }
    }
    return null;
  }

  function insertSnippetText(textToInsert) {
    let targetInputElement = findTargetInputElement();
    if (!targetInputElement) {
      console.error("Ferdium Gemini Recipe: Could not find the Gemini input field for snippet insertion.");
      return;
    }
    let actualInsertionPoint = targetInputElement;
    if (targetInputElement.classList.contains('ql-editor')) {
      let p = targetInputElement.querySelector('p');
      if (!p) {
        p = document.createElement('p');
        targetInputElement.appendChild(p);
      }
      actualInsertionPoint = p;
    }
    actualInsertionPoint.focus();
    setTimeout(() => {
      moveCursorToEnd(actualInsertionPoint);
      if (!document.execCommand('insertText', false, textToInsert)) {
        console.warn("Ferdium Gemini Recipe: execCommand('insertText') failed. Using fallback append.");
        if (actualInsertionPoint.innerHTML === '<br>') actualInsertionPoint.innerHTML = '';
        actualInsertionPoint.textContent += textToInsert;
        moveCursorToEnd(actualInsertionPoint);
      }
      const editorToDispatchOn = document.querySelector('.ql-editor') || targetInputElement;
      if (editorToDispatchOn) {
        editorToDispatchOn.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        editorToDispatchOn.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }
      console.log("Ferdium Gemini Recipe: Snippet inserted.");
    }, 50);
  }

  async function handlePasteButtonClick() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        Ferdium.displayErrorMessage("Clipboard access is not available or not permitted.");
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text) insertSnippetText(text);
    } catch (err) {
      console.error('Ferdium Gemini Recipe: Failed to read clipboard contents: ', err);
      Ferdium.displayErrorMessage(err.name === 'NotAllowedError' ? 'Clipboard permission denied.' : 'Failed to paste.');
    }
  }

  const DEFAULT_DOWNLOAD_EXTENSION = "txt";
  const KNOWN_EXTENSIONS = [
      "js", "html", "css", "json", "xml", "md", "txt", "py", "java", "c", "cpp", "h", "hpp",
      "cs", "ts", "jsx", "tsx", "php", "rb", "go", "rs", "swift", "kt", "kts", "dart",
      "sh", "bat", "ps1", "yaml", "yml", "ini", "cfg", "log", "csv", "tsv", "sql",
      "r", "pl", "lua", "vb", "vbs", "asm", "s", "f", "f90", "for", "pas", "inc",
      "diff", "patch", "conf", "service", "env", "properties", "gradle", "dockerfile",
      "tf", "tfvars", "hcl", "bicep", "csproj", "vbproj", "sln", "vcxproj", "lpr", "lpi", "lfm"
  ];

  // --- Canvas Selectors (used by the global download button) ---
  const GEMINI_CANVAS_WRAPPER_SELECTOR = "immersive-panel.ng-tns-c1436378242-1"; // Simplified for potential dynamic classes
  const GEMINI_CANVAS_TITLE_TEXT_SELECTOR = "h2.title-text.gds-title-s";
  const GEMINI_CANVAS_TITLE_BAR_SELECTOR = "div.toolbar.has-title";
  
  const XAP_CODE_EDITOR_SUB_SELECTOR = `
    code-immersive-panel > 
    div.container > 
    xap-code-editor
  `.replace(/\s+/g, ' ').trim(); // Target the xap-code-editor itself

  const MONACO_SCROLLABLE_VIEW_SUB_SELECTOR = `
    div.xap-monaco-container > 
    div.monaco-editor > 
    div.overflow-guard > 
    div.monaco-scrollable-element.editor-scrollable
  `.replace(/\s+/g, ' ').trim(); // Specific scrollable view

  const MONACO_EDITOR_LINE_CLASS = ".view-line";

  function sanitizeFilename(name, defaultExtension = DEFAULT_DOWNLOAD_EXTENSION) {
    if (!name || typeof name !== 'string') name = 'downloaded_content';
    
    let baseName = name;
    let existingExtension = "";
    const lastDotIndex = name.lastIndexOf('.');

    if (lastDotIndex > 0 && lastDotIndex < name.length - 1) {
        const potentialExt = name.substring(lastDotIndex + 1).toLowerCase();
        if (KNOWN_EXTENSIONS.includes(potentialExt)) {
            existingExtension = potentialExt;
            baseName = name.substring(0, lastDotIndex);
        }
    }

    let sanitizedBase = baseName.replace(/[<>:"/\\|?*]+/g, '_').replace(/\s+/g, '_').replace(/__+/g, '_');
    sanitizedBase = sanitizedBase.replace(/^_+|_+$/g, '').trim() || 'downloaded_content';
    
    const finalExtension = existingExtension || defaultExtension;
    return `${sanitizedBase}.${finalExtension}`;
  }

  function triggerDownload(filename, content, contentType = 'text/plain;charset=utf-8') {
    try {
      const blob = new Blob([content], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`Ferdium Gemini Recipe: Download triggered for "${filename}".`);
    } catch (error) {
      console.error(`Ferdium Gemini Recipe: Failed to trigger download:`, error);
      Ferdium.displayErrorMessage(`Failed to download: ${error.message}`);
    }
  }

  function extractMonacoEditorContent(scrollableLinesContainer, broaderEditorContainer) {
    if (!scrollableLinesContainer && !broaderEditorContainer) return "";
    let text = "";

    if (scrollableLinesContainer) {
        const lines = scrollableLinesContainer.querySelectorAll(MONACO_EDITOR_LINE_CLASS);
        if (lines && lines.length > 0) {
            lines.forEach(line => {
                text += (line.innerText || line.textContent || "") + '\n';
            });
            if (text.length > 0) {
                console.log("Ferdium Gemini Recipe: Extracted content from .view-line elements.");
                return text.slice(0, -1); 
            }
        }
    }

    if (broaderEditorContainer) {
        // Attempt to get text from the broader container.
        // This might include more than just the code lines, e.g., if editor has other text nodes.
        // A more sophisticated cleanup might be needed if this grabs too much UI text.
        // For now, we'll try a direct approach.
        let fullText = broaderEditorContainer.innerText || broaderEditorContainer.textContent || "";
        
        // Basic check: if the .view-line method returned nothing, but this has content,
        // it's likely the full code.
        if (text.trim().length === 0 && fullText.trim().length > 0) {
             console.warn("Ferdium Gemini Recipe: Used innerText of broader editor container as fallback.");
             // We could try to be smarter here by looking for common Monaco editor text patterns to remove,
             // but that's highly dependent on the specific editor's DOM structure.
             // For now, return the full text and user can manually clean if needed.
             return fullText.trim();
        } else if (text.trim().length > 0) {
            // If .view-line produced something, prefer that, even if short.
            return text.slice(0,-1); // Already processed above
        }
    }
    
    console.warn("Ferdium Gemini Recipe: Failed to extract meaningful content from editor.");
    return "";
  }

  function handleGlobalCanvasDownload() {
    const canvasElement = document.querySelector(GEMINI_CANVAS_WRAPPER_SELECTOR);
    if (!canvasElement) {
      Ferdium.displayErrorMessage("No active canvas found to download.");
      console.warn("Ferdium Gemini Recipe: No canvas wrapper found. Selector:", GEMINI_CANVAS_WRAPPER_SELECTOR);
      return;
    }
    console.log("Ferdium Gemini Recipe: Found canvas wrapper:", canvasElement);

    let titleTextElement = canvasElement.querySelector(GEMINI_CANVAS_TITLE_TEXT_SELECTOR);
    if (!titleTextElement) {
        const titleBar = canvasElement.querySelector(GEMINI_CANVAS_TITLE_BAR_SELECTOR);
        if (titleBar) titleTextElement = titleBar.querySelector(GEMINI_CANVAS_TITLE_TEXT_SELECTOR);
    }

    const xapCodeEditor = canvasElement.querySelector(XAP_CODE_EDITOR_SUB_SELECTOR);
    if (!xapCodeEditor) {
        Ferdium.displayErrorMessage("Could not find code editor in the active canvas.");
        console.warn("Ferdium Gemini Recipe: xap-code-editor not found. Selector:", XAP_CODE_EDITOR_SUB_SELECTOR);
        return;
    }
    console.log("Ferdium Gemini Recipe: Found xap-code-editor:", xapCodeEditor);
    
    const scrollableView = xapCodeEditor.querySelector(MONACO_SCROLLABLE_VIEW_SUB_SELECTOR);
    // scrollableView can be null if not fully rendered, extractMonacoEditorContent will use xapCodeEditor as fallback

    const canvasTitle = titleTextElement ? (titleTextElement.textContent || titleTextElement.innerText || "Untitled Canvas").trim() : "Untitled Canvas";
    const filename = sanitizeFilename(canvasTitle);
    const contentToDownload = extractMonacoEditorContent(scrollableView, xapCodeEditor);

    if (contentToDownload.trim() === "") {
      Ferdium.displayErrorMessage("Canvas content is empty.");
      console.warn("Ferdium Gemini Recipe: Canvas content empty after extraction.");
      return;
    }
    triggerDownload(filename, contentToDownload);
    console.log("Ferdium Gemini Recipe: Global download initiated for canvas:", canvasTitle);
  }

  function createToolbar() {
    const toolbarId = 'gemini-snippet-toolbar-v0-1';
    if (document.getElementById(toolbarId)) return;
    console.log("Ferdium Gemini Recipe: Initializing toolbar...");
    const toolbar = document.createElement('div');
    toolbar.id = toolbarId;

    buttonSnippets.forEach(snippet => {
      const button = document.createElement('button');
      button.textContent = snippet.label; button.title = snippet.text;
      button.addEventListener('click', () => insertSnippetText(snippet.text));
      toolbar.appendChild(button);
    });

    dropdownConfigurations.forEach(config => {
      if (!config.options || config.options.length === 0) return;
      const select = document.createElement('select');
      select.title = config.placeholder || "Select snippet";
      const defaultOption = document.createElement('option');
      defaultOption.textContent = config.placeholder || "Select...";
      defaultOption.value = ""; defaultOption.disabled = true; defaultOption.selected = true;
      select.appendChild(defaultOption);
      config.options.forEach(snippet => {
        const option = document.createElement('option');
        option.textContent = snippet.label; option.value = snippet.text;
        select.appendChild(option);
      });
      select.addEventListener('change', (event) => {
        if (event.target.value) {
          insertSnippetText(event.target.value);
          event.target.selectedIndex = 0;
        }
      });
      toolbar.appendChild(select);
    });
    
    const spacer = document.createElement('div');
    spacer.className = 'toolbar-spacer';
    toolbar.appendChild(spacer);

    const pasteButton = document.createElement('button');
    pasteButton.textContent = PASTE_BUTTON_LABEL; pasteButton.title = "Paste from Clipboard";
    pasteButton.addEventListener('click', handlePasteButtonClick);
    toolbar.appendChild(pasteButton);

    const globalDownloadButton = document.createElement('button');
    globalDownloadButton.textContent = DOWNLOAD_BUTTON_LABEL;
    globalDownloadButton.title = "Download active canvas content";
    globalDownloadButton.addEventListener('click', handleGlobalCanvasDownload);
    toolbar.appendChild(globalDownloadButton);

    if (document.body) {
      document.body.insertBefore(toolbar, document.body.firstChild);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body) document.body.insertBefore(toolbar, document.body.firstChild);
        else console.error("Ferdium Gemini Recipe: document.body not found at DOMContentLoaded.");
      });
    }
    console.log("Ferdium Gemini Recipe: Toolbar inserted.");
  }

  window.addEventListener('load', () => {
    injectCustomCSS();
    // Increased timeout slightly to give more time for complex UI elements to render
    // especially if the canvas is not immediately visible on load.
    setTimeout(createToolbar, 1500); 
  });

  Ferdium.displayErrorMessage = Ferdium.displayErrorMessage || function(message) {
    console.error("Ferdium Display Error:", message);
    alert(message); 
  };
};
