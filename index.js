const fs = require('fs');
const consoleService = require('./lib/consoleService');

module.exports.createMasterConsole = consoleService.createMasterConsole;
module.exports.createMonitorConsole = consoleService.createMonitorConsole;
module.exports.adminClient = require('./lib/client/client');

let mods = {}; 

fs.readdirSync(__dirname + '/lib/modules').forEach(function(filename) {
	if (/\.js$/.test(filename)) {
		let name = filename.slice(0, filename.lastIndexOf('.'));
		let _module = require('./lib/modules/' + name);
		if (!_module.moduleError) {
			Object.defineProperty( mods, name, { 
				numerable: true,
				get:function(){ return _module; }
			});
		}
	}
});

exports.modules = mods;