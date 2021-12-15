customElements.define('pop-up',
  class extends HTMLElement {
    constructor() {
      super();
      const template = document.getElementById('pop-up')
      const templateContent = template.content
      this.attachShadow({mode: 'open'}).appendChild(
        templateContent.cloneNode(true)
      )
    }
    toggleOpen() {
      if(this.hasAttribute('data-open')) {
        this.removeAttribute('data-open')
      } else {
        this.setAttribute('data-open', true)
      }
    }
    connectedCallback() {
      this.overlay = this.shadowRoot.querySelector('div')
      this.button = this.shadowRoot.querySelector('button')
      this.toggleOpen = this.toggleOpen.bind(this)

      this.overlay.addEventListener('click', this.toggleOpen)
      this.button.addEventListener('click', this.toggleOpen)
    }
  }
)