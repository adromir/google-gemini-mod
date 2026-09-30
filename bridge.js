// Restore environment after UMD libraries have attached to window
try {
    if (typeof window._temp_define !== 'undefined') {
        window.define = window._temp_define;
        delete window._temp_define;
    }
    if (typeof window._temp_module !== 'undefined') {
        window.module = window._temp_module;
        delete window._temp_module;
    }
    if (typeof window._temp_exports !== 'undefined') {
        window.exports = window._temp_exports;
        delete window._temp_exports;
    }
} catch (e) {
    console.warn("Gemini Mod Bridge: Global cleanup notice:", e);
}

console.log("Gemini Mod: Bridge script loaded (v4 - Optimized).");

const Bridge = {
    // --- Editor & Content Helpers ---
    getMonacoEditor: function () {
        if (typeof window.monaco === 'undefined' || !window.monaco.editor) return null;
        const editors = window.monaco.editor.getEditors();

        // Priority 1: Editor inside code-immersive-panel (Code Canvas)
        const canvasEditor = editors.find(e => {
            const node = e.getContainerDomNode();
            return node.closest('code-immersive-panel') && document.body.contains(node) && node.offsetParent !== null;
        });
        if (canvasEditor) return canvasEditor;

        // Priority 2: Fallback to any visible editor
        return editors.find(e => {
            const node = e.getContainerDomNode();
            return document.body.contains(node) && node.offsetParent !== null;
        });
    },

    getGeminiContent: function () {
        // 1. Try Monaco Editor directly
        const editor = this.getMonacoEditor();
        if (editor) {
            const model = editor.getModel();
            if (model) {
                let title = "code_snippet";
                const parentPanel = editor.getContainerDomNode().closest('code-immersive-panel');
                if (parentPanel) {
                    const header = parentPanel.querySelector('h2, [data-test-id="canvas-title"], .title, .filename');
                    if (header && header.textContent.trim()) {
                        title = header.textContent.trim();
                    }
                }
                if (title === "code_snippet") {
                    const broadTitle = document.querySelector('code-immersive-panel h2');
                    if (broadTitle && broadTitle.textContent.trim()) {
                        title = broadTitle.textContent.trim();
                    }
                }
                return { type: 'code', content: model.getValue(), title };
            }
        }

        // 2. Try ProseMirror (Document Editor)
        const pmEditor = document.querySelector('.ProseMirror');
        if (pmEditor) {
            const titleEl = document.querySelector('h2.title-text, [data-test-id="canvas-title"], .title');
            const title = titleEl ? titleEl.textContent.trim() : "gemini_document";
            if (pmEditor.pmView && pmEditor.pmView.state && pmEditor.pmView.state.doc) {
                try {
                    return { type: 'text', content: pmEditor.pmView.state.doc.textContent, title };
                } catch (e) {
                    console.warn("Gemini Mod Bridge: Failed to read ProseMirror state:", e);
                }
            }
            if (pmEditor.innerText && pmEditor.innerText.trim()) {
                return { type: 'text', content: pmEditor.innerText.trim(), title };
            }
        }

        // 3. Fallback: DOM extraction from immersive panels
        const panels = document.querySelectorAll('code-immersive-panel, immersive-panel, .immersive-panel-container');
        for (const panel of panels) {
            const checkRoot = (root) => {
                if (!root) return null;
                const titleEl = root.querySelector('h2.title-text, .title, [data-test-id="canvas-title"]');
                const title = titleEl ? titleEl.textContent.trim() : "gemini_artifact";

                const monacoEditor = root.querySelector('.monaco-editor');
                if (monacoEditor) {
                    const viewLines = monacoEditor.querySelector('.view-lines');
                    if (viewLines) return { type: 'code', content: viewLines.innerText, title };
                }
                const codeBlock = root.querySelector('code, pre');
                if (codeBlock) return { type: 'code', content: codeBlock.textContent, title };
                const textEditor = root.querySelector('.ProseMirror, [contenteditable="true"]');
                if (textEditor) return { type: 'text', content: textEditor.innerText, title };
                return null;
            };

            if (panel.shadowRoot) {
                const res = checkRoot(panel.shadowRoot);
                if (res) return res;
            }
            const res = checkRoot(panel);
            if (res) return res;
        }

        // 4. Try Standard Text Response (Fallback)
        const modelResponses = document.querySelectorAll('.model-response-text, message-content, .response-content');
        if (modelResponses.length > 0) {
            const lastResponse = modelResponses[modelResponses.length - 1];
            return { type: 'text', content: lastResponse.innerText, title: 'gemini_response' };
        }
        return null;
    },

    // --- Actions ---
    actions: {
        copy: async function () {
            const data = Bridge.getGeminiContent();
            if (!data || !data.content) {
                console.warn("Gemini Mod Bridge: No content to copy");
                return;
            }
            try {
                try { window.focus(); } catch (e) { }
                await navigator.clipboard.writeText(data.content);
                console.log("Gemini Mod Bridge: Copied via Clipboard API");
            } catch (e) {
                console.error("Gemini Mod Bridge: Clipboard API copy failed, using fallback:", e);
                try {
                    const textArea = document.createElement("textarea");
                    textArea.value = data.content;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-9999px";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    console.log("Gemini Mod Bridge: Copied via execCommand");
                } catch (err) {
                    console.error("Gemini Mod Bridge: ExecCommand fallback failed:", err);
                }
            }
        },

        download: function () {
            try {
                const data = Bridge.getGeminiContent();
                if (data && data.content) {
                    const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);

                    let filename = (data.title || "download").replace(/[^a-z0-9_\-\.]/gi, '_');
                    if (!filename.includes('.')) filename += '.txt';

                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    console.log("Gemini Mod Bridge: Download triggered", filename);
                }
            } catch (e) {
                console.error("Gemini Mod Bridge: Download Failed", e);
            }
        },

        pdf: function () {
            try {
                const jsPDF = window.jspdf ? window.jspdf.jsPDF : (window.jsPDF ? window.jsPDF : null);
                if (!jsPDF) return console.error("Gemini Mod Bridge: jsPDF not found.");

                const data = Bridge.getGeminiContent();
                if (!data || !data.content) return;

                const doc = new jsPDF({ unit: 'pt', format: 'a4' });
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const margin = 40;
                const maxLineWidth = pageWidth - (margin * 2);
                const lineHeight = 12;

                const content = data.content.replace(/\t/g, '    ').replace(/\u00A0/g, ' ');
                let title = data.title || "document";

                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text(title, margin, margin);

                let cursorY = margin + 25;
                doc.setFontSize(10);
                doc.setFont("courier", "normal");

                const lines = doc.splitTextToSize(content, maxLineWidth);
                lines.forEach(line => {
                    if (cursorY > pageHeight - margin) {
                        doc.addPage();
                        cursorY = margin;
                    }
                    doc.text(line, margin, cursorY);
                    cursorY += lineHeight;
                });

                const filename = title.replace(/[^a-z0-9_\-\.]/gi, '_') + ".pdf";
                doc.save(filename);
            } catch (e) {
                console.error("Gemini Mod Bridge: PDF Failed", e);
            }
        }
    }
};

// --- Event Listeners ---
document.addEventListener('GEMINI_ACTION_COPY', () => Bridge.actions.copy());
document.addEventListener('GEMINI_ACTION_DOWNLOAD', () => Bridge.actions.download());
document.addEventListener('GEMINI_ACTION_PDF', () => Bridge.actions.pdf());

console.log("Gemini Mod: Bridge events attached.");
