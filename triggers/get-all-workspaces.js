'use strict';

const getAllWorkspaces = (z, bundle) => {
  const options = {
    url: 'https://api.pdfmonkey.io/api/v1/workspace_cards',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bundle.authData.secretKey}`
    }
  };

  return z.request(options).then(response => {
    response.throwForStatus();
    const results = z.JSON.parse(response.content);
    const workspaces = results.workspace_cards.map(({id, identifier}) => ({ id, identifier }));
    return workspaces;
  });
};

module.exports = {
  key: 'getAllWorkspaces',
  noun: 'Workspace',

  display: {
    hidden: true,
    important: false,
    label: 'Fetch all workspaces',
    description: 'Fetch all accessible workspaces.'
  },

  operation: {
    perform: getAllWorkspaces,
    sample: {
      id: '11111111-2222-3333-4444-555555555555',
      identifier: 'Example Workspace'
    },
    outputFields: [
      { key: 'id',          label: 'ID',   type: 'string' },
      { key: 'identifier',  label: 'Name', type: 'string' }
    ]
  }
};
