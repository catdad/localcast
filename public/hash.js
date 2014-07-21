/*jslint browser: true, devel: true, expr: true */
/*globals views, request */

!function(){
    //these don't belong here
    var fileDOM = document.getElementById('contentFiles');
    var dirDOM = document.getElementById('contentDirs');
    var navDOM = document.getElementById('contentNav');
    
    var searchDOM = document.querySelector('#contentSearch input');
    searchDOM && (searchDOM.oninput = function(ev){
        views.filter(fileDOM.children, this.value);
        //views.filter(dirDOM.children, this.value);
    });
    
    var Hash = function(){
        var that = this;
        
        this.validateState = function(state){
            //make sure the object exists
            state = state || {};
            state.resource = state.resource || window.location.hash.replace('#', '');
            state.title = state.title || '';
            state.url = state.url || '/' + window.location.hash.replace(/#\/?/, '');
            
            if (state.url === '/') state.url = 'dir';
            if (!state.resource) state.resource = 'dir';
            
            state.url = '#' + state.url;
            
            return state;
        };
        
        this.replace = function(state, navigate){
            state = this.validateState(state);
            window.history.replaceState(state.resource, state.title, state.url);
            navigate && this.navigate(state.resource);
            
            return this;
        };
        
        this.push = function(state, navigate){
            state = this.validateState(state);
            window.history.pushState(state.resource, state.title, state.url);
            navigate && this.navigate(state.resource);
            return this;
        };
        
        this.navigate = function(url){
            request.json({
                url: url.replace(/\\/g,'/')
            }, function(err, data){
                if (err) return;
            
                //reset DOM elements
                fileDOM.innerHTML = dirDOM.innerHTML = navDOM.innerHTML = '';
            
                //populate files
                data.files.forEach(function(el){
                    if (el.isDirectory || el.isVirtual) dirDOM.appendChild( views.fileView(el) );
                    else fileDOM.appendChild( views.fileView(el) );
                });
            
                //populate nav
                navDOM.appendChild( views.nav(data.path) );
                
                console.log('navigating');
                
                window.scrollTo(0,0);
            });
        };
        
        window.onpopstate = function(ev){
            that.navigate(ev.state);
        };
    };
    
    var hashManager = new Hash();
    window.hash = hashManager;
    
    //init -- replace current state with valid state object
    hashManager.replace(null, true);
}();