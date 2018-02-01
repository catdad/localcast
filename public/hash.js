/*jslint browser: true, devel: true, expr: true */
/*globals views, request, server */

!function(){
    var Hash = function(){
        var that = this,
            nextPop = [];
        
        this.validateState = function(state){
            console.log(state);
            
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
                            
                //populate files
                window.STATE.emit('list', data);
                
                //navigate
                window.STATE.emit('navigate', data.path);
                
//                if (data.nowPlaying !== undefined) {
//                    server.nowPlaying(data.nowPlaying);
//                }
                
                window.scrollTo(0,0);
            });
        };
        
        this.state = function(){
            return history.state;
        };
        
        this.onNextPop = function(fn){
            if (fn && typeof fn === 'function') {
                nextPop.push(fn);
            }
        };
        
        this.back = function(){
            history.back();
        };
        
        window.onpopstate = function(ev){
            var defaultPrevented = false,
                prevent = function(){
                    defaultPrevented = true;
                };
            
            while(nextPop.length) {
                var fn = nextPop.shift();
                if (fn && typeof fn === 'function') {
                    fn({ preventDefault: prevent });
                }
            }
            
            if (!defaultPrevented) {
                that.navigate(ev.state);
            } else {
                ev.preventDefault();
            }
        };
    };
    
    var hashManager = new Hash();
    window.hash = hashManager;
    
    //init -- replace current state with valid state object
    hashManager.replace(null, true);
}();
