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
        this.hide.play()
        this.hide.onfinish = _ => this.removeAttribute('data-open')
      } else {
        this.setAttribute('data-open', true)
        this.show.play()
      }
    }
    connectedCallback() {
      this.overlay = this.shadowRoot.querySelector('div')
      const article = this.shadowRoot.querySelector('article')
      this.show = article.animate([{
        opacity: 0
      }, {
        opacity: 1
      }], {
        duration: 300,
        easing: 'ease-in-out'
      })
      this.hide = article.animate([{
        opacity: 1
      }, {
        opacity: 0
      }], {
        duration: 300,
        easing: 'ease-in-out'
      })
      // this.button = this.shadowRoot.querySelector('button')
      this.toggleOpen = this.toggleOpen.bind(this)

      this.overlay.addEventListener('click', this.toggleOpen)
      // this.button.addEventListener('click', this.toggleOpen)
    }
  }
)