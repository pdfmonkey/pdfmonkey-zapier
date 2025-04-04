'use strict';

const App = require('../../index');
const documentSample = require('../../samples/document');
const zapier = require('zapier-platform-core');
const { bundleWithAuth, pdfmonkeyApi } = require('../test-helpers');

const appTester = zapier.createAppTester(App);

const mockRequest = (data) => {
  beforeEach(() => {
    if (typeof data.payload !== 'string') {
      data.payload = JSON.stringify(data.payload);
    }

    if (typeof data.meta !== 'string') {
      data.meta = JSON.stringify(data.meta);
    }

    pdfmonkeyApi
      .post('/api/v1/documents', { document: { ...data, status: 'pending' } })
      .reply(201, { document: documentSample });
  });
};

describe('Actions::GenerateDocument', () => {
  zapier.tools.env.inject();

  describe('with basic data', () => {
    mockRequest({
      document_template_id: '11111111-2222-3333-4444-555555555555',
      meta: {},
      payload: { name: 'Jane Doe' }
    });

    const bundle = {
      ...bundleWithAuth(),
      inputData: {
        documentTemplateId: '11111111-2222-3333-4444-555555555555',
        payloadDict: { name: 'Jane Doe' }
      }
    };

    it('creates the Document', (done) => {
      appTester(App.creates.generateDocument.operation.perform, bundle)
        .then((response) => {
          expect(response.id).toBeDefined();
          done();
        })
        .catch(done);
    });
  });

  describe('with data and line items', () => {
    mockRequest({
      document_template_id: '11111111-2222-3333-4444-555555555555',
      meta: {},
      payload: {
        name: 'Jane Doe',
        lineItems: [{ name: 'Line Item 1' }, { name: 'Line Item 2' }]
      }
    });

    const bundle = {
      ...bundleWithAuth(),
      inputData: {
        documentTemplateId: '11111111-2222-3333-4444-555555555555',
        payloadDict: { name: 'Jane Doe' },
        useLineItems: 'Yes',
        lineItems: [
          { itemPayloadDict: { name: 'Line Item 1' } },
          { itemPayloadDict: { name: 'Line Item 2' } }
        ]
      }
    };

    it('creates the Document', (done) => {
      appTester(App.creates.generateDocument.operation.perform, bundle)
        .then((response) => {
          expect(response.id).toBeDefined();
          done();
        })
        .catch(done);
    });
  });

  describe('with data as real JSON', () => {
    mockRequest({
      document_template_id: '11111111-2222-3333-4444-555555555555',
      meta: {},
      payload: { name: 'Jane Doe' }
    });

    const bundle = {
      ...bundleWithAuth(),
      inputData: {
        documentTemplateId: '11111111-2222-3333-4444-555555555555',
        payload: '{ "name": "Jane Doe" }',
        realJson: 'Yes'
      }
    };

    it('creates the Document', (done) => {
      appTester(App.creates.generateDocument.operation.perform, bundle)
        .then((response) => {
          expect(response.id).toBeDefined();
          done();
        })
        .catch(done);
    });
  });

  describe('with data and line items as real JSON', () => {
    mockRequest({
      document_template_id: '11111111-2222-3333-4444-555555555555',
      meta: {},
      payload: {
        name: 'Jane Doe',
        lineItems: [{ name: 'Line Item 1' }, { name: 'Line Item 2' }]
      }
    });

    const bundle = {
      ...bundleWithAuth(),
      inputData: {
        documentTemplateId: '11111111-2222-3333-4444-555555555555',
        payload: '{ "name": "Jane Doe" }',
        realJson: 'Yes',
        useLineItems: 'Yes',
        lineItems: [
          { itemPayload: '{ "name": "Line Item 1" }' },
          { itemPayload: '{ "name": "Line Item 2" }' }
        ]
      }
    };

    it('creates the Document', (done) => {
      appTester(App.creates.generateDocument.operation.perform, bundle)
        .then((response) => {
          expect(response.id).toBeDefined();
          done();
        })
        .catch(done);
    });
  });

  describe('when a filename is specified', () => {
    describe('and no filename has been specified in meta', () => {
      mockRequest({
        document_template_id: '11111111-2222-3333-4444-555555555555',
        meta: { name: 'Test', _filename: 'test-doc.pdf' },
        payload: {}
      });

      it('adds it to the meta', (done) => {
        const bundle = {
          ...bundleWithAuth(),
          inputData: {
            documentTemplateId: '11111111-2222-3333-4444-555555555555',
            payloadDict: {},
            meta: { name: 'Test' },
            filename: 'test-doc.pdf'
          }
        };

        appTester(App.creates.generateDocument.operation.perform, bundle)
          .then(() => done())
          .catch(done);
      });
    });

    describe('and a filename is also specified in the meta', () => {
      mockRequest({
        document_template_id: '11111111-2222-3333-4444-555555555555',
        meta: { name: 'Test', _filename: 'already-present.pdf' },
        payload: {}
      });

      const bundle = {
        ...bundleWithAuth(),
        inputData: {
          documentTemplateId: '11111111-2222-3333-4444-555555555555',
          payloadDict: {},
          meta: { name: 'Test', _filename: 'already-present.pdf' },
          filename: 'test-doc.pdf'
        }
      };

      it('does not override it', (done) => {
        appTester(App.creates.generateDocument.operation.perform, bundle)
          .then(() => done())
          .catch(done);
      });
    });
  });

  describe('Fields', () => {
    describe('Payload fields', () => {
      describe('when realJson is "Yes"', () => {
        const bundle = {
          inputData: {
            realJson: 'Yes'
          }
        };

        it('shows fields for a JSON payload', (done) => {
          appTester(App.creates.generateDocument.operation.inputFields[3], bundle)
            .then((response) => {
              expect(response[0].key).toEqual('payload');
              done();
            })
            .catch(done);
        });
      });

      describe('when realJson is "No"', () => {
        const bundle = {
          inputData: {
            realJson: 'No'
          }
        };

        it('shows fields for a JSON payload', (done) => {
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
      describe('when useLineItems is "Yes"', () => {
        describe('and realJson is "Yes"', () => {
          const bundle = {
            inputData: {
              realJson: 'Yes',
              useLineItems: 'Yes'
            }
          };

          it('shows fields for a JSON payload', (done) => {
            appTester(App.creates.generateDocument.operation.inputFields[5], bundle)
              .then((response) => {
                expect(response[0].children[0].key).toEqual('itemPayload');
                done();
              })
              .catch(done);
          });
        });

        describe('and realJson is "No"', () => {
          const bundle = {
            inputData: {
              realJson: 'No',
              useLineItems: 'Yes'
            }
          };

          it('shows fields for a JSON payload', (done) => {
            appTester(App.creates.generateDocument.operation.inputFields[5], bundle)
              .then((response) => {
                expect(response[0].children[0].key).toEqual('itemPayloadDict');
                done();
              })
              .catch(done);
          });
        });
      });

      describe('when useLineItems is "No"', () => {
        const bundle = {
          inputData: {
            useLineItems: 'No'
          }
        };

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
