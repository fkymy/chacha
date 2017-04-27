require('dotenv').config()
var Botkit = require('botkit');
var Request = require('request');

// A check mark will be added to the message after issue is created
var CHECK_MARK = 'heavy_check_mark';
var EMOJI = 'heart';

var controller = Botkit.slackbot({
  debug: true
});

var bot = controller.spawn({
  token: process.env.SLACK_API_TOKEN
}).startRTM();

controller.hears(['hello'], ['direct_message', 'direct_mention', 'mention'], function(bot, message) {
  bot.reply(message, "Hello.");
});

controller.on('reaction_added', function(bot, message) {
  var messageData = {
    timestamp: message.item.ts,
    channel: message.item.channel
  };

  // get reaction details
  bot.api.reactions.get(messageData, function(error, response) {
    if (error) {
      bot.botkit.log('Failed to get emoji reaction: ', err);
      return;
    }

    if (response && response.message) {
      var reactions = response.message.reactions;

      for (var i = 0, j = reactions.length; i < j; i++) {
        if (reactions[i].name === CHECK_MARK) { break; }
        if (reactions[i].name !== EMOJI) { continue; }

        var options = {
          uri: 'https://api.github.com/repos/fkymy/chacha-issue-test/issues',
          headers: {
            'Content-Type': 'applcation/json',
            'Authorization': 'token ' + process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36'
          },
          body: JSON.stringify({ title: 'aaa', body: 'bbb' })
        };

        // send request to github
        console.log('##### postGithubIssue');
        console.log('message: ' + JSON.stringify(message));
        console.log('options: ' + JSON.stringify(options));
        postGithubIssue(message, options);
      }
    }
  });
});

function postGithubIssue(message, options) {
  Request.post(options, function(err, res) {
    console.log('##### response from github');
    console.log(res);
    if (err) {
      bot.botkit.log('Failed to post issue:', err);
    }

    addCheckMark(message);
    notifyIssue(message, res);
  });
};

function addCheckMark(message) {
  var messageData = {
    timestamp: message.item.ts,
    channel: message.item.channel,
    name: CHECK_MARK
  };

  bot.api.reactions.add(messageData, function(err) {
    if (err) {
      bot.botkit.log('Failed to add emoji reaction :(', err);
    }
  });
}

function notifyIssue(message, res) {
  var channelData = {
    channel: message.item.channel
  }, messageData = {
    text: 'Issueを作成しました: <'+ res.body.html_url + '>'
  };

  bot.reply(channelData, messageData, function(err) {
    if (err) {
      bot.botkit.log('Failed to post reply message :(', err);
    }
  });
}
