/** O <dialog> nativo não existe no jsdom: o mínimo para as folhas (Sheet) funcionarem nos testes. */
export function installDialogPolyfill() {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}
