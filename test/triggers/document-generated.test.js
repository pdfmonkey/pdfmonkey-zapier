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

describe('Triggers::DocumentGenerated', () => {
  zapier.tools.env.inject();

  describe('when only the Workspace is specified', () => {
    it('returns a list of Documents', (done) => {
      pdfmonkeyApi
        .get('/api/v1/document_cards')
        .query({
          'q[workspace_id]': '11111111-2222-3333-4444-555555555555',
          'page[size]': 100
        })
        .reply(200, { document_cards: [documentCardSample] });

      const bundle = {
        ...bundleWithAuth(),
        inputData: {
          workspaceId: '11111111-2222-3333-4444-555555555555'
        }
      };

      appTester(App.triggers.documentGenerated.operation.perform, bundle)
        .then((response) => {
          expect(response).toEqual([processesDocumentSample]);
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
          'page[size]': 100
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

      appTester(App.triggers.documentGenerated.operation.perform, bundle)
        .then((response) => {
          expect(response).toEqual([processesDocumentSample]);
          done();
        })
        .catch(done);
    });
  });
});
