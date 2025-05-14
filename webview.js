/**
 * Ferdium Recipe Webview Integration for Custom Google Gemini
 * Version: 0.0.5 (Paste button moved right, customizable label, enhanced Enter key override)
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
    #gemini-snippet-toolbar-v0-1 .paste-button-class { /* Added a class for more specific styling if needed */
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
            targetInputElement = pInEditor; // Prefer the paragraph
            break;
          }
          // If no 'p' but '.ql-editor' is found, use it.
          targetInputElement = element;
          break;
        }
        targetInputElement = element; // For other selectors like 'div[contenteditable="true"]'
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
    let targetInputElement = findTargetInputElement(); // This will find .ql-editor or .ql-editor p
    let actualInsertionPoint = targetInputElement;

    if (targetInputElement) {
        // If the target is .ql-editor, we want to ensure text goes into a <p> tag if possible
        if (targetInputElement.classList.contains('ql-editor')) {
            let p = targetInputElement.querySelector('p');
            if (!p) { // If no <p> exists, create one
                p = document.createElement('p');
                // If the editor is completely empty, Gemini might add its own <p><br></p> on first input.
                // For now, we'll append our own.
                targetInputElement.appendChild(p);
                console.log("Ferdium Gemini Recipe: Created new 'p' tag inside .ql-editor for insertion.");
            }
            actualInsertionPoint = p; // Insert into the paragraph
        }
        
        actualInsertionPoint.focus();

        setTimeout(() => {
            moveCursorToEnd(actualInsertionPoint);

            let insertedViaExec = false;
            try {
                // execCommand should insert at the current cursor position (which is now at the end)
                insertedViaExec = document.execCommand('insertText', false, textToInsert);
            } catch (e) {
                console.warn("Ferdium Gemini Recipe: execCommand('insertText') threw an error:", e);
                insertedViaExec = false;
            }

            if (!insertedViaExec) {
                console.warn("Ferdium Gemini Recipe: execCommand('insertText') failed. Using fallback append.");
                if (actualInsertionPoint.innerHTML === '<br>') { // Clear placeholder <br> if it exists
                    actualInsertionPoint.innerHTML = '';
                }
                actualInsertionPoint.textContent += textToInsert;
                moveCursorToEnd(actualInsertionPoint); // Ensure cursor is at the very end after manual append
            }

            // Dispatch events on the main editor div or the most relevant input element
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

  /**
   * Sets up the Enter key override for the Gemini input field.
   * Enter will insert a newline, Shift+Enter will behave as default (usually also newline).
   */
  function setupEnterKeyOverride() {
    let attempts = 0;
    const maxAttempts = 30; // Try for 15 seconds (30 * 500ms)
    const intervalId = setInterval(() => {
        const targetInputElement = findTargetInputElement(); // This should find .ql-editor p or .ql-editor

        if (targetInputElement) {
            clearInterval(intervalId);
            console.log("Ferdium Gemini Recipe: Gemini input field found for Enter key override:", targetInputElement);

            // It's crucial this listener is on the element that receives key events before they are processed for sending.
            // This is typically the contenteditable element itself.
            targetInputElement.addEventListener('keydown', (event) => {
                // Check for Enter or NumpadEnter, and ensure Shift key is not pressed
                if ((event.key === 'Enter' || event.code === 'NumpadEnter') && !event.shiftKey) {
                    console.log("Ferdium Gemini Recipe: Enter/NumpadEnter pressed without Shift.");
                    event.preventDefault();    // Prevent default action (e.g., sending message)
                    event.stopPropagation(); // Stop event from bubbling up or being captured by other listeners

                    // Insert a line break.
                    // execCommand('insertHTML', false, '<br>') is generally reliable for contenteditable.
                    // execCommand('insertLineBreak') is an alternative but sometimes less consistent across browsers/editors.
                    if (document.queryCommandSupported('insertHTML')) {
                        document.execCommand('insertHTML', false, '<br>');
                    } else {
                        // Fallback if insertHTML is not supported (highly unlikely for modern browsers)
                        document.execCommand('insertText', false, '\n');
                    }


                    // Dispatch input event to ensure Gemini (and Quill) recognizes the change
                    // It's important to dispatch this on the element that Quill is watching,
                    // which is typically the .ql-editor div or the <p> within it.
                    targetInputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    console.log("Ferdium Gemini Recipe: Line break inserted.");
                }
            });
            console.log("Ferdium Gemini Recipe: Enter key override is active on element:", targetInputElement);
        } else {
            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(intervalId);
                console.warn("Ferdium Gemini Recipe: Could not find Gemini input field for Enter key override after multiple attempts.");
            }
        }
    }, 500);
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

    // --- Create "Paste from Clipboard" Button ---
    // This button will be pushed to the right due to its style/class
    const pasteButton = document.createElement('button');
    pasteButton.textContent = PASTE_BUTTON_LABEL; // Use the customizable label
    pasteButton.title = "Paste from Clipboard";
    pasteButton.className = 'paste-button-class'; // Apply class for styling (margin-left: auto)
    // Alternatively, directly: pasteButton.style.marginLeft = 'auto';
    pasteButton.addEventListener('click', handlePasteButtonClick);
    toolbar.appendChild(pasteButton); // Append it as the last child for flex order

    // --- Insert Toolbar into the DOM ---
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
        setupEnterKeyOverride();
    }, 750); // Slightly increased delay to give Gemini UI more time to settle
  });

}; // End of module.exports
