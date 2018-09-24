import {html, render} from 'lit-html';
import {unsafeHTML} from 'lit-html/directives/unsafe-html.js';

class OtherTest extends HTMLElement {
    connectedCallback() {
        render(html`${unsafeHTML('<p>Test</p>')}`, this);
    }
}

window.customElements.define('other-test', OtherTest);