/* jshint browser: true, devel: true */

(function (window) {
    var raf = window.requestAnimationFrame.bind(window) || function(cb){ setTimeout(cb, 16); };
    var defer = function(cb){ setTimeout(cb, 0); };

    function once(dom, event, cb) {
        var listener = function(){
            dom.removeEventListener(event, listener);
            cb.apply(undefined, arguments);
        };

        dom.addEventListener(event, listener);
    }

    var views = {
        elem: function(type, opts) {
            opts = opts || {};
            var el = document.createElement(type);

            if (opts.className) {
                el.className = opts.className;
            }

            if (opts.text) {
                el.appendChild( views.text(opts.text) );
            }

            return el;
        },
        text: function(str) {
            return document.createTextNode(str || '');
        }
    };

    function clean(str) {
        var idx = str.search(/s[0-9]{2}e[0-9]{2}/i);
        var sub = (idx > 0) ? str.substr(0, idx) : str;
        return sub.replace(/\./g, ' ').trim();
    }

    function splitString(str) {
        return str.replace(/\.|\s|\/|\-/g, ' ').toLowerCase();
    }

    function empty(elem) {
        if (!elem) {
            return;
        }

        while (elem.firstChild) {
            elem.removeChild(elem.firstChild);
        }

        return elem;
    }

    // helper -- throttle function
    function throttle(func, time) {
        var t = Number(time);

        if (time < 1) {
            time = 64;
        }

        return setTimeout(func, time);
    }

    // helper -- pad numbers
    var padNumber = function(n, len){
        var s = n.toString();
        while(s.length < (len || 2)) { s = '0' + s; }
        return s;
    };

    window.UTIL = {
        raf: raf,
        defer: defer,
        once: once,
        elem: views.elem,
        text: views.text,
        clean: clean,
        splitString: splitString,
        empty: empty,
        throttle: throttle,
        padNumber: padNumber
    };
}(window));
