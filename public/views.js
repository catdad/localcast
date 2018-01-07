/*jshint browser: true, devel: true, expr: true */
/*globals request, hash, chromecast, server, toast */

function playVideo(resource) {
    window.location.href = resource;
}

//file views
var views = {
    //string shortener
    shorten: function(str){
        return (str.length > 20) ? (str.substring(0,18) + "...") : str;
    },
    elem: function(type, opts) {
        return window.UTIL.elem(type, opts);
    },
    
    //constructors
    Modal: function(contentDom, onOpen, origin) {
        window.STATE.emit('modal:open', contentDom, onOpen, origin);
    },
    videoModal: function(resource, name) {
        window.STATE.emit('video:play', resource, name);
    },
    controlsModal: function(ev, thumb, resource, name, domTrigger) {
        window.STATE.emit('splash', ev, thumb, resource, name, domTrigger);
    },
    deviceSelectModal: function(list, onSelect, onCancel) {
        var div = views.elem('div', { className: 'list'}),
            heading = views.elem('div', { className: 'heading', text: 'Select a device:' }),
            selected = false,
            height = 0;
        
        div.appendChild(heading);
        
        views.Modal(div, function(wrapper){
            wrapper.appendChild(div);
            
            [].forEach.call(div.childNodes, function(node){
                height += node.offsetHeight;
            });
            
            div.style.height = height + 'px';
        });
        
        window.STATE.once('modal:closed', function () {
            if (!selected) onCancel();
        });
                
        list.forEach(function(item){
            var b = views.elem('button', { text: item });
            
            b.onclick = function(){
                selected = true;
                onSelect(item);
                window.STATE.emit('modal:close');
            };
            
            div.appendChild(b);
        });
    },
    deviceDeselectModal: function(device, onDismiss){
        var dismiss = toast.warning({
            message: 'Disconnect from ' + device + '?',
            dismissible: false,
            action: [{
                name: 'yes',
                onclick: function(){
                    dismiss();
                    onDismiss(true);
                }
            },{
                name: 'no',
                onclick: function(){
                    dismiss();
                    onDismiss(false);
                }
            }]
        });
    },
    
    splitString: function(str) {
        return window.UTIL.splitString(str);   
    }
};
