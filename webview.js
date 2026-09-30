const path = require('path');
let Sortable;
try {
	Sortable = require(path.join(__dirname, 'sortable.min.js'));
	if (Sortable && Sortable.default) {
		Sortable = Sortable.default;
	}
} catch (e) {
	console.error("Gemini Mod: Failed to load sortable.min.js via require:", e);
}

module.exports = Ferdium => {
	// ===================================================================================
	// I. CONFIGURATION SECTION
	// ===================================================================================

	// --- Storage Keys ---
	const STORAGE_KEY_TOOLBAR_ITEMS = "ferdiumGeminiModToolbarItems_v2";
	const STORAGE_KEY_FOLDERS = 'ferdiumGeminiModFolders';
	const STORAGE_KEY_CONVO_FOLDERS = 'ferdiumGeminiModConvoFolders';
	const STORAGE_KEY_SYNC_KEY = 'gemini_mod_sync_key';
	const STORAGE_KEY_AUTH_SESSION = 'gemini_mod_auth_session';
	const STORAGE_KEY_SUPABASE_URL = 'gemini_mod_supabase_url';
	const STORAGE_KEY_SUPABASE_KEY = 'gemini_mod_supabase_key';
	const STORAGE_KEY_LAST_SYNC = 'gemini_mod_last_sync';
	const STORAGE_KEY_LAST_SYNC_CLIENT = 'gemini_mod_last_sync_client';
	const CLIENT_NAME = 'Ferdium';

	// --- Toolbar UI Labels ---
	const SETTINGS_BUTTON_LABEL = "⚙️ Settings";

	// --- CSS Selectors ---
	const GEMINI_INPUT_FIELD_SELECTORS = ['div[role="textbox"]', '.ql-editor p', '.ql-editor', 'div[contenteditable="true"]'];
	const FOLDER_CHAT_ITEM_SELECTOR = 'gem-nav-list-item, div[data-test-id="conversation"]';
	const FOLDER_CHAT_LIST_CONTAINER_SELECTOR = 'conversations-list mat-nav-list, mat-nav-list, conversations-list .conversations-container';
	const FOLDER_INJECTION_POINT_SELECTOR = '#sidenav-section-content-chats, conversations-list, div.chat-history-list, .conversations-list';

	// --- Default Definitions ---
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
		{ type: 'action', action: 'paste', label: "📋 Paste", title: "Paste from Clipboard" },
		{ type: 'action', action: 'copy', label: "📄 Copy", title: "Copy active canvas content" },
		{ type: 'action', action: 'download', label: "💾 Download", title: "Download active canvas content" },
		{ type: 'action', action: 'pdf', label: "📑 PDF", title: "Export active canvas content as PDF" }
	];

	// --- Global State ---
	let toolbarItems = [];
	let folders = [];
	let conversationFolders = {};
	const FOLDER_COLORS = ['#370000', '#0D3800', '#001B38', '#383200', '#380031', '#7DAC89', '#7A82AF', '#AC7D98', '#7AA7AF', '#9CA881'];

	if (!Sortable && typeof window !== 'undefined' && window.Sortable) {
		Sortable = window.Sortable;
	}
	if (Sortable && typeof window !== 'undefined' && !window.Sortable) {
		window.Sortable = Sortable;
	}

	// ===================================================================================
	// II. STYLES
	// ===================================================================================

	// --- Styles ---
	const embeddedCSS = `
		/* --- Toolbar Styles --- */
		#gemini-snippet-toolbar-ferdium {
			position: fixed !important; top: 0 !important; left: 50% !important;
			transform: translateX(-50%) !important;
			width: auto !important; max-width: 95vw !important;
			padding: 8px 12px !important; z-index: 999998 !important;
			display: flex !important; flex-wrap: wrap !important; justify-content: center !important;
			gap: 6px !important; align-items: center !important; font-family: 'Roboto', 'Arial', sans-serif !important;
			box-sizing: border-box !important; background-color: rgba(40, 42, 44, 0.95) !important;
			border-radius: 0 0 12px 12px !important;
			box-shadow: 0 4px 12px rgba(0,0,0,0.3);
			transition: all 0.2s ease;
		}
		#gemini-snippet-toolbar-ferdium .gemini-mod-toolbar-btn,
		#gemini-snippet-toolbar-ferdium .gemini-mod-toolbar-select {
			padding: 4px 12px !important; cursor: pointer !important; background-color: #202122 !important;
			color: #e3e3e3 !important; border-radius: 14px !important; font-size: 13px !important;
			font-family: inherit !important; font-weight: 500 !important; height: 30px !important;
			box-sizing: border-box !important; display: flex !important; align-items: center !important;
			border: 1px solid transparent !important; flex-shrink: 0; white-space: nowrap !important;
		}
		#gemini-snippet-toolbar-ferdium .gemini-mod-toolbar-btn:hover,
		#gemini-snippet-toolbar-ferdium .gemini-mod-toolbar-select:hover { background-color: #4a4e51 !important; border-color: #5f6368 !important; }
		#gemini-snippet-toolbar-ferdium .gemini-mod-toolbar-btn:active,
		#gemini-snippet-toolbar-ferdium .gemini-mod-toolbar-select:active { background-color: #5f6368 !important; transform: scale(0.98) !important; }

		/* Select-specific overrides for custom arrow */
		#gemini-snippet-toolbar-ferdium .gemini-mod-toolbar-select {
			appearance: none !important;
			padding-right: 25px !important;
			background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="%23e3e3e3" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>') !important;
			background-repeat: no-repeat !important; 
			background-position: right 8px center !important;
			background-size: 12px 12px !important;
		}
		#gemini-snippet-toolbar-ferdium .gemini-mod-toolbar-select option {
			background-color: #2a2a2a !important; color: #e3e3e3 !important; padding: 5px 10px !important;
		}
		
		.userscript-toolbar-spacer { margin-left: auto !important; width: 1px; }

		/* --- Settings Panel & Modal Styles --- */
		#gemini-mod-settings-overlay, #gemini-mod-type-modal-overlay {
			display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
			background-color: rgba(0,0,0,0.6); z-index: 999999;
		}
		#gemini-mod-settings-panel, #gemini-mod-type-modal {
			position: fixed; top: 50%; left: 50%;
			transform: translate(-50%, -50%);
			background-color: #282a2c; color: #e3e3e3; border-radius: 16px;
			padding: 0; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
			font-family: 'Roboto', 'Arial', sans-serif !important;
			overflow: hidden;
		}
		#gemini-mod-settings-panel {
			width: 90vw; max-width: 820px; max-height: 85vh; display: flex; flex-direction: column;
		}
		#gemini-mod-type-modal {
			text-align: center; padding: 20px;
		}
		#gemini-mod-type-modal h3 { margin-top: 0; }
		#gemini-mod-type-modal button { margin: 0 10px; }
		#gemini-mod-settings-panel h2 {
			margin: 0; padding: 16px 20px; border-bottom: 1px solid #444; background-color: #202122;
			font-size: 1.2rem; font-weight: 600;
		}
		.settings-container { display: flex; height: 520px; max-height: 70vh; min-height: 420px; }
		.settings-sidebar {
			width: 180px; border-right: 1px solid #444; padding: 15px 10px; display: flex; flex-direction: column;
			gap: 6px; background-color: #202122; flex-shrink: 0;
		}
		.settings-content {
			flex-grow: 1; padding: 20px; overflow-y: auto; background-color: #282a2c;
		}
		.tab-btn {
			text-align: left; padding: 10px 14px; background: none; border: none; color: #aaa;
			cursor: pointer; border-radius: 8px; font-size: 14px; font-weight: 500;
			transition: all 0.2s ease; width: 100%; box-sizing: border-box; font-family: inherit;
		}
		.tab-btn:hover { background-color: #3c4043; color: #e3e3e3; }
		.tab-btn.active { background-color: #4285f4; color: white; }
		.tab-pane { display: none; }
		.tab-pane.active { display: block; animation: geminiFadeIn 0.2s; }
		@keyframes geminiFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

		#gemini-mod-settings-panel label { display: block; margin: 10px 0 5px; font-weight: 500; }
		#gemini-mod-settings-panel input[type="text"], #gemini-mod-settings-panel input[type="email"], #gemini-mod-settings-panel input[type="password"], #gemini-mod-settings-panel textarea {
			width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #5f6368;
			background-color: #202122; color: #e3e3e3; box-sizing: border-box; font-family: inherit; font-size: 13px;
		}
		#gemini-mod-settings-panel textarea { min-height: 80px; resize: vertical; }
		#gemini-mod-settings-panel .item-group {
			border: 1px solid #444; border-radius: 8px; padding: 15px; margin-bottom: 10px;
			display: flex; gap: 10px; align-items: flex-start; cursor: grab;
		}
		#gemini-mod-settings-panel .item-content { flex-grow: 1; }
		#gemini-mod-settings-panel .dropdown-options-container { margin-left: 20px; margin-top: 10px; }
		#gemini-mod-settings-panel .option-item { display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; align-items: center; margin-bottom: 5px; }
		#gemini-mod-settings-panel button {
			padding: 6px 14px !important; cursor: pointer !important; background-color: #3c4043 !important;
			color: #e3e3e3 !important; border-radius: 16px !important; font-size: 13px !important;
			border: none !important; transition: background-color 0.2s ease; font-family: inherit;
		}
		#gemini-mod-settings-panel button:hover { background-color: #4a4e51 !important; }
		#gemini-mod-settings-panel .remove-btn, .dialog-btn-delete { background-color: #5c2b2b !important; color: white !important; }
		#gemini-mod-settings-panel .remove-btn:hover, .dialog-btn-delete:hover { background-color: #7d3a3a !important; }

		/* Sync tab UI */
		.sync-status-card {
			background: #1e2022; border: 1px solid #3c4043; border-radius: 10px; padding: 14px 18px; margin-bottom: 16px;
		}
		.sync-status-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
		.sync-status-detail { font-size: 12px; color: #aaa; margin: 0; }
		.sync-user-card {
			display: flex; align-items: center; justify-content: space-between;
			background: #2a2d30; border: 1px solid #3c4043; border-radius: 8px;
			padding: 10px 14px; margin-bottom: 14px;
		}
		.sync-user-info { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #e3e3e3; font-weight: 500; }
		.sync-auth-box {
			background: #1e2022; border: 1px solid #3c4043; border-radius: 8px;
			padding: 14px; margin-bottom: 16px;
		}
		.sync-auth-notice { font-size: 12px; color: #8ab4f8; margin: 0 0 12px 0; line-height: 1.4; }
		.sync-auth-row { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
		.sync-auth-btns { display: flex; gap: 10px; margin-top: 12px; }
		.sync-key-row { display: flex; gap: 8px; align-items: center; margin-top: 8px; margin-bottom: 12px; }
		.sync-actions-box { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; margin-bottom: 24px; }
		.sync-btn-primary { background-color: #8ab4f8 !important; color: #1f1f1f !important; font-weight: 600 !important; }
		.sync-advanced-details { margin-top: 20px; border-top: 1px solid #444; padding-top: 15px; }
		.sync-advanced-details summary { cursor: pointer; color: #8ab4f8; font-size: 13px; user-select: none; }

		/* --- Folder UI Styles --- */
		/* Match Gemini sidebar design: Google Sans font, Material colors, proper spacing */
		#folder-ui-container {
			display: block;
			width: 100%;
			margin: 0 !important;
			padding: 0;
			font-family: "Google Sans Flex","Google Sans Text","Google Sans",sans-serif;
			box-sizing: border-box;
		}

		/* --- Section header: matches "Notebooks" style --- */
		#folder-section-header {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			width: calc(100% - 16px) !important;
			margin: 2px 8px !important;
			box-sizing: border-box !important;
			padding: 0 12px !important;
			min-height: 36px !important;
			background: transparent !important;
			border: none !important;
			border-radius: 9999px !important;
			cursor: pointer;
			text-align: left;
			color: #c4c7c5 !important;
			font-family: inherit;
			gap: 8px;
			transition: background-color 0.15s ease, color 0.15s ease;
			outline: none;
		}
		#folder-section-header:hover {
			background-color: rgba(227, 227, 227, 0.08) !important;
			color: #e3e3e3 !important;
		}
		#folder-section-header .expandable-section-title {
			flex: 1;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-size: 0.875rem;
			font-weight: 500;
			line-height: 1.25rem;
		}
		#folder-section-header .toggle-icon {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 20px;
			height: 20px;
			flex-shrink: 0;
			margin-left: auto;
			color: #c4c7c5;
			transition: color 0.15s ease;
		}
		#folder-section-header .toggle-icon svg {
			display: block;
			transition: transform 0.2s ease;
		}
		#folder-section-header.collapsed .toggle-icon svg {
			transform: rotate(-90deg) !important;
		}
		#folder-section-header:not(.collapsed) .toggle-icon svg {
			transform: rotate(0deg) !important;
		}
		#folder-section-header:hover .toggle-icon {
			color: #e3e3e3;
		}
		
		/* Folder Items & Add Button */
		#folder-container { padding-bottom: 4px; }
		
		#add-folder-btn {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: flex-start;
			width: calc(100% - 16px) !important;
			margin: 2px 8px !important;
			box-sizing: border-box !important;
			padding: 0 12px !important;
			min-height: 36px !important;
			background: transparent !important;
			border: none !important;
			color: #c4c7c5 !important;
			border-radius: 9999px !important;
			cursor: pointer;
			text-align: left;
			font-family: "Google Sans Flex","Google Sans Text","Google Sans",sans-serif;
			font-size: 0.875rem;
			font-weight: 400;
			gap: 0 !important;
			transition: background-color 0.15s ease, color 0.15s ease;
			outline: none;
		}
		#add-folder-btn::before { content: none !important; }
		#add-folder-btn:hover {
			background-color: rgba(227, 227, 227, 0.08) !important;
			color: #e3e3e3 !important;
		}
		
		.add-folder-icon, .folder-icon-wrapper { 
			margin-right: 12px;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
		}

		/* Folder Specific */
		.folder { margin: 0; padding: 0; overflow: visible; }
		.folder-header {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: flex-start;
			width: calc(100% - 16px) !important;
			margin: 2px 8px !important;
			box-sizing: border-box !important;
			padding: 0 12px !important;
			min-height: 36px !important;
			background: transparent !important;
			border: none !important;
			color: #e3e3e3 !important;
			border-radius: 9999px !important;
			cursor: pointer;
			text-align: left;
			position: relative;
			font-family: "Google Sans Flex","Google Sans Text","Google Sans",sans-serif;
			font-size: 0.875rem;
			transition: background-color 0.15s ease;
			outline: none;
		}
		.folder-header:hover {
			background-color: rgba(227, 227, 227, 0.08) !important;
		}
		.folder-header.folder-drag-over {
			background-color: rgba(227, 227, 227, 0.16) !important;
			outline: 1px dashed #a8c7fa !important;
			outline-offset: -1px;
		}
		.folder-name {
			flex: 1;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			margin-left: 0;
			padding-right: 8px;
			font-size: 0.875rem;
			color: #e3e3e3 !important;
		}

		.folder-controls {
			display: flex !important;
			align-items: center;
			gap: 2px;
			flex-shrink: 0;
			margin-left: auto;
		}
		.folder-options-btn {
			background: none !important;
			border: none !important;
			color: #c4c7c5 !important;
			cursor: pointer;
			padding: 0;
			border-radius: 50% !important;
			width: 24px;
			height: 24px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			font-size: 1.1em;
			line-height: 1;
			opacity: 0;
			transition: opacity 0.15s ease, background-color 0.15s ease, color 0.15s ease;
		}
		.folder-header:hover .folder-options-btn {
			opacity: 1;
		}
		.folder-options-btn:hover {
			background-color: rgba(227, 227, 227, 0.12) !important;
			color: #fff !important;
		}

		.folder-toggle-icon {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 20px;
			height: 20px;
			flex-shrink: 0;
			color: #c4c7c5;
			transition: color 0.15s ease;
			cursor: pointer;
		}
		.folder-toggle-icon svg {
			display: block;
			transition: transform 0.2s ease;
		}
		.folder.closed .folder-toggle-icon svg {
			transform: rotate(-90deg) !important;
		}
		.folder:not(.closed) .folder-toggle-icon svg {
			transform: rotate(0deg) !important;
		}
		.folder-header:hover .folder-toggle-icon {
			color: #e3e3e3;
		}

		/* Folder content area - items inside */
		.folder-content {
			min-height: 0;
			max-height: 2000px;
			overflow: hidden;
			transition: max-height 0.25s ease-in-out;
		}
		.folder.closed .folder-content {
			max-height: 0 !important;
		}

		/* Chat items inside folders - match gem-nav-list-item look */
		.folder-content .conversation-items-container,
		.folder-content gem-nav-list-item {
			display: block;
			border-radius: 9999px !important;
			margin: 2px 8px !important;
			width: calc(100% - 16px) !important;
			box-sizing: border-box !important;
			padding: 0;
			border: none;
			transition: background-color 0.15s;
			position: relative;
		}
		.folder-content .conversation-items-container::before,
		.folder-content gem-nav-list-item::before {
			content: none;
		}
		.folder-content .conversation-items-container:hover,
		.folder-content gem-nav-list-item:hover {
			background-color: rgba(227, 227, 227, 0.08) !important;
		}

		.conversation-items-container, gem-nav-list-item { cursor: grab; }

		.folder-context-menu {
			position: fixed; z-index: 10000;
			background-color: #1e1f20;
			border: 1px solid #444746;
			border-radius: 4px;
			padding: 8px 0;
			box-shadow: 0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12);
			display: none;
			min-width: 160px;
		}
		.folder-context-menu-item {
			padding: 8px 12px; cursor: pointer; white-space: nowrap;
			font-family: "Google Sans Flex","Google Sans Text","Google Sans",sans-serif;
			font-size: 0.875rem; font-weight: 500; line-height: 1.25rem;
			color: #e3e3e3;
		}
		.folder-context-menu-item:hover { background-color: rgba(227, 227, 227, 0.08); }
		.folder-context-menu-item.delete { color: #f2b8b5; }
		.folder-context-menu-item.delete:hover { background-color: rgba(242, 184, 181, 0.08); }

		.sortable-ghost { opacity: 0.4; }
		.item-group.sortable-ghost { background-color: #555 !important; }

		/* --- Dialog & Color Picker Styles --- */
		.custom-dialog-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(34, 34, 34, 0.75); z-index: 1000000; display: flex; align-items: center; justify-content: center; }
		.custom-dialog-box { background-color: #333333; padding: 25px; border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); text-align: center; max-width: 400px; border: 1px solid #444; }
		.custom-dialog-box p, .custom-dialog-box h2 { margin: 0 0 20px; font-family: 'Roboto', Arial, sans-serif; color: #FFFFFF; }
		.custom-dialog-btn { border: none; border-radius: 8px; padding: 10px 20px; cursor: pointer; font-weight: 500; margin: 0 10px; }
		.dialog-btn-confirm { background-color: #8ab4f8; color: #202124; }
		.dialog-btn-cancel { background-color: #444; color: #fff; }
		.dialog-btn-delete { background-color: #5c2b2b !important; color: white !important; }
		.dialog-btn-delete:hover { background-color: #7d3a3a !important; }
		.custom-dialog-input { width: 100%; box-sizing: border-box; padding: 10px; border-radius: 8px; border: 1px solid #5f6368; background-color: #202122; color: #e3e3e3; font-size: 16px; margin-bottom: 20px; }
		.color-picker-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
		.color-picker-dialog .color-swatch { width: 32px; height: 32px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; position: relative; }
		.color-picker-dialog .color-swatch:hover { border: 2px solid #8ab4f8; }
		.color-picker-dialog .color-swatch.selected::after { content: ""; position: absolute; inset: 0; border: 3px solid #fff; border-radius: 50%; box-sizing: border-box; pointer-events: none; }
	`;

	// ===================================================================================
	// III. SCRIPT LOGIC
	// ===================================================================================

	// --- Core Functions ---
	function injectCustomCSS() {
		try {
			const style = document.createElement('style');
			style.textContent = embeddedCSS;
			document.head.appendChild(style);
		} catch (error) {
			console.error("Ferdium Gemini Mod: Failed to inject custom CSS:", error);
		}
	}

	function displayUserscriptMessage(message, isError = true) {
		const prefix = "Gemini Mod: ";
		if (isError) console.error(prefix + message);
		else console.log(prefix + message);
		if (Ferdium && Ferdium.displayErrorMessage) {
			Ferdium.displayErrorMessage(message);
		} else {
			alert(message);
		}
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
			displayUserscriptMessage("Could not find Gemini input field.");
			return;
		}
		target.focus();

		const selection = window.getSelection();
		if (selection.rangeCount === 0 || !target.contains(selection.anchorNode)) {
			const range = document.createRange();
			range.selectNodeContents(target);
			range.collapse(false);
			selection.removeAllRanges();
			selection.addRange(range);
		}

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

	function loadConfiguration() {
		try {
			// Toolbar items
			const savedToolbarItems = localStorage.getItem(STORAGE_KEY_TOOLBAR_ITEMS);
			if (savedToolbarItems) {
				toolbarItems = JSON.parse(savedToolbarItems);
				// Migration check
				const hasAction = (act) => toolbarItems.some(item => item.type === 'action' && item.action === act);
				if (!hasAction('paste')) toolbarItems.push({ type: 'action', action: 'paste', label: "📋 Paste", title: "Paste from Clipboard" });
				if (!hasAction('copy')) toolbarItems.push({ type: 'action', action: 'copy', label: "📄 Copy", title: "Copy active canvas content" });
				if (!hasAction('download')) toolbarItems.push({ type: 'action', action: 'download', label: "💾 Download", title: "Download active canvas content" });
				if (!hasAction('pdf')) toolbarItems.push({ type: 'action', action: 'pdf', label: "📑 PDF", title: "Export active canvas content as PDF" });

				// Filter out legacy settings item from toolbarItems so it is not rendered on the left
				toolbarItems = toolbarItems.filter(item => item && item.type !== 'settings');
			} else {
				toolbarItems = defaultToolbarItems.filter(item => item && item.type !== 'settings');
			}
			// Folder items
			const savedFolders = localStorage.getItem(STORAGE_KEY_FOLDERS);
			folders = savedFolders ? JSON.parse(savedFolders) : [];

			const savedConvoFolders = localStorage.getItem(STORAGE_KEY_CONVO_FOLDERS);
			conversationFolders = savedConvoFolders ? JSON.parse(savedConvoFolders) : {};
		} catch (e) {
			console.error("Gemini Mod: Error loading configuration, using defaults.", e);
			toolbarItems = defaultToolbarItems.filter(item => item && item.type !== 'settings');
			folders = [];
			conversationFolders = {};
		}
	}

	function saveToolbarConfiguration() {
		const settingsPanel = document.getElementById('gemini-mod-settings-panel');
		if (!settingsPanel) return;

		const newItems = [];
		settingsPanel.querySelectorAll('#toolbar-items-container > .item-group').forEach(group => {
			const type = group.dataset.type;
			// Removed visibility check

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
			} else if (type === 'action') {
				const action = group.dataset.action;
				const label = group.querySelector('.label-input').value.trim();
				const title = group.dataset.title;
				if (label) newItems.push({ type, action, label, title });
			}
		});

		try {
			localStorage.setItem(STORAGE_KEY_TOOLBAR_ITEMS, JSON.stringify(newItems));
			loadConfiguration(); // Reload all configs
			rebuildToolbar();
			toggleSettingsPanel(false);
		} catch (e) {
			displayUserscriptMessage("Failed to save settings. See console for details.");
			console.error("Gemini Mod: Error saving settings:", e);
		}
	}

	function saveFolderConfiguration() {
		localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(folders));
		localStorage.setItem(STORAGE_KEY_CONVO_FOLDERS, JSON.stringify(conversationFolders));
	}


	function rebuildToolbar() {
		const toolbar = document.getElementById('gemini-snippet-toolbar-ferdium');
		if (toolbar) createToolbar();
	}

	// --- Folder UI and Logic ---

	function getAngularScope(selector) {
		const el = document.querySelector(selector);
		if (!el) return null;
		for (let attr of el.attributes) {
			if (attr.name.startsWith('_ngcontent-')) return attr.name;
		}
		return null;
	}

	function findSidebarSections() {
		let notebooksSection = null;

		// 1. Search for Notebooks section container
		const allHeaders = document.querySelectorAll('.expandable-section-header, button[aria-controls], [data-test-id*="section"]');
		for (const h of allHeaders) {
			const text = (h.textContent || '').trim().toLowerCase();
			if (text.includes('notebook') && !h.closest('#folder-ui-container')) {
				notebooksSection = h.closest('expandable-section, .expandable-section') || h.parentElement;
				break;
			}
		}

		if (!notebooksSection) {
			const notebookBtn = document.querySelector('a[href*="notebook"], button[aria-label*="Notebook"], [data-test-id*="notebook"]');
			if (notebookBtn && !notebookBtn.closest('#folder-ui-container')) {
				notebooksSection = notebookBtn.closest('expandable-section, .expandable-section, mat-nav-list, .section') || notebookBtn.parentElement;
			}
		}

		// 2. Search for Recent chats section container
		let recentSection = null;
		const chatHeader = document.querySelector('#sidenav-section-header-chats, [aria-controls="sidenav-section-content-chats"]');
		if (chatHeader) {
			recentSection = chatHeader.closest('expandable-section, .expandable-section') || chatHeader;
		}

		if (!recentSection) {
			const convoList = document.querySelector('conversations-list, #sidenav-section-content-chats');
			if (convoList) {
				recentSection = convoList.closest('expandable-section, .expandable-section') || convoList;
			}
		}

		if (!recentSection) {
			for (const h of allHeaders) {
				const text = (h.textContent || '').trim().toLowerCase();
				if ((text.includes('letzte') || text.includes('recent') || text.includes('unterhaltungen')) && !h.closest('#folder-ui-container')) {
					recentSection = h.closest('expandable-section, .expandable-section') || h;
					break;
				}
			}
		}

		return { notebooksSection, recentSection };
	}

	function positionFolderContainer(container) {
		if (!container) return false;
		const { notebooksSection, recentSection } = findSidebarSections();

		// Priority 1: Insert immediately AFTER the Notebooks section
		if (notebooksSection && notebooksSection.parentNode) {
			const parent = notebooksSection.parentNode;
			const targetNext = notebooksSection.nextSibling;
			if (container.parentNode !== parent || container.previousSibling !== notebooksSection) {
				parent.insertBefore(container, targetNext);
				console.log("Gemini Mod: Positioned folders container after Notebooks section.");
			}
			return true;
		}

		// Priority 2: Insert immediately BEFORE the Recent chats section
		if (recentSection && recentSection.parentNode) {
			const parent = recentSection.parentNode;
			if (container.parentNode !== parent || container.nextSibling !== recentSection) {
				parent.insertBefore(container, recentSection);
				console.log("Gemini Mod: Positioned folders container before Recent section.");
			}
			return true;
		}

		return false;
	}

	function initializeFolders() {
		const foldersContainerId = 'folder-ui-container';
		let container = document.getElementById(foldersContainerId);

		if (!container) {
			container = document.createElement('div');
			container.setAttribute('storagekey', 'folders-mod');
			container.id = foldersContainerId;
		}

		const positioned = positionFolderContainer(container);
		if (!positioned) {
			return false; // Wait until Notebooks or Recent section is available
		}

		if (!container.hasChildNodes()) {
			renderFolders();
		}

		const chatHistoryList = document.querySelector('conversations-list, #sidenav-section-content-chats, mat-nav-list, gem-nav-list, .conversations-list');
		if (chatHistoryList && !chatHistoryList.dataset.geminiModObserved) {
			chatHistoryList.dataset.geminiModObserved = 'true';
			let debounceTimer = null;
			const observer = new MutationObserver(() => {
				clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => {
					processConversationItems(chatHistoryList);
					positionFolderContainer(container);
				}, 100);
			});
			observer.observe(chatHistoryList, { childList: true, subtree: true });
			processConversationItems(chatHistoryList);
		}

		const sidebarParent = container.parentElement;
		if (sidebarParent && !sidebarParent.dataset.geminiModPosObserved) {
			sidebarParent.dataset.geminiModPosObserved = 'true';
			const posObserver = new MutationObserver(() => {
				positionFolderContainer(container);
			});
			posObserver.observe(sidebarParent, { childList: true });
		}

		return true;
	}

	function createChevronSvg(isOpen = true) {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('width', '18');
		svg.setAttribute('height', '18');
		svg.setAttribute('fill', 'currentColor');
		svg.setAttribute('aria-hidden', 'true');
		svg.style.display = 'block';
		svg.style.transition = 'transform 0.2s ease';
		svg.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z');
		svg.appendChild(path);
		return svg;
	}

	let activeDraggedConvoItem = null;

	document.addEventListener('dragstart', (e) => {
		const item = e.target.closest(FOLDER_CHAT_ITEM_SELECTOR) || e.target.closest('.conversation-items-container');
		if (item) {
			activeDraggedConvoItem = item;
			if (e.dataTransfer) {
				e.dataTransfer.setData('text/plain', getConversationId(item) || '');
				e.dataTransfer.effectAllowed = 'move';
			}
		}
	}, true);

	document.addEventListener('dragend', () => {
		setTimeout(() => { activeDraggedConvoItem = null; }, 100);
		document.querySelectorAll('.folder-header.folder-drag-over, .folder.folder-drag-over').forEach(el => {
			el.classList.remove('folder-drag-over');
		});
	}, true);

	function renderFolders() {
		const container = document.getElementById('folder-ui-container');
		if (!container) return;

		const headerScope = getAngularScope('.expandable-section-title') || '';
		const itemScope = getAngularScope('gem-nav-list-item, .gem-nav-list-item') || getAngularScope('.title-text') || '';

		const STORAGE_KEY_SECTION_OPEN = 'ferdium_gemini_folder_section_open';
		const isSectionOpen = localStorage.getItem(STORAGE_KEY_SECTION_OPEN) !== 'false';

		if (isSectionOpen) container.classList.add('expanded');

		let oldHeader = document.getElementById('folder-section-header');
		if (oldHeader) oldHeader.remove();

		const sectionHeader = document.createElement('button');
		sectionHeader.id = 'folder-section-header';
		sectionHeader.setAttribute('data-test-id', 'expandable-section-toggle');
		sectionHeader.setAttribute('aria-expanded', isSectionOpen ? 'true' : 'false');
		sectionHeader.className = 'expandable-section-header ' + (isSectionOpen ? '' : 'collapsed');
		if (headerScope) sectionHeader.setAttribute(headerScope, '');

		const sectionLabel = document.createElement('span');
		sectionLabel.className = 'expandable-section-title gds-body-s folder-section-label';
		sectionLabel.textContent = 'Folders';
		if (headerScope) sectionLabel.setAttribute(headerScope, '');

		const sectionChevron = document.createElement('span');
		sectionChevron.className = 'toggle-icon';
		sectionChevron.setAttribute('data-test-id', 'expandable-section-toggle-icon');
		if (headerScope) sectionChevron.setAttribute(headerScope, '');
		sectionChevron.appendChild(createChevronSvg(isSectionOpen));

		sectionHeader.appendChild(sectionLabel);
		sectionHeader.appendChild(sectionChevron);
		container.appendChild(sectionHeader);

		let folderWrapper = document.getElementById('folder-section-body');
		if (folderWrapper) {
			const mainList = document.querySelector(FOLDER_CHAT_LIST_CONTAINER_SELECTOR);
			if (mainList) {
				folderWrapper.querySelectorAll(FOLDER_CHAT_ITEM_SELECTOR).forEach(item => {
					mainList.appendChild(item);
				});
			}
			folderWrapper.remove();
		}

		folderWrapper = document.createElement('div');
		folderWrapper.id = 'folder-section-body';
		folderWrapper.style.display = 'block';
		folderWrapper.style.width = '100%';
		folderWrapper.style.overflow = 'hidden';
		folderWrapper.style.transition = 'max-height 0.25s ease-in-out';
		folderWrapper.style.maxHeight = isSectionOpen ? '2000px' : '0px';
		container.appendChild(folderWrapper);

		sectionHeader.addEventListener('click', () => {
			const nowCollapsed = sectionHeader.classList.toggle('collapsed');
			sectionHeader.setAttribute('aria-expanded', nowCollapsed ? 'false' : 'true');
			folderWrapper.style.maxHeight = nowCollapsed ? '0px' : '2000px';
			const svg = sectionChevron.querySelector('svg');
			if (svg) svg.style.transform = nowCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
			localStorage.setItem(STORAGE_KEY_SECTION_OPEN, (!nowCollapsed).toString());
		});

		folders.forEach(folder => {
			folderWrapper.appendChild(createFolderElement(folder, itemScope));
		});

		const addBtn = document.createElement('button');
		addBtn.id = 'add-folder-btn';

		const addIcon = document.createElement('mat-icon');
		addIcon.className = 'mat-icon notranslate lm-icon-s lumi-symbols mat-ligature-font mat-icon-no-color add-folder-icon';
		addIcon.textContent = 'add';
		addIcon.style.color = 'var(--lumi-sys-color--on-surface-variant, #c4c7c5)';

		const addBtnLabel = document.createElement('span');
		addBtnLabel.className = 'title-text gds-body-s add-folder-label';
		addBtnLabel.textContent = 'New Folder';
		if (itemScope) addBtnLabel.setAttribute(itemScope, '');

		addBtn.appendChild(addIcon);
		addBtn.appendChild(addBtnLabel);
		addBtn.addEventListener('click', () => {
			showCustomPromptDialog("New Folder Name:", "", "Create", (name) => {
				if (name) {
					folders.push({ id: Date.now().toString(), name: name, color: FOLDER_COLORS[0], isOpen: true });
					saveFolderConfiguration();
					renderFolders();
				}
			});
		});
		folderWrapper.appendChild(addBtn);

		if (Sortable) {
			new Sortable(folderWrapper, {
				animation: 150,
				handle: '.folder-header',
				onEnd: () => {
					const newOrder = [];
					folderWrapper.querySelectorAll('.folder').forEach(el => {
						const id = el.dataset.id;
						const folder = folders.find(f => f.id === id);
						if (folder) newOrder.push(folder);
					});
					folders = newOrder;
					saveFolderConfiguration();
				}
			});
		}

		const chatListEl = document.querySelector(FOLDER_INJECTION_POINT_SELECTOR);
		if (chatListEl) {
			processConversationItems(chatListEl);
		}
	}

	function createFolderElement(folder, itemScope) {
		const isOpen = folder.isOpen !== undefined ? folder.isOpen : !folder.isClosed;
		const folderDiv = document.createElement('div');
		folderDiv.className = `folder ${isOpen ? '' : 'closed'}`;
		folderDiv.dataset.id = folder.id;

		const header = document.createElement('div');
		header.className = 'folder-header';

		const iconWrapper = document.createElement('div');
		iconWrapper.className = 'folder-icon-wrapper';

		const matIcon = document.createElement('mat-icon');
		matIcon.className = 'mat-icon notranslate lm-icon-s lumi-symbols mat-ligature-font mat-icon-no-color folder-icon';
		matIcon.textContent = isOpen ? 'folder_open' : 'folder';
		matIcon.style.color = folder.color || '#808080';
		iconWrapper.appendChild(matIcon);
		header.appendChild(iconWrapper);

		const nameSpan = document.createElement('span');
		nameSpan.className = 'title-text gds-body-s folder-name';
		nameSpan.textContent = folder.name;
		if (itemScope) nameSpan.setAttribute(itemScope, '');
		header.appendChild(nameSpan);

		const controls = document.createElement('div');
		controls.className = 'folder-controls';

		const settingsBtn = document.createElement('button');
		settingsBtn.className = 'folder-options-btn';
		settingsBtn.textContent = '⋮';
		settingsBtn.title = "Folder Options";
		settingsBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			showFolderContextMenu(e, folder);
		});
		controls.appendChild(settingsBtn);

		const toggleIcon = document.createElement('span');
		toggleIcon.className = 'folder-toggle-icon';
		toggleIcon.appendChild(createChevronSvg(isOpen));
		controls.appendChild(toggleIcon);

		header.appendChild(controls);

		header.addEventListener('click', () => {
			const currentlyOpen = folder.isOpen !== undefined ? folder.isOpen : !folder.isClosed;
			folder.isOpen = !currentlyOpen;
			folder.isClosed = !folder.isOpen;
			folderDiv.classList.toggle('closed', !folder.isOpen);
			matIcon.textContent = folder.isOpen ? 'folder_open' : 'folder';
			const svg = toggleIcon.querySelector('svg');
			if (svg) svg.style.transform = folder.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
			saveFolderConfiguration();
		});

		// Drag & drop onto folder header (allows dropping to closed folder or open folder)
		let autoOpenTimer = null;

		function handleDragOver(e) {
			if (!activeDraggedConvoItem) return;
			e.preventDefault();
			e.stopPropagation();
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = 'move';
			}
			header.classList.add('folder-drag-over');

			const isClosed = folderDiv.classList.contains('closed') || !folder.isOpen;
			if (isClosed && !autoOpenTimer) {
				autoOpenTimer = setTimeout(() => {
					if (folderDiv.classList.contains('closed') || !folder.isOpen) {
						folder.isOpen = true;
						folder.isClosed = false;
						folderDiv.classList.remove('closed');
						matIcon.textContent = 'folder_open';
						const svg = toggleIcon.querySelector('svg');
						if (svg) svg.style.transform = 'rotate(0deg)';
						saveFolderConfiguration();
					}
				}, 500);
			}
		}

		function handleDragLeave(e) {
			if (!header.contains(e.relatedTarget) && !folderDiv.contains(e.relatedTarget)) {
				header.classList.remove('folder-drag-over');
				if (autoOpenTimer) {
					clearTimeout(autoOpenTimer);
					autoOpenTimer = null;
				}
			}
		}

		function handleDrop(e) {
			if (!activeDraggedConvoItem) return;
			e.preventDefault();
			e.stopPropagation();
			header.classList.remove('folder-drag-over');
			if (autoOpenTimer) {
				clearTimeout(autoOpenTimer);
				autoOpenTimer = null;
			}

			const item = activeDraggedConvoItem;
			const convoId = getConversationId(item);
			if (convoId) {
				conversationFolders[convoId] = folder.id;
				saveFolderConfiguration();
			}

			contentDiv.appendChild(item);

			if (folderDiv.classList.contains('closed') || !folder.isOpen) {
				folder.isOpen = true;
				folder.isClosed = false;
				folderDiv.classList.remove('closed');
				matIcon.textContent = 'folder_open';
				const svg = toggleIcon.querySelector('svg');
				if (svg) svg.style.transform = 'rotate(0deg)';
				saveFolderConfiguration();
			}
		}

		header.addEventListener('dragenter', handleDragOver);
		header.addEventListener('dragover', handleDragOver);
		header.addEventListener('dragleave', handleDragLeave);
		header.addEventListener('drop', handleDrop);

		folderDiv.appendChild(header);

		const contentDiv = document.createElement('div');
		contentDiv.className = 'folder-content';
		contentDiv.dataset.folderId = folder.id;

		folderDiv.appendChild(contentDiv);

		if (Sortable) {
			new Sortable(contentDiv, {
				group: 'conversations',
				animation: 150,
				onStart: (evt) => {
					activeDraggedConvoItem = evt.item;
				},
				onEnd: () => {
					setTimeout(() => { activeDraggedConvoItem = null; }, 100);
					document.querySelectorAll('.folder-header.folder-drag-over').forEach(el => el.classList.remove('folder-drag-over'));
				},
				onAdd: (evt) => {
					const item = evt.item;
					const convoId = getConversationId(item);
					if (convoId) {
						conversationFolders[convoId] = folder.id;
						saveFolderConfiguration();
					}
				}
			});
		}

		return folderDiv;
	}

	function getConversationId(element) {
		if (!element) return null;
		const link = (element.tagName === 'A' ? element : null) || element.querySelector('a') || element.closest('a');
		if (link) {
			const href = link.getAttribute('href') || link.href || '';
			const match = href.match(/\/(?:app|conversation)\/([a-zA-Z0-9_-]+)/);
			if (match) return match[1];
		}
		const jslog = (element.getAttribute && element.getAttribute('jslog')) || '';
		let m = jslog.match(/"c_([A-Za-z0-9_-]+)"/) || jslog.match(/c_([A-Za-z0-9_-]+)/);
		if (m) return m[1];
		const t = element.querySelector('.conversation-title, [data-test-id="conversation-title"]') || link?.querySelector('span span span span');
		if (t && t.textContent.trim()) return `title:${t.textContent.trim()}`;
		return null;
	}

	function showFolderContextMenu(e, folder) {
		const existingMenu = document.getElementById('folder-context-menu');
		if (existingMenu) existingMenu.remove();

		const menu = document.createElement('div');
		menu.id = 'folder-context-menu';
		menu.className = 'folder-context-menu';

		const renameItem = document.createElement('div');
		renameItem.className = 'folder-context-menu-item';
		renameItem.textContent = '✏️ Rename';
		renameItem.onclick = () => {
			showCustomPromptDialog("Rename Folder:", folder.name, "Save", (newName) => {
				folder.name = newName;
				saveFolderConfiguration();
				renderFolders();
			});
			menu.remove();
		};
		menu.appendChild(renameItem);

		const colorItem = document.createElement('div');
		colorItem.className = 'folder-context-menu-item';
		colorItem.textContent = '🎨 Change Color';
		colorItem.onclick = () => {
			showColorPickerDialog(folder.id);
			menu.remove();
		};
		menu.appendChild(colorItem);

		const deleteItem = document.createElement('div');
		deleteItem.className = 'folder-context-menu-item delete';
		deleteItem.textContent = '🗑️ Delete';
		deleteItem.onclick = () => {
			showConfirmationDialog(`Delete folder "${folder.name}"? Conversations will return to the main list.`, () => {
				deleteFolder(folder.id);
			}, "Delete", "dialog-btn-delete");
			menu.remove();
		};
		menu.appendChild(deleteItem);

		document.body.appendChild(menu);
		menu.style.display = 'block';
		menu.style.left = e.pageX + 'px';
		menu.style.top = e.pageY + 'px';

		const closeMenu = () => {
			menu.remove();
			document.removeEventListener('click', closeMenu);
		};
		setTimeout(() => document.addEventListener('click', closeMenu), 0);
	}

	function deleteFolder(folderId) {
		Object.keys(conversationFolders).forEach(id => {
			if (conversationFolders[id] === folderId) delete conversationFolders[id];
		});
		folders = folders.filter(f => f.id !== folderId);
		saveFolderConfiguration();
		renderFolders();
		const chatListEl = document.querySelector(FOLDER_INJECTION_POINT_SELECTOR);
		if (chatListEl) {
			processConversationItems(chatListEl);
		}
	}

	function processConversationItems(chatHistoryList) {
		if (!chatHistoryList) return;

		const mainList = (chatHistoryList.matches && chatHistoryList.matches(FOLDER_CHAT_LIST_CONTAINER_SELECTOR))
			? chatHistoryList
			: (chatHistoryList.querySelector(FOLDER_CHAT_LIST_CONTAINER_SELECTOR) || chatHistoryList);

		const folderUiContainer = document.getElementById('folder-ui-container') || document.getElementById('folder-section-body') || document.getElementById('folder-container');

		const items = Array.from(document.querySelectorAll(FOLDER_CHAT_ITEM_SELECTOR)).filter(el => {
			return listContains(chatHistoryList, el) || listContains(mainList, el) || listContains(folderUiContainer, el);
		});

		items.forEach(item => {
			if (!item.parentNode?.classList?.contains('conversation-items-container')) {
				item.classList.add('conversation-items-container');
			}

			const convoId = getConversationId(item);
			if (!convoId) return;

			const assignedFolderId = conversationFolders[convoId];

			if (assignedFolderId) {
				const folderContent = document.querySelector(`.folder-content[data-folder-id="${assignedFolderId}"]`);
				if (folderContent && !folderContent.contains(item)) {
					folderContent.appendChild(item);
				}
			} else {
				if (mainList && !mainList.contains(item)) {
					mainList.appendChild(item);
				}
			}
		});

		if (mainList && Sortable && (!mainList.classList.contains('gemini-mod-sortable-init') || !Sortable.get(mainList))) {
			mainList.classList.add('gemini-mod-sortable-init');
			const existingSortable = Sortable.get(mainList);
			if (existingSortable) {
				try { existingSortable.destroy(); } catch (e) { }
			}
			new Sortable(mainList, {
				group: 'conversations',
				animation: 150,
				onStart: (evt) => {
					activeDraggedConvoItem = evt.item;
				},
				onEnd: () => {
					setTimeout(() => { activeDraggedConvoItem = null; }, 100);
					document.querySelectorAll('.folder-header.folder-drag-over').forEach(el => el.classList.remove('folder-drag-over'));
				},
				onAdd: (evt) => {
					const item = evt.item;
					const convoId = getConversationId(item);
					if (convoId && conversationFolders[convoId]) {
						delete conversationFolders[convoId];
						saveFolderConfiguration();
					}
				}
			});
		}
	}

	function listContains(list, node) {
		return list && list.contains(node);
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

		const btnReset = document.createElement('button');
		btnReset.className = 'custom-dialog-btn';
		btnReset.style.backgroundColor = '#5f6368';
		btnReset.style.color = '#ffffff';
		btnReset.textContent = 'Reset';

		dialogBox.appendChild(titleH2);
		dialogBox.appendChild(grid);
		dialogBox.appendChild(hexInput);

		const buttonContainer = document.createElement('div');
		buttonContainer.style.display = 'flex';
		buttonContainer.style.justifyContent = 'center';
		buttonContainer.style.marginTop = '20px';

		buttonContainer.appendChild(btnYes);
		buttonContainer.appendChild(btnNo);
		buttonContainer.appendChild(btnReset);

		dialogBox.appendChild(buttonContainer);

		overlay.appendChild(dialogBox);
		document.body.appendChild(overlay);

		btnYes.onclick = () => {
			const newColor = hexInput.value.trim();
			if (/^#[0-9A-F]{6}$/i.test(newColor) || /^#([0-9A-F]{3}){1,2}$/i.test(newColor)) {
				folder.color = newColor;
				saveFolderConfiguration();
				renderFolders();
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
		btnReset.onclick = () => {
			selectedColor = '#808080';
			hexInput.value = selectedColor;
			grid.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
		};
	}

	function showConfirmationDialog(message, onConfirm, confirmText = "Confirm", confirmClass = "dialog-btn-confirm") {
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




	// --- Toolbar UI ---

	function createToolbar() {
		const toolbarId = 'gemini-snippet-toolbar-ferdium';
		let toolbar = document.getElementById(toolbarId);
		if (!toolbar) {
			toolbar = document.createElement('div');
			toolbar.id = toolbarId;
			document.body.appendChild(toolbar);
		}
		clearElement(toolbar);

		// Render User Items
		toolbarItems.forEach(item => {
			if (!item || item.type === 'settings') return; // Skip if null or legacy settings
			// Respect Visibility Setting
			if (item.visible === false) return; // Skip if hidden

			if (item.type === 'button') {
				const btn = document.createElement('button');
				btn.textContent = item.label;
				btn.className = 'gemini-mod-toolbar-btn';
				btn.addEventListener('click', () => insertSnippetText(item.text));
				toolbar.appendChild(btn);
			} else if (item.type === 'dropdown') {
				// Reverted to native <select> per user request for robustness
				const select = document.createElement('select');
				select.className = 'gemini-mod-toolbar-select';
				select.title = item.placeholder;
				const defaultOption = new Option(item.placeholder, "", true, true);
				defaultOption.disabled = true;
				select.appendChild(defaultOption);
				if (item.options) {
					item.options.forEach(opt => select.appendChild(new Option(opt.label, opt.text)));
				}
				select.addEventListener('change', (e) => {
					if (e.target.value) {
						insertSnippetText(e.target.value);
						e.target.selectedIndex = 0;
					}
				});
				toolbar.appendChild(select);
			} else if (item.type === 'action') {
				const btn = document.createElement('button');
				btn.textContent = item.label;
				btn.title = item.title;
				btn.className = 'gemini-mod-toolbar-btn action-btn';
				if (item.action === 'download') {
					btn.addEventListener('click', handleGlobalCanvasDownload);
				} else if (item.action === 'copy') {
					btn.addEventListener('click', handleCopy);
				} else if (item.action === 'pdf') {
					btn.addEventListener('click', handlePDFExport);
				} else if (item.action === 'paste') {
					btn.addEventListener('click', async () => {
						try {
							const text = await navigator.clipboard.readText();
							insertSnippetText(text);
						} catch (e) {
							console.error("Paste failed:", e);
						}
					});
				}
				toolbar.appendChild(btn);
			}
		});

		// Spacer to push settings to the far right
		const spacer = document.createElement('div');
		spacer.className = 'userscript-toolbar-spacer';
		toolbar.appendChild(spacer);

		// Fixed Settings button on the right end
		const settingsBtn = document.createElement('button');
		settingsBtn.textContent = SETTINGS_BUTTON_LABEL;
		settingsBtn.title = 'Gemini Mod Settings';
		settingsBtn.className = 'gemini-mod-toolbar-btn settings-btn';
		settingsBtn.addEventListener('click', () => toggleSettingsPanel());
		toolbar.appendChild(settingsBtn);
	}

	// ===================================================================================
	// CLOUD SYNCHRONIZATION (SUPABASE) & BACKUP
	// ===================================================================================

	function displayMessage(message, isError = true) {
		const prefix = "Gemini Mod: ";
		if (isError) console.error(prefix + message);
		else console.log(prefix + message);
		alert(prefix + message);
	}

	const GeminiSync = {
		DEFAULT_SUPABASE_URL: 'https://wurrurgloawzvtiyilyr.supabase.co',
		DEFAULT_SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cnJ1cmdsb2F3enZ0aXlpbHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzgwODQsImV4cCI6MjEwNjM1NDA4NH0.aQ8GNObnE9xH8Jd3Rpv9eSp3c72ymjKuWC4Z8qGUQh4',

		getSession: function () {
			try {
				const raw = localStorage.getItem(STORAGE_KEY_AUTH_SESSION);
				return raw ? JSON.parse(raw) : null;
			} catch (_) {
				return null;
			}
		},

		setSession: function (session) {
			if (session) {
				localStorage.setItem(STORAGE_KEY_AUTH_SESSION, JSON.stringify(session));
			} else {
				this.clearSession();
			}
		},

		clearSession: function () {
			localStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
		},

		isAuthenticated: function () {
			const s = this.getSession();
			return !!(s && s.access_token && s.user);
		},

		getCurrentUser: function () {
			const s = this.getSession();
			return s ? s.user : null;
		},

		getSupabaseConfig: function () {
			const url = localStorage.getItem(STORAGE_KEY_SUPABASE_URL) || this.DEFAULT_SUPABASE_URL;
			const key = localStorage.getItem(STORAGE_KEY_SUPABASE_KEY) || this.DEFAULT_SUPABASE_KEY;
			return {
				url: url.trim().replace(/\/+$/, ''),
				key: key.trim()
			};
		},

		setSupabaseConfig: function (url, key) {
			localStorage.setItem(STORAGE_KEY_SUPABASE_URL, (url || '').trim().replace(/\/+$/, ''));
			localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, (key || '').trim());
		},

		resetSupabaseConfig: function () {
			localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
			localStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
		},

		getLastSyncInfo: function () {
			const ts = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
			const client = localStorage.getItem(STORAGE_KEY_LAST_SYNC_CLIENT);
			return {
				timestamp: ts ? parseInt(ts, 10) : null,
				client: client || null
			};
		},

		request: function (endpoint, method, data, config, customToken = null) {
			return new Promise((resolve, reject) => {
				const url = `${config.url}${endpoint}`;
				const authToken = customToken || config.key;
				const headers = {
					'apikey': config.key,
					'Authorization': `Bearer ${authToken}`
				};
				if (data) headers['Content-Type'] = 'application/json';
				if (method === 'POST') {
					headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
				}

				// Priority 1: Node https if available
				try {
					const https = require('https');
					const parsedUrl = new URL(url);
					const postData = data ? JSON.stringify(data) : null;
					const req = https.request({
						hostname: parsedUrl.hostname,
						port: parsedUrl.port || 443,
						path: parsedUrl.pathname + parsedUrl.search,
						method: method,
						headers: {
							...headers,
							...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
						}
					}, (res) => {
						let body = '';
						res.on('data', chunk => body += chunk);
						res.on('end', () => {
							if (res.statusCode >= 200 && res.statusCode < 300) {
								try { resolve(body ? JSON.parse(body) : null); }
								catch (_) { resolve(body); }
							} else {
								let msg = `HTTP ${res.statusCode}`;
								try {
									const p = JSON.parse(body);
									if (p.msg) msg = p.msg;
									else if (p.message) msg = p.message;
									else if (p.error_description) msg = p.error_description;
									else if (p.error) msg = typeof p.error === 'string' ? p.error : JSON.stringify(p.error);
								} catch (_) {
									if (body) msg += `: ${body.slice(0, 100)}`;
								}
								reject(new Error(msg));
							}
						});
					});
					req.on('error', reject);
					if (postData) req.write(postData);
					req.end();
					return;
				} catch (nodeErr) {
					// Fallback to fetch
				}

				// Priority 2: Fetch fallback
				fetch(url, {
					method: method,
					headers: headers,
					body: data ? JSON.stringify(data) : undefined
				}).then(async res => {
					if (res.ok) {
						const txt = await res.text();
						try { resolve(txt ? JSON.parse(txt) : null); }
						catch (_) { resolve(txt); }
					} else {
						const txt = await res.text();
						let msg = `HTTP ${res.status}`;
						try {
							const p = JSON.parse(txt);
							if (p.msg) msg = p.msg;
							else if (p.message) msg = p.message;
							else if (p.error_description) msg = p.error_description;
							else if (p.error) msg = typeof p.error === 'string' ? p.error : JSON.stringify(p.error);
						} catch (_) {
							if (txt) msg += `: ${txt.slice(0, 100)}`;
						}
						reject(new Error(msg));
					}
				}).catch(reject);
			});
		},

		getValidAccessToken: async function () {
			const session = this.getSession();
			if (!session || !session.access_token) {
				throw new Error("You must be logged in to sync settings.");
			}

			// If token expires in less than 60 seconds, refresh it
			if (session.refresh_token && session.expires_at && (session.expires_at - Date.now() < 60000)) {
				const config = this.getSupabaseConfig();
				try {
					const res = await this.request('/auth/v1/token?grant_type=refresh_token', 'POST', {
						refresh_token: session.refresh_token
					}, config);

					if (res && res.access_token) {
						const updatedSession = {
							access_token: res.access_token,
							refresh_token: res.refresh_token || session.refresh_token,
							expires_at: Date.now() + ((res.expires_in || 3600) * 1000),
							user: res.user || session.user
						};
						this.setSession(updatedSession);
						return updatedSession.access_token;
					}
				} catch (refreshErr) {
					console.warn("Gemini Mod: Token refresh failed:", refreshErr);
					this.clearSession();
					throw new Error("Session expired. Please log in again.");
				}
			}

			return session.access_token;
		},

		signUp: async function (email, password) {
			const cleanEmail = (email || '').trim();
			const cleanPass = (password || '').trim();
			if (!cleanEmail || !cleanEmail.includes('@')) {
				throw new Error("Please enter a valid email address.");
			}
			if (!cleanPass || cleanPass.length < 6) {
				throw new Error("Password must be at least 6 characters.");
			}

			const config = this.getSupabaseConfig();
			const res = await this.request('/auth/v1/signup', 'POST', {
				email: cleanEmail,
				password: cleanPass
			}, config);

			// If auto-confirm gave us a session immediately:
			if (res && res.access_token) {
				const session = {
					access_token: res.access_token,
					refresh_token: res.refresh_token,
					expires_at: Date.now() + ((res.expires_in || 3600) * 1000),
					user: {
						id: res.user.id,
						email: res.user.email
					}
				};
				this.setSession(session);
				return session.user;
			}

			// Otherwise, perform sign in to fetch session tokens
			return await this.signIn(cleanEmail, cleanPass);
		},

		signIn: async function (email, password) {
			const cleanEmail = (email || '').trim();
			const cleanPass = (password || '').trim();
			if (!cleanEmail || !cleanPass) {
				throw new Error("Please enter your email and password.");
			}

			const config = this.getSupabaseConfig();
			const res = await this.request('/auth/v1/token?grant_type=password', 'POST', {
				email: cleanEmail,
				password: cleanPass
			}, config);

			if (!res || !res.access_token || !res.user) {
				throw new Error("Invalid response received from authentication server.");
			}

			const session = {
				access_token: res.access_token,
				refresh_token: res.refresh_token,
				expires_at: Date.now() + ((res.expires_in || 3600) * 1000),
				user: {
					id: res.user.id,
					email: res.user.email
				}
			};
			this.setSession(session);
			return session.user;
		},

		signOut: async function () {
			const session = this.getSession();
			if (session && session.access_token) {
				const config = this.getSupabaseConfig();
				try {
					await this.request('/auth/v1/logout', 'POST', null, config, session.access_token);
				} catch (_) {
					// Best effort
				}
			}
			this.clearSession();
		},

		saveToCloud: async function (currentSettings, clientName = 'Ferdium') {
			const token = await this.getValidAccessToken();
			const session = this.getSession();
			if (!session || !session.user || !session.user.id) {
				throw new Error("Unable to identify authenticated user. Please log in again.");
			}

			const config = this.getSupabaseConfig();
			const payload = {
				user_id: session.user.id,
				data: {
					toolbarItems: currentSettings.toolbarItems,
					folders: currentSettings.folders,
					conversationFolders: currentSettings.conversationFolders,
					timestamp: Date.now(),
					client: clientName
				},
				client_name: clientName,
				updated_at: new Date().toISOString()
			};

			// Check client-side payload size limit (Postgres limit is 500KB)
			const serialized = JSON.stringify(payload.data);
			if (serialized.length > 450000) {
				throw new Error(`Settings size (${Math.round(serialized.length / 1024)} KB) exceeds the 450 KB safety limit.`);
			}

			await this.request('/rest/v1/gemini_mod_settings', 'POST', payload, config, token);

			const now = Date.now();
			localStorage.setItem(STORAGE_KEY_LAST_SYNC, now.toString());
			localStorage.setItem(STORAGE_KEY_LAST_SYNC_CLIENT, clientName);
			return payload;
		},

		loadFromCloud: async function () {
			const token = await this.getValidAccessToken();
			const config = this.getSupabaseConfig();
			const endpoint = '/rest/v1/gemini_mod_settings?select=*';
			const res = await this.request(endpoint, 'GET', null, config, token);

			if (!res || !Array.isArray(res) || res.length === 0) {
				throw new Error("No cloud backup found for this account. Upload your settings to the cloud first!");
			}

			const record = res[0];
			const data = record.data;
			if (!data || (!data.toolbarItems && !data.folders)) {
				throw new Error("Invalid or empty data received from cloud.");
			}

			const sourceClient = record.client_name || data.client || 'Cloud';
			const now = Date.now();
			localStorage.setItem(STORAGE_KEY_LAST_SYNC, now.toString());
			localStorage.setItem(STORAGE_KEY_LAST_SYNC_CLIENT, sourceClient);

			return {
				toolbarItems: data.toolbarItems || [],
				folders: data.folders || [],
				conversationFolders: data.conversationFolders || {},
				timestamp: data.timestamp || record.updated_at,
				client: sourceClient
			};
		},

		exportSettingsToFile: function (dataToSave) {
			const fullData = {
				toolbarItems: dataToSave.toolbarItems,
				folders: dataToSave.folders,
				conversationFolders: dataToSave.conversationFolders,
				timestamp: Date.now(),
				version: 1
			};
			const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `gemini_settings_backup_${new Date().toISOString().slice(0, 10)}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		},

		importSettingsFromFile: function (file, onImportSuccess) {
			const reader = new FileReader();
			reader.onload = async (e) => {
				try {
					const data = JSON.parse(e.target.result);
					if (data && (data.toolbarItems || data.folders)) {
						onImportSuccess(data);
					} else {
						alert("Invalid backup file: file must contain toolbarItems or folders.");
					}
				} catch (err) {
					alert("Error reading file: " + err.message);
				}
			};
			reader.readAsText(file);
		}
	};

	// --- Settings Panel UI ---

	function createSettingsPanel() {
		if (document.getElementById('gemini-mod-settings-overlay')) return;

		const overlay = document.createElement('div');
		overlay.id = 'gemini-mod-settings-overlay';

		const panel = document.createElement('div');
		panel.id = 'gemini-mod-settings-panel';
		overlay.appendChild(panel);

		const header = document.createElement('h2');
		header.textContent = 'Gemini Mod Settings';
		panel.appendChild(header);

		// Container for Tabbed Layout
		const container = document.createElement('div');
		container.className = 'settings-container';

		// Sidebar
		const sidebar = document.createElement('div');
		sidebar.className = 'settings-sidebar';

		const tabs = [
			{ id: 'tab-toolbar', label: '🛠️ Toolbar' },
			{ id: 'tab-sync', label: '☁️ Cloud Sync' },
			{ id: 'tab-reset', label: '⚠️ Danger Zone' }
		];

		// Content Area
		const content = document.createElement('div');
		content.className = 'settings-content';

		tabs.forEach((tab, index) => {
			const btn = document.createElement('button');
			btn.className = 'tab-btn' + (index === 0 ? ' active' : '');
			btn.textContent = tab.label;
			btn.dataset.target = tab.id;
			btn.onclick = () => {
				sidebar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
				content.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
				btn.classList.add('active');
				const targetPane = document.getElementById(tab.id);
				if (targetPane) targetPane.classList.add('active');
				if (tab.id === 'tab-sync') updateSettingsPanelSyncStatus();
			};
			sidebar.appendChild(btn);
		});

		// Footer Buttons in Sidebar
		const sidebarFooter = document.createElement('div');
		sidebarFooter.style.marginTop = 'auto';
		sidebarFooter.style.display = 'flex';
		sidebarFooter.style.flexDirection = 'column';
		sidebarFooter.style.gap = '8px';
		sidebarFooter.style.width = '100%';

		const closeBtn = document.createElement('button');
		closeBtn.textContent = 'Close';
		closeBtn.className = 'custom-dialog-btn dialog-btn-cancel';
		closeBtn.style.width = '100%';
		closeBtn.style.margin = '0';
		closeBtn.addEventListener('click', () => toggleSettingsPanel(false));
		sidebarFooter.appendChild(closeBtn);

		const saveBtn = document.createElement('button');
		saveBtn.textContent = 'Save & Close';
		saveBtn.className = 'custom-dialog-btn dialog-btn-confirm';
		saveBtn.style.width = '100%';
		saveBtn.style.margin = '0';
		saveBtn.addEventListener('click', saveToolbarConfiguration);
		sidebarFooter.appendChild(saveBtn);

		sidebar.appendChild(sidebarFooter);
		container.appendChild(sidebar);

		// --- TAB 1: TOOLBAR ---
		const tabToolbar = document.createElement('div');
		tabToolbar.id = 'tab-toolbar';
		tabToolbar.className = 'tab-pane active';

		const addItemBtn = document.createElement('button');
		addItemBtn.textContent = '+ Add Toolbar Item';
		addItemBtn.className = 'custom-dialog-btn dialog-btn-confirm';
		addItemBtn.style.marginBottom = '15px';
		addItemBtn.addEventListener('click', showToolbarItemTypeModal);
		tabToolbar.appendChild(addItemBtn);

		const dragDropHint = document.createElement('p');
		dragDropHint.textContent = 'The order of the items can be changed via Drag & Drop.';
		dragDropHint.style.fontSize = '12px';
		dragDropHint.style.color = '#aaa';
		dragDropHint.style.margin = '0 0 10px 0';
		tabToolbar.appendChild(dragDropHint);

		const itemsContainer = document.createElement('div');
		itemsContainer.id = 'toolbar-items-container';
		tabToolbar.appendChild(itemsContainer);

		content.appendChild(tabToolbar);

		// --- TAB 2: CLOUD SYNC ---
		const tabSync = document.createElement('div');
		tabSync.id = 'tab-sync';
		tabSync.className = 'tab-pane';

		const syncHeading = document.createElement('h3');
		syncHeading.textContent = 'Cloud Synchronization (Supabase)';
		syncHeading.style.marginTop = '0';
		tabSync.appendChild(syncHeading);

		const syncDesc = document.createElement('p');
		syncDesc.textContent = 'Synchronize toolbar items, folders, and conversation mappings between Ferdium, browser userscripts, and across devices.';
		syncDesc.style.fontSize = '13px';
		syncDesc.style.color = '#aaa';
		syncDesc.style.marginTop = '-5px';
		tabSync.appendChild(syncDesc);

		// Status card
		const statusCard = document.createElement('div');
		statusCard.className = 'sync-status-card';
		const statusTitle = document.createElement('div');
		statusTitle.id = 'sync-status-text';
		statusTitle.className = 'sync-status-title';
		statusTitle.textContent = 'Status: Checking...';
		statusTitle.style.color = '#8ab4f8';
		const statusDetail = document.createElement('div');
		statusDetail.id = 'sync-last-time-text';
		statusDetail.className = 'sync-status-detail';
		statusDetail.textContent = '';
		statusCard.appendChild(statusTitle);
		statusCard.appendChild(statusDetail);
		tabSync.appendChild(statusCard);

		// Container 1: Logged-in view
		const loggedInBox = document.createElement('div');
		loggedInBox.id = 'sync-auth-logged-in';
		loggedInBox.style.display = 'none';

		const userCard = document.createElement('div');
		userCard.className = 'sync-user-card';

		const userInfo = document.createElement('div');
		userInfo.className = 'sync-user-info';
		const userIcon = document.createElement('span');
		userIcon.textContent = '👤';
		const userEmail = document.createElement('span');
		userEmail.id = 'sync-user-email';
		userEmail.textContent = '';
		userInfo.appendChild(userIcon);
		userInfo.appendChild(userEmail);

		const logoutBtn = document.createElement('button');
		logoutBtn.textContent = '🚪 Log Out';
		logoutBtn.className = 'remove-btn';
		logoutBtn.title = 'Log out of Supabase on this device';
		logoutBtn.onclick = async () => {
			await GeminiSync.signOut();
			updateSettingsPanelSyncStatus();
			displayMessage("Logged out successfully.", false);
		};

		userCard.appendChild(userInfo);
		userCard.appendChild(logoutBtn);
		loggedInBox.appendChild(userCard);

		// Sync Actions Box (for logged in users)
		const actionsBox = document.createElement('div');
		actionsBox.className = 'sync-actions-box';

		const uploadBtn = document.createElement('button');
		uploadBtn.textContent = '☁️ Upload to Cloud (Backup)';
		uploadBtn.className = 'sync-btn-primary';
		uploadBtn.title = 'Upload current Ferdium settings and folders to Supabase';
		uploadBtn.onclick = async () => {
			try {
				await GeminiSync.saveToCloud({
					toolbarItems,
					folders,
					conversationFolders
				}, CLIENT_NAME);
				updateSettingsPanelSyncStatus();
				displayMessage("Settings uploaded to Cloud successfully!", false);
			} catch (err) {
				displayMessage("Upload failed: " + err.message);
			}
		};

		const downloadBtn = document.createElement('button');
		downloadBtn.textContent = '☁️ Download from Cloud (Sync)';
		downloadBtn.className = 'sync-btn-primary';
		downloadBtn.title = 'Download settings and folders from Supabase and apply them';
		downloadBtn.onclick = async () => {
			try {
				const remote = await GeminiSync.loadFromCloud();
				const clientStr = remote.client ? ` (from ${remote.client})` : '';
				const timeStr = remote.timestamp ? ` from ${new Date(remote.timestamp).toLocaleString()}` : '';
				showConfirmationDialog(`This will overwrite your local configuration with cloud settings${clientStr}${timeStr}. Continue?`, () => {
					localStorage.setItem(STORAGE_KEY_TOOLBAR_ITEMS, JSON.stringify(remote.toolbarItems));
					localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(remote.folders));
					localStorage.setItem(STORAGE_KEY_CONVO_FOLDERS, JSON.stringify(remote.conversationFolders || {}));
					displayMessage("Settings downloaded from Cloud! Reloading...", false);
					setTimeout(() => window.location.reload(), 1000);
				}, 'Overwrite & Apply', 'dialog-btn-confirm');
			} catch (err) {
				displayMessage("Download failed: " + err.message);
			}
		};

		actionsBox.appendChild(uploadBtn);
		actionsBox.appendChild(downloadBtn);
		loggedInBox.appendChild(actionsBox);
		tabSync.appendChild(loggedInBox);

		// Container 2: Logged-out view (Sign Up / Log In)
		const loggedOutBox = document.createElement('div');
		loggedOutBox.id = 'sync-auth-logged-out';
		loggedOutBox.className = 'sync-auth-box';

		const authNotice = document.createElement('div');
		authNotice.className = 'sync-auth-notice';
		authNotice.textContent = '🛡️ Multi-User Protection: Log in with your email and password to securely access your settings. Each user\'s configuration is strictly isolated with Row-Level Security.';
		loggedOutBox.appendChild(authNotice);

		const emailLabel = document.createElement('label');
		emailLabel.textContent = 'Email:';
		loggedOutBox.appendChild(emailLabel);

		const emailInput = document.createElement('input');
		emailInput.id = 'sync-email-input';
		emailInput.type = 'email';
		emailInput.placeholder = 'your.email@example.com';
		loggedOutBox.appendChild(emailInput);

		const passLabel = document.createElement('label');
		passLabel.textContent = 'Password:';
		loggedOutBox.appendChild(passLabel);

		const passRow = document.createElement('div');
		passRow.className = 'sync-auth-row';

		const passInput = document.createElement('input');
		passInput.id = 'sync-password-input';
		passInput.type = 'password';
		passInput.placeholder = 'Password (min. 6 characters)';
		passInput.style.flexGrow = '1';

		const togglePassBtn = document.createElement('button');
		togglePassBtn.textContent = '👁️';
		togglePassBtn.title = 'Toggle Password Visibility';
		togglePassBtn.onclick = () => {
			passInput.type = passInput.type === 'password' ? 'text' : 'password';
		};

		passRow.appendChild(passInput);
		passRow.appendChild(togglePassBtn);
		loggedOutBox.appendChild(passRow);

		const authBtnsRow = document.createElement('div');
		authBtnsRow.className = 'sync-auth-btns';

		const loginBtn = document.createElement('button');
		loginBtn.textContent = '🔑 Log In';
		loginBtn.className = 'sync-btn-primary';
		loginBtn.onclick = async () => {
			const email = emailInput.value.trim();
			const pass = passInput.value.trim();
			if (!email || !pass) {
				displayMessage("Please enter your email and password.");
				return;
			}
			try {
				loginBtn.disabled = true;
				loginBtn.textContent = 'Logging in...';
				const user = await GeminiSync.signIn(email, pass);
				passInput.value = '';
				updateSettingsPanelSyncStatus();
				displayMessage(`Welcome back, ${user.email}!`, false);
			} catch (err) {
				displayMessage("Login failed: " + err.message);
			} finally {
				loginBtn.disabled = false;
				loginBtn.textContent = '🔑 Log In';
			}
		};

		const signupBtn = document.createElement('button');
		signupBtn.textContent = '✨ Sign Up';
		signupBtn.title = 'Create a new sync account with this email and password';
		signupBtn.onclick = async () => {
			const email = emailInput.value.trim();
			const pass = passInput.value.trim();
			if (!email || !pass) {
				displayMessage("Please enter an email and password to create an account.");
				return;
			}
			try {
				signupBtn.disabled = true;
				signupBtn.textContent = 'Signing up...';
				const user = await GeminiSync.signUp(email, pass);
				passInput.value = '';
				updateSettingsPanelSyncStatus();
				displayMessage(`Account created and connected as ${user.email}!`, false);
			} catch (err) {
				displayMessage("Sign up failed: " + err.message);
			} finally {
				signupBtn.disabled = false;
				signupBtn.textContent = '✨ Sign Up';
			}
		};

		authBtnsRow.appendChild(loginBtn);
		authBtnsRow.appendChild(signupBtn);
		loggedOutBox.appendChild(authBtnsRow);

		const signupHelp = document.createElement('p');
		signupHelp.textContent = '💡 First time? Enter your email and password, then click "Sign Up" to create your personal account.';
		signupHelp.style.fontSize = '12px';
		signupHelp.style.color = '#8ab4f8';
		signupHelp.style.margin = '10px 0 0 0';
		loggedOutBox.appendChild(signupHelp);

		tabSync.appendChild(loggedOutBox);

		// Manual File Backup Section
		const manualHeader = document.createElement('h3');
		manualHeader.textContent = 'Manual File Backup';
		tabSync.appendChild(manualHeader);

		const manualDesc = document.createElement('p');
		manualDesc.textContent = 'Export or import your complete configuration to/from a local .json file.';
		manualDesc.style.fontSize = '12px';
		manualDesc.style.color = '#aaa';
		manualDesc.style.marginTop = '-5px';
		tabSync.appendChild(manualDesc);

		const fileRow = document.createElement('div');
		fileRow.style.display = 'flex';
		fileRow.style.gap = '10px';
		fileRow.style.marginBottom = '20px';

		const exportBtn = document.createElement('button');
		exportBtn.textContent = '⬇️ Export to File';
		exportBtn.onclick = () => {
			GeminiSync.exportSettingsToFile({ toolbarItems, folders, conversationFolders });
		};

		const importInput = document.createElement('input');
		importInput.type = 'file';
		importInput.accept = '.json';
		importInput.style.display = 'none';
		importInput.onchange = (e) => {
			if (e.target.files.length > 0) {
				GeminiSync.importSettingsFromFile(e.target.files[0], (imported) => {
					showConfirmationDialog('Overwrite local settings with imported backup file?', () => {
						if (imported.toolbarItems) localStorage.setItem(STORAGE_KEY_TOOLBAR_ITEMS, JSON.stringify(imported.toolbarItems));
						if (imported.folders) localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(imported.folders));
						if (imported.conversationFolders) localStorage.setItem(STORAGE_KEY_CONVO_FOLDERS, JSON.stringify(imported.conversationFolders));
						displayMessage("Backup imported successfully! Reloading...", false);
						setTimeout(() => window.location.reload(), 1000);
					}, 'Import & Overwrite', 'dialog-btn-confirm');
				});
			}
		};

		const importBtn = document.createElement('button');
		importBtn.textContent = '⬆️ Import from File';
		importBtn.onclick = () => importInput.click();

		fileRow.appendChild(exportBtn);
		fileRow.appendChild(importBtn);
		fileRow.appendChild(importInput);
		tabSync.appendChild(fileRow);

		// Advanced Supabase Connection
		const advancedDetails = document.createElement('details');
		advancedDetails.className = 'sync-advanced-details';
		const advancedSummary = document.createElement('summary');
		advancedSummary.textContent = '⚙️ Advanced Supabase Connection Settings';
		advancedDetails.appendChild(advancedSummary);

		const cfg = GeminiSync.getSupabaseConfig();

		const urlLabel = document.createElement('label');
		urlLabel.textContent = 'Supabase Project URL:';
		advancedDetails.appendChild(urlLabel);
		const urlInput = document.createElement('input');
		urlInput.type = 'text';
		urlInput.value = cfg.url;
		advancedDetails.appendChild(urlInput);

		const keyAdvLabel = document.createElement('label');
		keyAdvLabel.textContent = 'Supabase Anon/Publishable Key:';
		advancedDetails.appendChild(keyAdvLabel);
		const keyAdvInput = document.createElement('input');
		keyAdvInput.type = 'password';
		keyAdvInput.value = cfg.key;
		advancedDetails.appendChild(keyAdvInput);

		const advBtnsRow = document.createElement('div');
		advBtnsRow.style.display = 'flex';
		advBtnsRow.style.gap = '8px';
		advBtnsRow.style.marginTop = '10px';

		const saveCfgBtn = document.createElement('button');
		saveCfgBtn.textContent = 'Save Custom Connection';
		saveCfgBtn.onclick = () => {
			GeminiSync.setSupabaseConfig(urlInput.value, keyAdvInput.value);
			displayMessage("Custom Supabase connection saved!", false);
		};

		const resetCfgBtn = document.createElement('button');
		resetCfgBtn.textContent = 'Reset to Default Supabase Project';
		resetCfgBtn.onclick = () => {
			GeminiSync.resetSupabaseConfig();
			urlInput.value = GeminiSync.DEFAULT_SUPABASE_URL;
			keyAdvInput.value = GeminiSync.DEFAULT_SUPABASE_KEY;
			displayMessage("Reset to default Supabase project.", false);
		};

		advBtnsRow.appendChild(saveCfgBtn);
		advBtnsRow.appendChild(resetCfgBtn);
		advancedDetails.appendChild(advBtnsRow);

		tabSync.appendChild(advancedDetails);
		content.appendChild(tabSync);

		// --- TAB 3: DANGER ZONE ---
		const tabReset = document.createElement('div');
		tabReset.id = 'tab-reset';
		tabReset.className = 'tab-pane';

		const resetHeading = document.createElement('h3');
		resetHeading.textContent = 'Danger Zone';
		resetHeading.style.marginTop = '0';
		tabReset.appendChild(resetHeading);

		const resetFoldersBtn = document.createElement('button');
		resetFoldersBtn.textContent = 'Reset Folders Only';
		resetFoldersBtn.className = 'remove-btn';
		resetFoldersBtn.style.display = 'block';
		resetFoldersBtn.style.marginBottom = '15px';
		resetFoldersBtn.addEventListener('click', () => {
			showConfirmationDialog('Are you sure you want to delete all folder data? This cannot be undone.', () => {
				localStorage.removeItem(STORAGE_KEY_FOLDERS);
				localStorage.removeItem(STORAGE_KEY_CONVO_FOLDERS);
				window.location.reload();
			}, 'Reset Folders', 'dialog-btn-delete');
		});
		tabReset.appendChild(resetFoldersBtn);

		const resetEverythingBtn = document.createElement('button');
		resetEverythingBtn.textContent = 'Reset EVERYTHING (Factory Reset)';
		resetEverythingBtn.className = 'remove-btn';
		resetEverythingBtn.style.backgroundColor = '#cc2929';
		resetEverythingBtn.addEventListener('click', () => {
			showConfirmationDialog('Are you sure you want to delete ALL data (Folders, Toolbar, Sync configuration)? This cannot be undone.', () => {
				localStorage.removeItem(STORAGE_KEY_FOLDERS);
				localStorage.removeItem(STORAGE_KEY_CONVO_FOLDERS);
				localStorage.removeItem(STORAGE_KEY_TOOLBAR_ITEMS);
				localStorage.removeItem(STORAGE_KEY_SYNC_KEY);
				localStorage.removeItem(STORAGE_KEY_AUTH_SESSION);
				localStorage.removeItem(STORAGE_KEY_LAST_SYNC);
				localStorage.removeItem(STORAGE_KEY_LAST_SYNC_CLIENT);
				window.location.reload();
			}, 'Reset Everything', 'dialog-btn-delete');
		});
		tabReset.appendChild(resetEverythingBtn);

		content.appendChild(tabReset);

		container.appendChild(content);
		panel.appendChild(container);
		document.body.appendChild(overlay);
	}

	function updateSettingsPanelSyncStatus() {
		const statusText = document.getElementById('sync-status-text');
		const lastTimeText = document.getElementById('sync-last-time-text');
		const loggedInBox = document.getElementById('sync-auth-logged-in');
		const loggedOutBox = document.getElementById('sync-auth-logged-out');
		const userEmailEl = document.getElementById('sync-user-email');
		if (!statusText) return;

		const isAuth = GeminiSync.isAuthenticated();
		const user = GeminiSync.getCurrentUser();

		if (isAuth && user) {
			statusText.textContent = `Status: Connected as ${user.email} ✅`;
			statusText.style.color = "#81c995";
			if (userEmailEl) userEmailEl.textContent = user.email;
			if (loggedInBox) loggedInBox.style.display = 'block';
			if (loggedOutBox) loggedOutBox.style.display = 'none';
		} else {
			statusText.textContent = "Status: Not logged in (Authentication required) 🔒";
			statusText.style.color = "#f2994a";
			if (loggedInBox) loggedInBox.style.display = 'none';
			if (loggedOutBox) loggedOutBox.style.display = 'block';
		}

		if (lastTimeText) {
			const { timestamp, client } = GeminiSync.getLastSyncInfo();
			if (timestamp) {
				lastTimeText.textContent = `Last synchronized: ${new Date(timestamp).toLocaleString()} (${client || 'Cloud'})`;
			} else {
				lastTimeText.textContent = "Never synchronized yet.";
			}
		}
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

			const btnAction = document.createElement('button');
			btnAction.textContent = 'Predefined Action';
			btnAction.addEventListener('click', () => {
				showActionSelectionModal();
				modal.style.display = 'none';
			});

			modalContent.appendChild(btnButton);
			modalContent.appendChild(btnDropdown);
			modalContent.appendChild(btnAction);
			modal.appendChild(modalContent);
			document.body.appendChild(modal);
		}
		modal.style.display = 'block';
	}

	function showActionSelectionModal() {
		const actions = [
			{ action: 'paste', label: "📋 Paste", title: "Paste from Clipboard" },
			{ action: 'copy', label: "📄 Copy", title: "Copy active canvas content" },
			{ action: 'download', label: "💾 Download", title: "Download active canvas content" },
			{ action: 'pdf', label: "📑 PDF", title: "Export active canvas content as PDF" }
		];

		let modal = document.getElementById('gemini-mod-action-modal-overlay');
		if (!modal) {
			modal = document.createElement('div');
			modal.id = 'gemini-mod-action-modal-overlay';
			modal.className = 'custom-dialog-overlay';

			const modalContent = document.createElement('div');
			modalContent.className = 'custom-dialog-box';

			const h3 = document.createElement('h3');
			h3.textContent = 'Select Action';
			modalContent.appendChild(h3);

			actions.forEach(act => {
				const btn = document.createElement('button');
				btn.className = 'custom-dialog-btn';
				btn.textContent = act.label;
				btn.style.margin = '5px';
				btn.addEventListener('click', () => {
					addItemToPanel({ type: 'action', ...act });
					modal.style.display = 'none';
				});
				modalContent.appendChild(btn);
			});

			const cancelBtn = document.createElement('button');
			cancelBtn.className = 'custom-dialog-btn dialog-btn-cancel';
			cancelBtn.textContent = 'Cancel';
			cancelBtn.style.marginTop = '10px';
			cancelBtn.addEventListener('click', () => modal.style.display = 'none');
			modalContent.appendChild(cancelBtn);

			modal.appendChild(modalContent);
			document.body.appendChild(modal);
		}
		modal.style.display = 'flex';
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

		// Re-introduced Visibility Checkbox (Per User Request)
		// Only relevant for action buttons where user wants control
		if (item.type === 'action') {
			const visibleLabel = document.createElement('label');
			visibleLabel.style.display = 'flex';
			visibleLabel.style.alignItems = 'center';
			visibleLabel.style.marginRight = '10px';
			visibleLabel.style.cursor = 'pointer';

			const visibleInput = document.createElement('input');
			visibleInput.type = 'checkbox';
			visibleInput.className = 'visible-checkbox';
			// Default to true if undefined
			visibleInput.checked = (item.visible !== false);

			visibleLabel.appendChild(visibleInput);
			visibleLabel.appendChild(document.createTextNode(' Show'));
			group.appendChild(visibleLabel);
		}

		// Item Content
		const contentDiv = document.createElement('div');
		contentDiv.className = 'item-content';

		if (item.type === 'settings') {
			const label = document.createElement('label');
			label.textContent = "⚙️ Settings";
			label.style.fontWeight = 'bold';
			contentDiv.appendChild(label);
			group.style.backgroundColor = '#333'; // Visual distinction
		} else if (item.type === 'button') {
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
		} else if (item.type === 'action') {
			group.dataset.action = item.action;
			group.dataset.title = item.title;

			const labelLabel = document.createElement('label');
			labelLabel.textContent = `Action: ${item.action.toUpperCase()}`;
			contentDiv.appendChild(labelLabel);

			const labelInput = document.createElement('input');
			labelInput.type = 'text';
			labelInput.className = 'label-input';
			labelInput.value = item.label || '';
			contentDiv.appendChild(labelInput);
		}
		group.appendChild(contentDiv);

		// Remove Button (Only for non-protected items)
		// Settings is protected
		if (item.type !== 'action' && item.type !== 'settings') {
			const removeBtn = document.createElement('button');
			removeBtn.className = 'remove-btn';
			removeBtn.textContent = 'Remove';
			removeBtn.addEventListener('click', () => {
				group.remove();
			});
			group.appendChild(removeBtn);
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


	function saveToolbarConfiguration() {
		const container = document.getElementById('toolbar-items-container');
		const newItems = [];
		const groups = container.querySelectorAll('.item-group');

		groups.forEach(group => {
			const type = group.dataset.type;
			let item = { type };

			// Capture Visibility (if present)
			const visibleCheckbox = group.querySelector('.visible-checkbox');
			if (visibleCheckbox) {
				item.visible = visibleCheckbox.checked;
			}

			if (type === 'settings') {
				item.label = "⚙️"; // Hardcode just in case
			} else if (type === 'button') {
				item.label = group.querySelector('.label-input').value;
				item.text = group.querySelector('.text-input').value;
			} else if (type === 'dropdown') {
				item.placeholder = group.querySelector('.placeholder-input').value;
				item.options = [];
				const optionDivs = group.querySelectorAll('.option-item');
				optionDivs.forEach(optDiv => {
					item.options.push({
						label: optDiv.querySelector('.label-input').value,
						text: optDiv.querySelector('.text-input').value
					});
				});
			} else if (type === 'action') {
				item.action = group.dataset.action;
				item.title = group.dataset.title;
				item.label = group.querySelector('.label-input').value;
			}
			newItems.push(item);
		});

		toolbarItems = newItems;
		localStorage.setItem(STORAGE_KEY_TOOLBAR_ITEMS, JSON.stringify(toolbarItems));
		createToolbar(); // Refresh toolbar immediately
		toggleSettingsPanel(false);
	}

	function toggleSettingsPanel(forceState) {
		let overlay = document.getElementById('gemini-mod-settings-overlay');
		if (!overlay) {
			createSettingsPanel();
			overlay = document.getElementById('gemini-mod-settings-overlay');
		}
		if (!overlay) return;
		const isVisible = overlay.style.display === 'block';
		const show = typeof forceState === 'boolean' ? forceState : !isVisible;

		if (show) {
			populateSettingsPanel();
			updateSettingsPanelSyncStatus();
			const itemsContainer = document.getElementById('toolbar-items-container');
			if (itemsContainer && Sortable && (!itemsContainer.classList.contains('gemini-mod-sortable-init') || !Sortable.get(itemsContainer))) {
				itemsContainer.classList.add('gemini-mod-sortable-init');
				new Sortable(itemsContainer, {
					animation: 150,
					handle: '.item-group',
					ghostClass: 'sortable-ghost'
				});
			}
			overlay.style.display = 'block';
		} else {
			overlay.style.display = 'none';
		}
	}

	// --- Download Logic ---



	function handleGlobalCanvasDownload() {
		console.log("Gemini Mod: Dispatching DOWNLOAD event to Bridge");
		document.dispatchEvent(new CustomEvent('GEMINI_ACTION_DOWNLOAD'));
	}

	function handleCopy() {
		console.log("Gemini Mod: Dispatching COPY event to Bridge");
		document.dispatchEvent(new CustomEvent('GEMINI_ACTION_COPY'));
	}

	function handlePDFExport() {
		console.log("Gemini Mod: Dispatching PDF event to Bridge");
		document.dispatchEvent(new CustomEvent('GEMINI_ACTION_PDF'));
	}

	// ===================================================================================
	// IV. INITIALIZATION
	// ===================================================================================

	if (
		location.hostname === 'workspace.google.com' &&
		location.href.includes('products/gemini/')
	) {
		location.href =
			'https://accounts.google.com/AccountChooser?continue=https://gemini.google.com/u/0/';
	}

	function init() {
		try {
			console.log("Ferdium Gemini Mod: Initializing...");

			// Inject external libraries
			if (typeof __dirname !== 'undefined') {
				const patchScript = path.join(__dirname, 'patch_modules.js');
				const jsPdfScript = path.join(__dirname, 'jspdf.umd.min.js');
				const sortableScript = path.join(__dirname, 'sortable.min.js');
				const bridgeScript = path.join(__dirname, 'bridge.js');
				Ferdium.injectJSUnsafe(patchScript, jsPdfScript, sortableScript, bridgeScript);
			} else {
				console.error("Gemini Mod: __dirname is not defined. Cannot inject libraries.");
			}

			loadConfiguration();

			setTimeout(() => {
				try {
					injectCustomCSS();
					createToolbar();
					createSettingsPanel();

					// Start folder initialization loop with backoff
					let attempts = 0;
					let folderInitInterval = setInterval(() => {
						attempts++;
						if (initializeFolders()) {
							clearInterval(folderInitInterval);
							console.log("Ferdium Gemini Mod: Folders Initialized.");
						} else if (attempts === 60) {
							// After 30s of rapid checks, switch to gentle backoff (every 2.5s) instead of terminating
							clearInterval(folderInitInterval);
							folderInitInterval = setInterval(() => {
								if (initializeFolders()) {
									clearInterval(folderInitInterval);
									console.log("Ferdium Gemini Mod: Folders Initialized (delayed).");
								}
							}, 2500);
						}
					}, 500);

					console.log("Ferdium Gemini Mod: Fully initialized sequences started.");
				} catch (e) {
					console.error("Gemini Mod: Error during delayed initialization:", e);
					displayUserscriptMessage("Error initializing UI: " + e.message);
				}
			}, 1000);

		} catch (err) {
			console.error("Gemini Mod: Fatal error in init handler:", err);
			if (Ferdium && Ferdium.displayErrorMessage) {
				Ferdium.displayErrorMessage("Gemini Mod Failed to Load: " + err.message);
			}
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
};
