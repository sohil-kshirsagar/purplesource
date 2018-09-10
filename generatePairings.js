const NewsAPI = require('newsapi');
const newsapi = new NewsAPI('449713cfcf894813b7d3261923dedcd5');
const stringSimilarity = require('string-similarity');
const fs = require('fs');
const stopwords = require('nltk-stopwords')
const english = stopwords.load('english')
const replaceall = require("replaceall");
const nlp = require('compromise')


const similarityThreshold = 2;
const blueSources = ['al-jazeera-english', 'the-new-york-times', 'the-huffington-post', 'the-washington-post', 'cnn'];
const redSources = ['fox-news', 'breitbart-news', 'national-review', 'the-washington-times', 'the-american-conservative'];
const newsSourcesRemoveLower = ['al jazeera', 'new york times', 'huffington post', 'washington post', 'cnn', 'fox news', 'breitbart', 'national review', 'washington times', 'american conservative'];
const newsSourcesRemoveUpper = ['Al Jazeera', 'New York Times', 'Huffington Post', 'Washington Post', 'CNN', 'Fox News', 'Breitbart', 'National Review', 'Washington Times', 'American Conservative'];
const leanings = ['liberal', 'conservative'];
const categorySynonymsLower = {
  trump: ['trump', 'donald', ' president ', 'potus', ' j '],
  immigration: ['immigration', 'immigrants', 'immigrant'],
  guns: ['guns', 'firearms', 'gun'],
  healthcare: ['healthcare', 'health', 'health'],
  abortion: ['abortion']
};
const categorySynonymsUpper = {
  trump: ['Trump', 'Donald', ' President ', 'POTUS', ' J '],
  immigration: ['immigration', 'immigrants'],
  guns: ['guns', 'firearms', 'gun'],
  healthcare: ['healthcare', 'health', 'health'],
  abortion: ['abortion']
};

const categorySynonyms = {
  trump: ['trump', 'donald', 'president trump', 'potus', 'donald trump'],
  immigration: ['immigration', 'immigrants', 'immigration law', 'immigration reform'],
  guns: ['guns', 'firearms', 'gun', 'gun control', 'second amendment'],
  healthcare: ['healthcare', 'health', 'health', 'healthcare reform'],
  abortion: ['abortion', 'pro-life']
};

function convertSourceArrToStr(sourceArr, connector) {
  var sourceStr = "'";
  for (i = 0; i < sourceArr.length; i++) {
    if (i == sourceArr.length - 1) {
      sourceStr += sourceArr[i] + "'";
    } else {
      sourceStr += sourceArr[i] + connector;
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
          sources = convertSourceArrToStr(blueSources, ",");
        } else if (leanings[l] == 'conservative') {
          sources = convertSourceArrToStr(redSources, ",");
        }
        response = await newsapi.v2.everything({
          q: convertSourceArrToStr(categorySynonyms[categories[c]], " OR "),
          sources: sources,
          language: 'en',
          sortBy: 'relevancy',
          pageSize: 100
        });
        responseArticles = response['articles'];
        //change date to readable date
        /*
        var dateData = "2018-03-18T22:37:28Z"

        var dateObject = new Date(Date.parse(dateData));

        var dateReadable = dateObject.toDateString();

        console.log(dateReadable); */

        for (var i in responseArticles) {
          var dateData = responseArticles[i]['publishedAt']
          var dateObject = new Date(Date.parse(dateData));
          var dateReadable = dateObject.toDateString();
          responseArticles[i]['date'] = dateReadable;
          responseArticles[i]['dateObject'] = dateObject;

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
    // iterate through every possible pairing of articles from liberal set and conservative set
    for (var i in articles[categories[c]]['liberal']) {
      for (var j in articles[categories[c]]['conservative']) {
        if (Math.abs(articles[categories[c]]['liberal'][i]['dateObject'].getTime() - articles[categories[c]]['conservative'][j]['dateObject'].getTime()) > 604800000) {
          continue;
        }
        var scoreKey = i.toString() + "-" + j.toString(j);
        var similarity = calculateSimilarityEntitiesWords(articles[categories[c]]['liberal'][i]['title'], articles[categories[c]]['conservative'][j]['title'], articles[categories[c]]['liberal'][i]['description'], articles[categories[c]]['conservative'][j]['description'], categories[c]);
        //var titleSimilarity = calculateSimilarity(articles[categories[c]]['liberal'][i]['title'], articles[categories[c]]['conservative'][j]['title'], categories[c]);
        matchingScores[scoreKey] = similarity;
        /* originally was doing title and description and then taking the greater of the two as the similarityScore
        but doing just title works better, description can have too many words
        */
        /* var descriptionSimilarity = calculateSimilarity(articles[categories[c]]['liberal'][i]['description'], articles[categories[c]]['conservative'][j]['description'], categories[c]);
        if (titleSimilarity > descriptionSimilarity) {
          var score = titleSimilarity;
        } else {
          var score = descriptionSimilarity;
        }
        matchingScores[scoreKey] = score; */
      }
    }
    // remove pairings that are below the similarityThreshold
    var filtered = Object.assign(...
      Object.entries(matchingScores).filter(([k,v]) => v>similarityThreshold).map(([k,v]) => ({[k]:v}))
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

    function compare(a,b) {
      if (a.score > b.score)
        return -1;
      if (a.score < b.score)
        return 1;
      return 0;
    }

    pairedArticles = pairedArticles.sort(compare);

    pairedArticlesByCategory[categories[c]] = pairedArticles;
  }
  writeToFile(pairedArticlesByCategory);
}

function calculateSimilarity(string1, string2, category) {
  string1 = string1.toLowerCase();
  string2 = string2.toLowerCase();
  // remove numbers
  string1 = string1.replace(/\d+/g, '');
  string2 = string2.replace(/\d+/g, '');
  // remove punctuation
  string1 = string1.replace(/[^\w\s]|_/g, "");
  string2 = string2.replace(/[^\w\s]|_/g, "");
  for (w in categorySynonyms[category]) {
    // remove category words (basically words that are similar to the category we have - prevents matching just because both articles have category)
    string1 = replaceall(categorySynonyms[category][w], "", string1);
    string2 = replaceall(categorySynonyms[category][w], "", string2);
  }
  // remove stop words (clean up string, remove filler words)
  string1 = stopwords.remove(string1, english);
  string2 = stopwords.remove(string2, english);
  // NEED TO ADD - removal of news source words (eg. "washington times", "new york times")
  // remove duplicate words and trim whitespace
  string1 = string1.replace(/(\b\S.+\b)(?=.*\1)/g, "").replace(/\s+/g, " ").trim();
  string2 = string2.replace(/(\b\S.+\b)(?=.*\1)/g, "").replace(/\s+/g, " ").trim();
  /* One idea is to convert all words to an array and then just count which words are similar (or the same), return that as similarity score
  can normalize based on average number of words similarity
  this could work better because then the order of words doesn't make a difference, and it's our own algo
  */
  return stringSimilarity.compareTwoStrings(string1, string2);
}

function calculateSimilarityEntities(title1, title2, description1, description2, category) {
  function getEntities(string1, string2, category) {
    string1 = string1.toLowerCase();
    string2 = string2.toLowerCase();
    // remove numbers
    string1 = string1.replace(/\d+/g, '');
    string2 = string2.replace(/\d+/g, '');
    // remove punctuation
    string1 = string1.replace(/[^\w\s]|_/g, "");
    string2 = string2.replace(/[^\w\s]|_/g, "");
    for (w in categorySynonyms[category]) {
      // remove category words (basically words that are similar to the category we have - prevents matching just because both articles have category)
      string1 = replaceall(categorySynonyms[category][w], "", string1);
      string2 = replaceall(categorySynonyms[category][w], "", string2);
    }
    // removal of news source words
    for (w in newsSourcesRemove) {
      string1 = replaceall(w, "", string1);
      string2 = replaceall(w, "", string2);
    }
    var s1nlp = nlp(string1);
    var s2nlp = nlp(string2);

    var s1e = s1nlp.normalize().topics().data();
    var s2e = s2nlp.normalize().topics().data();


    var s1eArr = [];
    for (e in s1e) {
      s1eArr.push(s1e[e].normal);
    }
    var s2eArr = [];
    for (e in s2e) {
      s2eArr.push(s2e[e].normal);
    }
    return [s1eArr, s2eArr];
  }
  var titleEntities = getEntities(title1, title2, category);
  var descriptionEntities = getEntities(description1, description2, category);
  var entities1 = titleEntities[0].concat(descriptionEntities[0]);
  var entities2 = titleEntities[1].concat(descriptionEntities[1])
  var intersection = []
  for (var e1 of entities1) {
    if (entities2.includes(e1)) {
        intersection.push(e1)
    }
  }
  return intersection.length
}

function calculateSimilarityEntitiesWords(title1, title2, description1, description2, category) {
  function getEntities(string1, string2, category) {

    // remove numbers
    string1 = string1.replace(/\d+/g, '');
    string2 = string2.replace(/\d+/g, '');
    for (w of categorySynonymsUpper[category]) {
      // remove category words (basically words that are similar to the category we have - prevents matching just because both articles have category)
      string1 = replaceall(w, "", string1);
      string2 = replaceall(w, "", string2);
    }
    // removal of news source words
    for (w of newsSourcesRemoveUpper) {
      string1 = replaceall(w, "", string1);
      string2 = replaceall(w, "", string2);
    }

    var s1nlp = nlp(string1);
    var s2nlp = nlp(string2);

    var s1e = s1nlp.normalize().topics().data();
    var s2e = s2nlp.normalize().topics().data();


    var s1eArr = [];
    for (e in s1e) {
      s1eArr.push(s1e[e].normal);
    }
    var s2eArr = [];
    for (e in s2e) {
      s2eArr.push(s2e[e].normal);
    }

    return [s1eArr, s2eArr];
  }

  function getWordsArr(string1, string2, category) {
    string1 = string1.toLowerCase();
    string2 = string2.toLowerCase();
    // remove numbers
    string1 = string1.replace(/\d+/g, '');
    string2 = string2.replace(/\d+/g, '');
    // remove punctuation
    string1 = string1.replace(/[^\w\s]|_/g, "");
    string2 = string2.replace(/[^\w\s]|_/g, "");

    for (w in categorySynonymsLower[category]) {
      // remove category words (basically words that are similar to the category we have - prevents matching just because both articles have category)
      string1 = replaceall(categorySynonymsLower[category][w], "", string1);
      string2 = replaceall(categorySynonymsLower[category][w], "", string2);
    }
    //removal of news source words
    for (w in newsSourcesRemoveLower) {
      string1 = replaceall(newsSourcesRemoveLower[w], "", string1);
      string2 = replaceall(newsSourcesRemoveLower[w], "", string2);
    }
    string1 = stopwords.remove(string1, english);
    string2 = stopwords.remove(string2, english);


    var s1Arr = string1.replace(/\s+/g, " ").trim().split(" ");
    var s2Arr = string2.replace(/\s+/g, " ").trim().split(" ");


    return [s1Arr, s2Arr];
  }

  var titleEntities = getEntities(title1, title2, category);
  var descriptionEntities = getEntities(description1, description2, category);
  var entities1 = titleEntities[0].concat(descriptionEntities[0]);
  var entities2 = titleEntities[1].concat(descriptionEntities[1]);
  var entitiesIntersection = []
  for (var e1 of entities1) {
    if (entities2.includes(e1)) {
        entitiesIntersection.push(e1)
    }
  }
  var titleWords = getWordsArr(title1, title2, category);
  var descriptionWords = getWordsArr(description1, description2, category);
  var words1 = titleWords[0].concat(descriptionWords[0]);
  words1 = Array.from(new Set(words1))
  var words2 = titleWords[1].concat(descriptionWords[1]);
  words2 = Array.from(new Set(words2))
  var wordsIntersection = []
  for (var w1 of words1) {
    if (words2.includes(w1)) {
        wordsIntersection.push(w1)
    }
  }

  var entitiesArr = entitiesIntersection.join(" ").split(" ");
  var wordsArr = wordsIntersection.join(" ").split(" ");
  var wordsArrNoEntities = [];
  for (var w of wordsArr) {
    if (!entitiesArr.includes(w)) {
      wordsArrNoEntities.push(w);
    }
  }


  return (entitiesIntersection.length)*1+(wordsArrNoEntities.length*.5)
}

function writeToFile(dict) {
  var data = JSON.stringify(dict, null, 2);
  fs.writeFileSync('articles.json', data);
}

getArticles(['trump', 'immigration', 'guns', 'healthcare', 'abortion']);

//['trump', 'immigration', 'guns', 'healthcare', 'abortion']
