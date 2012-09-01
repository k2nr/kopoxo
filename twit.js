var configure = require('./configure');
var ntwitter = require('ntwitter');
var db = require('./db');

var twitter = new ntwitter({
  consumer_key: configure.consumerKey,
  consumer_secret: configure.consumerSecret,
  access_token_key: configure.masterAccessToken,
  access_token_secret: configure.masterAccessTokenSecret
});

var keyword = "ｺﾎﾟｫ";

function replyMessage(screen_name, in_reply_to_status_id, points) {
    var m;
    if(points >= 70) {
        m = 'ﾅｲｽｺﾎﾟｫです！';
    } else if (points >= 90){
        m = 'ｸﾞﾚｰﾄｺﾎﾟｫです！';
    } else if (points <= 20) {
        m = "その遅ｺﾎﾟｫ、('-^)b クソワロタです ";
    } else {
        return;
    }
    twitter.updateStatus('@' + screen_name + ' ' + m + points + 'ポイント獲得しました '
                         + configure.urlRoot + '/status/' + in_reply_to_status_id, {
        in_reply_to_status_id: in_reply_to_status_id
    }, function(err){
        console.log(err);
    });
}

function startSearchStream() {
    twitter.stream('statuses/filter', {'track': keyword}, function(stream){
        stream.on('data', function(data){
            db.queryUser({id: data.user.id}, function(d){
                // if the tweet isn't from a registered user then just return null.
                if(!d) return;
                if(!data.in_reply_to_status_id_str) {
                    db.addUserStatus(data, null);
                    db.addUserSingleActivity(data, 10, null);
                } else {
                    db.queryTweet(data.in_reply_to_status_id_str, function(repStat){
                        if(!repStat) return;
                        var lag = (new Date(data.created_at) - new Date(repStat.created_at));
                        var pts = Math.max(100 - lag/1000, 0);
                        db.addUserStatus(data, null);
                        db.addUserReplyActivity(data, pts, null);
                        replyMessage(data.user.screen_name,
                                     data.id_str,
                                     pts);
                    });
                }
            });
        });

        stream.on('end', function(res){
            console.error('search stream stopped: end');
        });
        stream.on('destroy', function(res){
            console.error('search stream stopped: destroy');
            restartSearchStream();
        });
    });
}

function restartSearchStream() {
    setTimeout(function() {
        startSearchStream();
    }, 60 * 1000);
}
startSearchStream();
