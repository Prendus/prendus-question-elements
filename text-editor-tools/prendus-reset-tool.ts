class PrendusResetTool extends WysiwygTool {
    static get is() { return 'prendus-reset-tool'; }

    connectedCallback() {
        super.connectedCallback();
        this._setCommand('insertText'); //TODO for some reason I have to set this command or else the tool will be disabled
    }

    execCommand() {
        if (this.disabled || !this.range0) {
            return;
        }

        this.shadowRoot.querySelector('#sureDialog').open();
    }

    sureDialogClick(e: Event) {
        e.stopPropagation();
    }

    yesClick() {
        this.dispatchEvent(new CustomEvent('reset-text-and-code'));
        this.shadowRoot.querySelector('#sureDialog').close();
    }

    noClick() {
        this.shadowRoot.querySelector('#sureDialog').close();
    }
}

window.customElements.define(PrendusResetTool.is, PrendusResetTool);
