window.$ = window.jQuery = require('../../node_modules/jquery/dist/jquery.min.js');
var TimeUtil = require('./util/TimeUtil.js');
var electron = require('electron');
var ipcRenderer = electron.ipcRenderer,
	BrowserWindow = electron.remote.BrowserWindow;
var util = require('util');
var url = require('url');
var path = require('path');

$(function() {
	var TABS = {TIMING: 'timing', DELAY: 'delay'};
	var STATUS = {PLAY: 1, PAUSE: 2, EDIT: 3, DELETE: 4};// 计时器状态（分别为播放，暂停，编辑，删除）
	var currentTab = TABS.TIMING;
	var delayIndex = 0,          // 当前计时器index
	    timingIndex = 0,
		playTimer = null;

	var $delayHourNumber = $('#delay-hour-number'),      // 时 数字面板
		$delayMinuteNumber = $('#delay-minute-number'),  // 分 数字面板
		$delaySecondNumber = $('#delay-second-number'),  // 秒 数字面板
		$delayStackItem = $('#delay .stack-item'),        
		$delayPlay = $('#delayPlay'),
		$delayMenuPause = $('li[data-type="delay_pause"]'), // 菜单 播放/暂停
		$delayMenuEdit = $('li[data-type="delay_edit"]'),   // 菜单 编辑
		$delayMenuDelete = $('li[data-type="delay_delete"]'); // 菜单删除

	var audio = new Audio('./wav/crowd-laughing.wav');    // 音频
	var abledInput = true;					// 是否允许输入
	var secondArr = new Array(5);           // 秒数
	var delayTimerArr = new Array(5);  // 计时器
	var delayStatusArr = [STATUS.DELETE, STATUS.DELETE, STATUS.DELETE, STATUS.DELETE, STATUS.DELETE]; // 计时器状态

	init();

	$('.stack-item').hover(function() {
		var $this = $(this);
		if($this.find('p').css('display') == 'none') {
			$this.find('ul').hide();		
		}
	})

	$('.tab').on('click', function() {
		var $this = $(this);
		var type = $this.attr('data-type');
		$('.tab').each(function(index, ele) {
			$(ele).removeClass('active');
		});	
		$this.addClass('active');	
		
		if(type == TABS.TIMING) {
			changeToTiming();
		} else {
			changeToDelay();
		}
		
	});

	$('#delay .stack-item img').on('click', function(event) {
		var $this = $(this);
		var id = $(this).attr('name');
		var index = id.substring(id.length - 1, id.length);		
		delayIndex = parseInt(index);
		$('#delayPlay').attr('src', './img/play.png');	
		
		resetDelayNumberToZero();
		$delayHourNumber.focus();
		event.stopPropagation();
		
	});

	
	// 计时器组
	$('#delay .stack-item').on('click', function() {	
		var nowIndex = parseInt($(this).attr('name').split('_')[1]);	
		if (delayStatusArr[nowIndex] == STATUS.DELETE) {
			return;
		}
		
		delayIndex = nowIndex;
		var status = delayStatusArr[delayIndex];
		console.log(delayIndex);	
		switch(status) {
			case STATUS.PLAY:
				$delayPlay.attr('src', './img/pause_black.png');
				break;
			case STATUS.PAUSE:
				$delayPlay.attr('src', './img/play.png');
				updateDelayNumber();
				break;		
			case STATUS.EDIT:
				$delayPlay.attr('src', './img/play.png');
				break;
			
		}
	});


	// 主时间面板的播放
	$('#delayPlay').on('click', function() {
		var $this = $(this);
		var hour = parseInt($delayHourNumber.val());
		var minute = parseInt($delayMinuteNumber.val());
		var second = parseInt($delaySecondNumber.val());
		
		var timeText = hour * 3600 + minute * 60 + second;
		
		var status = delayStatusArr[delayIndex];
		
		if (status == STATUS.DELETE) {	
			secondArr[delayIndex] = timeText;
			delayPlay(delayIndex);
		} else if(status == STATUS.PAUSE) {
			secondArr[delayIndex] = timeText;
			delayPlay(delayIndex);
		} else if (status == STATUS.PLAY) {
			delayPause(delayIndex);
		} else if (status == STATUS.EDIT) {
			secondArr[delayIndex] = timeText;
			delayPlay(delayIndex);
		}	
		
		switchMenuStatus(delayIndex);
	});

	// 主时间面板的删除按钮事件
	$('#delayDelete').on('click', function() {
		deleteMainDelay(delayIndex);
		
		resetDelayNumberToZero();
		$delayPlay.attr('src', './img/play.png');
	});

	

	// 菜单上的播放暂停
	$delayMenuPause.on('click', function() {
		$(this).parent().parent().click();
		
		var index = $delayMenuPause.index(this);
		var $this = $(this);
		switch (delayStatusArr[index]) {
			case STATUS.PLAY:
				$this.find('a').text('播放');
				delayPause(index);
				break;
			case STATUS.PAUSE:
				$this.find('a').text('暂停');
				delayPlay(index);
				break;
			case STATUS.EDIT:
				$this.find('a').text('暂停');
				delayPlay(index);
				break;				
		}
	})

	// 菜单上的编辑
	$delayMenuEdit.on('click', function() {
		$(this).parent().parent().click();
		var index = $delayMenuEdit.index(this);
		delayStatusArr[index] = STATUS.EDIT;
		$delayPlay.attr('src', './img/play.png');
		clearTimeout(delayTimerArr[index]);		
		$delayHourNumber.focus();	
		switchMenuStatus(index);
	})

	// 菜单上的删除
	$delayMenuDelete.on('click', function() {
		$(this).parent().parent().click();
		var index = $delayMenuDelete.index(this);
		deleteMainDelay(index);
		resetDelayNumberToZero();
		$delayPlay.attr('src', './img/play.png');
	})


	// 时间过滤和自动跳转到下一个输入
	$delayHourNumber.bind('input propertychange', function(event) {
		var value = $delayHourNumber.val();
		if(value.length >=2) {
			$delayHourNumber.val(value.substring(0, 2));
			$delayMinuteNumber.focus();
		}	
	});

	$delayMinuteNumber.bind('input propertychange', function(event) {
		var value = $delayMinuteNumber.val();
		if(value.length >=2) {
			$delayMinuteNumber.val(value.substring(0, 2));
			$delaySecondNumber.focus();
		}	
	});

	// 时间过滤
	$delayHourNumber.on('keyup', function() {
		var $this = $(this);
		$this.val($this.val().replace(/[^\d]/g,''));
	});

	$delayMinuteNumber.on('keyup', function() {
		var $this = $(this);
		$this.val($this.val().replace(/[^\d]/g,''));
	});

	$delaySecondNumber.on('keyup', function() {
		var $this = $(this);
		$this.val($this.val().replace(/[^\d]/g,''));
	});
	
	$('#settingBtn').on('click', function() {
		openSetting();
	});
	
	$('#closeBtn').on('click', function() {
		ipcRenderer.send('quit');
	});

	/* 修改菜单上的播放暂停 */
	function switchMenuStatus(index) {
		var $this = $delayStackItem.eq(index);		
		switch (delayStatusArr[index]) {
			case STATUS.PLAY:
				$this.find('a').eq(0).text('暂停');			
				break;
			case STATUS.PAUSE:
				$this.find('a').eq(0).text('播放');			
				break;
			case STATUS.EDIT:
				$this.find('a').eq(0).text('播放');			
				break;
				
		}
	}
	
	function delayPlay(currentIndex) {	
		$delayPlay.attr('src', './img/pause_black.png');
		var $currentStatckItem = $($delayStackItem.get(currentIndex));
		$currentStatckItem.find('ul').show();
		$currentStatckItem.find('img').hide();
		$currentStatckItem.find('p').show();
		
		setTimeout(function(){		
			var second = secondArr[currentIndex];
			var displayObj = TimeUtil.convertSecondToTime(second);
			$currentStatckItem.find('p').text(util.format('%s:%s:%s', displayObj.hour, displayObj.minute, displayObj.second));
			secondArr[currentIndex] = secondArr[currentIndex] - 1;
			if(second == 0) {
				delayTimeUp(currentIndex);
			} else {
				delayTimerArr[currentIndex] = setTimeout(arguments.callee, 1000);
			}
			
		}, 1);	
		delayStatusArr[currentIndex] = STATUS.PLAY;	
	}	

	function delayTimeUp(index) {
		// 播放声音
		
		// 发送时间到消息到主线程
		ipcRenderer.send('delayTimeUp', index);
		// 重置
		reset(index);
	}
	

	function reset(index) {
		
		var $currentStatckItem = $($delayStackItem.get(index));
		$delayPlay.attr('src', './img/play.png');
		secondArr[index] = null;
		clearTimeout(delayTimerArr[index]);
		delayTimerArr[index] = null;
		delayStatusArr[index] = STATUS.DELETE;
		
		
		$currentStatckItem.find('ul').hide();
		$currentStatckItem.find('img').show();
		$currentStatckItem.find('p').hide();
	}

	function deleteMainDelay(currentIndex) {
		clearTimeout(delayTimerArr[currentIndex]);		
		reset(currentIndex);
	}

	function delayPause(currentIndex) {	
		$delayPlay.attr('src', './img/play.png');
		clearTimeout(delayTimerArr[currentIndex]);	
		delayStatusArr[currentIndex] = STATUS.PAUSE;
	}

	function changeToTiming() {
		currentTab = TABS.TIMING;
		$('#timing').show();
		$('#delay').hide();
	}

	function changeToDelay() {
		currentTab = TABS.DELAY;
		$('#timing').hide();
		$('#delay').show();
	}

	function init() {
		changeToDelay();	
		buildMainDelayPanelTimer();
		
		ipcRenderer.on('stop', function(event, args) {			
			if(playTimer)
				clearInterval(playTimer);			
		});
		
		ipcRenderer.on('playVoice', function() {
			playTimer = setInterval(function(){
				audio.play();
			}, 1);
		});		
	}

	function buildMainDelayPanelTimer() {
		setTimeout(function(){
			var lastAbleInput = abledInput;
			if(delayStatusArr[delayIndex] == STATUS.PLAY ) {
				updateDelayNumber();
				abledInput = false;
			} else if(delayStatusArr[delayIndex] == STATUS.DELETE) {
				abledInput = true;
			} else if(delayStatusArr[delayIndex] == STATUS.PAUSE) {
			//	updateDelayNumber();
				abledInput = true;
			} else if(delayStatusArr[delayIndex] == STATUS.EDIT) {		
				abledInput = true;
			}

			if(lastAbleInput != abledInput) {
				if(abledInput) {
					abledDelayNumber();
				} else {
					disabledDelayNumber();
				}
			}
			
			setTimeout(arguments.callee, 10);
		}, 10);
	}

	function updateDelayNumber() {
		var timeText = $delayStackItem.eq(delayIndex).find('p').text();
		var timeStringArr = timeText.split(':');
		$delayHourNumber.val(timeStringArr[0]);
		$delayMinuteNumber.val(timeStringArr[1]);
		$delaySecondNumber.val(timeStringArr[2]);
	}

	function resetDelayNumberToZero() {
		$delayHourNumber.val('00');
		$delayMinuteNumber.val('00');
		$delaySecondNumber.val('00');
	}

	// 时间框禁止输入
	function disabledDelayNumber() {
		$delayHourNumber.attr('disabled', 'disabled');
		$delaySecondNumber.attr('disabled', 'disabled');
		$delayMinuteNumber.attr('disabled', 'disabled');
	}


	// 允许时间框输入
	function abledDelayNumber() {
		$delayHourNumber.attr('disabled', false);
		$delaySecondNumber.attr('disabled', false);
		$delayMinuteNumber.attr('disabled', false);
	}	
	
	// 读取配置文件
	var win = null;
	function openSetting() {
		ipcRenderer.send('openSettingWin');	
	}

});

