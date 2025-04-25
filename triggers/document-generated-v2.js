'use strict';

const documentSample = require('../samples/document');
const documentMapping = require('../mappings/document');

const subscribeHook = async (z, bundle) => {
  const response = await z.request({
    url: 'https://api.pdfmonkey.io/api/v1/rest_hooks',
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bundle.authData.secretKey}`
    },
    body: JSON.stringify({
      rest_hook: {
        document_template_ids: bundle.inputData.documentTemplateId || [],
        event: 'documents.generation.success',
        platform: 'Zapier',
        url: bundle.targetUrl,
        workspace_id: bundle.inputData.workspaceId
      }
    })
  });

  response.throwForStatus();
  const results = z.JSON.parse(response.content);

  return results.rest_hook;
};

const unsubscribeHook = async (z, bundle) => {
  const { id, workspace_id } = bundle.subscribeData;
  const response = await z.request({
    url: `https://api.pdfmonkey.io/api/v1/rest_hooks/${id}`,
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bundle.authData.secretKey}`
    }
  });

  response.throwForStatus();

  return {};
};

const performHook = (z, bundle) => {
  const result = JSON.parse(bundle.rawRequest.content);
  const document = cleanupDocument(result.document, z);

  return [document];
};

const cleanupDocument = (document, z) => {
  if (document.meta && document.meta.length > 2) {
    try {
      document.parsedMeta = z.JSON.parse(document.meta);
    } catch (error) {
      z.console.log('Error parsing meta:', error);
    }
  }

  return document;
};

const getSampleDocuments = async (z, bundle) => {
  const params = {
    'q[workspace_id]': bundle.inputData.workspaceId,
    'page[size]': 3
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

  const response = await z.request(options);
  response.throwForStatus();

  const results = z.JSON.parse(response.content);
  const documents = results.document_cards.filter((doc) => doc.status == 'success');

  return documents.map((doc) => cleanupDocument(doc, z));
};

module.exports = {
  key: 'documentGenerated_v2',
  noun: 'Document',

  display: {
    hidden: false,
    label: 'Document Generated',
    description: "Triggers when a document's generation is complete and successful."
  },

  operation: {
    type: 'hook',
    performSubscribe: subscribeHook,
    performUnsubscribe: unsubscribeHook,
    perform: performHook,
    performList: getSampleDocuments,
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
        dynamic: 'getAllTemplates.id.identifier'
      }
    ],
    sample: documentSample,
    outputFields: documentMapping.fields
  }
};
