/*
=====================================================
 Модуль: NodeChat for DLE
 Версия: 1.4
-----------------------------------------------------
 Автор: MSW
 Сайт:  http://0-web.ru/
-----------------------------------------------------
 Copyright (c) 2012-2014 MSW
=====================================================
 Данный код защищен авторскими правами
=====================================================
 Файл: config.js
=====================================================
*/
module.exports = {
    port: '9090', // порт приложения
    mess_limit: '75', // кол-во хранимых сообщений
    mess_length_min: '7', // минимальная длина сообщения
    mess_length_max: '1500', // максимальная длина сообщения
    timeShift: 0, // сдвиг времени в часах, например +2 или -2
    // *** MySQL *** //
    mysql_host:       'localhost', // хост MySQL
    mysql_database:   'db_name', // имя базы
    mysql_user:       'db_user', // имя пользователя
    mysql_password:   'db_pass', // пароль базы
    mysql_prefix:     'dle', // префикс таблиц в базе

    dir_phpsess : '/var/lib/php5/sess_' // полный путь к папке с пхп сессиями и префикс файлов сессий
};