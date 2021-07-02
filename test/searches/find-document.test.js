'use strict';

const App = require('../../index');
const documentSample = require('../../samples/document');
const zapier = require('zapier-platform-core');
const { bundleWithAuth, pdfmonkeyApi } = require('../test-helpers');

const appTester = zapier.createAppTester(App);

describe('Searches::FindDocument ', () => {
  zapier.tools.env.inject();

  it('returns an array containing the extended Document data', (done) => {
    pdfmonkeyApi
      .get(`/api/v1/documents/${documentSample.id}`)
      .reply(200, { document: documentSample });

    const bundle = {
      ...bundleWithAuth(),
      inputData: {
        documentId: documentSample.id
      }
    };

    appTester(App.searches.findDocument.operation.perform, bundle)
      .then(response => {
        expect(response).toEqual([
          {
            ...documentSample,
            parsedPayload: { name: 'Jane Doe' },
            parsedMeta: { _filename: 'demo-document.pdf' }
          }
        ]);
        done();
      })
      .catch(done);
  });
});
