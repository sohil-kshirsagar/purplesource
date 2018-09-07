const nlp = require('compromise')
const stopwords = require('nltk-stopwords')
const english = stopwords.load('english')
const replaceall = require("replaceall");

const blueSources = ['al-jazeera-english', 'the-new-york-times', 'bbc-news', 'the-huffington-post', 'the-washington-post'];
const redSources = ['fox-news', 'breitbart-news', 'national-review', 'the-washington-times', 'the-american-conservative'];
const newsSourcesRemove = ['al jazeera', 'new york times', 'bbc', 'huffington post', 'washington post', 'fox news', 'breitbart', 'national review', 'washington times', 'american conservative']
const leanings = ['liberal', 'conservative'];
const categorySynonyms = {
  trump: ['trump', 'donald', ' president ', 'potus', ' j '],
  immigration: ['immigration', 'immigrants'],
  guns: ['guns', 'firearms', 'gun'],
  healthcare: ['healthcare', 'health', 'health'],
  abortion: ['abortion']
};

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
  return intersection
}

var title1 = "New York Investigators Subpoena Michael Cohen for Documents Linked to Trump Foundation";
var title2 = "Subpoena Michael Cohen for Documents to Trump Foundation and Vladimir Putin";
var description1 = "Tyler Johnson and Isabel Llacer"
var description2 = "Tyler Johnson"

console.log(calculateSimilarityEntities(title1, title2, description1, description2, 'trump'))
