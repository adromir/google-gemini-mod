/**
 * Ferdium Recipe Webview Integration for Custom Google Gemini
 * Version: 0.0.4 (Includes append fix, paste button, and Enter key override)
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
  const embeddedCSS = `
    /* Styles for the Gemini Snippet Toolbar (v0.1) in Ferdium */
    #gemini-snippet-toolbar-v0-1 {
      position: fixed !important; /* Use !important to increase specificity if needed */
      top: 0 !important;
      left: 26% !important; /* Adjusted for potential Ferdium sidebars */
	  width: 60% !important;
      padding: 12px 12px !important;
      z-index: 99999 !important; /* Higher z-index */
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      align-items: center !important;
      font-family: 'Roboto', 'Arial', sans-serif !important;
      box-sizing: border-box !important;
      background-color: rgba(40, 42, 44, 0.95) !important; /* Slightly less transparent */
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
      /* border-color: #7c8186 !important; */ /* Border removed, so this is not needed */
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
        // If we found .ql-editor, try to get the <p> inside it.
        // Gemini often uses a <p> tag inside .ql-editor for the actual text.
        if (element.classList.contains('ql-editor')) {
          const pInEditor = element.querySelector('p');
          if (pInEditor) {
            targetInputElement = pInEditor;
            break;
          }
        }
        targetInputElement = element;
        break; // Stop searching once a target is found
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
    let targetParagraphElement = null;

    // Refine target if it's .ql-editor to ensure we operate on the paragraph if it exists
    if (targetInputElement && targetInputElement.classList.contains('ql-editor')) {
        const p = targetInputElement.querySelector('p');
        if (p) {
            targetParagraphElement = p;
            targetInputElement = p; // Prefer the paragraph for insertion
        } else {
            // If no 'p' exists, we might need to create it or ensure text goes into .ql-editor directly
            console.warn("Ferdium Gemini Recipe: No 'p' tag found inside .ql-editor for insertion. Will use .ql-editor itself.");
        }
    } else if (targetInputElement && targetInputElement.tagName === 'P') {
        targetParagraphElement = targetInputElement;
    }


    if (targetInputElement) {
      targetInputElement.focus();

      setTimeout(() => {
        moveCursorToEnd(targetInputElement);

        let insertedViaExec = false;
        try {
          insertedViaExec = document.execCommand('insertText', false, textToInsert);
        } catch (e) {
          console.warn("Ferdium Gemini Recipe: execCommand('insertText') threw an error:", e);
          insertedViaExec = false;
        }

        if (!insertedViaExec) {
          console.warn("Ferdium Gemini Recipe: execCommand('insertText') failed. Using fallback append.");
          let elementToAppendTo = targetParagraphElement || targetInputElement;

          if (elementToAppendTo.classList.contains('ql-editor') && !elementToAppendTo.querySelector('p')) {
            const newP = document.createElement('p');
            // Add a zero-width space if it's empty, sometimes helps with focus/editing
            // Or, if the editor is truly empty, Gemini might initialize its own <p> on input.
            // For appending, it's safer to ensure the text goes into the existing flow.
            // If newP.innerHTML is empty, textContent += will work fine.
            elementToAppendTo.appendChild(newP);
            elementToAppendTo = newP;
            console.log("Ferdium Gemini Recipe: Created new 'p' tag for appending within .ql-editor.");
          }

          // If the element is a div (like .ql-editor) and has no text,
          // or if it's a p, just append.
          // If it's a p and it's empty, ensure it's not just a <br> placeholder from Gemini
          if (elementToAppendTo.innerHTML === '<br>') {
            elementToAppendTo.innerHTML = ''; // Clear the placeholder <br>
          }
          elementToAppendTo.textContent += textToInsert;
          moveCursorToEnd(elementToAppendTo);
        }

        // Dispatch events on the main editor div if possible, or the target itself
        const editorDiv = document.querySelector('.ql-editor') || targetInputElement;
        editorDiv.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        editorDiv.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

        console.log("Ferdium Gemini Recipe: Snippet inserted.");
      }, 50); // 50ms delay

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
        alert("Clipboard access is not available or not permitted in this browser/context."); // User-friendly message
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
      // Notify the user if permission was denied or another error occurred
      if (err.name === 'NotAllowedError') {
        alert('Permission to read clipboard was denied. Please allow clipboard access in your browser settings or when prompted.');
      } else {
        alert('Failed to paste from clipboard. See console for details.');
      }
    }
  }

  /**
   * Sets up the Enter key override for the Gemini input field.
   * Enter will insert a newline, Shift+Enter will behave as default (usually also newline).
   */
  function setupEnterKeyOverride() {
    // Try to find the input field repeatedly until it's found, as it might be dynamically loaded.
    let attempts = 0;
    const maxAttempts = 20; // Try for 10 seconds (20 * 500ms)
    const intervalId = setInterval(() => {
        const targetInputElement = findTargetInputElement(); // Use the refined finder

        if (targetInputElement) {
            clearInterval(intervalId); // Stop trying once found
            console.log("Ferdium Gemini Recipe: Gemini input field found for Enter key override.", targetInputElement);

            targetInputElement.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault(); // Prevent default action (e.g., sending message)

                    // Insert a line break.
                    // Using insertHTML with <br> is often reliable for contenteditable divs.
                    // For Quill editor (.ql-editor), it typically handles <br> correctly.
                    document.execCommand('insertHTML', false, '<br>');

                    // Dispatch input event to ensure Gemini recognizes the change
                    targetInputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

                    console.log("Ferdium Gemini Recipe: Enter pressed, inserted line break.");
                }
                // If Shift+Enter is pressed, do nothing and let the default behavior occur.
            });
            console.log("Ferdium Gemini Recipe: Enter key override is active.");
        } else {
            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(intervalId); // Stop trying after max attempts
                console.warn("Ferdium Gemini Recipe: Could not find Gemini input field for Enter key override after multiple attempts.");
            }
        }
    }, 500); // Check every 500ms
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

    // --- Create "Paste from Clipboard" Button ---
    const pasteButton = document.createElement('button');
    pasteButton.textContent = "Paste";
    pasteButton.title = "Paste from Clipboard";
    pasteButton.addEventListener('click', handlePasteButtonClick);
    toolbar.appendChild(pasteButton);


    // --- Create Buttons from buttonSnippets ---
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
            event.target.selectedIndex = 0; // Reset dropdown
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
      // This case should be rare if called on window.load, but good to have a fallback.
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
    setTimeout(() => { // Slight delay to ensure Gemini's UI might be more ready
        createToolbar();
        setupEnterKeyOverride(); // Initialize the Enter key override
    }, 500); // Increased delay slightly
  });

}; // End of module.exports
