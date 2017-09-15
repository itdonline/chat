var express = require('express');
var app = express();
var fs = require('fs');
var http = require('http').Server(app);
//var options = { 
//    key: fs.readFileSync('ssl/privkey.pem'),
//    cert: fs.readFileSync('ssl/fullchain.pem')
//}
//var https = require('https').createServer(options, app);
//var io = require('socket.io')(https);
var io = require('socket.io')(http);
var port = 45512;




var mysql = require('mysql');
var connmysql = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'nodejs',
    port: 3306
});
connmysql.connect((err) => {
    if (err) {
        console.log('Loi ket noi den database');
        return;
    }
    console.log('Ket noi den database thanh cong');
});

/*connmysql.query("select iduser from user", function(err, result, fields) {
    if (err) throw err;
    if (typeof result !== 'undefined' && result.length > 0) {
        console.log(result[0].iduser);
    } else {
        console.log('ko co kq');
    }
});*/
function checkdangnhap(username, password, callback) {
    connmysql.query("select * from user where username = '" + username + "' and password ='" + password + "'", function(err, result, fields) {
        if (err) callback(err, null);
        else callback(null, result);
    });
}

function checkuserdb(username, callback) {
    connmysql.query("select iduser from user where username = '" + username + "'", function(err, result, fields) {
        if (err) {
            console.log('this.sql', this.sql); //command/query
            callback(err, null);
        } else callback(null, result);
    });
}

function insertdb(username, password, tenuser, callback) {
    connmysql.query("INSERT INTO user (username,password,tenuser) VALUES ('" + username + "','" + password + "','" + tenuser + "' ) ", function(err, result, fields) {
        if (err) {
            console.log('this.sql', this.sql); //command/query
            callback(err, null);
        } else callback(null, result);
    });
}
function updatedb(iduser, password, tenuser, callback) {
    connmysql.query("UPDATE user SET password='" + password + "', tenuser='" + tenuser + "' where iduser='" + iduser + "'  ", function(err, result, fields) {
        if (err) {
            console.log('this.sql', this.sql); //command/query
            callback(err, null);
        } else callback(null, result);
    });
}
app.get("/", function(yeucau, phanhoi) {
    phanhoi.sendFile(__dirname + '/html/chat.html');
}).use(express.static(__dirname + '/html/'));
// io là tất cả 
// socket là chỉ id socket đó thôi
function checkusername(socket) {
    if (!socket.username || socket.username.length === 0) {
        var tmp = {};
        tmp.reason = "bạn chưa đăng nhập";
        socket.emit('server-kick-logout', tmp);
        return 0;
    } else return 1;
}

function checkhople(str) {
    var n = str.search(/^[a-z0-9]{3,50}$/i);
    return n;
}

function checkkytukohople(str) {
    var n = str.search(/[|\\\'\"\[\]\^\&\*\!\@\,\.\#\$\%\?\/\<\>]/i);
    return n;
}
var kq = {}; // tao mang user va ds thanh cong that bai
kq.datahtml = [];
io.on('connection', function(socket) {
    console.log('co 1 client da ket noi ' + socket.id);
    //socket.on('disconnect', function() {
    //console.log(' user da ngat ket noi ' + socket.id);
    //});
    checkusername(socket); // đá đang kết nối ra
    socket.on('sender-send', function(mess) {
        //console.log('vua nhan duoc ' + mess);
        var check_tmp = checkusername(socket); // đá đang kết nối ra
        //console.log(socket.username);
        //console.log(check_tmp);
        if (check_tmp == 1) {
            io.emit('server-send', '<p>' + '<b>' + socket.username + '</b>:' + mess + '</p>');
        }
        //socket.broadcast.emit('server-send', '<p>' + mess + '</p>');
    });
    socket.on('sender-register', function(thongtinuser) {
        //console.log(thongtinuser);
        var check_u = checkhople(thongtinuser.username);
        var check_p = checkhople(thongtinuser.password);
        var check_n = checkkytukohople(thongtinuser.name);
        if (check_u <= -1) {
            socket.emit('server-res-register', { e: '#username-register', reason: 'user chưa hợp lệ', result: 0 });
        } else if (check_p <= -1) {
            socket.emit('server-res-register', { e: '#password-register', reason: 'password chưa hợp lệ', result: 0 });
        } else if (check_n > -1) {
            socket.emit('server-res-register', { e: '#name-register', reason: 'name có ký tự đặc biệc', result: 0 });
        } else {
            checkuserdb(thongtinuser.username, function(err, result) {
                if (err) {
                    console.log('err-register:' + err);
                } else {
                    if (typeof result !== 'undefined' && result.length > 0) {
                        // user đã có
                        socket.emit('server-res-register', { e: '#username-register', reason: 'user đã tồn tại', result: 0 });
                    } else {
                        //user chưa có
                        console.log('client ' + socket.id + ' vua thuc hien dang ky user ' +thongtinuser.username );
                        insertdb(thongtinuser.username, thongtinuser.password, thongtinuser.name, function(err, result) {
                            if (err){
                                console.log('err-insert' + err)
                            } 
                            else {
                                socket.emit('server-res-register', {
                                    e: '#login-card',
                                    reason: 'đăng ký thành công',
                                    result: 1
                                });
                            }
                        });
                    }
                }
            });

        }
    })
    socket.on('sender-login', function(thongtinuser) {
        console.log('client ' + socket.id + ' dang co gang dang nhap vao' + thongtinuser.username);
        var user = thongtinuser.username;
        checkdangnhap(thongtinuser.username, thongtinuser.password, function(err, data) {
            if (err) {
                console.log('err:' + err);
            } else {
                if (typeof data !== 'undefined' && data.length > 0) {
                    //console.log(data);
                    var check = kq.datahtml.filter(function(person) {
                        return person.nameObj == user;
                    });
                    if (typeof check !== 'undefined' && check.length > 0) {
                        console.log('client ' + socket.id + ' that bai user nay da dang nhap');
                        // the array is defined and has at least one element
                        // thất bại user đang đăng nhập
                        var kq_tmp = {};
                        kq_tmp.result = 0;
                        kq_tmp.reason = 'user đang đăng nhập';
                        socket.emit('server-send-private', kq_tmp);
                    } else {
                        console.log('client ' + socket.id + ' dang nhap thanh cong ' + thongtinuser.username);
                        // thành công
                        kq.result = 1;
                        kq.reason = 'user ' + data[0].tenuser + ' vừa mới đăng nhập vào';
                        socket.username = user;
                        socket.nameuser = data[0].tenuser;
                        var ttuser = {};
                        ttuser.idObj = socket.id;
                        ttuser.nameObj = user;
                        ttuser.nameuserobj = data[0].tenuser;
                        kq.datahtml.push(ttuser);
                        console.log(kq.datahtml);
                        var kq_tmp = {};
                        kq_tmp.result = 1;
                        kq_tmp.reason = 'dang ky thanh cong';
                        kq_tmp.iduser = socket.id;
                        kq_tmp.username = user;
                        kq_tmp.nameuser = data[0].tenuser;
                        io.emit('all-recived', kq);
                        socket.emit('server-send-private', kq_tmp);
                    }
                } else {
                    console.log('client ' + socket.id + ' that bai sai mat khau');
                    //console.log('ko co kq');
                    socket.emit('server-kick-logout', { reason: 'user chua co hoac tai khoan chua chinh xac' });
                }
            }
        });
    });
    socket.on('logout', function() {
        console.log(' client ' + socket.id + ' da logout');
        kq.result = 1;
        kq.reason = ' user ' + socket.username + 'vua out ra';
        kq.datahtml = kq.datahtml.filter(function(el) {
            return el.idObj !== socket.id;
        });
        socket.broadcast.emit('all-recived', kq);
    });
    socket.on('disconnect', function() {
        console.log(' user da ngat ket noi ' + socket.id);
        if(checkusername(socket) == 0 ) return;
        kq.result = 1;
        kq.reason = ' user ' + socket.username + 'vua out ra';
        kq.datahtml = kq.datahtml.filter(function(el) {
            return el.idObj !== socket.id;
        });
        socket.broadcast.emit('all-recived', kq);
    });
    socket.on('sender-send-private', function(data) {
        //console.log(data.guiden);
        if (data.guiden != socket.id) {
            var check_tmp = checkusername(socket); // đá đang kết nối ra
            if (check_tmp == 1) {
                //console.log('gui tn private' );
                var tmp = {};
                tmp.nameuser = socket.username;
                tmp.nameuserobj = socket.nameuser;
                tmp.noidung = data.noidung;
                tmp.iduser = socket.id;
                //console.log(tmp);
                socket.broadcast.to(data.guiden).emit('server-send-oneclient', tmp);
                //socket.to(data.guiden).emit('server-send-private', tmp);
                //io.to(data.iduser).emit('server-send-oneclient', tmp);
            }
        }
        /*tmp.username = socket.username;
        tmp.noidung = data.noidung;
        tmp.room = data.iduser;
        socket.join(data.guiden);
        io.sockets.in(data.guiden).emit("server-chat-private", tmp);*/
    });
    socket.on('sender-fix-infor',function(result){
        checkdangnhap(socket.username, result.oldpass, function(err, data){
            if (err) {
                console.log('err:' + err);
            }else{
                if (typeof data !== 'undefined' && data.length > 0) {
                    updatedb(data[0].iduser , result.newpass , result.nameuser,function(err,datadb){
                        if(err){
                            console.log('err-update' + err)
                        }else{
                            socket.emit('server-res-fix', { reason: 'thay đổi thông tin thành công' });
                        }
                    });
                } else {
                    console.log('client ' + socket.id + ' fix sai mat khau cu');
                    socket.emit('server-res-fix', { reason: 'mật khẫu cũ chưa đúng' });
                }
            }
        });
    });
})

http.listen(port, function() {
    console.log('dang mo port ' + port);
});
/*https.listen(port,function(){
    console.log('dang mo port ' + port);
});*/