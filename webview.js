/**
 * Ferdium Recipe Webview Integration for Custom Google Gemini
 * Version: 0.0.6 (Revised Enter key override using document capture phase)
 */

module.exports = Ferdium => {
  // --- Customizable Elements ---
  const PASTE_BUTTON_LABEL = "📋 Paste"; // Customizable label for the paste button

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
  const embeddedCSS = `
    /* Styles for the Gemini Snippet Toolbar (v0.1) in Ferdium */
    #gemini-snippet-toolbar-v0-1 {
      position: fixed !important;
      top: 0 !important;
      left: 26% !important; /* Adjusted for potential Ferdium sidebars */
      width: 60% !important; /* Ensure it doesn't take full width if not desired */
      padding: 12px 12px !important;
      z-index: 99999 !important;
      display: flex !important;
      flex-wrap: wrap !important; /* Allow items to wrap if space is tight */
      gap: 8px !important;
      align-items: center !important;
      font-family: 'Roboto', 'Arial', sans-serif !important;
      box-sizing: border-box !important;
      background-color: rgba(40, 42, 44, 0.95) !important;
      border-bottom-right-radius: 16px !important;
      border-bottom-left-radius: 16px !important;
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
      flex-shrink: 0; /* Prevent buttons from shrinking too much */
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

    /* Style for the paste button to be pushed to the right */
    #gemini-snippet-toolbar-v0-1 .paste-button-class {
        margin-left: auto !important;
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
      '.ql-editor p', // Prefer the paragraph element within the Quill editor
      '.ql-editor',   // Fallback to the main Quill editor div
      'div[contenteditable="true"]' // Generic fallback for contenteditable divs
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
        alert("Clipboard access is not available or not permitted in this browser/context.");
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
        alert('Permission to read clipboard was denied. Please allow clipboard access in your browser settings or when prompted.');
      } else {
        alert('Failed to paste from clipboard. See console for details.');
      }
    }
  }
  
  // Store the intervalId globally to clear it when the field is found or max attempts are reached.
  let enterKeyOverrideIntervalId = null; 
  // Store reference to the input field once found
  let geminiInputFieldForEnterKey = null;

  /**
   * The actual keydown listener that will be attached to the document.
   * @param {KeyboardEvent} event
   */
  const documentKeydownListener = (event) => {
    if (!geminiInputFieldForEnterKey) return; // Should not happen if listener is attached after field is found

    const activeElement = document.activeElement;
    // Check if the event originated from our specific input field or its content.
    const isEventTargetOurInput = geminiInputFieldForEnterKey === activeElement || geminiInputFieldForEnterKey.contains(activeElement);

    if (!isEventTargetOurInput) {
      return; // Event is not from our input field, ignore.
    }

    if ((event.key === 'Enter' || event.code === 'NumpadEnter') && !event.shiftKey) {
      console.log("Ferdium Gemini Recipe (Capture): Enter/NumpadEnter pressed without Shift on target:", activeElement);
      event.preventDefault();
      event.stopImmediatePropagation(); // Crucial: stop other listeners and bubbling.

      // Ensure the correct element within the input field has focus, especially if it's a <p>
      let elementToInsertInto = geminiInputFieldForEnterKey;
      if (geminiInputFieldForEnterKey.classList.contains('ql-editor')) {
          let p = geminiInputFieldForEnterKey.querySelector('p.ql-paragraph') || geminiInputFieldForEnterKey.querySelector('p'); // More specific paragraph if possible
          if (p && (p === activeElement || p.contains(activeElement))) {
            elementToInsertInto = p;
          }
      }
      elementToInsertInto.focus(); // Focus the element where <br> will be inserted.

      // Move cursor to current position before inserting <br>
      // This helps if Enter is pressed in the middle of a line.
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          // If the cursor is inside an empty paragraph, or at the end of a line,
          // execCommand('insertHTML', <br>) should create a new line correctly.
          // No need to explicitly collapse if we want the break at the current caret position.
      } else {
          // If no selection, try to focus and move to end as a fallback (less ideal for mid-line Enter)
          moveCursorToEnd(elementToInsertInto);
      }

      let success = false;
      try {
        success = document.execCommand('insertHTML', false, '<br>');
        if (!success) {
           console.warn("Ferdium Gemini Recipe (Capture): execCommand('insertHTML', <br>) returned false.");
           success = document.execCommand('insertText', false, '\n'); // Fallback
           if(!success) console.warn("Ferdium Gemini Recipe (Capture): execCommand('insertText', \\n) also returned false.");
        }
      } catch (e) {
        console.error("Ferdium Gemini Recipe (Capture): Error during execCommand for line break:", e);
        success = false;
      }

      if (success) {
        console.log("Ferdium Gemini Recipe (Capture): Line break inserted.");
        // Dispatch input event on the element that Quill/Gemini is watching
        const dispatchElement = elementToInsertInto.closest('.ql-editor') || elementToInsertInto;
        dispatchElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      } else {
        console.error("Ferdium Gemini Recipe (Capture): Failed to insert line break via execCommand.");
      }
    }
  };

  /**
   * Finds the Gemini input field and attaches the document-level keydown listener.
   */
  function findInputAndAttachEnterListener() {
    geminiInputFieldForEnterKey = findTargetInputElement();

    if (geminiInputFieldForEnterKey) {
      console.log("Ferdium Gemini Recipe: Gemini input field found for Enter key override:", geminiInputFieldForEnterKey);
      
      // Remove any existing listener to prevent duplicates if this function is called multiple times.
      document.removeEventListener('keydown', documentKeydownListener, true); 
      // Add the capturing event listener to the document.
      document.addEventListener('keydown', documentKeydownListener, true); 

      console.log("Ferdium Gemini Recipe: Document-level Enter key override is active (capture phase).");
      if (enterKeyOverrideIntervalId) {
        clearInterval(enterKeyOverrideIntervalId); // Stop polling
        enterKeyOverrideIntervalId = null;
      }
    } else {
      // console.log is in setupEnterKeyOverride's interval logging
    }
  }

  /**
   * Sets up the Enter key override for the Gemini input field by polling.
   */
  function setupEnterKeyOverride() {
    let attempts = 0;
    const maxAttempts = 40; // Try for 20 seconds (40 * 500ms)

    // Clear any existing interval before starting a new one.
    if (enterKeyOverrideIntervalId) {
        clearInterval(enterKeyOverrideIntervalId);
    }

    enterKeyOverrideIntervalId = setInterval(() => {
      findInputAndAttachEnterListener(); // Try to find and attach
      attempts++;
      console.log(`Ferdium Gemini Recipe: Attempt ${attempts}/${maxAttempts} to find input field for Enter key override.`);
      if (geminiInputFieldForEnterKey || attempts >= maxAttempts) { // Stop if found or max attempts reached
        clearInterval(enterKeyOverrideIntervalId);
        enterKeyOverrideIntervalId = null;
        if (!geminiInputFieldForEnterKey) {
          console.warn("Ferdium Gemini Recipe: Could not find Gemini input field for Enter key override after multiple attempts.");
        }
      }
    }, 500);
    findInputAndAttachEnterListener(); // Initial immediate attempt
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

    const pasteButton = document.createElement('button');
    pasteButton.textContent = PASTE_BUTTON_LABEL;
    pasteButton.title = "Paste from Clipboard";
    pasteButton.className = 'paste-button-class';
    pasteButton.addEventListener('click', handlePasteButtonClick);
    toolbar.appendChild(pasteButton);

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
        setupEnterKeyOverride(); // This now starts the polling mechanism
    }, 750);
  });

}; // End of module.exports
