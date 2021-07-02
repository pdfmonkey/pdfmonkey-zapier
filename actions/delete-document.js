'use strict';

const deleteDocument = (z, bundle) => {
  const options = {
    url: `https://api.pdfmonkey.io/api/v1/documents/${bundle.inputData.documentId}`,
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bundle.authData.secretKey}`
    }
  };

  return z.request(options).then(response => {
    response.throwForStatus();
    return { deletedAt: new Date() };
  });
};

module.exports = {
  key: 'deleteDocument',
  noun: 'Document',

  display: {
    important: true,
    label: 'Delete Document',
    description: 'Deletes a Document.'
  },

  operation: {
    perform: deleteDocument,
    inputFields: [
      {
        key: 'documentId',
        label: 'Document ID',
        type: 'string',
        required: true
      }
    ],
    sample: {
      deletedAt: "2020-09-22T22:00:25.883Z"
    },
    outputFields: [
      {
        key: 'deletedAt',
        label: 'Deletion DateTime',
        type: 'datetime'
      }
    ]
  }
};
