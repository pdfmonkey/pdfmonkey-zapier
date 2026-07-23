'use strict';

const crypto = require('crypto');
const documentCardSample = require('../samples/document-card');
const documentCardMapping = require('../mappings/document-card');

const payloadInput = (z, bundle) => {
  if (bundle.inputData.realJson === 'Yes') {
    return [
      {
        key: 'payload',
        label: 'Data for the Document (JSON Payload)',
        helpText: 'Use the JSON format `{ "firstname": "Jane", "lastname": "Doe" }`.',
        type: 'text'
      }
    ];
  }

  return [
    {
      key: 'payloadDict',
      label: 'Data for the Document',
      dict: true
    }
  ];
};

const lineItemsPayloadInput = (z, bundle) => {
  if (bundle.inputData.useLineItems === 'Yes') {
    let fields;

    if (bundle.inputData.realJson === 'Yes') {
      fields = [
        {
          key: 'itemPayload',
          label: 'Dynamic Data for an Item (JSON Payload)',
          type: 'text',
          helpText:
            'JSON Payload **for a single item**. Format: `{ "name": "Cool product", "price": 123.45 }`. Available as `lineItems` in your PDFMonkey Template.',
          default: '{\n  "name": "Cool product",\n  "price": 123.45\n}'
        }
      ];
    } else {
      fields = [
        {
          key: 'itemPayloadDict',
          label: 'Dynamic Data for an Item',
          helpText:
            'Data **for a single item**. Available as `lineItems` in your PDFMonkey Template.',
          dict: true
        }
      ];
    }

    return [
      {
        key: 'lineItems',
        label: 'Line Items',
        children: fields
      }
    ];
  }

  return [];
};

const cleanupDocument = (document, z) => {
  if (document.meta && document.meta.length > 2) {
    try {
      document.parsedMeta = z.JSON.parse(document.meta);
      delete document.parsedMeta._webhook_channel;
    } catch (error) {
      z.console.log('Error parsing meta:', error);
    }
  }

  return document;
};

const deleteRestHook = async (z, secretKey, restHookId) => {
  const response = await z.request({
    url: `https://api.pdfmonkey.io/api/v1/rest_hooks/${restHookId}`,
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${secretKey}`
    }
  });

  response.throwForStatus();
};

// Generating a Document can take longer than Zapier's ~30s synchronous limit.
// Instead of polling until it's done, we register a per-run webhook scoped to a
// unique channel, hand Zapier a callback URL, and return immediately. Zapier
// pauses the Task until PDFMonkey notifies that channel, and `resumeDocument`
// picks it back up.
const generateDocument = async (z, bundle) => {
  let payload;

  let filename = bundle.inputData.filename;
  let meta = bundle.inputData.meta || {};
  let lineItems = bundle.inputData.lineItems || [];
  let useLineItems = bundle.inputData.useLineItems === 'Yes';

  if (bundle.inputData.realJson === 'Yes') {
    payload = JSON.parse(bundle.inputData.payload);

    if (useLineItems) {
      payload.lineItems = lineItems.map((item) => JSON.parse(item.itemPayload));
    }
  } else {
    payload = bundle.inputData.payloadDict || {};

    if (useLineItems) {
      payload.lineItems = lineItems.map((item) => item.itemPayloadDict);
    }
  }

  if (!meta._filename && typeof filename === 'string') {
    meta._filename = filename;
  }

  // Registering a callback while Zapier loads a sample would leave the Task
  // hanging, so return a static sample synchronously instead.
  if (bundle.meta && bundle.meta.isLoadingSample) {
    return documentCardSample;
  }

  const callbackUrl = z.generateCallbackUrl();
  const channel = `zapier-${crypto.randomUUID()}`;

  // PDFMonkey routes each Document to a single `_webhook_channel`, so we must
  // claim it for this run's callback, overriding any value the user provided.
  if (meta._webhook_channel) {
    z.console.log('Overriding the provided meta._webhook_channel to route this run’s callback.');
  }
  meta._webhook_channel = channel;

  // Register the webhook BEFORE creating the Document so we never miss a
  // generation that completes immediately.
  const hookResponse = await z.request({
    url: 'https://api.pdfmonkey.io/api/v1/rest_hooks',
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bundle.authData.secretKey}`,
      'Content-Type': 'application/json'
    },
    body: {
      rest_hook: {
        custom_channel: channel,
        event: 'documents.generation.success,documents.generation.failure',
        platform: 'Zapier',
        url: callbackUrl,
        workspace_id: bundle.inputData.workspaceId
      }
    }
  });

  hookResponse.throwForStatus();
  const restHookId = z.JSON.parse(hookResponse.content).rest_hook.id;

  let createResponse;

  try {
    createResponse = await z.request({
      url: 'https://api.pdfmonkey.io/api/v1/documents',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${bundle.authData.secretKey}`,
        'Content-Type': 'application/json'
      },
      body: {
        document: {
          document_template_id: bundle.inputData.documentTemplateId,
          meta: JSON.stringify(meta),
          payload: JSON.stringify(payload),
          status: 'pending'
        }
      }
    });

    createResponse.throwForStatus();
  } catch (error) {
    // The webhook is already registered but no Document will ever notify it.
    // Drop the orphaned hook before surfacing the original failure.
    try {
      await deleteRestHook(z, bundle.authData.secretKey, restHookId);
    } catch (cleanupError) {
      z.console.log('Failed to remove the temporary webhook after a failed creation:', cleanupError);
    }

    throw error;
  }

  const document = z.JSON.parse(createResponse.content).document;

  return {
    id: document.id,
    status: document.status,
    _restHookId: restHookId
  };
};

// Called when PDFMonkey POSTs the finished DocumentCard to the callback URL.
const resumeDocument = async (z, bundle) => {
  const restHookId = bundle.outputData && bundle.outputData._restHookId;

  // Best-effort cleanup of the per-run webhook — never let it fail the run.
  if (restHookId) {
    try {
      await deleteRestHook(z, bundle.authData.secretKey, restHookId);
    } catch (error) {
      z.console.log('Failed to remove the temporary webhook:', error);
    }
  }

  // The callback body is a DocumentCard wrapped in a `document` key. We hand it
  // back whether generation succeeded or failed (never branching on status) so
  // the user can route downstream themselves.
  const result = z.JSON.parse(bundle.rawRequest.content);

  return cleanupDocument(result.document, z);
};

module.exports = {
  key: 'generateDocument',
  noun: 'Document',

  display: {
    label: 'Generate Document',
    description: 'Generates a Document.'
  },

  operation: {
    perform: generateDocument,
    performResume: resumeDocument,
    inputFields: [
      {
        key: 'workspaceId',
        label: 'Workspace',
        type: 'string',
        required: true,
        altersDynamicFields: true,
        dynamic: 'getAllWorkspaces.id.identifier'
      },
      {
        key: 'documentTemplateId',
        label: 'Template',
        type: 'string',
        required: true,
        dynamic: 'getAllTemplates.id.identifier'
      },
      {
        key: 'realJson',
        label: 'Use a custom JSON structure',
        type: 'string',
        choices: ['Yes', 'No'],
        helpText:
          'Select Yes if you prefer writing a complete JSON payload instead of a basic Zapier mapping for the Document data.',
        default: 'No',
        required: true,
        altersDynamicFields: true
      },
      payloadInput,
      {
        key: 'useLineItems',
        label: 'Add Line Items',
        type: 'string',
        choices: ['Yes', 'No'],
        helpText: 'Select Yes to add data for Line Items (in an invoice for instance).',
        default: 'No',
        required: false,
        altersDynamicFields: true
      },
      lineItemsPayloadInput,
      {
        key: 'filename',
        label: 'Custom Filename',
        type: 'string',
        helpText:
          'You can specify a custom filename for generated documents. A random value will be used if left empty.',
        required: false
      },
      {
        key: 'meta',
        label: 'Meta Data',
        helpText:
          'Additional data attached to the generated Document but not accessible in its Template.',
        dict: true,
        required: false,
        altersDynamicFields: false
      }
    ],
    sample: documentCardSample,
    outputFields: documentCardMapping.fields
  }
};
