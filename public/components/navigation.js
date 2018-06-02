/* jshint browser: true, devel: true */
/* globals request, hash, chromecast, server, toast */

(function (window) {
    var STATE = window.STATE;
    var UTIL = window.UTIL;

    var navDOM = document.getElementById('contentNav');

    STATE.on('navigate', function (path) {
        var sep = '/';
        path = (!path || path === '.') ? '' : path;

        var that = this;
        //generate links for nav
        var linker = function(href, display){
            var span = UTIL.elem('span', { className: 'navPart' });

            span.onclick = function(){
                hash.push({
                    resource: href,
                    title: 'root',
                    url: href || '/'
                }, true);
            };
            span.innerHTML = display;
            return span;
        };

        //generate nav separators
        var separator = function(){
            var s = UTIL.elem("span");
            s.innerHTML = "  &raquo;  ";
            return s;
        };

        var dom = UTIL.elem('div');

        if (path) {
            path.split(sep).forEach(function(el, i, arr){
                //ugh, special case
                if (i === 0){
                    //create root
                    dom.appendChild(linker('dir', "root"));
                }
                else{
                    //add separator
                    dom.appendChild(separator());
                    //add link
                    dom.appendChild(linker(arr.slice(0,i+1).join(sep),el));
                }
            });
        }

        navDOM.innerHTML = '';
        navDOM.appendChild(dom);
    });
}(window));
