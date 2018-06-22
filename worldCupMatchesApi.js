var axios = require('axios');
var moment = require('moment');

async function getMatchesFromApi() {
  try {
    const response = await axios.get("http://worldcup.sfg.io/matches");
    return response.data;
  } catch(e) {
    console.error(e);
    return [];
  }
}

async function getNextMatch() {
  return await getMatchesFromApi()
    .then(function(matches) {
      if (!matches || !matches.length) {
        console.log("no matches found from api");
      }
      return matches.find(match => match.status === "future")
    })
    .catch(function(e) {
      console.error(e);
      return {};
    });
}

async function getNextMatches(number) {
  return await getMatchesFromApi()
    .then(function(matches) {
      if (!matches || !matches.length) {
        console.log("no matches found from api");
      }
      return matches
        .filter(match => match.status === "future")
        .splice(0, number);
    })
    .catch(function(e) {
      console.error(e);
      return [];
    });
}

async function getLastMatches(number) {
  return await getMatchesFromApi()
    .then(function(matches) {
      if (!matches || !matches.length) {
        console.log("no matches found from api");
      }
      return matches
        .filter(match => match.status === "completed")
        .reverse()
        .splice(0, number)
        .reverse();
    })
    .catch(function(e) {
      console.error(e);
      return [];
    });
}

async function getYesterdayMatches() {
  return await getMatchesFromApi()
    .then(function(matches) {
      if (!matches || !matches.length) {
        console.log("no matches found from api");
      }
      return matches
        .filter(match => match.status === "completed")
        .filter(match => moment(match.datetime).diff(moment(), 'hours') > -24);
    })
    .catch(function(e) {
      console.error(e);
      return [];
    });
}

async function getTodayMatches() {
  return await getMatchesFromApi()
    .then(function(matches) {
      if (!matches || !matches.length) {
        console.log("no matches found from api");
      }
      return matches
        .filter(match => match.status === "future")
        .filter(match => moment(match.datetime).diff(moment(), 'hours') < 24);
    })
    .catch(function(e) {
      console.error(e);
      return [];
    });
}

async function getLastMatch() {
  return await getMatchesFromApi()
    .then(function(matches) {
      if (!matches || !matches.length) {
        console.log("no matches found from api");
      }
      return matches
        .filter(match => match.status === "completed")
        .pop();
    })
    .catch(function(e) {
      console.error(e);
      return {};
    });
}

module.exports = {
  getMatches: getMatchesFromApi,
  getNextMatch,
  getLastMatch,
  getNextMatches,
  getLastMatches,
  getYesterdayMatches,
  getTodayMatches
};