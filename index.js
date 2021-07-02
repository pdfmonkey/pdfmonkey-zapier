const authentication = require('./authentication');

const documentGeneratedTrigger = require('./triggers/document-generated');
const getAllAppsTrigger = require('./triggers/get-all-apps');
const getAllTemplatesTrigger = require('./triggers/get-all-templates');

const findDocumentSearch = require('./searches/find-document');

const generateDocumentAction = require('./actions/generate-document');
const deleteDocumentAction = require('./actions/delete-document');

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,

  authentication,

  triggers: {
    [documentGeneratedTrigger.key]: documentGeneratedTrigger,
    [getAllAppsTrigger.key]: getAllAppsTrigger,
    [getAllTemplatesTrigger.key]: getAllTemplatesTrigger
  },

  searches: {
    [findDocumentSearch.key]: findDocumentSearch
  },

  creates: {
    [deleteDocumentAction.key]: deleteDocumentAction,
    [generateDocumentAction.key]: generateDocumentAction
  }
};
