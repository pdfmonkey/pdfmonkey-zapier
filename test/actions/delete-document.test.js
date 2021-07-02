'use strict';

const App = require('../../index');
const documentSample = require('../../samples/document');
const zapier = require('zapier-platform-core');
const { bundleWithAuth, pdfmonkeyApi } = require('../test-helpers');

const appTester = zapier.createAppTester(App);

describe('Actions::DeleteDocument', () => {
  zapier.tools.env.inject();

  it('deletes a Document', (done) => {
    pdfmonkeyApi
      .delete('/api/v1/documents/11111111-2222-3333-4444-555555555555')
      .reply(200, { document: documentSample });

    const bundle = {
      ...bundleWithAuth(),
      inputData: {
        documentId: '11111111-2222-3333-4444-555555555555'
      }
    };

    appTester(App.creates.deleteDocument.operation.perform, bundle)
      .then(response => {
        expect(response.deletedAt).toBeDefined();
        done();
      })
      .catch(done);
  });
});
