var nodechat = ($.cookie("nodechat")) ? $.cookie("nodechat").split("_") : "1_450_275_55_5_1_2".split("_");
/*
nodechat[0] - ������(0), ������(1)
nodechat[1] - ������
nodechat[2] - ������
nodechat[3] - ������
nodechat[4] - �����
nodechat[5] - �� ����������(0), ����������(1)
nodechat[6] - � ��������(0), ���������(1), ����������������(2)
*/
$(function(){
	// *** ����������� � ������� ���� *** //
	socket = io.connect('http://SITE.COM:9090');

	// *** �������������� ������������ �� �������� ��� ������ ������� *** //
	if(nodechat[6]==2) {
		nodechat[6] = ($(window).width() >= 1550) ? 1 : 0;
	}

	// *** ������ ���� *** //
	$('#nodechat_btn').click(function() {
		// *** ���� ��� �������, �� ��������� *** //
		if(nodechat[0]==1) {
			nodechat_close();
			nodechat[0]=0;
		// *** ���� ��� ��������, �� �������� *** //
		} else {
			nodechat_open();
			nodechat[0]=1;
		}
		// *** ��������� ��������� *** //
		nodechat_setings_save();
		return false;
	});

	// *** ����������� � ���� *** //
	socket.on('chat_join', function () {
		if(nodechat[0]=="1") {
			nodechat_open();
			$('#nodechat_btn').addClass("onChat");
		}
	});

	// *** ������������� ���� *** //
	socket.on('chat_init', function (data) {
		if(nodechat[6]==1) {
			$('body').prepend(data);
		} else {
			$('#mainContent').prepend(data);
		}
		nodechat_init();
	});

	// *** ��������� ��������� *** //
	socket.on('chat_msg2client', function (data) {
		if(data.info) {
			$('#nodechat_msg_list').prepend(data.info);
			setTimeout(function() {
				$('.nodechat_info').fadeTo(750, 0, function() {
					$('div').remove('.nodechat_info');
				});
			}, 5000);
		} else {
			if(data.del) $('#nodechat_mess_'+data.del).remove();
			if(data.message) {
				$('#nodechat_msg_list').prepend(data.message);
				if(dle_group==5) $('a').remove('.nodechat_pm');
				if(dle_group>2) $('a').remove('.nodechat_mess_del');
			}
		}
	});
});

// *** �������� ���� *** //
function nodechat_open() {
	// *** ����������� � ������� ���� *** //
	socket.emit('join2chat');
	$('#nodechat_btn').addClass("onChat");
}

// *** �������� ���� *** //
function nodechat_close() {
	// *** ���������� �� ������� ���� *** //
	socket.emit('leave_chat');
	$('#nodechat_btn').removeClass("onChat");
	$('#nodechat').hide("slide", 100, function(){ $(this).remove(); });
}

// *** �������������� ���� ���� *** //
function nodechat_location() {

}

// *** ���������� �������� � cookie *** //
function nodechat_setings_save() {
	$.cookie("nodechat", nodechat.join("_"), { expires:365, path:'/' });
}

// *** ������������� ���� ���� *** //
function nodechat_init() {
	nodechat_input();
	if(dle_group==5) $('a').remove('.nodechat_pm');
	if(dle_group>2) $('a').remove('.nodechat_mess_del');
	if(nodechat[6]==1) {
		// *** ������ � ������ *** //
		$('#nodechat').css({height:nodechat[1]}).css({width:nodechat[2]});
		nodechat_messheight();
		// *** ������������� *** //
		if(nodechat[5]==1) {
			$('#nodechat').css({position:"fixed"});
			$('#nodechat_icons_unlocked').hide();
		// *** ��������� *** //
		} else {
			$('#nodechat').css({position:"absolute"});
			$('#nodechat_icons_locked').hide();
		}
		// *** �������� ������ *** //
		$('#nodechat').resizable({
			minHeight: 200,
			minWidth: 237,
			helper: 'ui-resizable-helper',
			stop: function(event, ui) {
				nodechat[1] = ui.size.height-2;
				nodechat[2] = ui.size.width-2;
				if(nodechat[5]==1) $('#nodechat').css({position:"fixed"});
				nodechat_messheight();
				nodechat_setings_save();
			}
		})
		// *** ���������� *** //
		.draggable({
			handle: '#nodechat_head',
			containment: 'document',
			scroll: false,
			stop: function(event, ui){
				nodechat[3]=ui.offset.top;
				nodechat[4]=ui.offset.left;
				nodechat_setings_save();
			}
		})
		// *** ������� ������ ����� *** //
		.offset({top:nodechat[3], left:nodechat[4]})
		.show("slide", 100);
	} else {
		$('#nodechat').css({height:'300px'});
		$('#nodechat_msg_list').css({height:'200px'});
		$('#nodechat_icons_unlocked').hide();
		$('#nodechat_icons_locked').hide();
		$('#nodechat').show("slide", 100);
	}

	// ****** ������ ****** //
	// *** ��������� ������ *** //
	$('#nodechat_icons li').hover(
		function() { $(this).addClass("ui-state-hover"); },
		function() { $(this).removeClass("ui-state-hover"); }
	);
	// *** ������: �������������� *** //
	$('#nodechat_icons_locked').click(function(){
		nodechat[5] = 0;
		$('#nodechat').css({position:"absolute"});
		$('#nodechat_icons_locked').hide();
		$('#nodechat_icons_unlocked').show();
		nodechat_setings_save();
		return false;
	});
	// *** ������: ������������� *** //
	$('#nodechat_icons_unlocked').click(function(){
		$('#nodechat').css({position:"fixed"});
		$('#nodechat_icons_unlocked').hide();
		$('#nodechat_icons_locked').show();
		nodechat[5] = 1;
		nodechat_setings_save();
		return false;
	});
	// *** ������: ������� *** //
	$('#nodechat_icons_close').click(function(){
		nodechat_close();
		nodechat[0]= 0;
		nodechat_setings_save();
		return false;
	});
	// *** ������: ����� ������������ *** //
	$('#nodechat_icons_newwin').click(function() {
		if(nodechat[6]=="1") {
			nodechat[6] = 0;
		} else {
			nodechat[6] = 1;
		}
		nodechat_setings_save();
		$('#nodechat').remove();
		nodechat_open();
		nodechat_init();
		return false;
	});
}

// *** ������ ����� ��������� *** //
function nodechat_messheight() {
	$('#nodechat_msg_list').css({height:nodechat[1]-106+'px'});
}

// *** ������������� ��-����� *** //
function nodechat_input() {
	$('#nodechat_input').markItUp({
		resizeHandle: false,
		markupSet: [
			{name:'B', key:'B', openWith:'[b]', closeWith:'[/b]'},
			{name:'I', key:'I', openWith:'[i]', closeWith:'[/i]'},
			{name:'U', key:'U', openWith:'[u]', closeWith:'[/u]'},
			{separator:'-' },
			{name:'Link', key:'L', openWith:'[url=[![Url]!]]', closeWith:'[/url]', placeHolder:'Text'},
			{name:':)', dropMenu: [
				{className:'smile01', openWith:':) '},
				{className:'smile02', openWith:':D '},
				{className:'smile03', openWith:'LOL '},
				{className:'smile04', openWith:':P '},
				{className:'smile05', openWith:':yes: '},
				{className:'smile06', openWith:':( '},
				{className:'smile07', openWith:';) '},
				{className:'smile08', openWith:":'( "},
				{className:'smile09', openWith:':! '},
				{className:'smile10', openWith:':no: '}
			]},
			{separator:'-' },
			{name:'Convert', beforeInsert:function() { memchat_text_convert(); } },
			{name:'Send [Enter]', beforeInsert:function() { nodechat_mess_send(); } }
		]
	});
	ctrl = false; // ������� ������� ������� "Ctrl"
	$('#nodechat_input').keydown(function(event) {
		switch(event.which) {
			case 13: return false; // ��������� ����������� ���������
			case 17: ctrl = true; // ������� Ctrl ������ � ������������
		}
	});
	$('#nodechat_input').keyup(function(event) {
		switch (event.which) {
			case 13:
				if (!ctrl) { // ���� ctrl �� �����
					nodechat_mess_send(); // ����������
					return false;
				}
				$('#nodechat_input').focus().val($('#nodechat_input').val()+'\r\n');
			break;
			case 17: ctrl = false; // Ctrl ���������
		}
	});
}

function memchat_text_convert() {
	var arr_en = new Array("A","a","B","b","C","c","D","d","E","e","F","f","G","g","H","h","I","i","J","j","K","k","L","l","M","m","N","n","O","o","P","p","Q","q","R","r","S","s","T","t","U","u","V","v","W","w","X","x","Y","y","Z","z","<",",",">",":",";","\"","\'","\{","\}");
	var arr_ru = new Array("�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�","�");

	var textout = $('#nodechat_input').val();
	textout = textout.replace(/\./g, "�");
	textout = textout.replace(/\[/g, "�");
	textout = textout.replace(/\]/g, "�");

	for(var i=0; i<arr_en.length; i++){
		var litnow = new RegExp(arr_en[i], "g");
		textout = textout.replace(litnow, arr_ru[i]);
	}
	$('#nodechat_input').val(textout);
}

function nodechat_mess_send() {
	var txt = $('#nodechat_input').val();
	$('#nodechat_input').val('');
	socket.emit('chat_msg2server', txt);
}

function nodechat_mess_del(id) {
	socket.emit('del_msg', id);
	return false;
}

function nodechat_reply(user) {
	$('#nodechat_input').focus().val($('#nodechat_input').val()+'[to]'+user+'[/to], ');
	return false;
}

function nodechat_PM(user) {
	$('#nodechat_input').focus().val('[PM]'+user+'[/PM]: ');
	return false;
}

var timer_of_nodechat = [];
function nodechat_action(id) {
	$('#nodechat_date_'+id).hide();
	$('#nodechat_edit_'+id).show();
	timer_of_nodechat[id] = setTimeout(function() {
		$('#nodechat_edit_'+id).hide();
		$('#nodechat_date_'+id).show();
	}, 8000);
	return false;
}
