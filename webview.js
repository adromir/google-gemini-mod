/**
 * Ferdium Recipe Webview Integration for Custom Google Gemini
 * Version: 0.0.16 (Attempt to access Monaco Editor API for full content, refined fallbacks)
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
    /* Styles for the Gemini Snippet Toolbar (v0.1) in Ferdium */
    #gemini-snippet-toolbar-v0-1 {
      position: fixed !important; top: 0 !important; left: 26% !important; width: 60% !important;
      padding: 12px 12px !important; z-index: 99999 !important; display: flex !important; flex-wrap: wrap !important;
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
      padding-right: 25px !important;
      appearance: none !important;
      background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="%23e3e3e3" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>') !important;
      background-repeat: no-repeat !important;
      background-position: right 8px center !important;
      background-size: 12px 12px !important;
    }

    #gemini-snippet-toolbar-v0-1 option {
      background-color: #2a2a2a !important;
      color: #e3e3e3 !important;
      font-weight: normal !important;
      padding: 5px 10px !important;
    }

    #gemini-snippet-toolbar-v0-1 button:hover,
    #gemini-snippet-toolbar-v0-1 select:hover {
      background-color: #4a4e51 !important;
    }

    #gemini-snippet-toolbar-v0-1 button:active {
      background-color: #5f6368 !important;
      transform: scale(0.98) !important;
    }

    /* Spacer to push buttons to the right */
    .toolbar-spacer {
        margin-left: auto !important;
    }
  `; // End of embeddedCSS

  /**
   * Injects the embedded CSS safely into the document head.
   */
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

  // --- Snippet Toolbar Logic ---
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

  /**
   * Moves the cursor to the end of the provided element's content.
   * @param {Element} element - The contenteditable element or paragraph within it.
   */
  function moveCursorToEnd(element) {
    try {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(element);
      range.collapse(false); // false collapses to the end
      sel.removeAllRanges();
      sel.addRange(range);
      element.focus(); // Ensure focus after moving cursor
    } catch (e) {
      console.error("Ferdium Gemini Recipe: Error setting cursor position:", e);
    }
  }

  /**
   * Finds the target Gemini input element.
   * @returns {Element | null} The found input element or null.
   */
  function findTargetInputElement() {
    const selectorsToTry = [
      '.ql-editor p', 
      '.ql-editor',   
      'div[contenteditable="true"]' 
    ];
    let targetInputElement = null;

    for (const selector of selectorsToTry) {
      const element = document.querySelector(selector);
      if (element) {
        if (element.classList.contains('ql-editor')) {
          const pInEditor = element.querySelector('p');
          if (pInEditor) {
            targetInputElement = pInEditor;
            break;
          }
          targetInputElement = element;
          break;
        }
        targetInputElement = element;
        break;
      }
    }
    return targetInputElement;
  }


  /**
   * Inserts text into the Gemini input field, always appending.
   * @param {string} textToInsert - The text snippet to insert.
   */
  function insertSnippetText(textToInsert) {
    let targetInputElement = findTargetInputElement();
    let actualInsertionPoint = targetInputElement;

    if (targetInputElement) {
        if (targetInputElement.classList.contains('ql-editor')) {
            let p = targetInputElement.querySelector('p');
            if (!p) {
                p = document.createElement('p');
                targetInputElement.appendChild(p);
                console.log("Ferdium Gemini Recipe: Created new 'p' tag inside .ql-editor for insertion.");
            }
            actualInsertionPoint = p;
        }
        
        actualInsertionPoint.focus();

        setTimeout(() => {
            moveCursorToEnd(actualInsertionPoint);

            let insertedViaExec = false;
            try {
                insertedViaExec = document.execCommand('insertText', false, textToInsert);
            } catch (e) {
                console.warn("Ferdium Gemini Recipe: execCommand('insertText') threw an error:", e);
                insertedViaExec = false;
            }

            if (!insertedViaExec) {
                console.warn("Ferdium Gemini Recipe: execCommand('insertText') failed. Using fallback append.");
                if (actualInsertionPoint.innerHTML === '<br>') {
                    actualInsertionPoint.innerHTML = '';
                }
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

    } else {
        console.error("Ferdium Gemini Recipe: Could not find the Gemini input field for snippet insertion.");
    }
  }

  /**
   * Handles the paste button click. Reads from clipboard and inserts text.
   */
  async function handlePasteButtonClick() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        console.warn("Ferdium Gemini Recipe: Clipboard API not available or readText not supported.");
        Ferdium.displayErrorMessage("Clipboard access is not available or not permitted in this browser/context.");
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        insertSnippetText(text);
      } else {
        console.log("Ferdium Gemini Recipe: Clipboard is empty.");
      }
    } catch (err) {
      console.error('Ferdium Gemini Recipe: Failed to read clipboard contents: ', err);
      if (err.name === 'NotAllowedError') {
        Ferdium.displayErrorMessage('Permission to read clipboard was denied. Please allow clipboard access in your browser settings or when prompted.');
      } else {
        Ferdium.displayErrorMessage('Failed to paste from clipboard. See console for details.');
      }
    }
  }
  
  // --- Canvas Download Feature ---
  const DEFAULT_DOWNLOAD_EXTENSION = "txt"; 

  // --- IMPORTANT: Canvas Selectors (used by the global download button) ---
  const GEMINI_CANVAS_WRAPPER_SELECTOR = "immersive-panel.ng-tns-c1436378242-1.ng-trigger.ng-trigger-immersivePanelTransitions.ng-star-inserted"; 
  const GEMINI_CANVAS_TITLE_TEXT_SELECTOR = "h2.title-text.gds-title-s"; 
  const GEMINI_CANVAS_TITLE_BAR_SELECTOR = "div.toolbar.has-title"; 

  // Selector for the xap-code-editor component itself, relative to GEMINI_CANVAS_WRAPPER_SELECTOR
  const GEMINI_XAP_CODE_EDITOR_SELECTOR = `
    code-immersive-panel.ng-star-inserted > 
    div.container > 
    xap-code-editor.ng-untouched.ng-pristine.ng-valid.ng-star-inserted
  `.replace(/\s+/g, ' ').trim();

  // Selector for the scrollable content area within xap-code-editor, relative to GEMINI_CANVAS_WRAPPER_SELECTOR
  // Used for fallback if Monaco API access fails.
  const GEMINI_MONACO_SCROLLABLE_CONTENT_SELECTOR = `
    code-immersive-panel.ng-star-inserted > 
    div.container > 
    xap-code-editor.ng-untouched.ng-pristine.ng-valid.ng-star-inserted > 
    div.xap-monaco-container > 
    div.monaco-editor.no-user-select.showUnused.showDeprecated.vs-dark > 
    div.overflow-guard > 
    div.monaco-scrollable-element.editor-scrollable.vs-dark
  `.replace(/\s+/g, ' ').trim();

  const MONACO_EDITOR_LINE_CLASS = ".view-line";


  /**
   * Sanitizes a string to be used as a valid filename.
   * @param {string} name - The original filename string.
   * @param {string} extension - The file extension to append.
   * @returns {string} A sanitized filename.
   */
  function sanitizeFilename(name, extension = DEFAULT_DOWNLOAD_EXTENSION) {
    if (!name || typeof name !== 'string') {
      name = 'downloaded_content';
    }
    let sanitized = name.replace(/[<>:"/\\|?*]+/g, '_');
    sanitized = sanitized.replace(/\s+/g, '_');
    sanitized = sanitized.replace(/__+/g, '_');
    sanitized = sanitized.replace(/^_+|_+$/g, '');
    sanitized = sanitized.trim();
    if (!sanitized) {
      sanitized = 'downloaded_content';
    }
    return `${sanitized}.${extension}`;
  }

  /**
   * Creates and triggers a download for the given text content.
   * @param {string} filename - The desired filename.
   * @param {string} content - The text content to download.
   * @param {string} contentType - The MIME type of the content.
   */
  function triggerDownload(filename, content, contentType = 'text/plain;charset=utf-8') {
    try {
      const blob = new Blob([content], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a); 
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`Ferdium Gemini Recipe: Download triggered for "${filename}".`);
    } catch (error) {
      console.error(`Ferdium Gemini Recipe: Failed to trigger download for "${filename}":`, error);
      Ferdium.displayErrorMessage(`Failed to download: ${error.message}`);
    }
  }

  /**
   * Extracts text content from the Monaco editor area.
   * Attempts to access Monaco Editor API first, then falls back to DOM scraping.
   * @param {Element} canvasElement - The main canvas wrapper element.
   * @returns {string} The extracted text content.
   */
  function extractMonacoEditorContent(canvasElement) {
    if (!canvasElement) return "";

    let editorContent = "";
    const xapEditorElement = canvasElement.querySelector(GEMINI_XAP_CODE_EDITOR_SELECTOR);
    
    if (xapEditorElement) {
      console.log("Ferdium Gemini Recipe: Found xap-code-editor element:", xapEditorElement);
      // Try to access a potential Monaco editor instance.
      // Common property names for editor instances: _editor, editor, monacoEditor, editorInstance
      // This is highly dependent on how xap-code-editor exposes its underlying Monaco instance.
      const potentialInstanceKeys = ['_editor', 'editor', 'monacoEditor', 'editorInstance', '__quill']; // Added __quill as another common one
      let editorInstance = null;

      for (const key of potentialInstanceKeys) {
        if (xapEditorElement[key] && typeof xapEditorElement[key].getModel === 'function') {
          editorInstance = xapEditorElement[key];
          console.log(`Ferdium Gemini Recipe: Found Monaco instance via key "${key}".`);
          break;
        }
      }
      
      // Check if Angular component instance is available (less likely to have direct editor model)
      if (!editorInstance && typeof ng !== 'undefined' && ng.getComponent) {
        try {
            const angularComponentInstance = ng.getComponent(xapEditorElement);
            if (angularComponentInstance) {
                console.log("Ferdium Gemini Recipe: Found Angular component instance for xap-code-editor:", angularComponentInstance);
                // Look for editor model within the Angular component
                for (const key of potentialInstanceKeys) {
                    if (angularComponentInstance[key] && typeof angularComponentInstance[key].getModel === 'function') {
                        editorInstance = angularComponentInstance[key];
                        console.log(`Ferdium Gemini Recipe: Found Monaco instance via Angular component key "${key}".`);
                        break;
                    }
                }
                // Specific check for a common pattern if the component itself is the editor
                if (!editorInstance && typeof angularComponentInstance.getModel === 'function') {
                     editorInstance = angularComponentInstance;
                     console.log(`Ferdium Gemini Recipe: Angular component itself seems to be the Monaco instance.`);
                }
            }
        } catch (e) {
            console.warn("Ferdium Gemini Recipe: Error trying to get Angular component for xap-code-editor:", e);
        }
      }


      if (editorInstance && typeof editorInstance.getModel === 'function') {
        try {
          const model = editorInstance.getModel();
          if (model && typeof model.getValue === 'function') {
            editorContent = model.getValue();
            console.log("Ferdium Gemini Recipe: Successfully extracted content via Monaco Editor API.");
            return editorContent; // Successfully got content via API
          } else {
            console.warn("Ferdium Gemini Recipe: Monaco model or getValue method not found on instance.");
          }
        } catch (e) {
          console.error("Ferdium Gemini Recipe: Error accessing Monaco Editor API:", e);
        }
      } else {
        console.warn("Ferdium Gemini Recipe: Monaco editor instance or getModel method not found on xap-code-editor element or its component.");
      }
    } else {
        console.warn("Ferdium Gemini Recipe: xap-code-editor element not found using selector:", GEMINI_XAP_CODE_EDITOR_SELECTOR);
    }

    // Fallback 1: Scrape .view-line elements from the scrollable content area
    console.log("Ferdium Gemini Recipe: Falling back to scraping .view-line elements.");
    const scrollableContentArea = canvasElement.querySelector(GEMINI_MONACO_SCROLLABLE_CONTENT_SELECTOR);
    if (scrollableContentArea) {
      const lines = scrollableContentArea.querySelectorAll(MONACO_EDITOR_LINE_CLASS);
      if (lines && lines.length > 0) {
        let text = "";
        lines.forEach(line => {
          text += (line.innerText || line.textContent || "") + '\n';
        });
        editorContent = text.length > 0 ? text.slice(0, -1) : "";
        if (editorContent.trim() !== "") {
            console.log("Ferdium Gemini Recipe: Extracted content by scraping .view-line elements.");
            return editorContent;
        } else {
            console.warn("Ferdium Gemini Recipe: .view-line scraping yielded empty content.");
        }
      } else {
        console.warn("Ferdium Gemini Recipe: Monaco editor lines (.view-line) not found in scrollable area. Selector:", MONACO_EDITOR_LINE_CLASS);
      }
    } else {
        console.warn("Ferdium Gemini Recipe: Monaco scrollable content area not found for .view-line scraping. Selector:", GEMINI_MONACO_SCROLLABLE_CONTENT_SELECTOR);
    }

    // Fallback 2: Use innerText of the scrollable content area
    console.log("Ferdium Gemini Recipe: Falling back to innerText of the scrollable content area.");
    if (scrollableContentArea) {
        editorContent = scrollableContentArea.innerText || scrollableContentArea.textContent || "";
        if (editorContent.trim() !== "") {
            console.log("Ferdium Gemini Recipe: Extracted content using innerText of scrollable area.");
            return editorContent;
        } else {
            console.warn("Ferdium Gemini Recipe: innerText of scrollable area is empty.");
        }
    }
    
    console.error("Ferdium Gemini Recipe: All methods to extract Monaco editor content failed or yielded empty content.");
    return ""; // Return empty if all methods fail
  }

  /**
   * Handles the click of the global canvas download button.
   * Finds the first available canvas and triggers its download.
   */
  function handleGlobalCanvasDownload() {
    const canvasElement = document.querySelector(GEMINI_CANVAS_WRAPPER_SELECTOR);

    if (!canvasElement) {
      console.warn("Ferdium Gemini Recipe: No open canvas found to download. Wrapper selector:", GEMINI_CANVAS_WRAPPER_SELECTOR);
      Ferdium.displayErrorMessage("No active canvas found to download.");
      return;
    }
    console.log("Ferdium Gemini Recipe: Found canvas wrapper:", canvasElement);

    let titleTextElement = canvasElement.querySelector(GEMINI_CANVAS_TITLE_TEXT_SELECTOR);
    if (!titleTextElement) {
        const titleBar = canvasElement.querySelector(GEMINI_CANVAS_TITLE_BAR_SELECTOR);
        if (titleBar) {
            titleTextElement = titleBar.querySelector(GEMINI_CANVAS_TITLE_TEXT_SELECTOR);
        }
    }
    
    const canvasTitle = titleTextElement ? (titleTextElement.textContent || titleTextElement.innerText || "Untitled Canvas").trim() : "Untitled Canvas";
    const filename = sanitizeFilename(canvasTitle);
    
    // Pass the canvasElement to the extraction function
    const contentToDownload = extractMonacoEditorContent(canvasElement);

    if (contentToDownload.trim() === "") {
        console.warn("Ferdium Gemini Recipe: Canvas content area is empty after all extraction attempts. Download aborted.");
        Ferdium.displayErrorMessage("Canvas content is empty or could not be extracted, nothing to download.");
        return;
    }
    triggerDownload(filename, contentToDownload);
    console.log("Ferdium Gemini Recipe: Global download initiated for canvas:", canvasTitle);
  }


  /**
   * Creates the snippet toolbar and adds it to the page.
   */
  function createToolbar() {
    const toolbarId = 'gemini-snippet-toolbar-v0-1';
    if (document.getElementById(toolbarId)) {
      console.log("Ferdium Gemini Recipe: Toolbar already exists.");
      return;
    }
    console.log("Ferdium Gemini Recipe: Initializing toolbar...");

    const toolbar = document.createElement('div');
    toolbar.id = toolbarId;

    buttonSnippets.forEach(snippet => {
      const button = document.createElement('button');
      button.textContent = snippet.label;
      button.title = snippet.text;
      button.addEventListener('click', () => {
        insertSnippetText(snippet.text);
      });
      toolbar.appendChild(button);
    });

    dropdownConfigurations.forEach(config => {
      if (config.options && config.options.length > 0) {
        const select = document.createElement('select');
        select.title = config.placeholder || "Select snippet";

        const defaultOption = document.createElement('option');
        defaultOption.textContent = config.placeholder || "Select...";
        defaultOption.value = "";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);

        config.options.forEach(snippet => {
          const option = document.createElement('option');
          option.textContent = snippet.label;
          option.value = snippet.text;
          select.appendChild(option);
        });

        select.addEventListener('change', (event) => {
          const selectedText = event.target.value;
          if (selectedText) {
            insertSnippetText(selectedText);
            event.target.selectedIndex = 0;
          }
        });
        toolbar.appendChild(select);
      }
    });
    
    const spacer = document.createElement('div');
    spacer.className = 'toolbar-spacer';
    toolbar.appendChild(spacer);

    const pasteButton = document.createElement('button');
    pasteButton.textContent = PASTE_BUTTON_LABEL;
    pasteButton.title = "Paste from Clipboard";
    pasteButton.addEventListener('click', handlePasteButtonClick);
    toolbar.appendChild(pasteButton);

    const globalDownloadButton = document.createElement('button');
    globalDownloadButton.textContent = DOWNLOAD_BUTTON_LABEL;
    globalDownloadButton.title = "Download active canvas content";
    globalDownloadButton.addEventListener('click', handleGlobalCanvasDownload);
    toolbar.appendChild(globalDownloadButton);

    if (document.body) {
      document.body.insertBefore(toolbar, document.body.firstChild);
      console.log("Ferdium Gemini Recipe: Toolbar inserted.");
    } else {
      document.addEventListener('DOMContentLoaded', () => {
          if(document.body) {
            document.body.insertBefore(toolbar, document.body.firstChild);
            console.log("Ferdium Gemini Recipe: Toolbar inserted on DOMContentLoaded.");
          } else {
            console.error("Ferdium Gemini Recipe: document.body still not found at DOMContentLoaded.");
          }
      });
    }
  }

  // --- Initialization Logic ---
  window.addEventListener('load', () => {
    injectCustomCSS();
    setTimeout(() => {
        createToolbar();
    }, 1000); 
  });

  Ferdium.displayErrorMessage = Ferdium.displayErrorMessage || function(message) {
    console.error("Ferdium Display Error:", message);
    alert(message); 
  };

}; // End of module.exports
