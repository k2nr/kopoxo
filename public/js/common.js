function getUserData(id,cb) {
    $.ajax({
        url: 'http://api.twitter.com/1/users/show.json?user_id=' + id,
        dataType: 'jsonp',
        success: function(res) {
            cb(res);
        }
    });
}

function getUserDataList(ids, cb) {
    $.ajax({
        url: 'http://api.twitter.com/1/users/lookup.json?user_id=' + ids.join(','),
        dataType: 'jsonp',
        success: function(res) {
            cb(res);
        }
    });
}
