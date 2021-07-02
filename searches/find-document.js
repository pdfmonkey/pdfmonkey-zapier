'use strict';

const documentSample = require('../samples/document');
const documentMapping = require('../mappings/document');

const findDocument = (z, bundle) => {
  const options = {
    method: 'GET',
    url: `https://api.pdfmonkey.io/api/v1/documents/${bundle.inputData.documentId}`,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bundle.authData.secretKey}`
    }
  };

  return z.request(options).then(response => {
    response.throwForStatus();
    const result = z.JSON.parse(response.content);

    if (result.document.payload && result.document.payload.length > 2) {
      result.document.parsedPayload = JSON.parse(result.document.payload);
    }

    if (result.document.meta && result.document.meta.length > 2) {
      result.document.parsedMeta = JSON.parse(result.document.meta);
    }

    return [result.document];
  });
};

module.exports = {
  key: 'findDocument',
  noun: 'Document',

  display: {
    important: true,
    label: 'Find Document',
    description: 'Find a document in PDFMonkey.'
  },

  operation: {
    perform: findDocument,
    inputFields: [
      {
        key: 'documentId',
        label: 'Document ID',
        type: 'string',
        required: true
      }
    ],
    sample: documentSample,
    outputFields: documentMapping.fields
  }
};
