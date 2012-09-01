var configure = require('./configure');
var express  = require('express');
var db = require('./db');
var twit = require('./twit');

var app = express();
var oauth = new (require('oauth').OAuth)(
    'https://api.twitter.com/oauth/request_token',
    'https://api.twitter.com/oauth/access_token',
    configure.consumerKey,
    configure.consumerSecret,
    '1.0',
    configure.oauthCallback,
    'HMAC-SHA1'
);

app.configure(function() {
    app.use(express.logger());
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({ secret: "secret" }));
    app.use(express.static(__dirname + '/public'));
    app.set('view engine', 'jade');
});

function addUser( req ){
    var profile = req.session.user_profile,
        oa = req.session.oauth;

    if(!profile || !oa){
        return;
    }

    db.addUser({
        id: profile.user_id,
        screen_name: profile.screen_name,
        oauth_access_token: oa.access_token,
        oauth_access_token_secret: oa.access_token_secret
    });
}

function isLoggedIn(req) {
    return !!req.session.user_profile;
}

function userData(req) {
    if(req.session) {
        return {
            id: req.session.user_profile.user_id,
            screen_name: req.session.user_profile.screen_name
        };
    } else {
        return null;
    }
}

app.get('/', function(req, res) {
    addUser(req);
    if(isLoggedIn(req)) {
        res.redirect('/home');
    } else {
        res.render('index');
    }
});

function mainContentReq(content) {
    return function(req, res) {
        addUser(req);
        if(isLoggedIn(req)) {
            var user = userData(req);
            db.getUserProfile(user.id, function(data){
                res.render(content, {
                    user: data
                });
            });
        } else {
            res.redirect('/');
        }
    };
}
var contents = ['home', 'public-activity', 'settings'];
for(var i=0; i < contents.length; i++) {
    app.get('/' + contents[i], mainContentReq(contents[i]));
}

app.get('/status/:id', function(req, res){
    db.queryTweet(req.params.id, function(tweet) {
        db.queryReplies(req.params.id, function(replies) {
            res.render('status', {
                tweet: tweet,
                replies: replies
            });
        });
    });
});

app.get('/auth/twitter', function(req, res) {
    oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results) {
        if(error) {
            res.send(error);
        } else {
            req.session.oauth = {};
            req.session.oauth.token = oauth_token;
            req.session.oauth.token_secret = oauth_token_secret;
            res.redirect('https://twitter.com/oauth/authenticate?oauth_token=' + oauth_token);
        }
    });
});

app.get('/auth/twitter/callback', function(req, res) {
    if(req.session.oauth) {
        req.session.oauth.verifier = req.query.oauth_verifier;

        oauth.getOAuthAccessToken(req.session.oauth.token,
                                  req.session.oauth.token_secret,
                                  req.session.oauth.verifier,
                                  function(error, oauth_access_token, oauth_access_token_secret, results) {
                if(error) {
                    res.send(error);
                } else {
                    req.session.oauth.access_token = oauth_access_token;
                    req.session.oauth.access_token_secret = oauth_access_token_secret;
                    req.session.user_profile = results;
                    res.redirect('/');
                }
            }
        );
    }
});

app.get('/signout', function(req, res) {
    delete req.session.oauth;
    delete req.session.user_profile;
    res.redirect('/');
});

app.post('/api/user-activities', function(req, res) {
    if(!isLoggedIn(req)) {
        res.send({error: "you aren't logged in"});
    } else {
        db.getUserActivities({
            userID: userData(req).id,
            limit:  req.body.limit.toString(),
            from: req.body.from
        }, function(data) {
            res.send(data);
        });
    }
});

app.post('/api/user-profile', function(req, res) {
    if(!isLoggedIn(req)) {
        res.send({error: "you aren't logged in"});
    } else {
        db.getUserProfile(userData(req).id, function(data) {
            res.send(data);
        });
    }
});

app.post('/unregister', function(req, res) {
    if(!isLoggedIn(req)) {
        res.redirect('/');
    } else {
        db.removeUser(userData(req), function(err) {
            if(err) {
                res.send('エラーでちゃった');
            } else {
                delete req.session.oauth;
                delete req.session.user_profile;

                res.render('unregister');
            }
        });
    }
});

app.listen(configure.port);
console.log('Listening on port ' + configure.port);
