'use strict';

const documentSample = require('../samples/document');
const documentMapping = require('../mappings/document');

const getGeneratedDocuments = (z, bundle) => {
  const params = {
    'q[workspace_id]': bundle.inputData.workspaceId,
    'page[size]': 100
  };

  if (bundle.inputData.documentTemplateId) {
    params['q[document_template_id]'] = bundle.inputData.documentTemplateId.join(',');
  }

  const options = {
    url: `https://api.pdfmonkey.io/api/v1/document_cards`,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bundle.authData.secretKey}`
    },
    params: params
  };

  return z.request(options).then(response => {
    response.throwForStatus();

    const results = z.JSON.parse(response.content);
    const documents = results.document_cards.filter(doc => doc.status == 'success');

    for (let doc of documents) {
      if (doc.meta && doc.meta.length > 2) {
        doc.parsedMeta = JSON.parse(doc.meta);
      }
    }

    return documents;
  });
};

module.exports = {
  key: 'documentGenerated',
  noun: 'Document',

  display: {
    hidden: false,
    important: true,
    label: 'Document Generated',
    description: "Triggers when a document's generation is complete and successful."
  },

  operation: {
    perform: getGeneratedDocuments,
    inputFields: [
      {
        key: 'workspaceId',
        label: 'Workspace',
        type: 'string',
        required: true,
        dynamic: 'getAllWorkspaces.id.identifier',
        altersDynamicFields: true
      },
      {
        key: 'documentTemplateId',
        label: 'Template(s)',
        helpText: 'Apply this trigger only for specific templates',
        type: 'string',
        required: false,
        list: true,
        dynamic: 'getAllTemplates.id.identifier',
      }
    ],
    sample: documentSample,
    outputFields: documentMapping.fields
  }
};
