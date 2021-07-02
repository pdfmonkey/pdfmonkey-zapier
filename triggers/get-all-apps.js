'use strict';

const getAllApps = (z, bundle) => {
  const options = {
    url: 'https://api.pdfmonkey.io/api/v1/apps',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bundle.authData.secretKey}`
    }
  };

  return z.request(options).then(response => {
    response.throwForStatus();
    const results = z.JSON.parse(response.content);
    const apps = results.apps.map(({id, identifier}) => ({ id, identifier }));
    return apps;
  });
};

module.exports = {
  key: 'getAllApps',
  noun: 'App',

  display: {
    hidden: true,
    important: false,
    label: 'Fetch all apps',
    description: 'Fetch all accessible apps.'
  },

  operation: {
    perform: getAllApps,
    sample: {
      id: '11111111-2222-3333-4444-555555555555',
      identifier: 'Example App'
    },
    outputFields: [
      { key: 'id',          label: 'ID',   type: 'string' },
      { key: 'identifier',  label: 'Name', type: 'string' }
    ]
  }
};
