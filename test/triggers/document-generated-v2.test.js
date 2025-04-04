'use strict';

const App = require('../../index');
const documentCardSample = require('../../samples/document-card');
const zapier = require('zapier-platform-core');
const { bundleWithAuth, pdfmonkeyApi } = require('../test-helpers');

const appTester = zapier.createAppTester(App);
const processesDocumentSample = {
  ...documentCardSample,
  parsedMeta: { _filename: 'demo-document.pdf' }
};

describe('Triggers::DocumentGenerated_v2', () => {
  zapier.tools.env.inject();

  describe('performList', () => {
    describe('when only the Workspace is specified', () => {
      it('returns a list of Documents', (done) => {
        pdfmonkeyApi
          .get('/api/v1/document_cards')
          .query({
            'q[workspace_id]': '11111111-2222-3333-4444-555555555555',
            'page[size]': 3
          })
          .reply(200, {
            document_cards: [documentCardSample, { ...documentCardSample, status: 'failed' }]
          });

        const bundle = {
          ...bundleWithAuth(),
          inputData: {
            workspaceId: '11111111-2222-3333-4444-555555555555'
          }
        };

        appTester(App.triggers.documentGenerated_v2.operation.performList, bundle)
          .then((response) => {
            // Only returns documents with status == 'success'
            expect(response).toEqual([processesDocumentSample]);
            expect(response.length).toBe(1);
            done();
          })
          .catch(done);
      });
    });

    describe('when both the Workspace and Template are specified', () => {
      it('returns a list of Documents', (done) => {
        pdfmonkeyApi
          .get('/api/v1/document_cards')
          .query({
            'q[workspace_id]': '11111111-2222-3333-4444-555555555555',
            'q[document_template_id]':
              '22222222-3333-4444-5555-666666666666,33333333-4444-5555-6666-777777777777',
            'page[size]': 3
          })
          .reply(200, { document_cards: [documentCardSample] });

        const bundle = {
          ...bundleWithAuth(),
          inputData: {
            workspaceId: '11111111-2222-3333-4444-555555555555',
            documentTemplateId: [
              '22222222-3333-4444-5555-666666666666',
              '33333333-4444-5555-6666-777777777777'
            ]
          }
        };

        appTester(App.triggers.documentGenerated_v2.operation.performList, bundle)
          .then((response) => {
            expect(response).toEqual([processesDocumentSample]);
            done();
          })
          .catch(done);
      });
    });
  });

  describe('performHook', () => {
    it('parses meta data from the webhook payload', (done) => {
      const bundle = {
        cleanedRequest: {
          document: {
            ...documentCardSample
          }
        }
      };

      appTester(App.triggers.documentGenerated_v2.operation.perform, bundle)
        .then((response) => {
          expect(response).toEqual([processesDocumentSample]);
          done();
        })
        .catch(done);
    });
  });

  describe('subscribeHook', () => {
    it('creates a webhook subscription', (done) => {
      const hookResponse = {
        rest_hook: {
          id: '123456',
          workspace_id: '11111111-2222-3333-4444-555555555555',
          url: 'https://hooks.zapier.com/hooks/standard/123456'
        }
      };

      pdfmonkeyApi
        .post('/api/v1/rest_hooks', {
          rest_hook: {
            document_template_ids: ['22222222-3333-4444-5555-666666666666'],
            event: 'documents.generation.success',
            platform: 'Zapier',
            url: 'https://hooks.zapier.com/hooks/standard/123456',
            workspace_id: '11111111-2222-3333-4444-555555555555'
          }
        })
        .reply(201, hookResponse);

      const bundle = {
        ...bundleWithAuth(),
        targetUrl: 'https://hooks.zapier.com/hooks/standard/123456',
        inputData: {
          workspaceId: '11111111-2222-3333-4444-555555555555',
          documentTemplateId: ['22222222-3333-4444-5555-666666666666']
        }
      };

      appTester(App.triggers.documentGenerated_v2.operation.performSubscribe, bundle)
        .then((response) => {
          expect(response).toEqual(hookResponse.rest_hook);
          done();
        })
        .catch(done);
    });
  });

  describe('unsubscribeHook', () => {
    it('deletes a webhook subscription', (done) => {
      pdfmonkeyApi.delete('/api/v1/rest_hooks/123456').reply(204);

      const bundle = {
        ...bundleWithAuth(),
        subscribeData: {
          id: '123456',
          workspace_id: '11111111-2222-3333-4444-555555555555'
        }
      };

      appTester(App.triggers.documentGenerated_v2.operation.performUnsubscribe, bundle)
        .then((response) => {
          expect(response).toEqual({});
          done();
        })
        .catch(done);
    });
  });
});
