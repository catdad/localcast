/*jslint browser: true, devel: true, expr: true */
/*globals request, hash, chromecast, toast */

function playVideo(resource){
    window.location.href = resource;
}

function toastControls(actions){
    var dismissFunc,
        dismiss = function(){
            dismissFunc && dismissFunc();
        },
        action = actions.map(function(el){
            return {
                name: el.name,
                onclick: function(){
                    dismiss();
                    el.onclick();
                }
            };
        });
    
    dismissFunc = toast.alert({    
        message: 'Controls: ',    
        dismissible: false,    
        action: action
    });
}

function serverPlay(url, name){
    console.log('play', url, name);
    var uri = '/session/play';
    
    if (url) {
        uri += '?value=' + encodeURIComponent(url);
    }
    
    request.json(uri, function(err, data){
        if (err) {
            toast.error('unexpected error: ' + err.message);
        } else if (data.success) {
            name && toast.success('playing ' + name);
            toastControls([
                {
                    name: 'pause',
                    onclick: serverPause
                },{
                    name: 'mute',
                    onclick: serverMute
                }
            ]);
        } else {
            toast.error(data.error);
        }
    });
}
function serverPause(){
    request.json('/session/pause', function(err, data){
        if (err) {
            toast.error('unexpected error: ' + err.message);
        } else if (data.success) {
            toast.alert({
                message: 'click to play',
                onclick: function(){
                    console.log(arguments);
                    serverPlay();
                },
                timeout: -1
            });
        } else {
            toast.error(data.error);
        }
    });
}
function serverMute(){
    request.json('/session/mute', function(err, data){
        if (err) {
            toast.error('unexpected error: ' + err.message);
        } else if (data.success) {
            toastControls([
                {
                    name: 'pause',
                    onclick: serverPause
                },{
                    name: 'unmute',
                    onclick: serverUnmute
                }
            ]);
        } else {
            toast.error(data.error);
        }
    });
}
function serverUnmute(){
    request.json('/session/unmute', function(err, data){
        if (err) {
            toast.error('unexpected error: ' + err.message);
        } else if (data.success) {
            toastControls([
                {
                    name: 'pause',
                    onclick: serverPause
                },{
                    name: 'mute',
                    onclick: serverMute
                }
            ]);
        } else {
            toast.error(data.error);
        }
    });
}

//file views
var views = {
    //icon router
    img: function(type){
        var temp = document.createElement('div');
        
        switch (type){
            case "folder":
//                return "/img/folder.png";
                temp.innerHTML = '<svg class="folder" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Your_Icon" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"><path d="M88.307,24.589H52.947c-2.713,0-6.66-1.789-8.445-3.825l-2.551-2.928c-2.475-2.822-7.352-5.032-11.104-5.032  H11.695c-4.225,0-7.66,3.435-7.66,7.657v58.931c0,3.346,2.158,6.189,5.152,7.23c0.764,0.363,1.609,0.572,2.508,0.572h76.611  c0.896,0,1.744-0.209,2.506-0.572c2.994-1.041,5.152-3.885,5.152-7.23V32.25C95.965,28.025,92.527,24.589,88.307,24.589z   M11.693,16.335h19.152c2.713,0,6.66,1.79,8.445,3.826l2.549,2.927c2.477,2.822,7.354,5.032,11.105,5.032h35.359  c2.275,0,4.127,1.853,4.127,4.129v28.424L7.564,60.625V20.46C7.566,18.186,9.418,16.335,11.693,16.335z"/></svg>';
                break;
            
            case "file":
                return "/img/file.png";
            
            case "video":
                temp.innerHTML = '<svg class="video" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Layer_1" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"><g><path d="M91.648,29.694c-1.056-4.57-4.81-7.938-9.327-8.441c-10.699-1.191-21.527-1.934-32.309-1.928   c-10.782-0.006-21.611,0.737-32.311,1.928c-4.517,0.503-8.269,3.871-9.324,8.441c-1.501,6.506-1.52,13.607-1.52,20.307   c0,6.699,0,13.8,1.502,20.307c1.056,4.566,4.808,7.938,9.325,8.438c10.699,1.191,21.527,1.934,32.31,1.929   c10.782,0.005,21.611-0.737,32.309-1.929c4.518-0.501,8.271-3.872,9.327-8.438c1.501-6.507,1.512-13.608,1.512-20.307   C93.142,43.302,93.15,36.2,91.648,29.694 M64.711,51.988l-20.34,10.997c-2.022,1.094-3.677,0.107-3.677-2.191V39.207   c0-2.299,1.654-3.286,3.677-2.192l20.34,10.998C66.734,49.105,66.734,50.895,64.711,51.988"/></g></svg>';
                break;
                
            default:
                return "/img/cupcake.png";
        }
        
        return temp.firstChild;
    },
    //string shortener
    shorten: function(str){
        return (str.length > 20) ? (str.substring(0,18) + "...") : str;
    },
    
    //constructors
    Modal: function(thumb, resource, name){
        var wrapper = document.createElement('div');
        var modal = document.createElement('div');
        wrapper.className = 'modal_wrapper';
        modal.className = 'modal';
        modal.setAttribute('data-name', name);
        wrapper.appendChild(modal);
        
        document.body.appendChild(wrapper);
        
        var image = document.createElement('img');
        image.src = thumb;
        image.className = 'thumb';
        
        image.onload = function(){
            modal.style.height = image.clientHeight + 'px';  
        };
        
        modal.appendChild(image);
        
        function close(){
            this.closeModal = undefined;
            document.body.removeChild(wrapper);   
        }
        
        wrapper.onclick = function(ev){
            console.log(ev);
            if (ev.target === wrapper) close();
        };
        
        var playLocalButton = document.createElement('button');
        playLocalButton.innerHTML = 'Play';
        var playCastButton = document.createElement('button');
        playCastButton.innerHTML = 'Cast';
        
        playLocalButton.onclick = function(){
            playVideo(resource);    
        };
        playCastButton.onclick = function(){
            function browserCast() {
                chromecast.startCast(resource, {
                    title: name,
                    images: [{ url: thumb }]
                });
            }
            
            function serverCast() {
                close();
                serverPlay(resource, name);
            }
            
            (chromecast.isAvailable()) ? browserCast() : serverCast();
        };
        
        modal.appendChild(playLocalButton);
        modal.appendChild(playCastButton);
    },
    
    nav: function(path, sep){
        sep = '/';
        path = (!path || path === '.') ? '' : path;
        
        var that = this;
        //generate links for nav
        var linker = function(href, display){
            var span = document.createElement("span");
            span.className = 'navPart';
            
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
            var s = document.createElement("span");
            s.innerHTML = "  &raquo;  ";
            return s;
        };

        var dom = document.createElement('div');
        
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
        
        return dom;
    },
    
    fileView: function(file){
        var div = document.createElement('div');
        div.className = 'file';
        div.setAttribute('data-path', file.path);
        div.title = file.name;
        
        //build click handler
        div.onclick = function(){
            var stateObj = {
                resource: file.path,
                title: file.name,
                url: file.path.replace(/\\/g, '/')
            };
            
            if (file.isDirectory){
                stateObj.resource = stateObj.resource;
                hash.push(stateObj, true);
            }
            else if (file.isFile){
                stateObj.resource = stateObj.resource;
//                hash.push(stateObj, true);
                
                views.Modal(file.thumb, file.resource, file.name);
            }
            else if (file.isVirtual){
                stateObj.resource = file.path;
                hash.push(stateObj, true);
            }
        };
        
        //build icon
        var icon = (file.isFile) ? this.img('video') : this.img('folder');
        
        if (file.isVirtual) icon.style.opacity = '.4';
        if (file.isFile && file.format !== 'mp4') icon.style.opacity = '.2';
        
        //build name field
        var name = document.createElement("div");
        name.innerHTML = this.shorten(file.name);
        
        //add elements to the DOM
        div.innerHTML = "";
        div.appendChild(icon);
        div.appendChild(name);
        
        //build episode field
        if (file.isFile){
            var episodeNumber = document.createElement('div');
            var episode = file.name.match(/(S|s)[0-9]{2}(E|e)[0-9]{2}|[0-9]{3}/);
            episodeNumber.innerHTML = (episode) ? episode[0] : '&nbsp;';
            episodeNumber.className = 'episode';
            div.appendChild(episodeNumber);
        }
        
        div.setAttribute('data-filter', this.splitString(file.name));
        
        return div;
    },
    filter: function(nodes, term){
        term = term.toLowerCase() || /./;
        [].forEach.call(nodes, function(el){
            el.style.display = (el.getAttribute('data-filter').match(term)) ? '' : 'none';
        });
    },
    splitString: function(str){
        return str.replace(/\.|\s|\/|\-/g, ' ').toLowerCase();   
    }
};

