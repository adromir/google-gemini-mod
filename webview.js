/**
 * Ferdium Recipe Webview Integration for Custom Google Gemini
 * Version: 0.0.3 (Includes append fix for snippet insertion)
 */

module.exports = Ferdium => {
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
    // document.body.classList.toggle('dark-mode', isEnabled); // Optional: if Gemini uses classes
  });

  // --- Embedded CSS ---
  // CSS content from service.css is embedded here to avoid TrustedHTML issues with Ferdium.injectCSS
  const embeddedCSS = `
    /* Styles for the Gemini Snippet Toolbar (v0.1) in Ferdium */
    #gemini-snippet-toolbar-v0-1 {
      position: fixed !important; /* Use !important to increase specificity if needed */
      top: 0 !important;
      left: 26% !important; /* Adjusted for potential Ferdium sidebars */
      padding: 12px 12px !important;
      z-index: 99999 !important; /* Higher z-index */
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      align-items: center !important;
      font-family: 'Roboto', 'Arial', sans-serif !important;
      box-sizing: border-box !important;
      background-color: rgba(40, 42, 44, 0.95) !important; /* Slightly less transparent */
      border-bottom-right-radius: 10px !important;
	  border-bottom-left-radius: 10px !important;
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
      border-color: #7c8186 !important;
    }

    #gemini-snippet-toolbar-v0-1 button:active {
      background-color: #5f6368 !important;
      transform: scale(0.98) !important;
    }
  `; // End of embeddedCSS

  /**
   * Injects the embedded CSS safely into the document head.
   */
  function injectCustomCSS() {
      const styleId = 'ferdium-gemini-toolbar-styles';
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
    // Add more button snippets here
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
    // Add more dropdown configurations here
  ];
  // ------------------------------------

  /**
   * Moves the cursor to the end of the provided element's content.
   * @param {Element} element - The contenteditable element or paragraph within it.
   */
  function moveCursorToEnd(element) {
      try {
          const range = document.createRange();
          const sel = window.getSelection();
          // Select all content within the element
          range.selectNodeContents(element);
          // Collapse the range to the end point.
          // true collapses to the start, false collapses to the end.
          range.collapse(false);
          // Remove any existing selections
          sel.removeAllRanges();
          // Add the new collapsed range, effectively placing the cursor at the end
          sel.addRange(range);
      } catch (e) {
          console.error("Ferdium Gemini Recipe: Error setting cursor position:", e);
      }
  }

  /**
   * Inserts text into the Gemini input field, always appending.
   * @param {string} textToInsert - The text snippet to insert.
   */
  function insertSnippetText(textToInsert) {
    const selectorsToTry = [
      '.ql-editor p', // Prefer the paragraph element
      '.ql-editor',   // Fallback to the main editor div
      'div[contenteditable="true"]' // Generic fallback
    ];
    let targetInputElement = null;
    let targetParagraphElement = null; // Specifically track the paragraph

    // Find the target element
    for (const selector of selectorsToTry) {
      targetInputElement = document.querySelector(selector);
      if (targetInputElement) {
        // If we found the main editor, try to find/use the paragraph inside it
        if (targetInputElement.classList.contains('ql-editor')) {
            targetParagraphElement = targetInputElement.querySelector('p');
            // If no 'p' exists yet, we might need to create it later or use the editor div itself
            if (!targetParagraphElement) {
                 console.warn("Ferdium Gemini Recipe: No 'p' tag found inside .ql-editor initially.");
                 // Keep targetInputElement as .ql-editor for now
            } else {
                // Prefer the paragraph if found
                targetInputElement = targetParagraphElement;
            }
        } else if (targetInputElement.tagName === 'P') {
            targetParagraphElement = targetInputElement;
        }
        break; // Stop searching once a target is found
      }
    }

    if (targetInputElement) {
      // Always focus the element first
      targetInputElement.focus();

      // Use setTimeout to ensure focus and cursor positioning happen correctly
      setTimeout(() => {
        // --- Move cursor to the end BEFORE inserting ---
        moveCursorToEnd(targetInputElement);

        // --- Attempt insertion ---
        let insertedViaExec = false;
        try {
            // Try the standard command first - it should now insert at the end
            insertedViaExec = document.execCommand('insertText', false, textToInsert);
        } catch (e) {
            console.warn("Ferdium Gemini Recipe: execCommand('insertText') threw an error:", e);
            insertedViaExec = false; // Ensure fallback is used
        }


        // --- Fallback if execCommand failed or wasn't supported ---
        if (!insertedViaExec) {
          console.warn("Ferdium Gemini Recipe: execCommand('insertText') failed or returned false. Using fallback append.");

          // Determine the element to append to (prefer paragraph)
          let elementToAppendTo = targetParagraphElement || targetInputElement;

          // If the target is the .ql-editor and still no 'p' exists, create one
          if (elementToAppendTo.classList.contains('ql-editor') && !elementToAppendTo.querySelector('p')) {
              const newP = document.createElement('p');
              // Add a zero-width space if it's empty, sometimes helps with focus/editing
              newP.innerHTML = '&#8203;';
              elementToAppendTo.appendChild(newP);
              elementToAppendTo = newP; // Append to the newly created paragraph
              console.log("Ferdium Gemini Recipe: Created new 'p' tag for appending.");
          }

          // Append the text content
          elementToAppendTo.textContent += textToInsert;

          // --- Move cursor to the end AFTER fallback insertion ---
          moveCursorToEnd(elementToAppendTo);
        }

        // --- Dispatch events to notify Gemini ---
        // Dispatch on the original targetInputElement found (usually .ql-editor or its p)
        const elementToDispatchOn = document.querySelector('.ql-editor') || targetInputElement;
        elementToDispatchOn.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        elementToDispatchOn.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

        console.log("Ferdium Gemini Recipe: Snippet inserted.");

      }, 50); // 50ms delay

    } else {
      console.error("Ferdium Gemini Recipe: Could not find the Gemini input field. Checked selectors:", selectorsToTry);
    }
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

    // --- Create Buttons ---
    buttonSnippets.forEach(snippet => {
      const button = document.createElement('button');
      button.textContent = snippet.label;
      button.title = snippet.text;
      button.addEventListener('click', () => {
        insertSnippetText(snippet.text);
      });
      toolbar.appendChild(button);
    });

    // --- Create Dropdowns ---
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

    // --- Insert Toolbar into the DOM ---
    if (document.body) {
        document.body.insertBefore(toolbar, document.body.firstChild);
        console.log("Ferdium Gemini Recipe: Toolbar inserted.");
    } else {
        console.warn("Ferdium Gemini Recipe: document.body not found at toolbar insertion time.");
    }
  }

  // --- Initialization Logic ---
  window.addEventListener('load', () => {
      injectCustomCSS();
      setTimeout(createToolbar, 500);
  });

}; // End of module.exports
