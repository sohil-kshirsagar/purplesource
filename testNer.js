const nlp = require('compromise')
const stopwords = require('nltk-stopwords')
const english = stopwords.load('english')
const replaceall = require("replaceall");

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


    console.log(string1);
    console.log(string2);


    var s1Arr = string1.replace(/\s+/g, " ").trim().split(" ");
    var s2Arr = string2.replace(/\s+/g, " ").trim().split(" ");

    console.log(s1Arr);
    console.log(s2Arr);

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
  console.log(titleWords);
  var descriptionWords = getWordsArr(description1, description2, category);
  console.log(descriptionWords);
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

  console.log(entitiesIntersection, wordsArr, wordsArrNoEntities);

  return (entitiesIntersection.length)*1+(wordsArrNoEntities.length*.5)
}

var title1 = "A Whirlwind Envelops the White House, and the Revolving Door Spins";
var title2 = "Trump: Russian collusion is a 'witch hunt' - Washington Times";
var description1 = "The White House turnover rate in the first year of Donald J. Trump’s presidency has been 34 percent. That’s a modern record."
var description2 = "Washington Times Trump: Russian collusion is a 'witch hunt' Washington Times President Donald Trump speaks during a meeting with the members of the National Governors Association in the State Dining Room of the White House, Monday, Feb. 26, 2018, in Washingto…"

console.log(calculateSimilarityEntitiesWords(title1, title2, description1, description2, 'trump'));
