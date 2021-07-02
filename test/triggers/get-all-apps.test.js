'use strict';

const App = require('../../index');
const zapier = require('zapier-platform-core');
const { bundleWithAuth, pdfmonkeyApi } = require('../test-helpers');

const appTester = zapier.createAppTester(App);

describe('Triggers::GetAllApps', () => {
  zapier.tools.env.inject();

  it('returns the list of apps', (done) => {
    pdfmonkeyApi
      .get('/api/v1/apps')
      .reply(200, {
        apps: [
          { id: '11111111-2222-3333-4444-555555555555', identifier: 'Test App 1' },
          { id: '21111111-2222-3333-4444-555555555555', identifier: 'Test App 2' }
        ]
      });

    appTester(App.triggers.getAllApps.operation.perform, bundleWithAuth)
      .then(response => {
        expect(response).toEqual([
          { id: '11111111-2222-3333-4444-555555555555', identifier: 'Test App 1' },
          { id: '21111111-2222-3333-4444-555555555555', identifier: 'Test App 2' }
        ]);
        done();
      })
      .catch(done);
  });
});
