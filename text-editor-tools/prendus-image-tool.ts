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
                }
            }));
        });
        reader.readAsDataURL(file);

        //TODO this is a temporary fix for the erratic behavior caused by inserting an image
        //TODO the editor cursor jumps around after inserting an image unless we estroy the input and add it later
        const imageInputContainer = this.shadowRoot.querySelector('#imageInputContainer');
        const imageInput = this.shadowRoot.querySelector('#imageInput');
        imageInputContainer.removeChild(imageInput);

        setTimeout(() => {
            imageInputContainer.appendChild(imageInput);
        }, 1000);
    }
}

window.customElements.define(PrendusImageTool.is, PrendusImageTool);
