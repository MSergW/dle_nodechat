/*
=====================================================
 Модуль: NodeChat for DLE
 Версия: 1.2
-----------------------------------------------------
 Автор: MSW
 Сайт:  http://0-web.ru/
-----------------------------------------------------
 Copyright (c) 2012 MSW
=====================================================
 Данный код защищен авторскими правами
=====================================================
 Файл: functions.js
=====================================================
*/
// *** Парсинг куков *** //
exports.parse_cookies = function( _cookies ) {
	var cookies = {};
	_cookies && _cookies.split('; ').forEach( function( cookie ) {
		var parts = cookie.split('=');
		cookies[ parts[0] ] = parts[1] || '';
	});
	return cookies;
}

// *** Парсинг PHP сессий *** //
exports.parse_session = function( _sessions ) {
	var sessions = {};
	_sessions && _sessions.split(';').forEach( function( session ) {
		var parts = session.split('|');
		if( parts[0] == "dle_user_id" ) sessions["dle_user_id"] = parse_session_val( parts[1] );
		else if( parts[0] == "dle_password" ) sessions["dle_password"] = parse_session_val( parts[1] );
	});
	return sessions;
}
function parse_session_val( val ) {
	var partz = val.split(':');
	if(partz[2]) return partz[2].replace(/"/g, "");
	else return 0;
}

// *** Добавление нуля в дату и время *** //
function addZero(i) {
	return (i < 10) ? "0"+i : i;
}

// *** Парсинг ББ-кодов *** //
function parseBBCode( text ) {
	text = text.replace(/\n/g, "<br>"); // переход на новую строку
	text = text.replace(/\[b\](.*?)\[\/b\]/ig, "<b>$1</b>"); // жирный текст
	text = text.replace(/\[i\](.*?)\[\/i\]/ig, "<i>$1</i>"); // наклонный текст
	text = text.replace(/\[u\](.*?)\[\/u\]/ig, "<u>$1</u>"); // подчёркнутый текст
	text = text.replace(/\[to\](.*?)\[\/to\]/ig, "<b>$1</b>"); // обращение
	text = text.replace(/\[url\](.*?)\[\/url\]/ig, "<a href=\"$1\" target=\"_blank\">$1</a>"); // ссылка
	text = text.replace(/\[url=(.*?)\](.*?)\[\/url\]/ig, "<a href=\"$1\" target=\"_blank\">$2</a>"); // ссылка
	return text;
}

// *** Парсинг смайлов *** //
function parseSmile( text ) {
	text = text.replace(/:\)/g, '<img src="/uploads/smiles/01.gif" class="nodechat_slile">');
	text = text.replace(/:D/g, '<img src="/uploads/smiles/02.gif" class="nodechat_slile">');
	text = text.replace(/LOL/g, '<img src="/uploads/smiles/03.gif" class="nodechat_slile">');
	text = text.replace(/:P/g, '<img src="/uploads/smiles/04.gif" class="nodechat_slile">');
	text = text.replace(/:yes:/g, '<img src="/uploads/smiles/05.gif" class="nodechat_slile">');
	text = text.replace(/:\(/g, '<img src="/uploads/smiles/06.gif" class="nodechat_slile">');
	text = text.replace(/;\)/g, '<img src="/uploads/smiles/07.gif" class="nodechat_slile">');
	text = text.replace(/:\'\(/g, '<img src="/uploads/smiles/08.gif" class="nodechat_slile">');
	text = text.replace(/:!/g, '<img src="/uploads/smiles/09.gif" class="nodechat_slile">');
	text = text.replace(/:no:/g, '<img src="/uploads/smiles/10.gif" class="nodechat_slile">');
	return text;
}

// *** Формирование личного сообщения *** //
exports.msg_pm_format = function(msg) {
	// *** Парсим ББ-коды *** //
	msg = parseBBCode(msg);
	// *** Смайлы *** //
	msg = parseSmile(msg);
	return msg;
}

// *** Формирование сообщения *** //
exports.msg_format = function(msg, mess_id, name, user_group, timeShift) {
	// *** Парсим ББ-коды *** //
	msg = parseBBCode(msg);

	// *** Смайлы *** //
	msg = parseSmile(msg);

	// формирование строки времени
	time = new Date(); // текущее время
	time.setHours(time.getHours()+timeShift);
	time_line = addZero(time.getDate())+'.'+addZero(time.getMonth()+1)+' '+addZero(time.getHours())+':'+addZero(time.getMinutes())+':'+addZero(time.getSeconds());
	// формирование строки сообщения
	message = '<div id="nodechat_mess_'+mess_id+'" class="nodechat_mess">';
	message += '<div class="nodechat_head">';
	message += '<span id="nodechat_date_'+mess_id+'" class="nodechat_date" onclick="nodechat_action('+mess_id+')">[ '+time_line+' ]</span>';
	message += '<span id="nodechat_edit_'+mess_id+'" style="display:none">';
	message += '<a class="nodechat_pm" href="#" onclick="nodechat_PM(&quot;'+name+'&quot;); return !1;">[ ЛС ]</a>';
	message += ' <a href="/user/'+encodeURI(name)+'">[ Профиль ]</a> ';
	message += '<a class="nodechat_mess_del" href="#" onclick="nodechat_mess_del(&quot;'+mess_id+'&quot;); return !1;">[ Удалить ]</a>';
	message += '</span>';
	message += ' <b onclick="nodechat_reply(&quot;'+name+'&quot;); return !1;" class="nodechat_user fc_ugrp_'+user_group+'">'+name+'</b>';
	message += '</div>';
	message += '<div class="nodechat_text">'+msg+'</div>';
	message += '</div>';
	return message;
}

// *** Формирование строки всех сообщений *** //
exports.mess_line = function(redis) {
	redis.hgetall("message",
		function(err, row) {
			var mess_line="";
			for(var m in row) {
				mess_line = row[m]+mess_line;
			}
			redis.set("mess_line", mess_line);
		}
	);
}

