const stringSimilarity = require('string-similarity');
const stopwords = require('nltk-stopwords')
const english = stopwords.load('english')
const replaceall = require("replaceall");


var string1 = "The relationship between Rupert Murdoch and Donald J. Trump, a presidential candidate at the time, reached a turning point when they met at Trump International Golf Links Scotland on June 25, 2016.";
var string2 = "Washington Times Trump slams Democrats' 'phony' excuse of Russia allegations Washington Times President Donald Trump waves as he boards Air Force One with first lady Melania Trump, and Barron Trump, 11, at the Palm Beach International Airport, Sunday, Nov. 26…";


const categorySynonyms = {
  trump: ['trump', 'donald', ' president ', 'potus', ' j '],
  immigration: ['immigration', 'immigrants'],
  guns: ['guns', 'firearms', 'gun'],
  healthcare: ['healthcare', 'health', 'health']
};

function calculateSimilarity(string1, string2, category) {
  console.log("nothing changed str1: " + string1);
  console.log("nothing changed str2: " + string2);
  string1 = string1.toLowerCase();
  string2 = string2.toLowerCase();
  string1 = string1.replace(/\d+/g, '');
  string2 = string2.replace(/\d+/g, '');
  string1 = string1.replace(/[^\w\s]|_/g, "");
  string2 = string2.replace(/[^\w\s]|_/g, "");
  for (w in categorySynonyms[category]) {
    string1 = replaceall(categorySynonyms[category][w], "", string1);
    string2 = replaceall(categorySynonyms[category][w], "", string2);
  }
  console.log("lower case, replace category words str1: " + string1);
  console.log("lower case, replace category words str2: " + string2);
  string1 = stopwords.remove(string1, english);
  string2 = stopwords.remove(string2, english);
  string1 = string1.replace(/(\b\S.+\b)(?=.*\1)/g, "").replace(/\s+/g, " ").trim();
  string2 = string2.replace(/(\b\S.+\b)(?=.*\1)/g, "").replace(/\s+/g, " ").trim();
  console.log("remove stop words, remove duplicates, trim whitespace str1: " + string1);
  console.log("remove stop words, remove duplicates, trim whitespace str2: " + string2);
  console.log("similarity score: " + stringSimilarity.compareTwoStrings(string1, string2));
}

calculateSimilarity(string1, string2, 'trump');
