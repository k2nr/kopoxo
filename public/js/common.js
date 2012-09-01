function getUserData(id,cb) {
    $.ajax({
        url: 'http://api.twitter.com/1/users/show.json?user_id=' + id,
        dataType: 'jsonp',
        success: function(res) {
            cb(res);
        }
    });
}