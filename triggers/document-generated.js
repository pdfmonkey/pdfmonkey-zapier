'use strict';

const documentSample = require('../samples/document');
const documentMapping = require('../mappings/document');

const getGeneratedDocuments = (z, bundle) => {
  const params = {
    'q[app_id]': bundle.inputData.appId,
    'page[size]': 100
  };

  if (bundle.inputData.documentTemplateId) {
    params['q[document_template_id]'] = bundle.inputData.documentTemplateId.join(',');
  }

  const options = {
    url: `https://api.pdfmonkey.io/api/v1/documents`,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bundle.authData.secretKey}`
    },
    params: params
  };

  return z.request(options).then(response => {
    response.throwForStatus();

    const results = z.JSON.parse(response.content);
    const documents = results.documents.filter(doc => doc.status == 'success');

    for (let doc of documents) {
      if (doc.payload && doc.payload.length > 2) {
        doc.parsedPayload = JSON.parse(doc.payload);
      }

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
        key: 'appId',
        label: 'App',
        type: 'string',
        required: true,
        dynamic: 'getAllApps.id.identifier',
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
