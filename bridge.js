// bridge.js
// This script runs in the MAIN WORLD (Same as Monaco, jsPDF, Sortable)

console.log("Gemini Mod: Bridge script loaded (v3 - Restored).");

const Bridge = {
    // --- Editor & Content Helpers ---
    getMonacoEditor: function () {
        if (typeof window.monaco === 'undefined') return null;
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
        // 1. Try Monaco
        const editor = this.getMonacoEditor();
        if (editor) {
            const model = editor.getModel();
            if (model) {
                // Try to find a title
                let title = "code_snippet";
                // Strategy 1: specific filename header
                const parentPanel = editor.getContainerDomNode().closest('code-immersive-panel');
                if (parentPanel) {
                    const header = parentPanel.querySelector('h2, [data-test-id="canvas-title"], .title, .filename');
                    if (header && header.textContent.trim()) {
                        title = header.textContent.trim();
                    }
                }
                // Strategy 2: Fallback title
                if (title === "code_snippet") {
                    const broadTitle = document.querySelector('code-immersive-panel h2');
                    if (broadTitle && broadTitle.textContent.trim()) {
                        title = broadTitle.textContent.trim();
                    }
                }
                return { type: 'code', content: model.getValue(), title };
            }
        }

        // 2. Try Standard Text Response (Fallback)
        const modelResponses = document.querySelectorAll('.model-response-text');
        if (modelResponses.length > 0) {
            const lastResponse = modelResponses[modelResponses.length - 1];
            return { type: 'text', content: lastResponse.innerText, title: 'gemini_response' };
        }
        return null;
    },

    // --- Actions ---
    actions: {
        copy: async function () {
            try {
                // Use getGeminiContent() instead of editor.trigger
                const data = Bridge.getGeminiContent();
                if (data && data.content) {
                    try { window.focus(); } catch (e) { }
                    await navigator.clipboard.writeText(data.content);
                    console.log("Gemini Mod Bridge: Copied via Clipboard API");
                } else {
                    console.warn("Gemini Mod Bridge: No content to copy");
                }
            } catch (e) {
                console.error("Gemini Mod Bridge: Copy Failed", e);
                // Fallback: execCommand
                try {
                    const data = Bridge.getGeminiContent();
                    if (data && data.content) {
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
                    }
                } catch (err) {
                    // Silent fail or alert
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
        },

        initSortable: function (detail) {
            const { selector, options } = detail;
            if (typeof window.Sortable === 'undefined') return;
            const el = document.querySelector(selector);
            if (!el) return;

            const defaultOptions = {
                animation: 150,
                delay: 100,
                delayOnTouchOnly: true,
                onEnd: function (evt) {
                    const newOrder = [];
                    for (let i = 0; i < el.children.length; i++) {
                        if (el.children[i].dataset.folderId) {
                            newOrder.push(el.children[i].dataset.folderId);
                        }
                    }
                    document.dispatchEvent(new CustomEvent('GEMINI_SORT_UPDATE', {
                        detail: { newOrder: newOrder, container: selector }
                    }));
                }
            };
            const finalOptions = { ...defaultOptions, ...options };
            finalOptions.onEnd = defaultOptions.onEnd;
            new window.Sortable(el, finalOptions);
        }
    }
};

// --- Event Listeners ---
document.addEventListener('GEMINI_ACTION_COPY', () => Bridge.actions.copy());
document.addEventListener('GEMINI_ACTION_DOWNLOAD', () => Bridge.actions.download());
document.addEventListener('GEMINI_ACTION_PDF', () => Bridge.actions.pdf());

document.addEventListener('GEMINI_INIT_SORTABLE', (e) => {
    if (e.detail) Bridge.actions.initSortable(e.detail);
});

console.log("Gemini Mod: Bridge events attached.");
