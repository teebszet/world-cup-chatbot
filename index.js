//
// This implements most of the bot code. It starts off by looking for the `bot_token` value that will
// have been stored if you successfully OAuthed with your Bot using the 'Add to Slack' button. Assuming
// it exists, it implements an instance of `slack`, and then listens out for incoming HTTP requests.
// It also implements code that watches for slash commands, sets up event handling for when events
// like `pin_added`, `star_added` or `reaction_added` are received. As well as using the database
// to record when actions like adding a star have been completed.
//

"use strict";

const ts = require('./tinyspeck.js'),
      datastore = require("./datastore.js").data,
      makelele = require('./makeleleMessages.json'),
      wcMatches = require('./worldCupMatchesApi.js'),
      moment = require("moment");

var connected=false;
const timezone = 8;

getConnected() // Check we have a database connection
  .then(function(){
    datastore.set("bot_token", process.env.SLACK_BOT_TOKEN)
    .then(function(){
      return datastore.get("bot_token")}) // Grab the bot token before proceeding
    .then(function(value){
      var slack;

      if(!value){
        console.log("There's no bot token stored - you need to auth this bot with Slack for it to be fully functional"); 
        // we need to be able to respond to verify requests from Slack before we
        // have a bot token set, so not setting one
        slack = ts.instance({});
      } else {
        console.log("Using bot token"); 
        // we have the bot_token set, so we're good to go
        slack = ts.instance({ token:value });
      }

      function getChatPostMessage(channel) {
        return Object.assign(makelele.nextMatch, {
          channel: channel,
          token: value,
        });
      }

      function formatFixture(nextMatch) {
        var niceDatetime = moment(nextMatch.datetime).utcOffset(timezone).calendar();
        return `${nextMatch.home_team.country} vs. ${nextMatch.away_team.country}; ${niceDatetime}`;
      }

      async function getNextMatchMessage() {
        var nextMatch = await wcMatches.getNextMatch();
        return formatFixture(nextMatch);
      }

      function formatResult(match) {
        const scorers = match.home_team_events
          .concat(match.away_team_events)
          .filter(event => event.type_of_event.match(/goal/))
          .map(event => event.player)
          .join(',');
        return `${match.home_team.country} ${match.home_team.goals} - ${match.away_team.goals} ${match.away_team.country}\n` + 
            `(${scorers})`;
      }

      async function getLatestResultMessage() {
        var latestResult = await wcMatches.getLastMatch();
        return formatResult(latestResult);
      }
      
      async function getLastXMatchesMessage(number) {
        var matches = await wcMatches.getLastMatches(number);
        return matches.map(match => formatResult(match)).join("\n\n");
      }
      
      async function getYesterdayMatchesMessage() {
        var matches = await wcMatches.getYesterdayMatches();
        return matches.map(match => formatResult(match)).join("\n\n");
      }
      
      async function getTodayMatchesMessage() {
        var matches = await wcMatches.getTodayMatches();
        return matches.map(match => formatFixture(match)).join("\n");
      }
      
      async function getNextXMatchesMessage(number) {
        var matches = await wcMatches.getNextMatches(number);
        return matches.map(match => formatFixture(match)).join("\n");
      }

      function getQuote() {
        const index = Math.floor(Math.random() * makelele.quotes.length)
        return makelele.quotes[index];
      }

      function getNextDeadline() {
        var deadlines = makelele.deadlines.filter(deadline => moment(deadline).diff(moment()) > 0);
        return moment(deadlines.shift()).utcOffset(timezone).calendar();
      }

      slack.on('app_mention', async (payload) => {
        console.log("Received app_mention");
        console.log(payload);
        let message;
        if (payload.event.text && 
            payload.event.text.match(/\bnext match\b/i)) {
          message = await getNextMatchMessage();
        } else if (payload.event.text && 
                   payload.event.text.match(/\b(last|latest) (result|match)\b/i)) {
          message = await getLatestResultMessage();
        } else if (payload.event.text && 
                   payload.event.text.match(/\btoday\b/i)) {
          message = await getTodayMatchesMessage();
        } else if (payload.event.text && 
                   payload.event.text.match(/\byesterday\b/i)) {
          message = await getYesterdayMatchesMessage();
        } else if (payload.event.text && 
                   payload.event.text.match(/\bnext [0-9]+ matches\b/i)) {
          var number = payload.event.text.match(/\bnext (0-9+) matches\b/i)[1];
          message = await getNextXMatchesMessage(number);
        } else if (payload.event.text && 
                   payload.event.text.match(/\blast [0-9]+ (results|matches)\b/i)) {
          var number = payload.event.text.match(/\blast ([0-9]+) (results|matches)\b/i)[1];
          message = await getLastXMatchesMessage(number);
        } else if (payload.event.text && 
                   payload.event.text.match(/\bnext deadline\b/i)) {
          message = getNextDeadline();
        } else {
          message = getQuote();
        }

        if (message) {
          const data = Object.assign(getChatPostMessage(payload.event.channel), { text: message });
          slack.send("chat.postMessage", data).then(res => {
            // console.log(res.data);
            console.log("Response sent to app_mention");
          }, reason => {
            console.log("An error occurred when responding to next match command: " + reason);
          });
        }
      });

      // incoming http requests
      slack.listen('3000');
  });
});

function getConnected() {
  return new Promise(function (resolving) {
    if(!connected){
      connected = datastore.connect().then(function(){
        resolving();
      });
    } else {
      resolving();
    }
  });
}

function isJSON(data) {
  var ret = true;
  try {
    JSON.parse(data);
  }catch(e) {
    ret = false;
  }
  return ret;
}