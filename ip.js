var os = require('os');
var config = require('./config.json');

var ip = undefined;

module.exports = function(){
    //check if one was already found
    if (ip) return ip;
    
    //check if one is already specified
    if (config.ip) {
        ip = config.ip;
        return ip;
    }
    
    //get network interfaces
    var ifaces = os.networkInterfaces();
    
    //preference Ethernet
    if (ifaces.Ethernet){
        var options = ifaces.Ethernet.filter(function(el){
            return (el.family === 'IPv4');
        });
        
        if (options.length) {
            ip = options[0].address;
            return ip;
        }
    }
    
    //loop through everything
    for (var dev in ifaces) {
        
        ifaces[dev].forEach(function(details){
            if (!details.internal && details.family === 'IPv4' && details.address !== '127.0.0.1') {
                ip = details.address;
            }
        });
    }
    
    return ip;
};