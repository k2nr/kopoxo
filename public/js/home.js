(function() {
var users = {};

$(document).ready(function(){
    $('table#my-activities').hide();
    $.post('/api/user-activities', {limit: 100}, function(res) {
      var len = res.length, cnt=0, i;
      for(i=0; i < len; i++) {
          (function(d) {
              var $elem = $('<tr />');
              $('table#my-activities').append($elem);
              makeTableElement(d, function(data) {
                  $elem.append(data);
                  cnt++;
                  if(cnt === len) {
                      $('table#my-activities').show();
                  }
              });
          }(res[i]));
      }
  });
});

function statusLink(screenName, statusID) {
//    return 'https://twitter.com/' + screenName + '/status/' + statusID;
    return '/status/' + statusID;
}

// returns YYYY/MM/DD HH:MM:SS with link to the post
function formatedDate(screenName, statusID, date) {
    return '<a href="' + statusLink(screenName, statusID) + '">' +
        date.getFullYear() + '/' + (date.getMonth()+1) + '/' + date.getDate() + ' '
        + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '</a>';
}

function formatedScreenName(screenName) {
    return '<a href="/user/' + screenName + '">' + screenName + '</a>';
}

function makeTableElement(data, cb) {
    var res;
    switch(data.type) {
    case 'single':
        res = '<td><div><div>あなたのコポり: ' +
            '<strong>' + data.points + 'pt獲得！</strong>' +
            '</div><div>' + formatedDate(data.user_screen_name, data.status_id, new Date(data.date)) +
            '</div></div></td>';
        break;
    case 'post_reply':
        res = '<td><div><div>あなたの' + formatedScreenName(data.target_screen_name) + 'へのコポり: ' +
            '<strong>' + data.points + 'pt獲得！</strong>' +
            '</div><div>' + formatedDate(data.user_screen_name, data.status_id, new Date(data.date)) +
            '</div></div></td>';
        break;
    case 'get_reply':
        res = '<td><div><div>' + formatedScreenName(data.target_screen_name) + 'からのコポられ: ' +
            '<strong>' + data.points + 'pt獲得！</strong>' +
            '</div><div>' + formatedDate(data.user_screen_name, data.status_id, new Date(data.date)) +
            '</div></div></td>';
        break;
    }
    cb(res);
}

}());