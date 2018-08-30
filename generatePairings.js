const NewsAPI = require('newsapi');
const newsapi = new NewsAPI('449713cfcf894813b7d3261923dedcd5');
const stringSimilarity = require('string-similarity');
const fs = require('fs');
const stopwords = require('nltk-stopwords')
const english = stopwords.load('english')
// example: stopwords.remove(sentence, english)

const categories = ['Trump'];
const blueSources = ['al-jazeera-english', 'the-new-york-times', 'bbc-news', 'the-huffington-post', 'the-washington-post', 'the-economist', 'politico'];
const redSources = ['fox-news', 'breitbart-news', 'national-review', 'the-washington-times', 'the-american-conservative'];
const leanings = ['liberal', 'conservative'];

function convertSourceArrToStr(sourceArr) {
  var sourceStr = "'";
  for (i = 0; i < sourceArr.length; i++) {
    if (i == sourceArr.length - 1) {
      sourceStr += sourceArr[i] + "'";
    } else {
      sourceStr += sourceArr[i] + ",";
    }
  }
  return sourceStr;
}

async function getArticlesForCategories(categories) {
  try {
    var categoryDict = {};
    for (var c in categories) {
      categoryDict[categories[c]] = {};
      var articles = {};
      for (var l in leanings) {
        var sources = "";
        if (leanings[l] == 'liberal') {
          sources = convertSourceArrToStr(blueSources);
        } else if (leanings[l] == 'conservative') {
          sources = convertSourceArrToStr(redSources);
        }
        response = await newsapi.v2.everything({
          q: categories[c],
          sources: sources,
          language: 'en',
          sortBy: 'relevancy'
        });
        responseArticles = response['articles'];
        for (var i in responseArticles) {
          delete responseArticles[i]['author']
        }
        categoryDict[categories[c]][leanings[l]] = responseArticles;
      }
    }
    return categoryDict;
  } catch (error) {
    console.log(error);
  }
}

function getArticles(categories) {
  getArticlesForCategories(categories).then(response => {
    pairArticles(response, categories);
  });
}

function pairArticles(articles, categories) {
  var pairedArticlesByCategory = {};
  for (var c in categories) {
    var pairedArticles = [];
    var matchingScores = {};
    for (var i in articles[categories[c]]['liberal']) {
      for (var j in articles[categories[c]]['conservative']) {
        var titleSimilarity = stringSimilarity.compareTwoStrings(articles[categories[c]]['liberal'][i]['title'], articles[categories[c]]['conservative'][j]['title']);
        var descriptionSimilarity = stringSimilarity.compareTwoStrings(articles[categories[c]]['liberal'][i]['description'], articles[categories[c]]['conservative'][j]['description']);
        if (titleSimilarity > descriptionSimilarity) {
          var score = titleSimilarity;
        } else {
          var score = descriptionSimilarity;
        }
        var scoreKey = i.toString() + "-" + j.toString(j);
        matchingScores[scoreKey] = score;
      }
    }
    var filtered = Object.assign(...
      Object.entries(matchingScores).filter(([k,v]) => v>.5).map(([k,v]) => ({[k]:v}))
    );
    for (var key in filtered) {
      var indexes = key.split("-");
      var pair = {
        score: filtered[key],
        liberal: articles[categories[c]]['liberal'][indexes[0]],
        conservative: articles[categories[c]]['conservative'][indexes[1]],
      }
      pairedArticles.push(pair);
    }
    pairedArticlesByCategory[categories[c]] = pairedArticles;
  }
  writeToFile(pairedArticlesByCategory);
}

function writeToFile(dict) {
  var data = JSON.stringify(dict, null, 2);
  fs.writeFileSync('articles.json', data);
}

getArticles(['gun control', 'trump', 'russia']);
