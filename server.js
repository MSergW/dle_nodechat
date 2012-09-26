/*
=====================================================
 Модуль: NodeChat for DLE
 Версия: 1.0.3
-----------------------------------------------------
 Автор: MSW
 Сайт:  http://0-web.ru/
-----------------------------------------------------
 Copyright (c) 2012 MSW
=====================================================
 Данный код защищен авторскими правами
=====================================================
 Файл: server.js
=====================================================
*/
var express = require('express'), // подключаем модуль express
    crypto = require('crypto'), // подключаем модуль для шифрования
    fs = require('fs'); // подключаем модуль для работы с файловой системой

var func = require('./functions'), // подключаем файл с функциями
    lang = require('./language'), // подключаем файл с языковыми переменными
    config = require('./config'); // подключаем файл с настройками

var app = express(),
    http = require('http'),
    server = http.createServer(app),
    io = require('socket.io').listen(server);

server.listen(config.port);

io.enable('browser client minification'); // сжатие *.js файлов
io.enable('browser client etag');         // apply etag caching logic based on version number
io.enable('browser client gzip');         // gzip the file
io.set('log level', 0); // логировать только ошибки
//io.set('transports', ['websocket', 'xhr-polling', 'jsonp-polling', 'htmlfile', 'flashsocket' ]); // enable all transports

var mysql = require('mysql'); // подключаем модуль для работы с MySQL
var db = mysql.createConnection({ //параметры подключения к базе
	host     : config.mysql_host,		// хост MySQL
	database : config.mysql_database,	// имя базы
	user     : config.mysql_user,		// имя пользователя
	password : config.mysql_password,	// пароль базы
});

var messages = [], // массив сообщений
    member_id = {}, // объект пользователей
    mess_line = "", // строка со всеми сообщениями
    mess_id = 0; // айди сообщения

var html_chat = fs.readFileSync( __dirname + '/html/chat.html', 'utf-8');

io.sockets.on('connection', function (socket) {
	// ****** Идентификация пользователя ****** //
	var cookies = func.parse_cookies(socket.handshake.headers.cookie);
	fs.readFile( config.dir_phpsess+cookies.PHPSESSID, 'utf-8', function (err, data) {
		var dle_user_id, dle_password, sessions;
		// *** Идентификация по данным куков *** //
		if(err) {
			dle_user_id = cookies.dle_user_id;
			dle_password = cookies.dle_password;
		// *** Идентификация по данным сессии *** //
		} else {
			sessions = func.parse_session( data );
			dle_user_id = sessions.dle_user_id;
			dle_password = sessions.dle_password;
		}
		if( parseInt(dle_user_id)>0 && dle_password!=0 ) {
			db.query('SELECT name, password, user_id, user_group, restricted FROM '+config.mysql_prefix+'_users WHERE user_id='+db.escape(dle_user_id), function(err, rows) {
				if( rows[0].user_id && rows[0].password && rows[0].password == crypto.createHash('md5').update(dle_password).digest("hex") ) {
					member_id[socket.id] = {name:rows[0].name, user_id:rows[0].user_id, user_group:rows[0].user_group, restricted:rows[0].restricted};
				}
				socket.emit('chat_join', "true");
			});
		} else {
			member_id[socket.id] = {name:'guest', user_id:'0', user_group:'5', restricted:'1'};
			socket.emit('chat_join', "true");
		}
	});

	// *** Подкючение к комнате чата *** //
	socket.on('join2chat', function() {
		socket.join('chat');
		var data = html_chat.replace('!MESSAGES!', mess_line);
		if(member_id[socket.id]) {
			if(member_id[socket.id].restricted>0) data = data.replace('!TEXTAREA!', lang.restricted);
			else if(member_id[socket.id].restricted==0) data = data.replace('!TEXTAREA!', '<textarea id="nodechat_input"></textarea>');
			else data = data.replace('!TEXTAREA!', lang.guest);
		} else data = data.replace('!TEXTAREA!', lang.guest);
		socket.emit('chat_init', data);
	});

	// *** Получение сообщение *** //
	socket.on('chat_msg2server', function (msg) {
		if(member_id[socket.id].restricted==0) {
			msg = msg.trim(); // удаляем проблемы в начале и конце текста
			// минимальная длина сообщения
			if(msg.length < config.mess_length_min) {
				socket.emit( 'chat_msg2client', {info:'<div class="nodechat_info error">'+lang.msg_min+'</div>'} );
			// максимальная длина сообщения
			} else if(msg.length > config.mess_length_max) {
				socket.emit( 'chat_msg2client', {info:'<div class="nodechat_info error">'+lang.msg_max+'</div>'} );
			} else {
				msg = msg.replace(/</g, "&lt;"); // фильтруем html
				msg = msg.replace(/>/g, "&gt;"); // фильтруем html

				// *** Отправка ЛС *** //
				if(msg.indexOf('[PM]')+1 && msg.indexOf('[/PM]')+1) {
					msg = msg.replace("[PM]", ""); //
					var parts = msg.split('[/PM]:');
					if(parts[0] && parts[1]) {
						db.query('SELECT name, user_id FROM '+config.mysql_prefix+'_users WHERE name='+db.escape(parts[0]), function(err, rows) {
							if( rows[0] ) {
								var time = new Date(); // текущее время
								db.query('INSERT INTO '+config.mysql_prefix+'_pm (subj, text, user, user_from, date, pm_read, folder) VALUES ("'+lang.ls_subj+'", '+db.escape(parts[1])+', "'+rows[0].user_id+'", "'+member_id[socket.id].name+'", "'+parseInt( time.getTime()/1000 )+'", "no", "inbox");');
								db.query('UPDATE '+config.mysql_prefix+'_users SET pm_all=pm_all+1, pm_unread=pm_unread+1 WHERE user_id='+rows[0].user_id);
								socket.emit( 'chat_msg2client', {info:'<div class="nodechat_info notis">'+lang.ls_send+'</div>'} );
							} else socket.emit( 'chat_msg2client', {info:'<div class="nodechat_info error">'+lang.user_not_found+'</div>'} );
						});
					}
				} else {
					mess_id++; // айди сообщения
					// *** формирование сообщения *** //
					var message = func.msg_format(msg, mess_id, member_id[socket.id].name, member_id[socket.id].user_group);

					if(mess_id>config.mess_limit) {
						var mess_id_del = mess_id - config.mess_limit;
						delete messages[mess_id_del];
						io.sockets.in('chat').emit( 'chat_msg2client', {message:message, del:mess_id_del} );
					} else {
						io.sockets.in('chat').emit( 'chat_msg2client', {message:message} );
					}
					// дописываем сообщение в массив
					messages[mess_id] = message;
					// формируем строку всех сообщений
					mess_line = func.mess_line(messages);
				}
			}
		}
	});

	// *** Удаление сообщения *** //
	socket.on('del_msg', function(id) {
		if(member_id[socket.id]) {
			if( member_id[socket.id].user_group==1 || member_id[socket.id].user_group==2 ) {
				// удаляем сообщение
				delete messages[id];
				// отправляем всем команду на удаление сообщения
				io.sockets.in('chat').emit( 'chat_msg2client', {del:id} );
				// формируем строку всех сообщений
				mess_line = func.mess_line(messages);
			} else socket.emit( 'chat_msg2client', {info:'<div class="nodechat_info error">'+lang.access_denid+'</div>'} );
		}
	});

	// *** Отключение пользователя *** //
	socket.on('disconnect', function() {
		delete member_id[socket.id];
	});

	// *** Отключение чата *** //
	socket.on('leave_chat', function() {
		socket.leave('chat');
	});

});
