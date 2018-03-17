var util = require('util');
var TimeUtil = {
	/*
	传入秒数，转换成带时分秒的对象{hour: hour, minute: minute, second: second}
	*/
	convertSecondToTime : function(second) {
		var hour = parseInt(second / 3600);
		var minute = parseInt(second % 3600 / 60);
		var seconds = second % 3600 % 60;
		
		hour = hour + '';
		hour = hour.length <= 1 ? '0' + hour : hour;
		minute = minute + '';
		minute = minute.length <= 1 ? '0' + minute : minute;
		seconds = seconds + '';
		seconds = seconds.length <= 1 ? '0' + seconds : seconds;
		
		return {
			hour: hour,
			minute: minute,
			second: seconds
		}
	},
	
	convertTimeToSecond : function(hour, minute, second) {
		return hour * 3600 + minute * 60 + second;
	}
}

module.exports = TimeUtil;