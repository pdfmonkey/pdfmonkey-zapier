'use strict';

const App = require('../../index');
const documentCardSample = require('../../samples/document-card');
const zapier = require('zapier-platform-core');
const { bundleWithAuth, pdfmonkeyApi } = require('../test-helpers');

const appTester = zapier.createAppTester(App);

const TEMPLATE_ID = '11111111-2222-3333-4444-555555555555';
const WORKSPACE_ID = '66666666-7777-8888-9999-000000000000';
const REST_HOOK_ID = '123456';

// Captures the bodies PDFMonkey receives so tests can assert on the generated
// channel, which is only known at runtime.
const mockGeneration = () => {
  const captured = {};

  beforeEach(() => {
    captured.hook = null;
    captured.document = null;

    pdfmonkeyApi
      .post('/api/v1/rest_hooks', (body) => {
        captured.hook = body.rest_hook;
        return true;
      })
      .reply(201, { rest_hook: { id: REST_HOOK_ID } });

    pdfmonkeyApi
      .post('/api/v1/documents', (body) => {
        captured.document = body.document;
        return true;
      })
      .reply(201, { document: { id: 'doc-1', status: 'pending' } });
  });

  return captured;
};

describe('Actions::GenerateDocument', () => {
  zapier.tools.env.inject();

  describe('perform', () => {
    describe('with basic data', () => {
      const captured = mockGeneration();

      const bundle = {
        ...bundleWithAuth(),
        inputData: {
          workspaceId: WORKSPACE_ID,
          documentTemplateId: TEMPLATE_ID,
          payloadDict: { name: 'Jane Doe' }
        }
      };

      it('registers a channel-scoped webhook and returns the pending Document', (done) => {
        appTester(App.creates.generateDocument.operation.perform, bundle)
          .then((response) => {
            expect(response).toEqual({
              id: 'doc-1',
              status: 'pending',
              _restHookId: REST_HOOK_ID
            });

            const channel = captured.hook.custom_channel;
            expect(channel).toMatch(/^zapier-/);
            expect(captured.hook.event).toEqual(
              'documents.generation.success,documents.generation.failure'
            );
            expect(captured.hook.url).toBeDefined();
            expect(captured.hook.workspace_id).toEqual(WORKSPACE_ID);

            expect(JSON.parse(captured.document.meta)._webhook_channel).toEqual(channel);
            done();
          })
          .catch(done);
      });
    });

    describe('with data and line items', () => {
      const captured = mockGeneration();

      const bundle = {
        ...bundleWithAuth(),
        inputData: {
          workspaceId: WORKSPACE_ID,
          documentTemplateId: TEMPLATE_ID,
          payloadDict: { name: 'Jane Doe' },
          useLineItems: true,
          lineItems: [
            { itemPayloadDict: { name: 'Line Item 1' } },
            { itemPayloadDict: { name: 'Line Item 2' } }
          ]
        }
      };

      it('sends the line items in the payload', (done) => {
        appTester(App.creates.generateDocument.operation.perform, bundle)
          .then((response) => {
            expect(response.id).toEqual('doc-1');
            expect(JSON.parse(captured.document.payload).lineItems).toEqual([
              { name: 'Line Item 1' },
              { name: 'Line Item 2' }
            ]);
            done();
          })
          .catch(done);
      });
    });

    describe('with data as real JSON', () => {
      const captured = mockGeneration();

      // The `code` field delivers the payload as a raw JSON string.
      const bundle = {
        ...bundleWithAuth(),
        inputData: {
          workspaceId: WORKSPACE_ID,
          documentTemplateId: TEMPLATE_ID,
          payload: '{ "name": "Jane Doe" }',
          realJson: true
        }
      };

      it('sends the parsed payload', (done) => {
        appTester(App.creates.generateDocument.operation.perform, bundle)
          .then((response) => {
            expect(response.id).toEqual('doc-1');
            expect(JSON.parse(captured.document.payload)).toEqual({ name: 'Jane Doe' });
            done();
          })
          .catch(done);
      });
    });

    describe('with data and line items as real JSON', () => {
      const captured = mockGeneration();

      const bundle = {
        ...bundleWithAuth(),
        inputData: {
          workspaceId: WORKSPACE_ID,
          documentTemplateId: TEMPLATE_ID,
          payload: '{ "name": "Jane Doe" }',
          realJson: true,
          useLineItems: true,
          lineItems: [{ itemPayload: '{ "name": "Line Item 1" }' }, { itemPayload: '{ "name": "Line Item 2" }' }]
        }
      };

      it('sends the parsed line items', (done) => {
        appTester(App.creates.generateDocument.operation.perform, bundle)
          .then((response) => {
            expect(response.id).toEqual('doc-1');
            expect(JSON.parse(captured.document.payload).lineItems).toEqual([
              { name: 'Line Item 1' },
              { name: 'Line Item 2' }
            ]);
            done();
          })
          .catch(done);
      });
    });

    // Zaps saved before these inputs became native boolean fields still send
    // 'Yes' for the toggles; the tolerant helpers must accept them.
    describe('with legacy string inputs', () => {
      const captured = mockGeneration();

      const bundle = {
        ...bundleWithAuth(),
        inputData: {
          workspaceId: WORKSPACE_ID,
          documentTemplateId: TEMPLATE_ID,
          payload: '{ "name": "Jane Doe" }',
          realJson: 'Yes',
          useLineItems: 'Yes',
          lineItems: [{ itemPayload: '{ "name": "Line Item 1" }' }]
        }
      };

      it('parses the stringified payload and line items', (done) => {
        appTester(App.creates.generateDocument.operation.perform, bundle)
          .then(() => {
            const payload = JSON.parse(captured.document.payload);
            expect(payload).toEqual({ name: 'Jane Doe', lineItems: [{ name: 'Line Item 1' }] });
            done();
          })
          .catch(done);
      });
    });

    describe('with malformed JSON payload', () => {
      const bundle = {
        ...bundleWithAuth(),
        inputData: {
          workspaceId: WORKSPACE_ID,
          documentTemplateId: TEMPLATE_ID,
          payload: '{ not valid',
          realJson: true
        }
      };

      it('rejects with a readable message and never registers a webhook', (done) => {
        appTester(App.creates.generateDocument.operation.perform, bundle)
          .then(() => done(new Error('expected the run to reject')))
          .catch((error) => {
            expect(error.message).toContain("isn't valid JSON");
            done();
          });
      });
    });

    describe('when a custom _webhook_channel is provided', () => {
      const captured = mockGeneration();

      const bundle = {
        ...bundleWithAuth(),
        inputData: {
          workspaceId: WORKSPACE_ID,
          documentTemplateId: TEMPLATE_ID,
          payloadDict: {},
          meta: { _webhook_channel: 'mine' }
        }
      };

      it('supersedes it with the generated channel', (done) => {
        appTester(App.creates.generateDocument.operation.perform, bundle)
          .then(() => {
            expect(JSON.parse(captured.document.meta)._webhook_channel).toMatch(/^zapier-/);
            done();
          })
          .catch(done);
      });
    });

    describe('when a filename is specified', () => {
      describe('and no filename has been specified in meta', () => {
        const captured = mockGeneration();

        const bundle = {
          ...bundleWithAuth(),
          inputData: {
            workspaceId: WORKSPACE_ID,
            documentTemplateId: TEMPLATE_ID,
            payloadDict: {},
            meta: { name: 'Test' },
            filename: 'test-doc.pdf'
          }
        };

        it('adds it to the meta', (done) => {
          appTester(App.creates.generateDocument.operation.perform, bundle)
            .then(() => {
              expect(JSON.parse(captured.document.meta)._filename).toEqual('test-doc.pdf');
              done();
            })
            .catch(done);
        });
      });

      describe('and a filename is also specified in the meta', () => {
        const captured = mockGeneration();

        const bundle = {
          ...bundleWithAuth(),
          inputData: {
            workspaceId: WORKSPACE_ID,
            documentTemplateId: TEMPLATE_ID,
            payloadDict: {},
            meta: { name: 'Test', _filename: 'already-present.pdf' },
            filename: 'test-doc.pdf'
          }
        };

        it('does not override it', (done) => {
          appTester(App.creates.generateDocument.operation.perform, bundle)
            .then(() => {
              expect(JSON.parse(captured.document.meta)._filename).toEqual('already-present.pdf');
              done();
            })
            .catch(done);
        });
      });
    });

    describe('when the Document creation fails', () => {
      const captured = {};

      beforeEach(() => {
        captured.deleted = false;

        pdfmonkeyApi
          .post('/api/v1/rest_hooks')
          .reply(201, { rest_hook: { id: REST_HOOK_ID } });

        pdfmonkeyApi.post('/api/v1/documents').reply(422, { errors: ['boom'] });

        pdfmonkeyApi.delete(`/api/v1/rest_hooks/${REST_HOOK_ID}`).reply(204, () => {
          captured.deleted = true;
          return '';
        });
      });

      const bundle = {
        ...bundleWithAuth(),
        inputData: {
          workspaceId: WORKSPACE_ID,
          documentTemplateId: TEMPLATE_ID,
          payloadDict: {}
        }
      };

      it('removes the orphaned webhook and rethrows', (done) => {
        appTester(App.creates.generateDocument.operation.perform, bundle)
          .then(() => done(new Error('expected the run to reject')))
          .catch((error) => {
            expect(error).toBeDefined();
            expect(captured.deleted).toBe(true);
            done();
          });
      });
    });

    describe('when Zapier is loading a sample', () => {
      const bundle = {
        ...bundleWithAuth(),
        meta: { isLoadingSample: true },
        inputData: {
          workspaceId: WORKSPACE_ID,
          documentTemplateId: TEMPLATE_ID,
          payloadDict: {}
        }
      };

      it('returns a sample without registering a webhook', (done) => {
        appTester(App.creates.generateDocument.operation.perform, bundle)
          .then((response) => {
            expect(response).toEqual(documentCardSample);
            done();
          })
          .catch(done);
      });
    });
  });

  describe('performResume', () => {
    const resumeBundle = (status) => ({
      ...bundleWithAuth(),
      outputData: { _restHookId: REST_HOOK_ID },
      rawRequest: {
        content: JSON.stringify({
          document: { ...documentCardSample, status }
        })
      }
    });

    beforeEach(() => {
      pdfmonkeyApi.delete(`/api/v1/rest_hooks/${REST_HOOK_ID}`).reply(204);
    });

    it('removes the temporary webhook and returns the finished Document', (done) => {
      appTester(App.creates.generateDocument.operation.performResume, resumeBundle('success'))
        .then((response) => {
          expect(response.id).toEqual(documentCardSample.id);
          expect(response.status).toEqual('success');
          expect(response.parsedMeta).toEqual({ _filename: 'demo-document.pdf' });
          done();
        })
        .catch(done);
    });

    it('returns the failed Document without throwing', (done) => {
      appTester(App.creates.generateDocument.operation.performResume, resumeBundle('failure'))
        .then((response) => {
          expect(response.status).toEqual('failure');
          done();
        })
        .catch(done);
    });
  });

  describe('Fields', () => {
    describe('Payload fields', () => {
      describe('when realJson is enabled', () => {
        const bundle = { inputData: { realJson: true } };

        it('shows the JSON payload field', (done) => {
          appTester(App.creates.generateDocument.operation.inputFields[3], bundle)
            .then((response) => {
              expect(response[0].key).toEqual('payload');
              expect(response[0].type).toEqual('code');
              done();
            })
            .catch(done);
        });
      });

      describe('when realJson is disabled', () => {
        const bundle = { inputData: { realJson: false } };

        it('shows the dict payload field', (done) => {
          appTester(App.creates.generateDocument.operation.inputFields[3], bundle)
            .then((response) => {
              expect(response[0].key).toEqual('payloadDict');
              done();
            })
            .catch(done);
        });
      });
    });

    describe('Line Items Payload fields', () => {
      describe('when useLineItems is enabled and realJson is enabled', () => {
        const bundle = { inputData: { realJson: true, useLineItems: true } };

        it('shows the JSON item field', (done) => {
          appTester(App.creates.generateDocument.operation.inputFields[5], bundle)
            .then((response) => {
              expect(response[0].children[0].key).toEqual('itemPayload');
              done();
            })
            .catch(done);
        });
      });

      describe('when useLineItems is enabled and realJson is disabled', () => {
        const bundle = { inputData: { realJson: false, useLineItems: true } };

        it('shows the dict item field', (done) => {
          appTester(App.creates.generateDocument.operation.inputFields[5], bundle)
            .then((response) => {
              expect(response[0].children[0].key).toEqual('itemPayloadDict');
              done();
            })
            .catch(done);
        });
      });

      describe('when useLineItems is disabled', () => {
        const bundle = { inputData: { useLineItems: false } };

        it('does not show any field for Line Items', (done) => {
          appTester(App.creates.generateDocument.operation.inputFields[5], bundle)
            .then((response) => {
              expect(response).toEqual([]);
              done();
            })
            .catch(done);
        });
      });
    });
  });
});
