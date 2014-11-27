/*jslint browser: true, devel: true, expr: true */
/*globals request, hash, chromecast, server, toast */

function playVideo(resource) {
    window.location.href = resource;
}

// event name enum (includes browser-specific events)
var fake = document.createElement('div'),
    getName = function(prop){
        return fake.style[prop.toLowerCase()] !== undefined ? prop.toLowerCase() + 'end' :
               fake.style['Webkit' + prop] !== undefined ? 'webkit' + prop + 'End' :
               fake.style['O' + prop] !== undefined ? 'o' + prop + 'End' :
               fake.style['Moz' + prop] !== undefined ? 'moz' + prop + 'End' : prop.toLowerCase() + 'end';
    };
var eventName = {
    animationEnd: getName('Animation'),
    transitionEnd: getName('Transition')
};

var raf = window.requestAnimationFrame || function(cb){ setTimeout(cb, 16); };
var defer = function(cb){ setTimeout(cb, 0); };

function once(dom, event, cb) {
    var listener = function(){
        dom.removeEventListener(event, listener);
        cb.apply(undefined, arguments);
    };
    
    dom.addEventListener(event, listener);
}

//file views
var views = {
    //icon router
    img: function(type){
        var temp = views.elem('div');
        
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
    //episode name cleaner
    clean: function(str){
        var idx = str.search(/s[0-9]{2}e[0-9]{2}/i);
        var sub = (idx > 0) ? str.substr(0, idx) : str;
        return sub.replace(/\./g, ' ').trim();
    },
    elem: function(type, opts) {
        opts = opts || {};
        var el = document.createElement(type);
        opts.className && (el.className = opts.className);
        opts.text && (el.appendChild( document.createTextNode(opts.text) ));
        return el;
    },
    
    //constructors
    Modal: function(contentDom, onOpen, origin) {
        var wrapper = views.elem('div', { className: 'modal_wrapper' }),
            onClose;
            
        contentDom.classList.add('modal');
        
        
        if (origin && origin.x !== undefined && origin.y !== undefined) {
            wrapper.style.transformOrigin = origin.x + 'px ' + origin.y + 'px';
        } else {
            wrapper.style.transformOrigin = '50% 50%';
        }
        
        // wrapper transition callback
        var wrapperTransitionEnded = function() {
            onOpen && onOpen(wrapper);
        };
        
        document.body.appendChild(wrapper);
        
        // execute the transition on the next animation frame
        raf(function() {
            // add callback for when the animation ends
            once(wrapper, eventName.transitionEnd, wrapperTransitionEnded);
            
            // Chrome on Android won't trigger a transition if this is executed without a timeout,
            // don't know why...
            defer(function() {
                wrapper.classList.add('open');
            });
        });
        
        function removeModalContent(done) {
            // when the modal is done closing, hide it
            once(contentDom, eventName.transitionEnd, function(ev){
                // stop this event from triggering the wrapper transition end as well
                ev.preventDefault();
                ev.stopPropagation();
                
                // hide the content for now -- it can be removed later
                contentDom.style.visibility = 'hidden';
                
                // trigger the done callback
                done && done();
            });
        }
        
        function closeModal(done) {
            // when the wrapper is done animating, remove it
            once(wrapper, eventName.transitionEnd, function(){
                document.body.removeChild(wrapper);
                
                // trigger done callback if it exists
                done && done();
                
                // trigger onClose, if one was provided
                onClose && onClose();
            });
            
            // remove the open class to animate
            wrapper.classList.remove('open');
        }
        
        // close Modal if clicking on the black space
        wrapper.onclick = function(ev) {
            if (ev.target === wrapper) closeModal();
        };
        
        return {
            close: closeModal,
            replace: function(){},
            onClose: function(cb){
                onClose = typeof cb === 'function' ? cb : undefined;
            }
        };
    },
    videoModal: function(ev, thumb, resource, name, domTrigger){
        var modal = views.elem('div'),
            container = views.elem('div'),
            image = views.elem('img', { className: 'thumb' }),
            title = views.elem('div', { className: 'title', text: name });
        
        container.appendChild(title);
        
        // get the origin to use for animation
        var triggerBB = domTrigger.getBoundingClientRect(),
            origin = {
                x: (triggerBB.left + triggerBB.right) / 2,
                y: (triggerBB.top + triggerBB.bottom) / 2
            };
        
        var playLocalButton = document.createElement('button');
        var playCastButton = document.createElement('button');
      
        // first, queue the image to load, and keep track here
        var modalIsOpen = false,
            imageIsLoaded = false;
        
        // this function should be executed after image has loaded and tranition has ended
        var imageOnLoad = function(wrapper) {
            // make sure the modal is empty
            while(wrapper.firstChild) { 
                wrapper.removeChild(wrapper.firstChild);
            }
            
            wrapper.appendChild(modal);
            
            // get necessary dimensions
            var cWidth = modal.clientWidth,
                width = image.width,
                height = image.height;
            
            // insert the image first
            modal.appendChild(image);
            
            // insert the two buttons created earlier
            container.appendChild(playLocalButton);
            container.appendChild(playCastButton);
            
            modal.appendChild(container);
            
            var containerHeight = container.offsetHeight;
            
            // let's animate the height transition as well
            raf(function() {
                modal.style.height = ( cWidth * height / width ) + containerHeight + 'px';
            });
        };
        
        // add an onload callback and a source to the image
        image.onload = function() {
            if (modalIsOpen) imageOnLoad();
            else imageIsLoaded = true;
        };
        image.src = thumb;
        
        // Build the play and cast buttons while we wait for the image
        playLocalButton.className = 'play';
        playCastButton.className = 'cast';
        
        var playIcon = views.elem('span', { className: 'icon icon-play' }),
            playText = document.createTextNode('Play');
        var castIcon = views.elem('span', { className: 'icon icon-cast' }),
            castText = document.createTextNode('Cast');
        
        playLocalButton.appendChild(playIcon);
        playLocalButton.appendChild(playText);
        playCastButton.appendChild(castIcon);
        playCastButton.appendChild(castText);
        
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
                server.playNew(resource, name);
            }
            
            (chromecast.isAvailable() && false) ? browserCast() : serverCast();
        };
        
        var thisModal = views.Modal(modal, function onOpen(wrapper){
            
            if (imageIsLoaded) imageOnLoad(wrapper);
            else {
                modalIsOpen = true;
                // add spinner while the image loads
                wrapper.appendChild(views.elem('div', { className: 'loading' }));
            }
            
        }, origin);
    },
    
    nav: function(path, sep){
        sep = '/';
        path = (!path || path === '.') ? '' : path;
        
        var that = this;
        //generate links for nav
        var linker = function(href, display){
            var span = views.elem("span", { className: 'navPart' });
            
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
            var s = views.elem("span");
            s.innerHTML = "  &raquo;  ";
            return s;
        };

        var dom = views.elem('div');
        
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
        var div = views.elem('div', { className: 'file' });
        div.setAttribute('data-path', file.path);
        div.title = file.name;
        div.setAttribute('data-title', this.clean(file.name));
        
        //build click handler
        div.onclick = function(ev){
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
                
                views.videoModal(ev, file.thumb, file.resource, file.name, div);
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
        
        //add elements to the DOM
        div.innerHTML = "";
        div.appendChild(icon);
        
        //build episode field
        if (file.isFile){
            var episode = file.name.match(/s[0-9]{2}e[0-9]{2}/i);
            if (!episode) {
                episode = file.name.match(/[0-9]{3}/);
            }
            div.setAttribute('data-episode', (episode) ? episode[0] : ' ');
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

