/**
 * Ferdium Recipe Webview Integration for Custom Google Gemini
 * Version: 0.0.4
 * Author: Adromir
 * Changelog:
 * - Added sort functionality: Users can now reorder buttons and dropdowns
 *   in the settings panel using up/down arrow buttons.
 * - Updated remove button logic to refresh sort button states correctly.
 * - Aligned dropdown placeholder input and remove button side-by-side.
 * - Added spacing between save and cancel buttons.
 * - Fixed crash on initialization by rewriting settings panel creation
 * to be compliant with TrustedHTML Content Security Policy.
 */

module.exports = Ferdium => {

    // ===================================================================================
    // I. CONFIGURATION SECTION
    // ===================================================================================

    const STORAGE_KEY_BUTTONS = "ferdiumGeminiModButtons";
    const STORAGE_KEY_DROPDOWNS = "ferdiumGeminiModDropdowns";

    // --- Customizable Labels for Toolbar Buttons ---
    const PASTE_BUTTON_LABEL = "📋 Paste";
    const DOWNLOAD_BUTTON_LABEL = "💾 Download Canvas";
    const SETTINGS_BUTTON_LABEL = "⚙️ Settings";

    // --- CSS Selectors for DOM Elements ---
    const GEMINI_CANVAS_TITLE_TEXT_SELECTOR = "code-immersive-panel > toolbar > div > div.left-panel > h2.title-text.gds-title-s.ng-star-inserted";
    const GEMINI_CANVAS_SHARE_BUTTON_SELECTOR = "toolbar div.action-buttons share-button > button";
    const GEMINI_CANVAS_COPY_BUTTON_SELECTOR = "copy-button[data-test-id='copy-button'] > button.copy-button";
    const GEMINI_INPUT_FIELD_SELECTORS = ['.ql-editor p', '.ql-editor', 'div[contenteditable="true"]'];

    // --- Download Feature Configuration ---
    const DEFAULT_DOWNLOAD_EXTENSION = "txt";

    // --- Regular Expressions for Filename Sanitization ---
    // eslint-disable-next-line no-control-regex
    const INVALID_FILENAME_CHARS_REGEX = /[<>:"/\\|?*\x00-\x1F]/g;
    const RESERVED_WINDOWS_NAMES_REGEX = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    const FILENAME_WITH_EXT_REGEX = /^(.+)\.([a-zA-Z0-9]{1,8})$/;

    // ===================================================================================
    // II. DEFAULT TOOLBAR DEFINITIONS (Used if no custom config is saved)
    // ===================================================================================

    const defaultButtonSnippets = [
        { label: "Greeting", text: "Hello Gemini!" },
        { label: "Explain", text: "Could you please explain ... in more detail?" },
    ];

    const defaultDropdownConfigurations = [
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

    let currentButtonSnippets = [];
    let currentDropdownConfigurations = [];

    const embeddedCSS = `
        /* --- Toolbar Styles --- */
        #gemini-snippet-toolbar-ferdium {
            position: fixed !important; top: 0 !important; left: 50% !important;
            transform: translateX(-50%) !important;
            width: auto !important; max-width: 80% !important;
            padding: 10px 15px !important; z-index: 999999 !important;
            display: flex !important; flex-wrap: wrap !important;
            gap: 8px !important; align-items: center !important; font-family: 'Roboto', 'Arial', sans-serif !important;
            box-sizing: border-box !important; background-color: rgba(40, 42, 44, 0.95) !important;
            border-radius: 0 0 16px 16px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        }
        #gemini-snippet-toolbar-ferdium button,
        #gemini-snippet-toolbar-ferdium select {
            padding: 4px 10px !important; cursor: pointer !important; background-color: #202122 !important;
            color: #e3e3e3 !important; border-radius: 16px !important; font-size: 13px !important;
            font-family: inherit !important; font-weight: 500 !important; height: 28px !important;
            box-sizing: border-box !important; vertical-align: middle !important;
            transition: background-color 0.2s ease, transform 0.1s ease !important;
            border: none !important; flex-shrink: 0;
        }
        #gemini-snippet-toolbar-ferdium select {
            padding-right: 25px !important; appearance: none !important;
            background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="%23e3e3e3" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>') !important;
            background-repeat: no-repeat !important; background-position: right 8px center !important; background-size: 12px 12px !important;
        }
        #gemini-snippet-toolbar-ferdium option {
            background-color: #2a2a2a !important; color: #e3e3e3 !important;
            font-weight: normal !important; padding: 5px 10px !important;
        }
        #gemini-snippet-toolbar-ferdium button:hover,
        #gemini-snippet-toolbar-ferdium select:hover { background-color: #4a4e51 !important; }
        #gemini-snippet-toolbar-ferdium button:active { background-color: #5f6368 !important; transform: scale(0.98) !important; }
        .userscript-toolbar-spacer { margin-left: auto !important; }

        /* --- Settings Panel Styles --- */
        #gemini-mod-settings-panel {
            display: none; position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%); z-index: 1000000;
            background-color: #282a2c; color: #e3e3e3; border-radius: 16px;
            padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            width: 90vw; max-width: 800px; max-height: 80vh; overflow-y: auto;
            font-family: 'Roboto', 'Arial', sans-serif !important;
        }
        #gemini-mod-settings-panel h2 { margin-top: 0; border-bottom: 1px solid #444; padding-bottom: 10px; }
        #gemini-mod-settings-panel h3 { margin-top: 10px; }
        #gemini-mod-settings-panel .settings-section { margin-bottom: 20px; }
        #gemini-mod-settings-panel label { display: block; margin: 10px 0 5px; font-weight: 500; }
        #gemini-mod-settings-panel input[type="text"], #gemini-mod-settings-panel textarea {
            width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #5f6368;
            background-color: #202122; color: #e3e3e3; box-sizing: border-box;
        }
        #gemini-mod-settings-panel textarea { min-height: 80px; resize: vertical; }
        #gemini-mod-settings-panel .item-group {
            border: 1px solid #444; border-radius: 8px; padding: 15px; margin-bottom: 10px;
            display: grid; grid-template-columns: auto 1fr 1fr auto; gap: 10px; align-items: center;
        }
        #gemini-mod-settings-panel .dropdown-item-group {
            border: 1px solid #444; border-radius: 8px; padding: 15px; margin-bottom: 10px;
            position: relative;
        }
        #gemini-mod-settings-panel .dropdown-options-container { margin-left: 20px; margin-top: 10px; }
        #gemini-mod-settings-panel .option-item { display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; align-items: center; margin-bottom: 5px; }
        #gemini-mod-settings-panel button {
             padding: 4px 10px !important; cursor: pointer !important; background-color: #3c4043 !important;
             color: #e3e3e3 !important; border-radius: 16px !important; font-size: 13px !important;
             border: none !important; transition: background-color 0.2s ease;
        }
        #gemini-mod-settings-panel button:hover { background-color: #4a4e51 !important; }
        #gemini-mod-settings-panel .remove-btn { background-color: #5c2b2b !important; }
        #gemini-mod-settings-panel .remove-btn:hover { background-color: #7d3a3a !important; }
        #gemini-mod-settings-panel .settings-actions {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        }
        #gemini-mod-settings-panel .sort-controls { display: flex; flex-direction: column; gap: 4px; }
        #gemini-mod-settings-panel .sort-btn { padding: 2px 6px !important; height: auto !important; line-height: 1; }
        #gemini-mod-settings-panel .sort-btn:disabled { background-color: #202122 !important; color: #5f6368 !important; cursor: not-allowed; }
    `;

    // --- Core Functions ---

    function injectCustomCSS() {
        const styleId = 'ferdium-gemini-custom-styles';
        if (document.getElementById(styleId)) return;
        try {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = embeddedCSS;
            document.head.appendChild(style);
        } catch (error) {
            console.error("Ferdium Gemini Recipe: Failed to inject custom CSS:", error);
        }
    }

    // --- Text Insertion Logic ---

    function findTargetInputElement() {
        for (const selector of GEMINI_INPUT_FIELD_SELECTORS) {
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
        const target = findTargetInputElement();
        if (!target) {
            Ferdium.displayErrorMessage("Could not find Gemini input field.");
            return;
        }
        target.focus();
        setTimeout(() => {
            try {
                document.execCommand('insertText', false, textToInsert);
            } catch (e) {
                console.warn("Ferdium Gemini Recipe: execCommand failed, falling back.", e);
                target.textContent += textToInsert;
            }
            target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        }, 50);
    }

    // --- Configuration Management (using localStorage) ---

    function loadConfiguration() {
        try {
            const savedButtons = localStorage.getItem(STORAGE_KEY_BUTTONS);
            const savedDropdowns = localStorage.getItem(STORAGE_KEY_DROPDOWNS);

            currentButtonSnippets = savedButtons ? JSON.parse(savedButtons) : defaultButtonSnippets;
            currentDropdownConfigurations = savedDropdowns ? JSON.parse(savedDropdowns) : defaultDropdownConfigurations;
        } catch (e) {
            console.error("Ferdium Gemini Recipe: Error loading configuration, using defaults.", e);
            currentButtonSnippets = defaultButtonSnippets;
            currentDropdownConfigurations = defaultDropdownConfigurations;
        }
    }

    function saveConfiguration() {
        const settingsPanel = document.getElementById('gemini-mod-settings-panel');
        if (!settingsPanel) return;

        const newButtons = [];
        settingsPanel.querySelectorAll('#buttons-container > .item-group').forEach(group => {
            const label = group.querySelector('.label-input').value.trim();
            const text = group.querySelector('.text-input').value;
            if (label) newButtons.push({ label, text });
        });

        const newDropdowns = [];
        settingsPanel.querySelectorAll('#dropdowns-container > .dropdown-item-group').forEach(group => {
            const placeholder = group.querySelector('.placeholder-input').value.trim();
            const options = [];
            group.querySelectorAll('.option-item').forEach(opt => {
                const label = opt.querySelector('.label-input').value.trim();
                const text = opt.querySelector('.text-input').value;
                if (label) options.push({ label, text });
            });
            if (placeholder && options.length > 0) {
                newDropdowns.push({ placeholder, options });
            }
        });

        try {
            localStorage.setItem(STORAGE_KEY_BUTTONS, JSON.stringify(newButtons));
            localStorage.setItem(STORAGE_KEY_DROPDOWNS, JSON.stringify(newDropdowns));
            loadConfiguration(); // Reload current config from storage
            rebuildToolbar();
            toggleSettingsPanel(false);
            console.log("Ferdium Gemini Recipe: Settings saved.");
        } catch (e) {
            Ferdium.displayErrorMessage("Failed to save settings. See console for details.");
            console.error("Ferdium Gemini Recipe: Error saving settings:", e);
        }
    }

    /**
     * Safely removes all child nodes from a given DOM element.
     * @param {HTMLElement} element The element to clear.
     */
    function clearElement(element) {
        if (!element) return;
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    // --- Toolbar Creation ---

    function createToolbar() {
        const toolbarId = 'gemini-snippet-toolbar-ferdium';
        let toolbar = document.getElementById(toolbarId);
        if (toolbar) {
            clearElement(toolbar); // Clear existing toolbar if rebuilding
        } else {
            toolbar = document.createElement('div');
            toolbar.id = toolbarId;
            document.body.insertBefore(toolbar, document.body.firstChild);
        }

        currentButtonSnippets.forEach(snippet => {
            const button = document.createElement('button');
            button.textContent = snippet.label;
            button.title = snippet.text;
            button.addEventListener('click', () => insertSnippetText(snippet.text));
            toolbar.appendChild(button);
        });

        currentDropdownConfigurations.forEach(config => {
            const select = document.createElement('select');
            select.title = config.placeholder;
            const defaultOption = new Option(config.placeholder, "", true, true);
            defaultOption.disabled = true;
            select.appendChild(defaultOption);
            config.options.forEach(opt => select.appendChild(new Option(opt.label, opt.text)));
            select.addEventListener('change', (e) => {
                if (e.target.value) {
                    insertSnippetText(e.target.value);
                    e.target.selectedIndex = 0;
                }
            });
            toolbar.appendChild(select);
        });

        const spacer = document.createElement('div');
        spacer.className = 'userscript-toolbar-spacer';
        toolbar.appendChild(spacer);

        const pasteButton = document.createElement('button');
        pasteButton.textContent = PASTE_BUTTON_LABEL;
        pasteButton.title = "Paste from Clipboard";
        pasteButton.addEventListener('click', async () => {
             try {
                const text = await navigator.clipboard.readText();
                if (text) insertSnippetText(text);
            } catch (err) {
                Ferdium.displayErrorMessage('Failed to read clipboard: ' + err.message);
            }
        });
        toolbar.appendChild(pasteButton);

        const downloadButton = document.createElement('button');
        downloadButton.textContent = DOWNLOAD_BUTTON_LABEL;
        downloadButton.title = "Download active canvas content";
        downloadButton.addEventListener('click', handleGlobalCanvasDownload);
        toolbar.appendChild(downloadButton);

        const settingsButton = document.createElement('button');
        settingsButton.textContent = SETTINGS_BUTTON_LABEL;
        settingsButton.title = "Open Settings";
        settingsButton.addEventListener('click', () => toggleSettingsPanel());
        toolbar.appendChild(settingsButton);
    }

    function rebuildToolbar() {
        const toolbar = document.getElementById('gemini-snippet-toolbar-ferdium');
        if (toolbar) createToolbar();
    }

    // --- Settings Panel UI ---

    function updateSortButtonsState(container) {
        if (!container) return;
        const items = Array.from(container.children);
        items.forEach((item, i) => {
            const upBtn = item.querySelector('.sort-btn-up');
            const downBtn = item.querySelector('.sort-btn-down');
            if (upBtn) upBtn.disabled = (i === 0);
            if (downBtn) downBtn.disabled = (i === items.length - 1);
        });
    }

    function createSettingsPanel() {
        if (document.getElementById('gemini-mod-settings-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'gemini-mod-settings-panel';

        const h2 = document.createElement('h2');
        h2.textContent = 'Gemini Mod Settings';
        panel.appendChild(h2);

        // Buttons Section
        const buttonsSection = document.createElement('div');
        buttonsSection.className = 'settings-section';
        buttonsSection.id = 'settings-buttons';
        const buttonsH3 = document.createElement('h3');
        buttonsH3.textContent = 'Buttons';
        buttonsSection.appendChild(buttonsH3);
        const buttonsContainer = document.createElement('div');
        buttonsContainer.id = 'buttons-container';
        buttonsSection.appendChild(buttonsContainer);
        const addButtonBtn = document.createElement('button');
        addButtonBtn.id = 'add-button-btn';
        addButtonBtn.textContent = 'Add Button';
        buttonsSection.appendChild(addButtonBtn);
        panel.appendChild(buttonsSection);

        // Dropdowns Section
        const dropdownsSection = document.createElement('div');
        dropdownsSection.className = 'settings-section';
        dropdownsSection.id = 'settings-dropdowns';
        const dropdownsH3 = document.createElement('h3');
        dropdownsH3.textContent = 'Dropdowns';
        dropdownsSection.appendChild(dropdownsH3);
        const dropdownsContainer = document.createElement('div');
        dropdownsContainer.id = 'dropdowns-container';
        dropdownsSection.appendChild(dropdownsContainer);
        const addDropdownBtn = document.createElement('button');
        addDropdownBtn.id = 'add-dropdown-btn';
        addDropdownBtn.textContent = 'Add Dropdown';
        dropdownsSection.appendChild(addDropdownBtn);
        panel.appendChild(dropdownsSection);

        // Actions Section
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'settings-actions';
        const saveBtn = document.createElement('button');
        saveBtn.id = 'settings-save-btn';
        saveBtn.textContent = 'Save & Close';
        actionsDiv.appendChild(saveBtn);
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'settings-cancel-btn';
        cancelBtn.textContent = 'Cancel';
        actionsDiv.appendChild(cancelBtn);
        panel.appendChild(actionsDiv);

        document.body.appendChild(panel);

        // Event Listeners
        saveBtn.addEventListener('click', saveConfiguration);
        cancelBtn.addEventListener('click', () => toggleSettingsPanel(false));
        addButtonBtn.addEventListener('click', () => {
            const container = document.getElementById('buttons-container');
            addButtonToPanel(undefined, container);
            updateSortButtonsState(container);
        });
        addDropdownBtn.addEventListener('click', () => {
            const container = document.getElementById('dropdowns-container');
            addDropdownToPanel(undefined, container);
            updateSortButtonsState(container);
        });
    }

    function populateSettingsPanel() {
        const buttonsContainer = document.getElementById('buttons-container');
        const dropdownsContainer = document.getElementById('dropdowns-container');

        clearElement(buttonsContainer);
        clearElement(dropdownsContainer);

        currentButtonSnippets.forEach(btn => addButtonToPanel(btn, buttonsContainer));
        updateSortButtonsState(buttonsContainer);

        currentDropdownConfigurations.forEach(dd => addDropdownToPanel(dd, dropdownsContainer));
        updateSortButtonsState(dropdownsContainer);
    }

    function addButtonToPanel(button = { label: '', text: '' }, container) {
        if (!container) container = document.getElementById('buttons-container');
        const group = document.createElement('div');
        group.className = 'item-group';

        // Sort Controls
        const sortControls = document.createElement('div');
        sortControls.className = 'sort-controls';
        const upBtn = document.createElement('button');
        upBtn.textContent = '▲';
        upBtn.className = 'sort-btn sort-btn-up';
        upBtn.addEventListener('click', () => {
            if (group.previousElementSibling) {
                group.parentNode.insertBefore(group, group.previousElementSibling);
                updateSortButtonsState(container);
            }
        });
        const downBtn = document.createElement('button');
        downBtn.textContent = '▼';
        downBtn.className = 'sort-btn sort-btn-down';
        downBtn.addEventListener('click', () => {
            if (group.nextElementSibling) {
                group.parentNode.insertBefore(group.nextElementSibling, group);
                updateSortButtonsState(container);
            }
        });
        sortControls.appendChild(upBtn);
        sortControls.appendChild(downBtn);
        group.appendChild(sortControls);

        // Label
        const labelDiv = document.createElement('div');
        const labelLabel = document.createElement('label');
        labelLabel.textContent = 'Button Label';
        labelDiv.appendChild(labelLabel);
        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.className = 'label-input';
        labelInput.value = button.label;
        labelDiv.appendChild(labelInput);
        group.appendChild(labelDiv);

        // Text
        const textDiv = document.createElement('div');
        const textLabel = document.createElement('label');
        textLabel.textContent = 'Snippet Text';
        textDiv.appendChild(textLabel);
        const textInput = document.createElement('textarea');
        textInput.className = 'text-input';
        textInput.value = button.text;
        textDiv.appendChild(textInput);
        group.appendChild(textDiv);

        // Remove Button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            group.remove();
            updateSortButtonsState(container);
        });
        group.appendChild(removeBtn);

        container.appendChild(group);
    }

    function addDropdownToPanel(dropdown = { placeholder: '', options: [] }, container) {
        if (!container) container = document.getElementById('dropdowns-container');
        const group = document.createElement('div');
        group.className = 'dropdown-item-group';

        // Placeholder & Main Controls
        const placeholderDiv = document.createElement('div');
        const placeholderLabel = document.createElement('label');
        placeholderLabel.textContent = 'Dropdown Placeholder';
        placeholderDiv.appendChild(placeholderLabel);

        const inputWrapper = document.createElement('div');
        inputWrapper.style.display = 'flex';
        inputWrapper.style.gap = '8px';
        inputWrapper.style.alignItems = 'center';

        const placeholderInput = document.createElement('input');
        placeholderInput.type = 'text';
        placeholderInput.className = 'placeholder-input';
        placeholderInput.value = dropdown.placeholder;
        inputWrapper.appendChild(placeholderInput);

        const removeDropdownBtn = document.createElement('button');
        removeDropdownBtn.className = 'remove-btn';
        removeDropdownBtn.textContent = 'Remove Dropdown';
        removeDropdownBtn.addEventListener('click', () => {
             group.remove();
             updateSortButtonsState(container);
        });
        inputWrapper.appendChild(removeDropdownBtn);

        // Sort controls for dropdown
        const sortControls = document.createElement('div');
        sortControls.className = 'sort-controls';
        const upBtn = document.createElement('button');
        upBtn.textContent = '▲';
        upBtn.className = 'sort-btn sort-btn-up';
        upBtn.addEventListener('click', () => {
             if (group.previousElementSibling) {
                group.parentNode.insertBefore(group, group.previousElementSibling);
                updateSortButtonsState(container);
            }
        });
        const downBtn = document.createElement('button');
        downBtn.textContent = '▼';
        downBtn.className = 'sort-btn sort-btn-down';
        downBtn.addEventListener('click', () => {
             if (group.nextElementSibling) {
                group.parentNode.insertBefore(group.nextElementSibling, group);
                updateSortButtonsState(container);
            }
        });
        sortControls.appendChild(upBtn);
        sortControls.appendChild(downBtn);
        inputWrapper.appendChild(sortControls);

        placeholderDiv.appendChild(inputWrapper);
        group.appendChild(placeholderDiv);

        // Options Container
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'dropdown-options-container';
        const optionsLabel = document.createElement('label');
        optionsLabel.textContent = 'Options';
        optionsContainer.appendChild(optionsLabel);
        group.appendChild(optionsContainer);

        // Add Option Button
        const addOptionBtn = document.createElement('button');
        addOptionBtn.className = 'add-option-btn';
        addOptionBtn.textContent = 'Add Option';
        addOptionBtn.addEventListener('click', () => {
            addOptionToDropdownPanel(optionsContainer);
        });
        group.appendChild(addOptionBtn);

        // Populate existing options
        if (dropdown.options && dropdown.options.length > 0) {
            dropdown.options.forEach(opt => addOptionToDropdownPanel(optionsContainer, opt));
        } else {
             addOptionToDropdownPanel(optionsContainer);
        }

        container.appendChild(group);
    }

    function addOptionToDropdownPanel(container, option = { label: '', text: '' }) {
        const item = document.createElement('div');
        item.className = 'option-item';

        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.className = 'label-input';
        labelInput.placeholder = 'Option Label';
        labelInput.value = option.label;
        item.appendChild(labelInput);

        const textInput = document.createElement('textarea');
        textInput.className = 'text-input';
        textInput.placeholder = 'Snippet Text';
        textInput.value = option.text;
        item.appendChild(textInput);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'X';
        removeBtn.addEventListener('click', () => item.remove());
        item.appendChild(removeBtn);

        container.appendChild(item);
    }

    function toggleSettingsPanel(forceState) {
        const panel = document.getElementById('gemini-mod-settings-panel');
        if (!panel) return;
        const isVisible = panel.style.display === 'block';
        const show = typeof forceState === 'boolean' ? forceState : !isVisible;

        if (show) {
            populateSettingsPanel();
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    }

    // --- Download Logic ---

    function sanitizeBasename(baseName) {
        if (typeof baseName !== 'string' || baseName.trim() === "") return "downloaded_document";
        let sanitized = baseName.trim()
            .replace(INVALID_FILENAME_CHARS_REGEX, '_')
            .replace(/\s+/g, '_')
            .replace(/__+/g, '_')
            .replace(/^[_.-]+|[_.-]+$/g, '');
        if (!sanitized || RESERVED_WINDOWS_NAMES_REGEX.test(sanitized)) {
            sanitized = `_${sanitized || "file"}_`;
        }
        return sanitized || "downloaded_document";
    }

    function determineFilename(title) {
        if (!title || typeof title !== 'string' || title.trim() === "") {
            return `downloaded_document.${DEFAULT_DOWNLOAD_EXTENSION}`;
        }
        const match = title.trim().match(FILENAME_WITH_EXT_REGEX);
        if (match) {
            return `${sanitizeBasename(match[1])}.${match[2].toLowerCase()}`;
        }
        return `${sanitizeBasename(title)}.${DEFAULT_DOWNLOAD_EXTENSION}`;
    }

    function triggerDownload(filename, content) {
        try {
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            Ferdium.displayErrorMessage(`Failed to download: ${error.message}`);
        }
    }

    async function handleGlobalCanvasDownload() {
        const titleEl = document.querySelector(GEMINI_CANVAS_TITLE_TEXT_SELECTOR);
        if (!titleEl) return Ferdium.displayErrorMessage("No active canvas found to download.");

        const panelEl = titleEl.closest('code-immersive-panel');
        const shareButton = panelEl?.querySelector(GEMINI_CANVAS_SHARE_BUTTON_SELECTOR);
        if (!shareButton) return Ferdium.displayErrorMessage("Could not find the 'Share' button.");

        shareButton.click();

        setTimeout(() => {
            const copyButton = document.querySelector(GEMINI_CANVAS_COPY_BUTTON_SELECTOR);
            if (!copyButton) return Ferdium.displayErrorMessage("Could not find the 'Copy' button after sharing.");

            copyButton.click();

            setTimeout(async () => {
                try {
                    const content = await navigator.clipboard.readText();
                    if (!content) return Ferdium.displayErrorMessage("Clipboard empty. Nothing to download.");
                    const filename = determineFilename(titleEl.textContent);
                    triggerDownload(filename, content);
                } catch (err) {
                    Ferdium.displayErrorMessage('Clipboard permission denied or failed to read.');
                }
            }, 300);
        }, 500);
    }

    // --- Initial Setup ---
    if (
      location.hostname === 'workspace.google.com' &&
      location.href.includes('products/gemini/')
    ) {
      location.href =
        'https://accounts.google.com/AccountChooser?continue=https://gemini.google.com/u/0/';
    }

    Ferdium.handleDarkMode(isEnabled => {
      localStorage.setItem('theme', isEnabled ? 'dark' : 'light');
    });

    Ferdium.displayErrorMessage = Ferdium.displayErrorMessage || function(message) {
      console.error("Ferdium Display Error:", message);
      alert(message);
    };

    window.addEventListener('load', () => {
        injectCustomCSS();
        loadConfiguration();
        setTimeout(() => {
            try {
                createToolbar();
                createSettingsPanel();
                console.log("Ferdium Gemini Recipe: Fully initialized.");
            } catch (e) {
                console.error("Ferdium Gemini Recipe: Error during initialization:", e);
                Ferdium.displayErrorMessage("Error initializing toolbar. See console.");
            }
        }, 1500);
    });
};

