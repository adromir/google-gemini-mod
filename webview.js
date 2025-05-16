/**
 * Ferdium Recipe Webview Integration for Custom Google Gemini
 * Version: 0.0.27 (Reorganized code structure for better readability)
 * Author: Adromir (Original script by user, download feature added)
 */

module.exports = Ferdium => {

  // ===================================================================================
  // I. CONFIGURATION SECTION
  // ===================================================================================

  // --- Customizable Labels for Toolbar Buttons ---
  const PASTE_BUTTON_LABEL = "📋 Paste";
  const DOWNLOAD_BUTTON_LABEL = "💾 Download Canvas as File";

  // --- CSS Selectors for DOM Elements ---
  //    (Used by the global download button and snippet insertion)

  // Selector to find the h2 title element of an active canvas.
  // This is the primary way to detect an "active canvas".
  const GEMINI_CANVAS_TITLE_TEXT_SELECTOR = "#app-root > main > side-navigation-v2 > bard-sidenav-container > bard-sidenav-content > div.content-wrapper > div > div.content-container > chat-window > immersive-panel > code-immersive-panel > toolbar > div > div.left-panel > h2.title-text.gds-title-s.ng-star-inserted";
  
  // Selector for the "Copy to Clipboard" button, relative to the toolbar element.
  // The toolbar element is found by navigating up from the titleTextElement.
  const GEMINI_COPY_BUTTON_IN_TOOLBAR_SELECTOR = "div.action-buttons > copy-button.ng-star-inserted > button.copy-button";

  // Selectors for the Gemini input field (for snippet insertion)
  const GEMINI_INPUT_FIELD_SELECTORS = [
      '.ql-editor p', 
      '.ql-editor',   
      'div[contenteditable="true"]' 
  ];

  // --- Download Feature Configuration ---
  const DEFAULT_DOWNLOAD_EXTENSION = "txt"; 

  // --- Regular Expressions for Filename Sanitization ---
  // eslint-disable-next-line no-control-regex
  const INVALID_FILENAME_CHARS_REGEX = /[<>:"/\\|?*\x00-\x1F]/g;
  const RESERVED_WINDOWS_NAMES_REGEX = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  // General pattern for "basename.extension" where extension is 1-8 alphanumeric chars.
  const FILENAME_WITH_EXT_REGEX = /^(.+)\.([a-zA-Z0-9]{1,8})$/; 
  // For finding such a pattern as a substring (non-greedy base, ensuring it's followed by a word boundary or end of string)
  const SUBSTRING_FILENAME_REGEX = /([\w\s.,\-()[\\]{}'!~@#$%^&+=]+?\.([a-zA-Z0-9]{1,8}))(?=\s|$|[,.;:!?])/g;


  // ===================================================================================
  // II. TOOLBAR ELEMENT DEFINITIONS
  // ===================================================================================

  // --- Snippet Buttons Configuration ---
  const buttonSnippets = [
    { label: "Greeting", text: "Hello Gemini!" },
    { label: "Explain", text: "Could you please explain ... in more detail?" },
  ];

  // --- Dropdown Menus Configuration ---
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

  // ===================================================================================
  // III. SCRIPT LOGIC
  // ===================================================================================

  // --- Embedded CSS for the Toolbar ---
  const embeddedCSS = `
    #gemini-snippet-toolbar-v0-1 { 
      position: fixed !important; 
      top: 0 !important; 
      left: 50% !important; 
      transform: translateX(-50%) !important; 
      width: auto !important; 
      max-width: 80% !important; 
      padding: 10px 15px !important; 
      z-index: 999999 !important; 
      display: flex !important; 
      flex-wrap: wrap !important;
      gap: 8px !important; 
      align-items: center !important; 
      font-family: 'Roboto', 'Arial', sans-serif !important;
      box-sizing: border-box !important; 
      background-color: rgba(40, 42, 44, 0.95) !important;
      border-radius: 0 0 16px 16px !important; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    #gemini-snippet-toolbar-v0-1 button, 
    #gemini-snippet-toolbar-v0-1 select {
      padding: 4px 10px !important; 
      cursor: pointer !important; 
      background-color: #202122 !important;
      color: #e3e3e3 !important; 
      border-radius: 16px !important; 
      font-size: 13px !important;
      font-family: inherit !important; 
      font-weight: 500 !important; 
      height: 28px !important;
      box-sizing: border-box !important; 
      vertical-align: middle !important;
      transition: background-color 0.2s ease, transform 0.1s ease !important;
      border: none !important; 
      flex-shrink: 0;
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
    .toolbar-spacer { 
        margin-left: auto !important;
    }
  `;

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

  /**
   * Moves the cursor to the end of the provided element's content.
   * @param {Element} element - The contenteditable element or paragraph within it.
   */
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

  /**
   * Finds the target Gemini input element.
   * @returns {Element | null} The found input element or null.
   */
  function findTargetInputElement() {
    let targetInputElement = null;
    for (const selector of GEMINI_INPUT_FIELD_SELECTORS) {
      const element = document.querySelector(selector);
      if (element) {
        if (element.classList.contains('ql-editor')) {
          const pInEditor = element.querySelector('p');
          targetInputElement = pInEditor || element;
        } else {
          targetInputElement = element;
        }
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
    if (!targetInputElement) {
        console.error("Ferdium Gemini Recipe: Could not find the Gemini input field for snippet insertion.");
        Ferdium.displayErrorMessage("Could not find Gemini input field.");
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
        let insertedViaExec = false;
        try {
            insertedViaExec = document.execCommand('insertText', false, textToInsert);
        } catch (e) {
            console.warn("Ferdium Gemini Recipe: execCommand('insertText') threw an error:", e);
        }
        if (!insertedViaExec) {
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
  
  /**
   * Helper function to ensure filename length does not exceed a maximum.
   * @param {string} filename - The filename to check.
   * @param {number} maxLength - The maximum allowed length.
   * @returns {string} The potentially truncated filename.
   */
  function ensureLength(filename, maxLength = 255) {
    if (filename.length <= maxLength) {
        return filename;
    }
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex === -1 || dotIndex < filename.length - 10 ) { 
        return filename.substring(0, maxLength);
    }
    const base = filename.substring(0, dotIndex);
    const ext = filename.substring(dotIndex);
    const maxBaseLength = maxLength - ext.length;
    if (maxBaseLength <= 0) {
        return filename.substring(0, maxLength);
    }
    return base.substring(0, maxBaseLength) + ext;
  }

  /**
   * Sanitizes a base filename part (no extension).
   * @param {string} baseName - The base name to sanitize.
   * @returns {string} The sanitized base name.
   */
  function sanitizeBasename(baseName) {
    if (typeof baseName !== 'string' || baseName.trim() === "") return "downloaded_document";
    let sanitized = baseName.trim()
        .replace(INVALID_FILENAME_CHARS_REGEX, '_')
        .replace(/\s+/g, '_')
        .replace(/__+/g, '_')
        .replace(/^[_.-]+|[_.-]+$/g, '');
    if (!sanitized || RESERVED_WINDOWS_NAMES_REGEX.test(sanitized)) {
        sanitized = `_${sanitized || "file"}_`;
        sanitized = sanitized.replace(INVALID_FILENAME_CHARS_REGEX, '_').replace(/\s+/g, '_').replace(/__+/g, '_').replace(/^[_.-]+|[_.-]+$/g, '');
    }
    return sanitized || "downloaded_document";
  }

  /**
   * Determines the filename for download based on the canvas title,
   * prioritizing a `basename.ext` structure if found.
   * @param {string} title - The original string (e.g., canvas title).
   * @param {string} defaultExtension - The default extension if no structure is found.
   * @returns {string} A processed filename.
   */
  function determineFilename(title, defaultExtension = "txt") {
    const logPrefix = "Ferdium Gemini Recipe: determineFilename - ";
    if (!title || typeof title !== 'string' || title.trim() === "") {
        console.log(`${logPrefix}Input title invalid or empty, defaulting to "downloaded_document.${defaultExtension}".`);
        return ensureLength(`downloaded_document.${defaultExtension}`);
    }
    let trimmedTitle = title.trim();
    let baseNamePart = "";
    let extensionPart = "";
    const fullTitleMatch = trimmedTitle.match(FILENAME_WITH_EXT_REGEX);
    if (fullTitleMatch) {
        const potentialBase = fullTitleMatch[1];
        const potentialExt = fullTitleMatch[2].toLowerCase();
        if (!INVALID_FILENAME_CHARS_REGEX.test(potentialBase.replace(/\s/g, '_'))) {
            baseNamePart = potentialBase;
            extensionPart = potentialExt;
            console.log(`${logPrefix}Entire title "${trimmedTitle}" matches basename.ext. Base: "${baseNamePart}", Ext: "${extensionPart}"`);
        }
    }
    if (!extensionPart) { 
        let lastMatch = null;
        let currentMatch;
        SUBSTRING_FILENAME_REGEX.lastIndex = 0; 
        while ((currentMatch = SUBSTRING_FILENAME_REGEX.exec(trimmedTitle)) !== null) {
            lastMatch = currentMatch;
        }
        if (lastMatch) {
            const substringExtMatch = lastMatch[1].match(FILENAME_WITH_EXT_REGEX);
            if (substringExtMatch) {
                baseNamePart = substringExtMatch[1];
                extensionPart = substringExtMatch[2].toLowerCase();
                console.log(`${logPrefix}Found substring "${lastMatch[1]}" matching basename.ext. Base: "${baseNamePart}", Ext: "${extensionPart}"`);
            }
        }
    }
    if (extensionPart) { 
        const sanitizedBase = sanitizeBasename(baseNamePart);
        return ensureLength(`${sanitizedBase}.${extensionPart}`);
    } else {
        console.log(`${logPrefix}No basename.ext pattern found. Sanitizing full title "${trimmedTitle}" with default extension "${defaultExtension}".`);
        const sanitizedTitleBase = sanitizeBasename(trimmedTitle);
        return ensureLength(`${sanitizedTitleBase}.${defaultExtension}`);
    }
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
   * Handles the click of the global canvas download button.
   * Finds the active canvas title, then its toolbar and copy button,
   * then reads from clipboard and initiates download.
   */
  async function handleGlobalCanvasDownload() {
    const titleTextElement = document.querySelector(GEMINI_CANVAS_TITLE_TEXT_SELECTOR);

    if (!titleTextElement) {
      console.warn("Ferdium Gemini Recipe: No active canvas title found. Selector:", GEMINI_CANVAS_TITLE_TEXT_SELECTOR);
      Ferdium.displayErrorMessage("No active canvas found to download.");
      return;
    }
    console.log("Ferdium Gemini Recipe: Found canvas title element:", titleTextElement);

    const toolbarElement = titleTextElement.closest('toolbar'); 

    if (!toolbarElement) {
        console.warn("Ferdium Gemini Recipe: Could not find parent toolbar for the title element. Searched for 'toolbar' tag from title.");
        Ferdium.displayErrorMessage("Could not locate the toolbar for the active canvas.");
        return;
    }
    console.log("Ferdium Gemini Recipe: Found toolbar element relative to title:", toolbarElement);

    const copyButton = toolbarElement.querySelector(GEMINI_COPY_BUTTON_IN_TOOLBAR_SELECTOR);
    if (!copyButton) {
      console.warn("Ferdium Gemini Recipe: 'Copy to Clipboard' button not found within the identified toolbar. Selector used on toolbar:", GEMINI_COPY_BUTTON_IN_TOOLBAR_SELECTOR);
      Ferdium.displayErrorMessage("Could not find the 'Copy to Clipboard' button in the active canvas's toolbar.");
      return;
    }
    console.log("Ferdium Gemini Recipe: Found 'Copy to Clipboard' button:", copyButton);

    copyButton.click();
    console.log("Ferdium Gemini Recipe: Programmatically clicked the 'Copy to Clipboard' button.");

    setTimeout(async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          console.warn("Ferdium Gemini Recipe: Clipboard API not available or readText not supported for download.");
          Ferdium.displayErrorMessage("Clipboard access is not available. Cannot retrieve content for download.");
          return;
        }
        const clipboardContent = await navigator.clipboard.readText();
        console.log("Ferdium Gemini Recipe: Successfully read from clipboard.");

        if (!clipboardContent || clipboardContent.trim() === "") {
          console.warn("Ferdium Gemini Recipe: Clipboard is empty after copy operation.");
          Ferdium.displayErrorMessage("Clipboard was empty after attempting to copy. Nothing to download.");
          return;
        }
        
        const canvasTitle = (titleTextElement.textContent || "Untitled Canvas").trim();
        const filename = determineFilename(canvasTitle); 
        
        triggerDownload(filename, clipboardContent);
        console.log("Ferdium Gemini Recipe: Global download initiated for canvas title:", canvasTitle, "using clipboard content. Filename:", filename);

      } catch (err) {
        console.error('Ferdium Gemini Recipe: Failed to read from clipboard after copy:', err);
        if (err.name === 'NotAllowedError') {
          Ferdium.displayErrorMessage('Permission to read clipboard was denied. Please allow clipboard access.');
        } else {
          Ferdium.displayErrorMessage('Failed to read from clipboard. See console for details.');
        }
      }
    }, 300); 
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
    globalDownloadButton.title = "Download active canvas content (uses canvas's copy button)";
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

  // --- Initial Setup ---
  // Redirect for Workspace users (if necessary) - Placed before module.exports logic
  if (
    location.hostname === 'workspace.google.com' &&
    location.href.includes('products/gemini/')
  ) {
    location.href =
      'https://accounts.google.com/AccountChooser?continue=https://gemini.google.com/u/0/';
    // No return here, as the module export needs to happen for Ferdium.
    // The page will redirect anyway.
  }

  // --- Ferdium Integration ---
  Ferdium.handleDarkMode(isEnabled => { // This should be within the module.exports scope
    localStorage.setItem('theme', isEnabled ? 'dark' : 'light');
  });

  Ferdium.displayErrorMessage = Ferdium.displayErrorMessage || function(message) {
    console.error("Ferdium Display Error:", message);
    alert(message); 
  };
  
  // Initialize the main features after the window loads
  window.addEventListener('load', () => {
    injectCustomCSS();
    // Increased delay slightly for potentially complex UI rendering
    setTimeout(() => { 
        createToolbar();
    }, 1500); // Adjusted delay
  });

}; // End of module.exports