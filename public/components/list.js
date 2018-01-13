/* jslint browser: true, devel: true */
/* globals request, hash, chromecast, server, toast */

(function (window) {
    var STATE = window.STATE;
    var UTIL = window.UTIL;
    
    var fileDOM = document.getElementById('contentFiles');
    var dirDOM = document.getElementById('contentDirs');
    
    function img(type) {
        var temp = UTIL.elem('div');
        
        switch (type){
            case "folder":
                temp.innerHTML = '<svg class="folder" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M88.307,24.589H52.947c-2.713,0-6.66-1.789-8.445-3.825l-2.551-2.928c-2.475-2.822-7.352-5.032-11.104-5.032  H11.695c-4.225,0-7.66,3.435-7.66,7.657v58.931c0,3.346,2.158,6.189,5.152,7.23c0.764,0.363,1.609,0.572,2.508,0.572h76.611  c0.896,0,1.744-0.209,2.506-0.572c2.994-1.041,5.152-3.885,5.152-7.23V32.25C95.965,28.025,92.527,24.589,88.307,24.589z   M11.693,16.335h19.152c2.713,0,6.66,1.79,8.445,3.826l2.549,2.927c2.477,2.822,7.354,5.032,11.105,5.032h35.359  c2.275,0,4.127,1.853,4.127,4.129v28.424L7.564,60.625V20.46C7.566,18.186,9.418,16.335,11.693,16.335z"/></svg>';
                break;
            case "video":
                temp.innerHTML = '<svg class="video" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g><path d="M91.648,29.694c-1.056-4.57-4.81-7.938-9.327-8.441c-10.699-1.191-21.527-1.934-32.309-1.928   c-10.782-0.006-21.611,0.737-32.311,1.928c-4.517,0.503-8.269,3.871-9.324,8.441c-1.501,6.506-1.52,13.607-1.52,20.307   c0,6.699,0,13.8,1.502,20.307c1.056,4.566,4.808,7.938,9.325,8.438c10.699,1.191,21.527,1.934,32.31,1.929   c10.782,0.005,21.611-0.737,32.309-1.929c4.518-0.501,8.271-3.872,9.327-8.438c1.501-6.507,1.512-13.608,1.512-20.307   C93.142,43.302,93.15,36.2,91.648,29.694 M64.711,51.988l-20.34,10.997c-2.022,1.094-3.677,0.107-3.677-2.191V39.207   c0-2.299,1.654-3.286,3.677-2.192l20.34,10.998C66.734,49.105,66.734,50.895,64.711,51.988"/></g></svg>';
                break;
        }
        
        return temp.firstChild;
    }
    
    function navigateTo(dir) {
        var stateObj = {
            resource: dir.path,
            title: dir.name,
            url: dir.path.replace(/\\/g, '/')
        };

        hash.push(stateObj, true);
    }
    
    function getFileSubtitle(file) {
        //build episode/year field
        var text;

        // look for a year first
        var year = file.name.match(/(?!\()[0-9]{4}(?=\))/);
        if (year) { text = year[0]; }

        // look for an s00e00 episode
        var episode = file.name.match(/s[0-9]{2}e[0-9]{2}/i);
        if (!episode) {
            // look for a 3-digit episode
            episode = file.name.match(/[0-9]{3}/);
        }
        if (episode && !text) {
            text = episode[0];
        }
        
        return text || ' ';
    }
    
    function view(file) {
        var div = UTIL.elem('div', { className: 'file' });
        div.setAttribute('data-path', file.path);
        div.title = file.name;
        div.setAttribute('data-title', UTIL.clean(file.name));
        
        div.setAttribute('data-filter', UTIL.splitString(file.name));
        
        return div;
    }
    
    function dirView(file) {
        var div = view(file);
        
        var icon = img('folder');
        
        if (file.isVirtual) {
            icon.style.opacity = '.4';
        }
        
        div.appendChild(icon);
        
        div.onclick = function () {
            navigateTo(file);
        };
        
        return div;
    }
    
    function fileView(file) {
        var div = view(file);
        
        div.onclick = function() {
            window.STATE.emit('splash', file, div);
        };
        
        //build icon
        var icon = img('video');
        
        if (file.format !== 'mp4') {
            icon.style.opacity = '.2';
        }

        div.setAttribute('data-episode', getFileSubtitle(file));

        //add elements to the DOM
        div.appendChild(icon);
        
        return div;
    }
    
    STATE.on('list', function (data) {
        //reset DOM elements
        fileDOM.innerHTML = dirDOM.innerHTML = '';
        
        data.files.forEach(function(el) {
            if (el.isDirectory || el.isVirtual) {
                el.elem = dirView(el);
                dirDOM.appendChild(el.elem);
            } else {
                el.elem = fileView(el);
                fileDOM.appendChild(el.elem);
            }
        });
    });
    
    STATE.on('list:filter', function (term) {
        var nodes = fileDOM.children;
        
        term = term.toLowerCase() || /./;
        
        [].forEach.call(nodes, function(el) {
            el.style.display = (el.getAttribute('data-filter').match(term)) ? '' : 'none';
        });
    });
}(window));
