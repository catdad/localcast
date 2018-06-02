/* jslint browser: true, devel: true */

(function (window) {
    var STATE = window.STATE;

    var searchDOM = document.querySelector('#contentSearch input');

    searchDOM.addEventListener('input', function (ev) {
        STATE.emit('list:filter', this.value);
    });
}(window));
