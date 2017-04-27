require('dotenv').config()
if (!process.env.SLACK_API_TOKEN || !process.env.GITHUB_API_TOKEN) {
  console.log('Error: Specify token in .env');
  process.exit(1);
}

var Botkit = require('botkit');
var Request = require('request');
var Datetime = require('node-datetime');
var Fs = require('fs');

var CHECK_MARK = 'heavy_check_mark';
var EMOJI_WANTED = 'heart';
//
// startup chacha
//
var controller = Botkit.slackbot({
  debug: true
});

var bot = controller.spawn({
  token: process.env.SLACK_API_TOKEN
}).startRTM();

//
// pingpong
//
controller.hears(['ping'], ['direct_message', 'direct_mention', 'mention'], function(bot, message) {
  bot.reply(message, "pong");
});

//
// emoji-issue
//
controller.on('reaction_added', function(bot, message) {
  var messageData = {
    timestamp: message.item.ts,
    channel: message.item.channel
  };

  bot.api.reactions.get(messageData, function(error, response) {
    if (error) {
      bot.botkit.log('Failed to get emoji reaction: ', err);
      return;
    }

    if (response && response.message && response.message.reactions) {
      var reactions = response.message.reactions;

      for (var i = 0, j = reactions.length; i < j; i++) {
        if (reactions[i].name === CHECK_MARK) { break; }
        if (reactions[i].name !== EMOJI_WANTED) { continue; }

        var options = {
          uri: 'https://api.github.com/repos/fkymy/chacha-issue-test/issues',
          headers: {
            'Content-Type': 'applcation/json',
            'Authorization': 'token ' + process.env.GITHUB_API_TOKEN,
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103'
          },
          body: JSON.stringify({
            title: '[slack] ' + Datetime.create().format('Y-m-d H:M'),
            body: "[created by a bot]\n" + response.message.permalink + readIssueTemplate()
          })
        };

        postGithubIssue(message, options);
      }
    }
  });
});

function readIssueTemplate() {
  var issueTemplate;
  Fs.readFile('.github/ISSUE_TEMPLATE.md', 'utf8', function (error, text) {
    issueTemplate = text;
  });

  return issueTemplate;
}

function postGithubIssue(message, options) {
  Request.post(options, function(error, response) {
    if (response && response.statusCode === 201) {
      addCheckMark(message);
      notifyIssue(message, response);
    }
    else if (response && resonse.statusCode !== 201) {
      bot.botkit.log('Failed to post issue: ', response);
      return;
    }
    else if (error) {
      bot.botkit.log('Error from github: ', error);
      return;
    }
  });
};

function addCheckMark(message) {
  var messageData = {
    timestamp: message.item.ts,
    channel: message.item.channel,
    name: CHECK_MARK
  };

  bot.api.reactions.add(messageData, function(error) {
    if (error) {
      bot.botkit.log('Failed to add emoji reaction :(', error);
    }
  });
}

function notifyIssue(message, response) {
  var channelData = {
    channel: message.item.channel
  }, messageData = {
    text: 'Issueを作成しました: <'+ JSON.parse(response.body).html_url + '>'
  };

  bot.reply(channelData, messageData, function(error) {
    if (error) {
      bot.botkit.log('Failed to post reply message :(', error);
    }
  });
}
