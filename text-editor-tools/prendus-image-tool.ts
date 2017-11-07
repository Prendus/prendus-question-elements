class PrendusImageTool extends WysiwygTool {
    static get is() { return 'prendus-image-tool'; }

    connectedCallback() {
        super.connectedCallback();

        this._setCommand('insertImage');
    }

    execCommand() {
        if (this.disabled || !this.range0) {
            return;
        }

        this.shadowRoot.querySelector('#imageInput').click();
    }

    imageInputChange(e: Event) {
        //TODO validate the file
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            this.dispatchEvent(new CustomEvent('insert-image', {
                detail: {
                    dataUrl: reader.result
                },
                bubbles: false
            }));
        });
        reader.readAsDataURL(file);
    }
}

window.customElements.define(PrendusImageTool.is, PrendusImageTool);
