/**
 * SimpleSortable.js - MODIFIED FOR FERDIUM
 * A lightweight, zero-dependency drag-and-drop library created from scratch.
 * Inspired by Sortable.js but tailored for the specific Ferdium/Electron use case.
 * It avoids module detection and attaches directly to the window object.
 * Author: Adromir
 * @license MIT
 */

(function(window) {
    'use strict';

    if (window.SimpleSortable) {
        return;
    }

    let ghostEl;
    let dragEl;
    let activeGroup;

    function SimpleSortable(el, options) {
        if (!el || !el.nodeType || el.nodeType !== 1) {
            throw `SimpleSortable: \`el\` must be an HTMLElement, not ${{}.toString.call(el)}`;
        }

        this.el = el;
        this.options = { ...SimpleSortable.defaults, ...options };

        el._simpleSortable = this;

        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);

        el.addEventListener('pointerdown', this._onPointerDown, false);
    }
	
	SimpleSortable.defaults = {
		group: '',
		handle: null,
		ghostClass: 'sortable-ghost',
		chosenClass: 'sortable-chosen',
	};

    SimpleSortable.prototype = {
        constructor: SimpleSortable,

        _onPointerDown: function(evt) {
            if (dragEl || evt.button !== 0) return;

            const target = evt.target;
            const handle = this.options.handle ? target.closest(this.options.handle) : true;
            const item = target.closest('[data-ss-draggable]');

            if (item && handle) {
                evt.preventDefault();
                dragEl = item;
                activeGroup = this.options.group;

                dragEl.classList.add(this.options.chosenClass);

                document.addEventListener('pointermove', this._onPointerMove, false);
                document.addEventListener('pointerup', this._onPointerUp, false);
            }
        },

        _onPointerMove: function(evt) {
            if (!dragEl) return;
            evt.preventDefault();

            if (!ghostEl) {
                this._createGhost(evt);
            }

            // Move ghost
            ghostEl.style.transform = `translate3d(${evt.clientX}px, ${evt.clientY}px, 0)`;

			ghostEl.style.display = 'none';
            let target = document.elementFromPoint(evt.clientX, evt.clientY);
			ghostEl.style.display = '';
			
            if (!target) return;

            if (target === ghostEl) {
                return;
            }

            const dropZone = target.closest('[data-ss-zone]');
			
            if (dropZone && dropZone._simpleSortable && dropZone._simpleSortable.options.group === activeGroup) {
				const dropTarget = target.closest('[data-ss-draggable]');
                 if (dropTarget && dropTarget !== dragEl) {
                    const rect = dropTarget.getBoundingClientRect();
                    const next = (evt.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
					
                    if (next && dropTarget.nextSibling) {
                        dropZone.insertBefore(dragEl, dropTarget.nextSibling);
                    } else if (!next) {
                        dropZone.insertBefore(dragEl, dropTarget);
                    }
                 } else if (!dropTarget && dropZone.children.length === 0) { // Empty zone
                    dropZone.appendChild(dragEl);
                 }
            }
        },

        _onPointerUp: function(evt) {
            if (!dragEl) return;
            evt.preventDefault();

            document.removeEventListener('pointermove', this._onPointerMove, false);
            document.removeEventListener('pointerup', this._onPointerUp, false);

            if (ghostEl) {
                ghostEl.remove();
            }
            
            dragEl.classList.remove(this.options.chosenClass);
            
            if (this.options.onEnd) {
                this.options.onEnd();
            }
            
            ghostEl = null;
            dragEl = null;
            activeGroup = null;
        },
        
        _createGhost: function(evt) {
            ghostEl = dragEl.cloneNode(true);
            ghostEl.classList.remove(this.options.chosenClass);
            ghostEl.classList.add(this.options.ghostClass);
            ghostEl.style.position = 'fixed';
            ghostEl.style.top = '0px';
            ghostEl.style.left = '0px';
			ghostEl.style.zIndex = '1000001'; // Ensure it's on top of the settings overlay (z-index: 999999)
            ghostEl.style.pointerEvents = 'none';
            ghostEl.style.opacity = '0.8';
            const rect = dragEl.getBoundingClientRect();
            ghostEl.style.width = `${rect.width}px`;
            ghostEl.style.height = `${rect.height}px`;
            
            document.body.appendChild(ghostEl);
			
			ghostEl.style.transform = `translate3d(${evt.clientX}px, ${evt.clientY}px, 0)`;
        },
        
        destroy: function() {
            this.el.removeEventListener('pointerdown', this._onPointerDown, false);
            this.el._simpleSortable = null;
        }
    };

    window.SimpleSortable = SimpleSortable;

})(window);

