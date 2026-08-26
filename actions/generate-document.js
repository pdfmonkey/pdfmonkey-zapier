'use strict';

const crypto = require('crypto');
const cleanupDocument = require('../lib/cleanup-document');
const documentCardSample = require('../samples/document-card');
const documentCardMapping = require('../mappings/document-card');

// Boolean fields deliver `true`/`false`; Zaps saved before these fields became
// booleans used a 'Yes'/'No' dropdown. Accept both so existing Tasks keep working.
const isEnabled = (value) => value === true || value === 'Yes';

// Native `json` fields arrive parsed, but a field mapped to a single string
// value can still come through as text — normalize either shape to an object,
// surfacing a readable message instead of a raw SyntaxError on bad input.
const asObject = (value, z, label) => {
  if (typeof value !== 'string') return value || {};

  try {
    return z.JSON.parse(value);
  } catch (error) {
    throw new z.errors.Error(`The ${label} isn't valid JSON. Please check its syntax.`, 'InvalidPayload', 400);
  }
};

const payloadInput = (z, bundle) => {
  if (isEnabled(bundle.inputData.realJson)) {
    return [
      {
        key: 'payload',
        label: 'Data for the Document (JSON Payload)',
        helpText: 'Use the JSON format `{ "firstname": "Jane", "lastname": "Doe" }`.',
        type: 'code'
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
  if (isEnabled(bundle.inputData.useLineItems)) {
    let fields;

    if (isEnabled(bundle.inputData.realJson)) {
      fields = [
        {
          key: 'itemPayload',
          label: 'Dynamic Data for an Item (JSON Payload)',
          type: 'code',
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Zapier gives a `perform` 30 seconds total, so budget the wait on wall-clock
// rather than a poll count: the count alone ignores request latency and would
// overrun on a slow network.
const POLL_INTERVAL = 1000;
const POLL_BUDGET = 25000;

const fetchDocument = async (z, secretKey, documentId) => {
  const response = await z.request({
    url: `https://api.pdfmonkey.io/api/v1/documents/${documentId}`,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${secretKey}`
    }
  });

  response.throwForStatus();

  return z.JSON.parse(response.content).document;
};

const isSettled = (document) => document.status === 'success' || document.status === 'failure';

const waitForDocument = async (z, secretKey, documentId) => {
  const deadline = Date.now() + POLL_BUDGET;
  let document;

  do {
    await sleep(POLL_INTERVAL);
    document = await fetchDocument(z, secretKey, documentId);
  } while (!isSettled(document) && Date.now() < deadline);

  if (!isSettled(document)) {
    z.console.log(`Document ${documentId} was still generating after ${POLL_BUDGET}ms.`);
  }

  // A Document carries more than the DocumentCard a callback delivers. Drop the
  // extras so the sample matches the shape live Tasks will actually receive.
  delete document.checksum;
  delete document.payload;
  delete document.preview_url;

  return cleanupDocument(document, z, { stripWebhookChannel: true });
};

const createDocument = async (z, bundle, meta, payload) => {
  const response = await z.request({
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

  response.throwForStatus();

  return z.JSON.parse(response.content).document;
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
// On a live Task, instead of polling until it's done, we register a per-run
// webhook scoped to a unique channel, hand Zapier a callback URL, and return
// immediately. Zapier pauses the Task until PDFMonkey notifies that channel,
// and `resumeDocument` picks it back up, removing the webhook on its way out.
//
// The Zap editor is the exception: it never pauses a test for a callback, so
// the user would only ever see a `pending` Document. There we generate a real
// Document too — proving the template and payload work — but wait for it by
// polling, which fits within the editor's synchronous run.
const generateDocument = async (z, bundle) => {
  let payload;

  let filename = bundle.inputData.filename;
  let meta = bundle.inputData.meta || {};
  let lineItems = bundle.inputData.lineItems || [];
  let useLineItems = isEnabled(bundle.inputData.useLineItems);

  if (isEnabled(bundle.inputData.realJson)) {
    payload = asObject(bundle.inputData.payload, z, 'JSON payload');

    if (useLineItems) {
      payload.lineItems = lineItems.map((item) => asObject(item.itemPayload, z, 'line item JSON'));
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

  if (bundle.meta && bundle.meta.isLoadingSample) {
    const document = await createDocument(z, bundle, meta, payload);

    return waitForDocument(z, bundle.authData.secretKey, document.id);
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

  let document;

  try {
    document = await createDocument(z, bundle, meta, payload);
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

  return cleanupDocument(result.document, z, { stripWebhookChannel: true });
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
        type: 'boolean',
        helpText:
          'Enable to write a complete JSON payload instead of a basic Zapier mapping for the Document data.',
        default: 'false',
        altersDynamicFields: true
      },
      payloadInput,
      {
        key: 'useLineItems',
        label: 'Add Line Items',
        type: 'boolean',
        helpText: 'Enable to add data for Line Items (in an invoice for instance).',
        default: 'false',
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
