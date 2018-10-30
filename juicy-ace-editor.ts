//TODO The only reason this is called juicy-ace-editor is so that I don't have to update the code tag in assessml
//TODO Change the name of this element eventually and then update assessml

import 'ace-builds/src-min-noconflict/ace.js';
import 'ace-builds/src-min-noconflict/mode-javascript.js';

class JuicyAceEditor extends HTMLElement {
    editor: any;

    get value() {
        return this.editor.getValue();
    }

    set value(val) {
        this.editor.setValue(val, 1);
    }

    connectedCallback() {
        this.innerHTML = `
            <style>
                #${this.id}-container {
                    display: flex;
                    flex-direction: column;
                    height: 50vh;
                }

                #${this.id}-editor {
                    flex: 1;
                    font-size: 1.5em;
                }
            </style>

            <div id="${this.id}-container">
                <div id="${this.id}-editor"></div>
            </div>
        `;

        this.editor = ace.edit(`${this.id}-editor`);
        this.editor.session.setUseWorker(false);
        this.editor.session.setMode('ace/mode/javascript');
    }
}

window.customElements.define('juicy-ace-editor', JuicyAceEditor);
