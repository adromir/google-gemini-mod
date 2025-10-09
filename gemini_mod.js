// ===================================================================================
//               Google Gemini Mod for Ferdium
// ===================================================================================
// Version: 0.0.2
// Author: Adromir
//
// This script enhances the Google Gemini web interface within the Ferdium app.
// It adds a customizable quick-access toolbar, drag-and-drop folders for
// organizing chats, and a download feature for conversations.
// This version uses a custom, lightweight drag-and-drop implementation.
// ===================================================================================

(function() {
	'use strict';

	// ===================================================================================
	// I. HELPER FUNCTIONS
	// ===================================================================================

	/**
	 * Saves a value to localStorage, serializing it as JSON.
	 * @param {string} key The key under which to store the value.
	 * @param {any} value The value to store. Must be JSON-serializable.
	 * @returns {Promise<void>}
	 */
	function _setValue(key, value) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
			return Promise.resolve();
		} catch (e) {
			console.error("Gemini Mod (Ferdium): Error setting localStorage item", key, e);
			return Promise.reject(e);
		}
	}

	/**
	 * Retrieves a value from localStorage, parsing it from JSON.
	 * @param {string} key The key of the value to retrieve.
	 * @param {any} [defaultValue=null] The value to return if the key is not found or parsing fails.
	 * @returns {Promise<any>}
	 */
	function _getValue(key, defaultValue = null) {
		try {
			const value = localStorage.getItem(key);
			if (value === null) {
				return Promise.resolve(defaultValue);
			}
			return Promise.resolve(JSON.parse(value));
		} catch (e) {
			console.error("Gemini Mod (Ferdium): Error getting localStorage item", key, e);
			return Promise.resolve(defaultValue); // Return default on error to prevent crashes
		}
	}

	/**
	 * Deletes a key and its value from localStorage.
	 * @param {string} key The key to delete.
	 * @returns {Promise<void>}
	 */
	function _deleteValue(key) {
		try {
			localStorage.removeItem(key);
			return Promise.resolve();
		} catch (e) {
			console.error("Gemini Mod (Ferdium): Error deleting localStorage item", key, e);
			return Promise.reject(e);
		}
	}


	// ===================================================================================
	// II. CONFIGURATION SECTION
	// ===================================================================================

	// --- Storage Keys ---
	const STORAGE_KEY_TOOLBAR_ITEMS = "geminiModToolbarItems_v2";
	const STORAGE_KEY_FOLDERS = 'gemini_folders';
	const STORAGE_KEY_CONVO_FOLDERS = 'gemini_convo_folders';

	// --- Toolbar UI Labels ---
	const PASTE_BUTTON_LABEL = "📋 Paste";
	const DOWNLOAD_BUTTON_LABEL = "💾 Download";
	const SETTINGS_BUTTON_LABEL = "⚙️ Settings";

	// --- CSS Selectors ---
	const GEMINI_CODE_CANVAS_TITLE_SELECTOR = "code-immersive-panel > toolbar > div > div.left-panel > h2.title-text.gds-title-s.ng-star-inserted";
	const GEMINI_CODE_CANVAS_PANEL_SELECTOR = 'code-immersive-panel';
	const GEMINI_CODE_CANVAS_SHARE_BUTTON_SELECTOR = "toolbar div.action-buttons share-button > button";
	const GEMINI_CODE_CANVAS_COPY_BUTTON_SELECTOR = "copy-button[data-test-id='copy-button'] > button.copy-button";
	const GEMINI_DOC_CANVAS_PANEL_SELECTOR = "immersive-panel";
	const GEMINI_DOC_CANVAS_EDITOR_SELECTOR = ".ProseMirror";
	const GEMINI_DOC_CANVAS_TITLE_SELECTOR = ".ProseMirror h1";
	const GEMINI_INPUT_FIELD_SELECTORS = ['.ql-editor p', '.ql-editor', 'div[contenteditable="true"]'];
	const FOLDER_CHAT_ITEM_SELECTOR = 'div[data-test-id="conversation"]';
	const FOLDER_CHAT_CONTAINER_SELECTOR = '.conversation-items-container';
	const FOLDER_CHAT_LIST_CONTAINER_SELECTOR = 'conversations-list .conversations-container';
	const FOLDER_INJECTION_POINT_SELECTOR = 'div.chat-history-list';


	// --- Download Feature Configuration ---
	const DEFAULT_DOWNLOAD_EXTENSION = "txt";

	// --- Filename Sanitization Regex ---
	// eslint-disable-next-line no-control-regex
	const INVALID_FILENAME_CHARS_REGEX = /[<>:"/\\|?*\x00-\x1F]/g;
	const RESERVED_WINDOWS_NAMES_REGEX = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
	const FILENAME_WITH_EXT_REGEX = /^(.+)\.([a-zA-Z0-9]{1,8})$/;

	// ===================================================================================
	// III. DEFAULT DEFINITIONS (Used if no custom config is saved)
	// ===================================================================================

	const defaultToolbarItems = [
		{ type: 'button', label: "Greeting", text: "Hello Gemini!" },
		{ type: 'button', label: "Explain", text: "Could you please explain ... in more detail?" },
		{
			type: 'dropdown',
			placeholder: "Actions...",
			options: [
				{ label: "Summarize", text: "Please summarize the following text:\n" },
				{ label: "Ideas", text: "Give me 5 ideas for ..." },
			]
		},
	];

	// ===================================================================================
	// IV. SCRIPT LOGIC
	// ===================================================================================

	// --- Global State ---
	let toolbarItems = [];
	let folders = [];
	let conversationFolders = {};
	const FOLDER_COLORS = ['#370000', '#0D3800', '#001B38', '#383200', '#380031', '#7DAC89', '#7A82AF', '#AC7D98', '#7AA7AF', '#9CA881'];


	// --- Styles ---
	const embeddedCSS = `
		/* --- Toolbar Styles --- */
		#gemini-snippet-toolbar-script {
			position: fixed !important; top: 0 !important; left: 50% !important;
			transform: translateX(-50%) !important;
			width: auto !important; max-width: 80% !important;
			padding: 10px 15px !important; z-index: 999998 !important; /* Below settings panel */
			display: flex !important; flex-wrap: wrap !important;
			gap: 8px !important; align-items: center !important; font-family: 'Roboto', 'Arial', sans-serif !important;
			box-sizing: border-box !important; background-color: rgba(40, 42, 44, 0.95) !important;
			border-radius: 0 0 16px 16px !important;
			box-shadow: 0 4px 12px rgba(0,0,0,0.25);
		}
		#gemini-snippet-toolbar-script button,
		#gemini-snippet-toolbar-script select {
			padding: 4px 10px !important; cursor: pointer !important; background-color: #202122 !important;
			color: #e3e3e3 !important; border-radius: 16px !important; font-size: 13px !important;
			font-family: inherit !important; font-weight: 500 !important; height: 28px !important;
			box-sizing: border-box !important; vertical-align: middle !important;
			transition: background-color: 0.2s ease, transform: 0.1s ease !important;
			border: none !important; flex-shrink: 0;
		}
		#gemini-snippet-toolbar-script select {
			padding-right: 25px !important; appearance: none !important;
			background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="%23e3e3e3" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>') !important;
			background-repeat: no-repeat !important; background-position: right 8px center !important; background-size: 12px 12px !important;
		}
		#gemini-snippet-toolbar-script option {
			background-color: #2a2a2a !important; color: #e3e3e3 !important;
			font-weight: normal !important; padding: 5px 10px !important;
		}
		#gemini-snippet-toolbar-script button:hover,
		#gemini-snippet-toolbar-script select:hover { background-color: #4a4e51 !important; }
		#gemini-snippet-toolbar-script button:active { background-color: #5f6368 !important; transform: scale(0.98) !important; }
		.mod-toolbar-spacer { margin-left: auto !important; }

		/* --- Settings Panel & Modal Styles --- */
		#gemini-mod-settings-overlay, #gemini-mod-type-modal-overlay {
			display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
			background-color: rgba(0,0,0,0.6); z-index: 999999;
		}
		#gemini-mod-settings-panel, #gemini-mod-type-modal {
			position: fixed; top: 50%; left: 50%;
			transform: translate(-50%, -50%);
			background-color: #282a2c; color: #e3e3e3; border-radius: 16px;
			padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
			font-family: 'Roboto', 'Arial', sans-serif !important;
		}
		#gemini-mod-settings-panel {
			width: 90vw; max-width: 800px; max-height: 80vh; overflow-y: auto;
		}
		#gemini-mod-type-modal {
		    text-align: center;
		}
		#gemini-mod-type-modal h3 { margin-top: 0; }
		#gemini-mod-type-modal button { margin: 0 10px; }
		#gemini-mod-settings-panel h2 { margin-top: 0; border-bottom: 1px solid #444; padding-bottom: 10px; }
        #gemini-mod-settings-panel h3 { margin-top: 20px; border-bottom: 1px solid #444; padding-bottom: 8px; }
		#gemini-mod-settings-panel label { display: block; margin: 10px 0 5px; font-weight: 500; }
		#gemini-mod-settings-panel input[type="text"], #gemini-mod-settings-panel textarea {
			width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #5f6368;
			background-color: #202122; color: #e3e3e3; box-sizing: border-box;
		}
		#gemini-mod-settings-panel textarea { min-height: 80px; resize: vertical; }
		#gemini-mod-settings-panel .item-group {
			border: 1px solid #444; border-radius: 8px; padding: 15px; margin-bottom: 10px;
			display: flex; gap: 10px; align-items: flex-start;
            cursor: grab;
		}
		#gemini-mod-settings-panel .item-content { 
			flex-grow: 1;
			display: flex;
			flex-direction: column;
		}
		#gemini-mod-settings-panel .dropdown-options-container { margin-left: 20px; margin-top: 10px; }
		
		#gemini-mod-settings-panel .option-item { 
			display: flex; 
			gap: 10px; 
			align-items: flex-start; 
			margin-bottom: 10px; 
		}
		#gemini-mod-settings-panel .option-item > input, 
		#gemini-mod-settings-panel .option-item > textarea {
			flex: 1;
			min-width: 0;
		}
		#gemini-mod-settings-panel .option-item > .remove-btn {
			flex-shrink: 0;
			height: 34px;
		}

		#gemini-mod-settings-panel button {
			 padding: 4px 10px !important; cursor: pointer !important; background-color: #3c4043 !important;
			 color: #e3e3e3 !important; border-radius: 16px !important; font-size: 13px !important;
			 border: none !important; transition: background-color: 0.2s ease;
		}
		#gemini-mod-settings-panel button:hover { background-color: #4a4e51 !important; }
		#gemini-mod-settings-panel .remove-btn, .dialog-btn-delete { background-color: #5c2b2b !important; color: white !important; }
		#gemini-mod-settings-panel .remove-btn:hover, .dialog-btn-delete:hover { background-color: #7d3a3a !important; }
		#gemini-mod-settings-panel .settings-actions {
			margin-top: 20px; display: flex; justify-content: flex-end; gap: 8px;
		}

		/* --- Folder UI Styles --- */
		#folder-ui-container { padding: 0 8px; }
		#folder-container { padding-bottom: 8px; border-bottom: 1px solid var(--surface-3); }
		.folder { margin-bottom: 5px; border-radius: 8px; overflow: hidden; }
		.folder-header { display: flex; align-items: center; padding: 10px; cursor: pointer; background-color: var(--surface-2); position: relative; }
		.folder-header:hover { background-color: var(--surface-3); }
		.folder-color-indicator { width: 8px; height: 20px; border-radius: 4px; margin-right: 10px; flex-shrink: 0; }
		.folder-name { flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'Roboto', Arial, sans-serif !important; }
		.folder-controls { display: flex; align-items: center; margin-left: 5px; }
		.folder-toggle-icon { transition: transform 0.2s; }
		.folder.closed .folder-toggle-icon { transform: rotate(-90deg); }
		.folder-options-btn { background: none; border: none; color: inherit; cursor: pointer; padding: 2px 4px; border-radius: 4px; margin-left: 4px; font-size: 1.2em; line-height: 1; }
		.folder-options-btn:hover { background-color: rgba(255,255,255,0.1); }
		.folder-content { max-height: 500px; overflow-y: auto; transition: max-height 0.3s ease-in-out, padding 0.3s ease-in-out; background-color: var(--surface-1); min-height: 10px; }
		.folder.closed .folder-content { max-height: 0; padding-top: 0; padding-bottom: 0; min-height: 0; }
		#add-folder-btn { width: 100%; margin: 8px 0; padding: 10px; border: none; background-color: var(--primary-surface); color: var(--on-primary-surface); border-radius: 8px; cursor: pointer; font-weight: 500; }
		#add-folder-btn:hover { opacity: 0.9; }
		.conversation-items-container { cursor: grab; }
		.folder-context-menu { position: absolute; z-index: 10000; background-color: #333333; border: 1px solid var(--surface-4); border-radius: 8px; padding: 5px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); display: none; }
		.folder-context-menu-item { padding: 8px 12px; cursor: pointer; border-radius: 4px; white-space: nowrap; font-family: 'Roboto', Arial, sans-serif !important; color: #FFFFFF; }
		.folder-context-menu-item:hover { background-color: var(--surface-4); }
		.folder-context-menu-item.delete { color: #DB4437; }
        .sortable-ghost { opacity: 0.8; background: #333; }
        .sortable-chosen { opacity: 0.5; }


		/* --- Dialog & Color Picker Styles --- */
		.custom-dialog-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(34, 34, 34, 0.75); z-index: 1000000; display: flex; align-items: center; justify-content: center; }
		.custom-dialog-box { background-color: #333333; padding: 25px; border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); text-align: center; max-width: 400px; border: 1px solid var(--surface-4); }
		.custom-dialog-box p, .custom-dialog-box h2 { margin: 0 0 20px; font-family: 'Roboto', Arial, sans-serif; color: #FFFFFF; }
		.custom-dialog-btn { border: none; border-radius: 8px; padding: 10px 20px; cursor: pointer; font-weight: 500; margin: 0 10px; }
		.dialog-btn-confirm { background-color: #8ab4f8; color: #202124; }
		.dialog-btn-cancel { background-color: var(--surface-4); color: var(--on-surface); }
		.custom-dialog-input { width: 100%; box-sizing: border-box; padding: 10px; border-radius: 8px; border: 1px solid var(--surface-4); background-color: var(--surface-1); color: var(--on-surface); font-size: 16px; margin-bottom: 20px; }
		.color-picker-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
		.color-picker-dialog .color-swatch { width: 32px; height: 32px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; position: relative; }
		.color-picker-dialog .color-swatch:hover { border: 2px solid var(--on-primary-surface); }
		.color-picker-dialog .color-swatch.selected::after { content: ""; position: absolute; inset: 0; border: 3px solid #fff; border-radius: 50%; box-sizing: border-box; pointer-events: none; }
	`;

	// --- Core Functions ---

	function injectCustomCSS() {
		try {
			if (document.getElementById('gemini-mod-styles')) return;
			const style = document.createElement('style');
			style.id = 'gemini-mod-styles';
			style.textContent = embeddedCSS;
			document.head.appendChild(style);
		} catch (error) {
			console.error("Gemini Mod (Ferdium): Failed to inject custom CSS:", error);
		}
	}

	function displayModMessage(message, isError = true) {
		const prefix = "Gemini Mod (Ferdium): ";
		if (isError) console.error(prefix + message);
		else console.log(prefix + message);
		alert(prefix + message);
	}

	function clearElement(element) {
		if (element) {
			while (element.firstChild) {
				element.removeChild(element.firstChild);
			}
		}
	}

	// --- Text Insertion Logic ---

	function findTargetInputElement() {
		for (const selector of GEMINI_INPUT_FIELD_SELECTORS) {
			const element = document.querySelector(selector);
			if (element) {
				return element.classList.contains('ql-editor') ? (element.querySelector('p') || element) : element;
			}
		}
		return null;
	}

	function insertSnippetText(textToInsert) {
		const target = findTargetInputElement();
		if (!target) {
			displayModMessage("Could not find Gemini input field.");
			return;
		}
		target.focus();
		setTimeout(() => {
			try {
				document.execCommand('insertText', false, textToInsert);
			} catch (e) {
				console.warn("Gemini Mod: execCommand failed, falling back to textContent.", e);
				target.textContent += textToInsert;
			}
			target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
		}, 50);
	}


	// --- Configuration Management ---

	async function loadConfiguration() {
		try {
			// Toolbar items
			const savedToolbarItems = await _getValue(STORAGE_KEY_TOOLBAR_ITEMS);
			toolbarItems = savedToolbarItems || defaultToolbarItems;
			// Folder items
			folders = await _getValue(STORAGE_KEY_FOLDERS, []);
			conversationFolders = await _getValue(STORAGE_KEY_CONVO_FOLDERS, {});
		} catch (e) {
			console.error("Gemini Mod: Error loading configuration, using defaults.", e);
			toolbarItems = defaultToolbarItems;
			folders = [];
			conversationFolders = {};
		}
	}

	async function saveToolbarConfiguration() {
		const settingsPanel = document.getElementById('gemini-mod-settings-panel');
		if (!settingsPanel) return;

		const newItems = [];
		settingsPanel.querySelectorAll('#toolbar-items-container > .item-group').forEach(group => {
			const type = group.dataset.type;
			if (type === 'button') {
				const label = group.querySelector('.label-input').value.trim();
				const text = group.querySelector('.text-input').value;
				if (label) newItems.push({ type, label, text });
			} else if (type === 'dropdown') {
				const placeholder = group.querySelector('.placeholder-input').value.trim();
				const options = [];
				group.querySelectorAll('.option-item').forEach(opt => {
					const label = opt.querySelector('.label-input').value.trim();
					const text = opt.querySelector('.text-input').value;
					if (label) options.push({ label, text });
				});
				if (placeholder && options.length > 0) {
					newItems.push({ type, placeholder, options });
				}
			}
		});

		try {
			await _setValue(STORAGE_KEY_TOOLBAR_ITEMS, newItems);
			await loadConfiguration(); // Reload all configs
			rebuildToolbar();
			toggleSettingsPanel(false);
		} catch (e) {
			displayModMessage("Failed to save settings. See console for details.");
			console.error("Gemini Mod: Error saving settings:", e);
		}
	}

	async function saveFolderConfiguration() {
		await _setValue(STORAGE_KEY_FOLDERS, folders);
		await _setValue(STORAGE_KEY_CONVO_FOLDERS, conversationFolders);
	}


	// --- Toolbar Creation ---

	function createToolbar() {
		const toolbarId = 'gemini-snippet-toolbar-script';
		let toolbar = document.getElementById(toolbarId);
		if (toolbar) {
			clearElement(toolbar);
		} else {
			toolbar = document.createElement('div');
			toolbar.id = toolbarId;
			document.body.insertBefore(toolbar, document.body.firstChild);
		}

		toolbarItems.forEach(item => {
			if (item.type === 'button') {
				const button = document.createElement('button');
				button.textContent = item.label;
				button.title = item.text;
				button.addEventListener('click', () => insertSnippetText(item.text));
				toolbar.appendChild(button);
			} else if (item.type === 'dropdown') {
				const select = document.createElement('select');
				select.title = item.placeholder;
				const defaultOption = new Option(item.placeholder, "", true, true);
				defaultOption.disabled = true;
				select.appendChild(defaultOption);
				item.options.forEach(opt => select.appendChild(new Option(opt.label, opt.text)));
				select.addEventListener('change', (e) => {
					if (e.target.value) {
						insertSnippetText(e.target.value);
						e.target.selectedIndex = 0;
					}
				});
				toolbar.appendChild(select);
			}
		});

		const spacer = document.createElement('div');
		spacer.className = 'mod-toolbar-spacer';
		toolbar.appendChild(spacer);

		const pasteButton = document.createElement('button');
		pasteButton.textContent = PASTE_BUTTON_LABEL;
		pasteButton.title = "Paste from Clipboard";
		pasteButton.addEventListener('click', async () => {
			try {
				const text = await navigator.clipboard.readText();
				if (text) insertSnippetText(text);
			} catch (err) {
				displayModMessage('Failed to read clipboard: ' + err.message);
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
		settingsButton.title = "Open Mod Settings";
		settingsButton.addEventListener('click', () => toggleSettingsPanel());
		toolbar.appendChild(settingsButton);
	}

	function rebuildToolbar() {
		const toolbar = document.getElementById('gemini-snippet-toolbar-script');
		if (toolbar) createToolbar();
	}


	// --- Folder UI and Logic ---

	function getIdentifierFromElement(el) {
		if (!el) return null;
		if (el.matches(FOLDER_CHAT_CONTAINER_SELECTOR)) {
			el = el.querySelector(FOLDER_CHAT_ITEM_SELECTOR) || el;
		}
		const anchor = el.closest('a');
		if (anchor) {
			const href = anchor.getAttribute('href') || '';
			const m = href.match(/\/conversation\/([A-Za-z0-9_-]+)/);
			if (m) return m[1];
		}
		const jslog = el.getAttribute('jslog') || '';
		let m = jslog.match(/"c_([A-Za-z0-9_-]+)"/);
		if (!m) m = jslog.match(/c_([A-Za-z0-9_-]+)/);
		if (m) return m[1];
		const t = el.querySelector('.conversation-title');
		if (t) return `title:${t.textContent.trim()}`;
		console.warn('[Gemini Folders] Could not find ID for element:', el);
		return null;
	}

	function renderFolders() {
		const container = document.getElementById('folder-container');
		if (!container) return;
		clearElement(container);

		folders.forEach(folder => {
			const folderEl = document.createElement('div');
			folderEl.className = 'folder';
			folderEl.dataset.folderId = folder.id;
			if (folder.isClosed) folderEl.classList.add('closed');

			const headerEl = document.createElement('div');
			headerEl.className = 'folder-header';
			headerEl.addEventListener('click', (e) => {
				if (!e.target.closest('.folder-options-btn')) toggleFolder(folder.id);
			});

			const colorIndicator = document.createElement('div');
			colorIndicator.className = 'folder-color-indicator';
			colorIndicator.style.backgroundColor = folder.color;

			const nameEl = document.createElement('span');
			nameEl.className = 'folder-name';
			nameEl.textContent = folder.name;

			const controlsEl = document.createElement('div');
			controlsEl.className = 'folder-controls';

			const toggleIcon = document.createElement('span');
			toggleIcon.className = 'folder-toggle-icon';
			toggleIcon.textContent = '▼';

			const optionsBtn = document.createElement('button');
			optionsBtn.className = 'folder-options-btn';
			optionsBtn.textContent = '⋮';
			optionsBtn.addEventListener('click', (e) => showContextMenu(e, folder.id));

			controlsEl.appendChild(toggleIcon);
			controlsEl.appendChild(optionsBtn);
			headerEl.appendChild(colorIndicator);
			headerEl.appendChild(nameEl);
			headerEl.appendChild(controlsEl);

			const contentEl = document.createElement('div');
			contentEl.className = 'folder-content';
			contentEl.setAttribute('data-ss-zone', 'true'); // For SimpleSortable

			folderEl.appendChild(headerEl);
			folderEl.appendChild(contentEl);
			container.appendChild(folderEl);
		});

		organizeConversations();
		setupDragAndDrop();
	}

	function organizeConversations() {
		const chatListContainer = document.querySelector(FOLDER_CHAT_LIST_CONTAINER_SELECTOR);
		if (!chatListContainer) return;
		
		chatListContainer.setAttribute('data-ss-zone', 'true'); // For SimpleSortable
		
		// Add draggable attribute to items
		document.querySelectorAll(FOLDER_CHAT_CONTAINER_SELECTOR).forEach(item => {
			item.setAttribute('data-ss-draggable', 'true');
		});


		const folderIds = new Set(folders.map(f => f.id));
		let dataWasCorrected = false;

		document.querySelectorAll('.folder-content ' + FOLDER_CHAT_CONTAINER_SELECTOR).forEach(item => {
			const convoEl = item.querySelector(FOLDER_CHAT_ITEM_SELECTOR);
			const identifier = getIdentifierFromElement(convoEl);
			if (!identifier || !conversationFolders[identifier] || !folderIds.has(conversationFolders[identifier])) {
				chatListContainer.appendChild(item);
			}
		});

		Array.from(chatListContainer.children).forEach(itemToMove => {
			const convoEl = itemToMove.querySelector(FOLDER_CHAT_ITEM_SELECTOR);
			const identifier = getIdentifierFromElement(convoEl);
			if (!identifier) return;

			let folderId = conversationFolders[identifier];

			if (folderId && !folderIds.has(folderId)) {
				delete conversationFolders[identifier];
				folderId = null;
				dataWasCorrected = true;
			}

			if (folderId) {
				const folderContent = document.querySelector(`.folder[data-folder-id="${folderId}"] .folder-content`);
				if (folderContent && !folderContent.contains(itemToMove)) {
					folderContent.appendChild(itemToMove);
				}
			}
		});

		if (dataWasCorrected) saveFolderConfiguration();
	}

	function createNewFolder() {
		showCustomPromptDialog("Enter New Folder Name", "", "Create", (name) => {
			if (name) {
				const newFolder = { id: `folder_${Date.now()}`, name, color: '#808080', isClosed: false };
				folders.push(newFolder);
				saveFolderConfiguration().then(renderFolders);
			}
		});
	}

	function updateFolderHeader(folderId) {
		const folder = folders.find(f => f.id === folderId);
		const folderEl = document.querySelector(`.folder[data-folder-id="${folderId}"]`);
		if (!folder || !folderEl) return;
		folderEl.querySelector('.folder-name').textContent = folder.name;
		folderEl.querySelector('.folder-color-indicator').style.backgroundColor = folder.color;
	}

	function renameFolder(folderId) {
		const folder = folders.find(f => f.id === folderId);
		if (!folder) return;
		showCustomPromptDialog("Rename Folder", folder.name, "Save", (newName) => {
			if (newName && newName !== folder.name) {
				folder.name = newName;
				saveFolderConfiguration().then(() => updateFolderHeader(folderId));
			}
		});
	}

	async function deleteFolder(folderId) {
		Object.keys(conversationFolders).forEach(id => {
			if (conversationFolders[id] === folderId) delete conversationFolders[id];
		});
		folders = folders.filter(f => f.id !== folderId);
		await saveFolderConfiguration();
		renderFolders();
	}

	function toggleFolder(folderId) {
		const folder = folders.find(f => f.id === folderId);
		if (folder) {
			folder.isClosed = !folder.isClosed;
			const folderEl = document.querySelector(`.folder[data-folder-id="${folderId}"]`);
			if (folderEl) folderEl.classList.toggle('closed');
			saveFolderConfiguration();
		}
	}

	// --- Context Menus & Dialogs ---

	function showContextMenu(event, folderId) {
		event.preventDefault();
		event.stopPropagation();
		closeContextMenu();

		const btn = event.currentTarget;
		const rect = btn.getBoundingClientRect();

		const menu = document.createElement('div');
		menu.className = 'folder-context-menu';
		menu.id = 'folder-context-menu-active';

		const items = {
			'Rename': () => renameFolder(folderId),
			'Change Color': () => showColorPickerDialog(folderId),
			'Delete Folder': () => showConfirmationDialog("Are you sure you want to delete this folder?", () => deleteFolder(folderId), "Delete", "dialog-btn-delete")
		};

		for (const [text, action] of Object.entries(items)) {
			const itemEl = document.createElement('div');
			itemEl.className = 'folder-context-menu-item';
			if (text === 'Delete Folder') itemEl.classList.add('delete');
			itemEl.textContent = text;
			itemEl.onclick = (e) => {
				e.stopPropagation();
				closeContextMenu();
				action(e);
			};
			menu.appendChild(itemEl);
		}

		document.body.appendChild(menu);
		menu.style.display = 'block';
		menu.style.top = `${rect.bottom + window.scrollY}px`;
		menu.style.left = `${rect.right + window.scrollX - menu.offsetWidth}px`;
		setTimeout(() => document.addEventListener('click', closeContextMenu, { once: true }), 0);
	}

	function closeContextMenu() {
		const menu = document.getElementById('folder-context-menu-active');
		if (menu) menu.remove();
	}

	function showColorPickerDialog(folderId) {
		const folder = folders.find(f => f.id === folderId);
		if (!folder) return;

		const overlay = document.createElement('div');
		overlay.className = 'custom-dialog-overlay';
		const dialogBox = document.createElement('div');
		dialogBox.className = 'custom-dialog-box color-picker-dialog';
		const titleH2 = document.createElement('h2');
		titleH2.textContent = 'Change Folder Color';
		const grid = document.createElement('div');
		grid.className = 'color-picker-grid';

		let selectedColor = folder.color;

		FOLDER_COLORS.forEach(color => {
			const swatch = document.createElement('div');
			swatch.className = 'color-swatch';
			if (color.toLowerCase() === selectedColor.toLowerCase()) swatch.classList.add('selected');
			swatch.style.backgroundColor = color;
			swatch.onclick = () => {
				selectedColor = color;
				hexInput.value = color;
				grid.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
				swatch.classList.add('selected');
			};
			grid.appendChild(swatch);
		});

		const hexInput = document.createElement('input');
		hexInput.className = 'custom-dialog-input';
		hexInput.type = 'text';
		hexInput.placeholder = 'Or enter a hex value, e.g. #C0FFEE';
		hexInput.value = selectedColor;

		const btnYes = document.createElement('button');
		btnYes.className = 'custom-dialog-btn dialog-btn-confirm';
		btnYes.textContent = 'Save';
		const btnNo = document.createElement('button');
		btnNo.className = 'custom-dialog-btn dialog-btn-cancel';
		btnNo.textContent = 'Cancel';

		dialogBox.appendChild(titleH2);
		dialogBox.appendChild(grid);
		dialogBox.appendChild(hexInput);
		dialogBox.appendChild(btnYes);
		dialogBox.appendChild(btnNo);
		overlay.appendChild(dialogBox);
		document.body.appendChild(overlay);

		btnYes.onclick = () => {
			const newColor = hexInput.value.trim();
			if (/^#[0-9A-F]{6}$/i.test(newColor)) {
				folder.color = newColor;
				saveFolderConfiguration().then(() => updateFolderHeader(folderId));
				overlay.remove();
			} else {
				hexInput.style.border = "1px solid red";
				hexInput.value = "Invalid Hex Code";
				setTimeout(() => {
					hexInput.style.border = "";
					hexInput.value = selectedColor;
				}, 2000);
			}
		};
		btnNo.onclick = () => { overlay.remove(); };
	}

	function showConfirmationDialog(message, onConfirm, confirmText = "Confirm", confirmClass = "dialog-btn-delete") {
		const overlay = document.createElement('div');
		overlay.className = 'custom-dialog-overlay';
		const dialogBox = document.createElement('div');
		dialogBox.className = 'custom-dialog-box';
		const messageP = document.createElement('p');
		messageP.textContent = message;
		const btnYes = document.createElement('button');
		btnYes.className = `custom-dialog-btn ${confirmClass}`;
		btnYes.textContent = confirmText;
		const btnNo = document.createElement('button');
		btnNo.className = 'custom-dialog-btn dialog-btn-cancel';
		btnNo.textContent = 'Cancel';
		dialogBox.appendChild(messageP);
		dialogBox.appendChild(btnYes);
		dialogBox.appendChild(btnNo);
		overlay.appendChild(dialogBox);
		document.body.appendChild(overlay);
		btnYes.onclick = () => { onConfirm(); overlay.remove(); };
		btnNo.onclick = () => { overlay.remove(); };
	}

	function showCustomPromptDialog(title, defaultValue, confirmText, onConfirm) {
		const overlay = document.createElement('div');
		overlay.className = 'custom-dialog-overlay';
		const dialogBox = document.createElement('div');
		dialogBox.className = 'custom-dialog-box';
		const titleH2 = document.createElement('h2');
		titleH2.textContent = title;
		const input = document.createElement('input');
		input.className = 'custom-dialog-input';
		input.type = 'text';
		input.value = defaultValue;
		const btnYes = document.createElement('button');
		btnYes.className = 'custom-dialog-btn dialog-btn-confirm';
		btnYes.textContent = confirmText;
		const btnNo = document.createElement('button');
		btnNo.className = 'custom-dialog-btn dialog-btn-cancel';
		btnNo.textContent = 'Cancel';
		dialogBox.appendChild(titleH2);
		dialogBox.appendChild(input);
		dialogBox.appendChild(btnYes);
		dialogBox.appendChild(btnNo);
		overlay.appendChild(dialogBox);
		document.body.appendChild(overlay);
		input.focus();
		input.select();
		btnYes.onclick = () => { onConfirm(input.value); overlay.remove(); };
		btnNo.onclick = () => { overlay.remove(); };
		input.onkeydown = (e) => { if (e.key === 'Enter') btnYes.click(); };
	}

	// --- Drag and Drop ---
	function setupDragAndDrop() {
		try {
            const Sortable = window.SimpleSortable;
			if (typeof Sortable !== 'function') {
				 console.error("Gemini Mod (Ferdium): SimpleSortable is not available.");
				 return;
			}

			// For conversation folders
			const chatListContainer = document.querySelector(FOLDER_CHAT_LIST_CONTAINER_SELECTOR);
			if (chatListContainer) {
				new Sortable(chatListContainer, {
					group: 'shared-chats',
					ghostClass: 'sortable-ghost',
                    chosenClass: 'sortable-chosen',
					onEnd: rebuildAndSaveState,
				});
			}

			document.querySelectorAll('.folder-content').forEach(folderContentEl => {
				new Sortable(folderContentEl, {
					group: 'shared-chats',
					ghostClass: 'sortable-ghost',
                    chosenClass: 'sortable-chosen',
					onEnd: rebuildAndSaveState,
				});
			});

			// For toolbar items in settings
			const toolbarItemsContainer = document.getElementById('toolbar-items-container');
			if (toolbarItemsContainer) {
				new Sortable(toolbarItemsContainer, {
                    handle: '.item-group',
					ghostClass: 'sortable-ghost',
                    chosenClass: 'sortable-chosen',
				});
			}
		} catch (e) {
			console.error("Gemini Mod (Ferdium): Failed to initialize SimpleSortable. Drag & Drop will be disabled.", e);
		}
	}

	function rebuildAndSaveState() {
		const newConversationFolders = {};
		document.querySelectorAll('.folder').forEach(folderEl => {
			const folderId = folderEl.dataset.folderId;
			folderEl.querySelectorAll(FOLDER_CHAT_CONTAINER_SELECTOR).forEach(item => {
				const id = getIdentifierFromElement(item.querySelector(FOLDER_CHAT_ITEM_SELECTOR));
				if (id) {
					newConversationFolders[id] = folderId;
				}
			});
		});
		conversationFolders = newConversationFolders;
		saveFolderConfiguration();
	}

	function initializeFolders() {
		const injectionPoint = document.querySelector(FOLDER_INJECTION_POINT_SELECTOR);
		if (!injectionPoint) return false;

		if (document.getElementById('folder-ui-container')) {
			organizeConversations();
			return true;
		}

		const uiContainer = document.createElement('div');
		uiContainer.id = 'folder-ui-container';
		const addButton = document.createElement('button');
		addButton.id = 'add-folder-btn';
		addButton.textContent = '＋ New Folder';
		addButton.onclick = createNewFolder;
		const folderContainer = document.createElement('div');
		folderContainer.id = 'folder-container';
		uiContainer.appendChild(addButton);
		uiContainer.appendChild(folderContainer);
		injectionPoint.prepend(uiContainer);
		renderFolders();
		return true;
	}


	// --- Settings Panel UI ---
	function createSettingsPanel() {
		if (document.getElementById('gemini-mod-settings-overlay')) return;

		const overlay = document.createElement('div');
		overlay.id = 'gemini-mod-settings-overlay';

		const panel = document.createElement('div');
		panel.id = 'gemini-mod-settings-panel';
		overlay.appendChild(panel);

		panel.appendChild(document.createElement('h2')).textContent = 'Gemini Mod Settings';

        // Toolbar Section
        panel.appendChild(document.createElement('h3')).textContent = 'Toolbar Items';
        const dragDropHint = document.createElement('p');
        dragDropHint.textContent = 'The order of the items can be changed via Drag & Drop.';
        dragDropHint.style.fontSize = '12px';
        dragDropHint.style.color = '#aaa';
        dragDropHint.style.margin = '-5px 0 10px 0';
        panel.appendChild(dragDropHint);

		const itemsContainer = document.createElement('div');
		itemsContainer.id = 'toolbar-items-container';
        itemsContainer.setAttribute('data-ss-zone', 'true'); // For SimpleSortable
		panel.appendChild(itemsContainer);

		const addItemBtn = document.createElement('button');
		addItemBtn.textContent = 'Add Toolbar Item';
		addItemBtn.addEventListener('click', showToolbarItemTypeModal);
		panel.appendChild(addItemBtn);

        // Folder Section
        panel.appendChild(document.createElement('h3')).textContent = 'Folder Settings';
        const resetFoldersBtn = document.createElement('button');
        resetFoldersBtn.textContent = 'Reset All Folder Data';
        resetFoldersBtn.className = 'remove-btn';
        resetFoldersBtn.addEventListener('click', () => {
            showConfirmationDialog('Are you sure you want to delete all folder data? This cannot be undone.', async () => {
				await _deleteValue(STORAGE_KEY_FOLDERS);
				await _deleteValue(STORAGE_KEY_CONVO_FOLDERS);
				location.reload();
			}, 'Reset', 'dialog-btn-delete');
        });
        panel.appendChild(resetFoldersBtn);


		const actionsDiv = document.createElement('div');
		actionsDiv.className = 'settings-actions';
		const saveBtn = document.createElement('button');
		saveBtn.textContent = 'Save & Close';
		saveBtn.addEventListener('click', saveToolbarConfiguration);
		actionsDiv.appendChild(saveBtn);

		const cancelBtn = document.createElement('button');
		cancelBtn.textContent = 'Cancel';
		cancelBtn.addEventListener('click', () => toggleSettingsPanel(false));
		actionsDiv.appendChild(cancelBtn);
		panel.appendChild(actionsDiv);

		document.body.appendChild(overlay);
	}

	function showToolbarItemTypeModal() {
		let modal = document.getElementById('gemini-mod-type-modal-overlay');
		if (!modal) {
			modal = document.createElement('div');
			modal.id = 'gemini-mod-type-modal-overlay';
			const modalContent = document.createElement('div');
			modalContent.id = 'gemini-mod-type-modal';
            const h3 = document.createElement('h3');
            h3.textContent = 'Select Toolbar Item Type';
			modalContent.appendChild(h3);

			const btnButton = document.createElement('button');
			btnButton.textContent = 'Button';
			btnButton.addEventListener('click', () => {
				addItemToPanel({ type: 'button' });
				modal.style.display = 'none';
			});

			const btnDropdown = document.createElement('button');
			btnDropdown.textContent = 'Dropdown';
			btnDropdown.addEventListener('click', () => {
				addItemToPanel({ type: 'dropdown' });
				modal.style.display = 'none';
			});

			modalContent.appendChild(btnButton);
			modalContent.appendChild(btnDropdown);
			modal.appendChild(modalContent);
			document.body.appendChild(modal);
		}
		modal.style.display = 'block';
	}

	function populateSettingsPanel() {
		const container = document.getElementById('toolbar-items-container');
		clearElement(container);
		toolbarItems.forEach(item => addItemToPanel(item));
	}

	function addItemToPanel(item) {
		const container = document.getElementById('toolbar-items-container');
		const group = document.createElement('div');
		group.className = 'item-group';
		group.dataset.type = item.type;
        group.setAttribute('data-ss-draggable', 'true'); // For SimpleSortable

		// Item Content
		const contentDiv = document.createElement('div');
		contentDiv.className = 'item-content';

		if (item.type === 'button') {
			const button = item || { label: '', text: '' };
			const labelLabel = document.createElement('label');
			labelLabel.textContent = 'Button Label';
			contentDiv.appendChild(labelLabel);

			const labelInput = document.createElement('input');
			labelInput.type = 'text';
			labelInput.className = 'label-input';
			labelInput.value = button.label || '';
			contentDiv.appendChild(labelInput);

			const textLabel = document.createElement('label');
			textLabel.textContent = 'Snippet Text';
			contentDiv.appendChild(textLabel);

			const textInput = document.createElement('textarea');
			textInput.className = 'text-input';
			textInput.value = button.text || '';
			contentDiv.appendChild(textInput);
		} else if (item.type === 'dropdown') {
			const dropdown = item || { placeholder: '', options: [] };
			const placeholderLabel = document.createElement('label');
			placeholderLabel.textContent = 'Dropdown Placeholder';
			contentDiv.appendChild(placeholderLabel);

			const placeholderInput = document.createElement('input');
			placeholderInput.type = 'text';
			placeholderInput.className = 'placeholder-input';
			placeholderInput.value = dropdown.placeholder || '';
			contentDiv.appendChild(placeholderInput);

			const optionsContainer = document.createElement('div');
			optionsContainer.className = 'dropdown-options-container';
			optionsContainer.appendChild(document.createElement('label')).textContent = 'Options';
			contentDiv.appendChild(optionsContainer);

			const addOptionBtn = document.createElement('button');
			addOptionBtn.textContent = 'Add Option';
			addOptionBtn.addEventListener('click', () => addOptionToDropdownPanel(optionsContainer));
			contentDiv.appendChild(addOptionBtn);

			if (dropdown.options && dropdown.options.length > 0) {
				dropdown.options.forEach(opt => addOptionToDropdownPanel(optionsContainer, opt));
			} else {
				addOptionToDropdownPanel(optionsContainer);
			}
		}
		group.appendChild(contentDiv);

		// Remove Button
		const removeBtn = document.createElement('button');
		removeBtn.className = 'remove-btn';
		removeBtn.textContent = 'Remove';
		removeBtn.addEventListener('click', () => {
			group.remove();
		});
		group.appendChild(removeBtn);

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
		const overlay = document.getElementById('gemini-mod-settings-overlay');
		if (!overlay) return;
		const isVisible = overlay.style.display === 'block';
		const show = typeof forceState === 'boolean' ? forceState : !isVisible;

		if (show) {
			populateSettingsPanel();
            // This needs to be called after population to init Sortable
            setupDragAndDrop();
			overlay.style.display = 'block';
		} else {
			overlay.style.display = 'none';
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
			displayModMessage(`Failed to download: ${error.message}`);
		}
	}

    async function handleGlobalCanvasDownload() {
        // --- METHOD 1: Try the logic for Code Canvases ---
        const codeTitleEl = document.querySelector(GEMINI_CODE_CANVAS_TITLE_SELECTOR);

        if (codeTitleEl) {
            console.log("Gemini Mod: Code canvas detected. Using clipboard method.");
            const panelEl = codeTitleEl.closest(GEMINI_CODE_CANVAS_PANEL_SELECTOR);
            const shareButton = panelEl?.querySelector(GEMINI_CODE_CANVAS_SHARE_BUTTON_SELECTOR);
            if (!shareButton) return displayModMessage("Could not find the 'Share' button in the code canvas.");

            shareButton.click();

            setTimeout(() => {
                const copyButton = document.querySelector(GEMINI_CODE_CANVAS_COPY_BUTTON_SELECTOR);
                if (!copyButton) return displayModMessage("Could not find the 'Copy' button after sharing.");

                copyButton.click();

                setTimeout(async () => {
                    try {
                        const content = await navigator.clipboard.readText();
                        if (!content) return displayModMessage("Clipboard empty. Nothing to download.");
                        const filename = determineFilename(codeTitleEl.textContent);
                        triggerDownload(filename, content);
                    } catch (err) {
                        displayModMessage('Clipboard permission denied or failed to read.');
                    }
                }, 300);
            }, 500);
            return; // Stop execution if successful
        }

        // --- METHOD 2: Fallback logic for Document/Immersive Canvases ---
        const immersivePanel = document.querySelector(GEMINI_DOC_CANVAS_PANEL_SELECTOR);
        const editorContent = immersivePanel?.querySelector(GEMINI_DOC_CANVAS_EDITOR_SELECTOR);

        if (editorContent) {
            console.log("Gemini Mod: Document canvas detected. Using direct extraction method.");
            const content = editorContent.innerText;
            if (!content || content.trim() === "") {
                return displayModMessage("Document canvas is empty. Nothing to download.");
            }

            let title = "document_canvas";
            const titleEl = editorContent.querySelector(GEMINI_DOC_CANVAS_TITLE_SELECTOR);
            if (titleEl && titleEl.innerText.trim() !== "") {
                title = titleEl.innerText.trim();
            }

            const filename = determineFilename(title);
            triggerDownload(filename, content);
            return; // Stop execution if successful
        }

        // --- If both methods fail ---
        displayModMessage("No active or supported canvas found to download.");
    }


	// --- Initialization ---

	/**
	 * Main execution function. Initializes the mod features.
	 */
	async function runMod() {
		console.log("Gemini Mod (Ferdium): Running main script...");
		injectCustomCSS();
		await loadConfiguration();
		try {
			createToolbar();
			createSettingsPanel();
			// Start folder initialization loop. This will repeatedly try to
			// find the chat list and set up the folders.
			const folderInitInterval = setInterval(() => {
				if (initializeFolders()) {
					// Once successfully initialized, we don't need to keep trying.
					clearInterval(folderInitInterval);
					console.log("Gemini Mod (Ferdium): Folder UI initialized successfully.");
				}
			}, 1000); // Check every second
		} catch (e) {
			console.error("Gemini Mod: Error during main script execution:", e);
			displayModMessage("Error initializing mod. See console.");
		}
	}


	/**
	 * Waits for a key element of the Gemini UI and for the Sortable library to be present before running the mod.
	 */
	function waitForReadyAndInit() {
		console.log("Gemini Mod (Ferdium): Waiting for Gemini UI and Sortable library to be ready...");
		const readyChecker = setInterval(() => {
			if (document.querySelector(FOLDER_INJECTION_POINT_SELECTOR) && window.SimpleSortable) {
				clearInterval(readyChecker);
				runMod();
			}
		}, 250); // Check every 250ms
	}

	// Start the initialization process once the DOM is loaded.
	if (document.readyState === 'loading') {
		window.addEventListener('DOMContentLoaded', waitForReadyAndInit);
	} else {
		waitForReadyAndInit();
	}

})();

