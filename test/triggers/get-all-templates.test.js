'use strict';

const App = require('../../index');
const zapier = require('zapier-platform-core');
const { bundleWithAuth, pdfmonkeyApi } = require('../test-helpers');

const appTester = zapier.createAppTester(App);

describe('Triggers::GetAllTemplates', () => {
  zapier.tools.env.inject();

  it('returns the list of templates for a given workspace', (done) => {
    const templatesData = [
      {
        id: '22222222-3333-4444-5555-666666666666',
        app_id: '11111111-2222-3333-4444-555555555555',
        auth_token: 'xxx',
        created_at: '2050-01-02T12:34:45.789+01:00',
        identifier: 'Tpl 1',
        created_at: '2050-01-02T12:34:45.789+01:00',
        legacy: false
      },
      {
        id: '33333333-4444-5555-6666-777777777777',
        app_id: '11111111-2222-3333-4444-555555555555',
        auth_token: 'yyy',
        created_at: '2050-01-03T12:34:45.789+01:00',
        identifier: 'Tpl 1',
        created_at: '2050-01-03T12:34:45.789+01:00',
        legacy: true
      }
    ];

    pdfmonkeyApi
      .get('/api/v1/document_template_cards')
      .query({ 'q[workspace_id]': '11111111-2222-3333-4444-555555555555' })
      .reply(200, { document_template_cards: templatesData });

    const bundle = {
      ...bundleWithAuth(),
      inputData: {
        workspaceId: '11111111-2222-3333-4444-555555555555'
      }
    };

    appTester(App.triggers.getAllTemplates.operation.perform, bundle)
      .then(response => {
        expect(response).toEqual(templatesData);
        done();
      })
      .catch(done);
  });
});
