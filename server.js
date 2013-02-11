/*
=====================================================
 Модуль: NodeChat for DLE
 Версия: 1.2
-----------------------------------------------------
 Автор: MSW
 Сайт:  http://0-web.ru/
-----------------------------------------------------
 Copyright (c) 2012-2013 MSW
=====================================================
 Данный код защищен авторскими правами
=====================================================
 Файл: server.js
=====================================================
*/

var crypto = require('crypto'),	// подключаем модуль для шифрования
    fs = require('fs');			// подключаем модуль для работы с файловой системой

var redis = require("redis").createClient();

var func = require('./functions'),	// подключаем файл с функциями
    lang = require('./language'),	// подключаем файл с языковыми переменными
    config = require('./config');	// подключаем файл с настройками

var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

server.listen(config.port);

io.enable('browser client minification');	// сжатие *.js файлов
io.enable('browser client etag');			// apply etag caching logic based on version number
io.enable('browser client gzip');			// gzip the file
io.set('log level', 0);						// логировать только ошибки
io.set('heartbeat interval', 45);
io.set('heartbeat timeout', 120);
io.set('polling duration', 20);
io.set('close timeout',120);

var mysql = require('mysql');			// подключаем модуль для работы с MySQL
var db = mysql.createConnection({		//параметры подключения к базе
	host     : config.mysql_host,		// хост MySQL
	database : config.mysql_database,	// имя базы
	user     : config.mysql_user,		// имя пользователя
	password : config.mysql_password,	// пароль базы
});
db.query("SET SESSION wait_timeout = 604800;"); // 7 суток таймаут

var html_chat = fs.readFileSync( __dirname + '/html/chat.html', 'utf-8');

io.sockets.on('connection', function (socket) {
	// ****** Идентификация пользователя ****** //
	var cookies = func.parse_cookies(socket.handshake.headers.cookie);
	var dle_user_id, dle_password, sessions;
	if(parseInt(cookies.dle_user_id)>0 && cookies.dle_password!=0 ) {
		db.query('SELECT name, password, user_id, user_group, restricted FROM '+config.mysql_prefix+'_users WHERE user_id='+db.escape(cookies.dle_user_id), function(err, rows) {
			if( rows[0].user_id && rows[0].password && rows[0].password == crypto.createHash('md5').update(cookies.dle_password).digest("hex") ) {
				redis.hmset(socket.id, {"name":""+rows[0].name+"", "user_id":""+rows[0].user_id+"", "user_group":""+rows[0].user_group+"", "restricted":""+rows[0].restricted+""}, function(){ socket.emit('chat_join', "true"); });
			} else {
				redis.hmset(socket.id, {"name":"guest", "user_id":"0", "user_group":"5", "restricted":"1"}, function(){ socket.emit('chat_join', "true"); });
			}
		});
	} else {
		fs.readFile( config.dir_phpsess+cookies.PHPSESSID, 'utf-8', function (err, data) {
			// *** Идентификация по данным куков *** //
			if(err) {
				redis.hmset(socket.id, {"name":"guest", "user_id":"0", "user_group":"5", "restricted":"1"}, function(){ socket.emit('chat_join', "true"); });
			// *** Идентификация по данным сессии *** //
			} else {
				sessions = func.parse_session( data );
				dle_user_id = sessions.dle_user_id;
				dle_password = sessions.dle_password;
			}

			if( parseInt(dle_user_id)>0 && dle_password!=0 ) {
				db.query('SELECT name, password, user_id, user_group, restricted FROM '+config.mysql_prefix+'_users WHERE user_id='+db.escape(dle_user_id), function(err, rows) {
					if( rows[0].user_id && rows[0].password && rows[0].password == crypto.createHash('md5').update(dle_password).digest("hex") ) {
						redis.hmset(socket.id, {"name":""+rows[0].name+"", "user_id":""+rows[0].user_id+"", "user_group":""+rows[0].user_group+"", "restricted":""+rows[0].restricted+""}, function(){ socket.emit('chat_join', "true"); redis.expire(socket.id, 300); });
					} else {
						redis.hmset(socket.id, {"name":"guest", "user_id":"0", "user_group":"5", "restricted":"1"}, function(){ socket.emit('chat_join', "true"); redis.expire(socket.id, 300); });
					}
				});
			} else {
				redis.hmset(socket.id, {"name":"guest", "user_id":"0", "user_group":"5", "restricted":"1"}, function(){ socket.emit('chat_join', "true"); redis.expire(socket.id, 300); });
			}
		});
	}
	// *** Подкючение к комнате чата *** //
	socket.on('join2chat', function() {
		socket.join('chat');
		redis.get("mess_line",
			function(err, mess){
				if(mess==null) mess="";
				var data = html_chat.replace('!MESSAGES!', mess);
				redis.hget(socket.id, "restricted", function(err, row) {
					if(err) {
						console.log("err");
					} else {
						if( +row>0 ) data = data.replace('!TEXTAREA!', lang.restricted);
						else if( +row==0 ) data = data.replace('!TEXTAREA!', '<textarea id="nodechat_input"></textarea>');
						else data = data.replace('!TEXTAREA!', lang.guest);
						socket.emit('chat_init', data);
					}
				});
			}
		);
	});

	// *** Получение сообщение *** //
	socket.on('chat_msg2server', function (msg) {
		redis.hgetall(socket.id, function (err, row) {
			if(err) {
				console.log("err");
			} else {
				if( +row.restricted==0) {
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
										var message = func.msg_pm_format(parts[1]);
										db.query('INSERT INTO '+config.mysql_prefix+'_pm (subj, text, user, user_from, date, pm_read, folder) VALUES ("'+lang.ls_subj+'", '+db.escape(message)+', "'+rows[0].user_id+'", "'+row.name+'", "'+parseInt( time.getTime()/1000 )+'", "no", "inbox");');
										db.query('UPDATE '+config.mysql_prefix+'_users SET pm_all=pm_all+1, pm_unread=pm_unread+1 WHERE user_id='+rows[0].user_id);
										socket.emit( 'chat_msg2client', {info:'<div class="nodechat_info notis">'+lang.ls_send+'</div>'} );
									} else socket.emit( 'chat_msg2client', {info:'<div class="nodechat_info error">'+lang.user_not_found+'</div>'} );
								});
							}
						} else {
							redis.get("mess_id",
								function(err, mid){
									if(mid==null) mid=1;
									var message = func.msg_format(msg, mid, row.name, row.user_group, config.timeShift);
									redis.hset("message", mid, message,
										function() {
											redis.hlen("message",
												function(err, num) {
													if(num>config.mess_limit) {
														redis.hkeys("message",
															function(err, ids) {
																ids.sort( function(a,b){return a - b} );
																ids.splice(-config.mess_limit);
																for(var id in ids) {
																	io.sockets.in('chat').emit( 'chat_msg2client', {del:id} );
																}
																redis.hdel(["message", ids.join(', ')],
																	function() {
																		func.mess_line(redis);
																	}
																);
															}
														);
													}
												}
											);
										}
									);

									io.sockets.in('chat').emit( 'chat_msg2client', {message:message} );
									redis.get("mess_line",
										function(err, row) {
											if(row==null) row="";
											redis.set("mess_line", message+row);
										}
									);
									mid++;
									redis.set("mess_id", mid);
								}
							);
						}
					}
				}
			}
		});
	});

	// *** Удаление сообщения *** //
	socket.on('del_msg', function(id) {
		redis.hget(socket.id, "user_group", function (err, row) {
			if(err) {
				console.log("err");
			} else {
				if( +row==1 || +row==2 ) {
					redis.hdel("message", id,
						function() {
							io.sockets.in('chat').emit( 'chat_msg2client', {del:id} );
							func.mess_line(redis);
						}
					);
				} else socket.emit( 'chat_msg2client', {info:'<div class="nodechat_info error">'+lang.access_denid+'</div>'} );
			}
		});
	});

	// *** Отключение пользователя *** //
	socket.on('disconnect', function() {
		redis.del(socket.id);
	});

	// *** Отключение чата *** //
	socket.on('leave_chat', function() {
		socket.leave('chat');
	});

});