var nconf = require('nconf').file({file: getUserHome() + '/config.json'});

function saveSetting(key, value) {
	nconf.set(key, value);
	nconf.save();
}

function readSetting(key) {
	nconf.load();
	return nconf.get(key);
}

function getUserHome() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}


module.exports = {
	set: saveSetting,
	get: readSetting
}