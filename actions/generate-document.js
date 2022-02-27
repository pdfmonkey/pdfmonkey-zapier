'use strict';

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
          helpText: 'JSON Payload **for a single item**. Format: `{ "name": "Cool product", "price": 123.45 }`. Available as `lineItems` in your PDFMonkey Template.',
          default: "{\n  \"name\": \"Cool product\",\n  \"price\": 123.45\n}"
        }
      ];
    }
    else {
      fields = [
        {
          key: 'itemPayloadDict',
          label: 'Dynamic Data for an Item',
          helpText: 'Data **for a single item**. Available as `lineItems` in your PDFMonkey Template.',
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

const generateDocument = (z, bundle) => {
  let payload;

  let filename = bundle.inputData.filename;
  let meta = bundle.inputData.meta || {};
  let lineItems = bundle.inputData.lineItems || [];
  let useLineItems = bundle.inputData.useLineItems === 'Yes';

  if (bundle.inputData.realJson === 'Yes') {
    payload = JSON.parse(bundle.inputData.payload);

    if (useLineItems) {
      payload.lineItems = lineItems.map(item => JSON.parse(item.itemPayload));
    }
  }
  else {
    payload = bundle.inputData.payloadDict || {};

    if (useLineItems) {
      payload.lineItems = lineItems.map(item => item.itemPayloadDict);
    }
  }

  if (!meta._filename && typeof filename === 'string') {
    meta._filename = filename;
  }

  const options = {
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
  };

  return z.request(options).then(async (response) => {
    response.throwForStatus();

    let result = z.JSON.parse(response.content);
    let documentId = result.document.id;
    let documentStatus = result.document.status;

    const getOptions = {
      url: `https://api.pdfmonkey.io/api/v1/documents/${documentId}`,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${bundle.authData.secretKey}`
      }
    };

    while (documentStatus != 'success' && documentStatus != 'failure') {
      response = await z.request(getOptions);
      response.throwForStatus();
      result = z.JSON.parse(response.content);
      documentStatus = result.document.status;
    }

    if (result.document.payload && result.document.payload.length > 2) {
      result.document.parsedPayload = JSON.parse(result.document.payload);
    }

    if (result.document.meta && result.document.meta.length > 2) {
      result.document.parsedMeta = JSON.parse(result.document.meta);
    }

    return result.document;
  });
};

module.exports = {
  key: 'generateDocument',
  noun: 'Document',

  display: {
    important: true,
    label: 'Generate Document',
    description: 'Generates a Document.'
  },

  operation: {
    perform: generateDocument,
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
        helpText: 'Select Yes if you prefer writing a complete JSON payload instead of a basic Zapier mapping for the Document data.',
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
        helpText: 'You can specify a custom filename for generated documents. A random value will be used if left empty.',
        required: false
      },
      {
        key: 'meta',
        label: 'Meta Data',
        helpText: 'Additional data attached to the generated Document but not accessible in its Template.',
        dict: true,
        required: false,
        altersDynamicFields: false
      }
    ],
    sample: documentCardSample,
    outputFields: documentCardMapping.fields
  }
};
