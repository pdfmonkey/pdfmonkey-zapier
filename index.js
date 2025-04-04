const authentication = require('./authentication');

const documentGeneratedTrigger = require('./triggers/document-generated');
const documentGeneratedTriggerV2 = require('./triggers/document-generated-v2');
const getAllWorkspacesTrigger = require('./triggers/get-all-workspaces');
const getAllTemplatesTrigger = require('./triggers/get-all-templates');

const findDocumentSearch = require('./searches/find-document');

const generateDocumentAction = require('./actions/generate-document');
const deleteDocumentAction = require('./actions/delete-document');

module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,

  authentication,

  triggers: {
    [documentGeneratedTriggerV2.key]: documentGeneratedTriggerV2,
    [documentGeneratedTrigger.key]: documentGeneratedTrigger,
    [getAllWorkspacesTrigger.key]: getAllWorkspacesTrigger,
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
