var configure = require('./configure');
var mongo = require('mongoose');

mongo.connect(configure.dbpath);

/* ************************* */
/* Model & Schema Definition */
/* ************************* */

var Activity =  mongo.model('activities', new mongo.Schema({
    points: Number,
    type: String,
    user_id: Number,
    user_screen_name: String,
    user_profile_img: String,
    status_id: String,
    target_user_id: String,
    target_screen_name: String,
    target_status_id: String,
    date: Date
}));

var User = mongo.model('user', new mongo.Schema({
    id: Number,
    screen_name: String,
    points: Number,
    access_token: String,
    access_token_secret: String
}));

var Status = mongo.model('statuses', new mongo.Schema({
    id: String,
    user_id: Number,
    screen_name: String,
    profile_image_url: String,
    in_reply_to_status_id: String,
    in_reply_to_screen_name: String,
    text: String,
    created_at: Date
}));


function updateUser(id, func) {
    User.find({id: id}, function(err, users) {
        if(!users || users.length === 0) {
            return;
        }
        if(err) {
            return;
        }

        func(users[0]).save();
    });
}

function addActivity(data) {
    var act = new Activity();
    act.points = data.points;
    act.type = data.type;
    act.user_id = data.user_id;
    act.status_id = data.status_id;
    act.target_status_id = data.target_status_id;
    act.target_user_id = data.target_user_id;
    act.target_screen_name = data.target_screen_name;
    act.user_screen_name = data.user_screen_name;
    act.user_profile_img = data.user_profile_img;
    act.date = new Date();
    act.save();
}

/* **************** */
/* Public Functions */
/* **************** */

/** Add new user to DB. */
exports.addUser = function(data) {
    User.find({id: data.id}, function(err, docs) {
        var user;
        if(docs && docs.length > 0) {
            user = docs[0];
        } else {
            user = new User();
            user.points = 0;
            user.id = data.id;
        }
        user.screen_name = data.screen_name;
        user.access_token = data.access_token;
        user.access_token_secret = data.access_token_secret;
        user.save(function(err) {
            if(err) console.error('failed to add user: ' + err);
        });
    });
};

/** removes a registered user */
exports.removeUser = function(data, cb) {
    User.remove({id: data.id}, function(err) {
        Activity.remove({user_id: data.id}, function(err) {
            Status.remove({user_id: data.id}, function(err) {
                cb(err);
            });
        });
    });
};

/** queries user info from user id.
 *  returns null if there's no registered user of the id */
exports.queryUser = function(query, cb) {
    User.find(query).select('id screen_name points').exec(function(err, docs) {
        var user = docs[0];
        if(cb) cb(user);
    });
};

/** queries tweet from user id and status id. returns all info related to the tweet.
 * if requested tweet is not found in DB, returns null */
exports.queryTweet = function(id, cb){
    if(!cb) return;
    Status.find({id: id}, function(err, docs) {
        if(err || !docs) {
            cb(null);
            return;
        } else {
            cb(docs[0]);
        }
    });
};

exports.queryReplies = function(id, cb) {
    if(!cb) return;
    Status.find({in_reply_to_status_id: id}, function(err, docs) {
        if(err || !docs) {
            cb(null);
            return;
        } else {
            cb(docs);
        }
    });
};

exports.addUserStatus = function(data, cb) {
    var stat = new Status();
    stat.id = data.id_str;
    stat.user_id = data.user.id;
    stat.screen_name = data.user.screen_name;
    stat.profile_image_url = data.user.profile_image_url;
    stat.in_reply_to_status_id = data.in_reply_to_status_id_str;
    stat.in_reply_to_screen_name = data.in_reply_to_screen_name;
    stat.text = data.text;
    stat.created_at = data.created_at;
    stat.save();
};

exports.addUserSingleActivity = function(data, pts, cb) {
    if(!cb) cb = function(err){};
    if(!pts) pts = 10;

    updateUser(data.user.id, function(user) {
        user.points += pts;
        return user;
    });
    addActivity({
        points: pts,
        type: 'single',
        user_id: data.user.id,
        user_screen_name: data.user.screen_name,
        user_profile_img: data.user.profile_image_url,
        status_id: data.id_str
    });
};

/** Update kopoxo pts */
exports.addUserReplyActivity = function(data, pts, cb) {
    if(!cb) cb = function(err){};

    updateUser(data.user.id, function(user) {
        user.points += pts;
        return user;
    });
    addActivity({
        points: pts,
        type: 'post_reply',
        user_id: data.user.id,
        user_screen_name: data.user.screen_name,
        user_profile_img: data.user.profile_image_url,
        status_id: data.id_str,
        target_user_id: data.in_reply_to_user_id_str,
        target_screen_name: data.in_reply_to_screen_name,
        target_status_id: data.in_reply_to_status_id_str
    });

    updateUser(data.in_reply_to_user_id, function(user) {
        user.points += 10;
        return user;
    });
    addActivity({
        points: 10,
        type: 'get_reply',
        user_id: data.in_reply_to_user_id,
        user_screen_name: data.in_reply_to_screen_name,
        user_profile_img: data.user.profile_image_url,
        status_id: data.id_str,
        target_user_id: data.user.id,
        target_screen_name: data.user.screen_name
    });
};

exports.addNoReplyActivity = function(data, pts, cb) {
    if(!cb) cb = function(err){};

    updateUser(data.user.id, function(user) {
        user.points += pts;
        return user;
    });
    addActivity({
        points: pts,
        type: 'no_reply',
        user_id: data.user.id,
        user_screen_name: data.user.screen_name,
        user_profile_img: data.user.profile_image_url,
        status_id: data.id_str
    });
};

exports.getUserActivities = function(arg, cb) {
    var userID = arg.userID,
        limit = arg.limit || 20,
        from  = arg.from;

    Activity
        .find({user_id: userID})
        .sort('field -date')
        .limit(limit)
        .exec(function(err, docs){
            cb(docs);
        });
};

exports.getAllActivities = function(cb) {
    Activity.find({}, function(err, docs) {
        cb(docs);
    });
};

exports.getUserProfile = function(id, cb) {
    exports.queryUser({id: id}, function(data) {
        Activity.find({user_id: id}).or([{type: 'single'}, {type: 'post_reply'}]).count(function(err, pcount) {
            Activity.find({user_id: id, type: 'get_reply'}).count(function(err, gcount){
                data.post_count = pcount;
                data.get_count = gcount;
                cb({
                    id: data.id,
                    points: data.points,
                    screen_name: data.screen_name,
                    post_count: pcount,
                    get_count: gcount
                });
            });
        });
    });
};

exports.getRanking = function(cb) {
    User
     .find({})
     .select('id screen_name points profile_image_url')
     .sort('-points')
     .limit(10)
     .exec(function(err, docs) {
        cb(docs);
    });
};
