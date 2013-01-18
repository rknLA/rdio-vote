/*globals R, $, Handlebars */
(function() {
  /* log! */
  var log = function(text) {
    console.log("[Voter] " + text);
  };


  /* This handles the login flow inside a closure.
   * Cause closures are fun.
   * */
  var showLogin = (function() {
    var loginShowing = false;

    var loginPressed = function() {
      log("you hit the authentication button");
      $('#authenticationButton').html('Authenticating')
        .attr('disabled', 'disabled');
      R.authenticate(authenticationComplete);
    };

    var authenticationComplete = function(success) {
      if (success) {
        log("authentication successful!");
        initializeVoter();
      } else {
        log("authentication failed");
        $('#authenticationButton').html('Authenticate')
          .removeAttr('disabled');
      }
    };

    return function() {
      if (!loginShowing) {
        log("Should show an authorize button now.");
        $('.loading')
          .append('<button id="authenticationButton">Authenticate</button>');
        $('#authenticationButton').click(loginPressed);
        loginShowing = true;
      } else {
        log("Login is already showing! Do nothing.");
      }
    };
  })();

  var initializeVoter = function() {
    $('.loading').empty().hide();
    var source = $('#userIdentityTemplate').html();
    var template = Handlebars.compile(source);
    var currentUserInfo = template({
      avatarUrl: R.currentUser.get('icon'),
      userName: R.currentUser.get('vanityName')
    });
    $('#you').empty()
      .append(currentUserInfo);
    setupPlaystate();
  };

  /* This should only get called after we've authenticated
   * and have a current User.  Right now, that means it's
   * only called from initializeVoter.
   */
  var setupPlaystate = function() {
    R.player.on("change:playingTrack", playerTrackDidChange);
    R.player.on("change:playingSource", playerSourceDidChange);
    R.player.on("change:playState", playstateDidChange);
    R.player.on("change:position", playstateDidChange);

    //kick playstateDidChange on load
    playstateDidChange(R.player.playState());
    playerSourceDidChange(R.player.playingSource());
  };

  var playerPositionDidChange = function (newValue) {
    log('playerPositionDidChange ');
    console.log(newValue);
  };

  var playerTrackDidChange = function (newValue) {
    updatePlayerInfo(newValue);
  };
  
  var enableControls = function() {
    $('#killdoze').removeAttr('disabled');
    $('#downvote').removeAttr('disabled');
    $('#upboat').removeAttr('disabled');
  };

  var disableControls = function() {
    $('#killdoze').attr('disabled', 'disabled');
    $('#downvote').attr('disabled', 'disabled');
    $('#upboat').attr('disabled', 'disabled');
  };

  var handleVote = function(vote) {
    // 1 - skip
    // 2 - favorite
    // 3 - ban 
    var voteInt;
    if (vote == 'favorite') {
      voteInt = 2;
    } else if (vote == 'skip') {
      voteInt = 1;
    } else if (vote == 'ban') {
      voteInt = 3;
    } else {
      return function(e) {
        console.error('invalid vote parameter');
      };
    }

    return function (e) {
      e.preventDefault();

      // disable buttons, only boat once
      disableControls();

      var station = R.player.playingSource().get('key');
      var track = R.player.playingTrack().get('key');
      
      R.request({
        method: "voteForTrackOnStation",
        content: {
          'station_key': station,
          'track_key': track,
          'vote': voteInt
        },
        success: function (response) {
          console.log(response);
          $('#vote-results').empty().append('Voted!');
        },
        error: function (response) {
          console.error(response);
          $('#vote-results').empty().append('Error voting.');
        }
      });
    };
  };

  var playerSourceDidChange = function(newValue) {
    log('playerSourceDidChange ');
    console.log(newValue);

    var newSourceType = newValue.get('type');

    if (newSourceType == 'tp' ||
        newSourceType == 'rr' ||
        newSourceType == 'sr') {

      // source is an echonest station, and can be voted.
      $('#killdoze').on('click', handleVote('skip'));
      $('#downvote').on('click', handleVote('ban'));
      $('#upboat').on('click', handleVote('favorite'));
      enableControls();

      $('#controls').show();
    } else {
      $('#controls').hide();
      $('#killdoze').off();
      $('#downvote').off();
      $('#upboat').off();
    }
  };

  var playstateDidChange = function(newValue) {
    if (newValue == R.player.PLAYSTATE_PLAYING) {
      $('#playstate').empty().append('Playing');
      var currentTrack = R.player.playingTrack();
      updatePlayerInfo(currentTrack);
      $('#player-info').show();
    } else {
      $('#playstate').empty().append('Paused');
      $('#player-info').hide();
    }
  };

  var updatePlayerInfo = function (newInfo) {
    var container = $('#current-track');
    $('.track-name:first', container).empty()
      .append(newInfo.get('name'));
    $('.artist:first', container).empty()
      .append(newInfo.get('artist'));
    $('.album:first', container).empty()
      .append(newInfo.get('album'));
  };


  //noConflict
  var oldVoter = window.rdioVoter;

  window.rdioVoter = {
    noConflict: oldVoter,

    onRdioReady: function() {
      log("Rdio is ready!");
      var user = R.currentUser.vanityName;
      var logStr = "Viewing as " + user + " ";
      if (R.authenticated()) {
        log(logStr + "and also authenticated");
        initializeVoter();
      } else {
        log(logStr + "but not authenticated");
        showLogin();
      }
    }
  };

  R.ready(rdioVoter.onRdioReady);
})();
