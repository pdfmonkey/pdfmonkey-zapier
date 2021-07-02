'use strict';

const getAllTemplates = (z, bundle) => {
  const options = {
    url: 'https://api.pdfmonkey.io/api/v1/document_template_cards',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bundle.authData.secretKey}`
    },
    params: {
      'q[app_id]': bundle.inputData.appId
    }
  };

  return z.request(options).then(response => {
    response.throwForStatus();
    const results = z.JSON.parse(response.content);
    return results.document_template_cards;
  });
};

module.exports = {
  key: 'getAllTemplates',
  noun: 'Template',

  display: {
    hidden: true,
    important: false,
    label: 'Fetch all templates',
    description: 'Fetch all accessible templates.'
  },

  operation: {
    perform: getAllTemplates,
    inputFields: [
      {
        key: 'appId',
        label: 'App',
        type: 'string',
        required: true,
        dynamic: 'getAllApps.id.identifier'
      }
    ],
    sample: {
      id: '08521cf9-c591-41dc-a062-d1573ef6c4f4',
      app_id: '01c981ba-4540-4022-9cf9-0c7a18e6af0f',
      auth_token: '21e38f178a36da2a48cd69e7fc4b9987',
      created_at: '2019-10-30T20:24:35.333+01:00',
      identifier: 'PDFM_Example',
      updated_at: '2020-03-27T16:20:42.703+01:00',
      legacy: true
    },
    outputFields: [
      { key: 'id',         label: 'ID',   type: 'string' },
      { key: 'identifier', label: 'Name', type: 'string' }
    ]
  }
};
