'use strict';

const App = require('../../index');
const zapier = require('zapier-platform-core');
const { bundleWithAuth, pdfmonkeyApi } = require('../test-helpers');

const appTester = zapier.createAppTester(App);

describe('Triggers::getAllWorkspaces', () => {
  zapier.tools.env.inject();

  it('returns the list of workspaces', (done) => {
    pdfmonkeyApi
      .get('/api/v1/workspace_cards')
      .reply(200, {
        workspace_cards: [
          { id: '11111111-2222-3333-4444-555555555555', identifier: 'Test Workspace 1' },
          { id: '21111111-2222-3333-4444-555555555555', identifier: 'Test Workspace 2' }
        ]
      });

    appTester(App.triggers.getAllWorkspaces.operation.perform, bundleWithAuth)
      .then(response => {
        expect(response).toEqual([
          { id: '11111111-2222-3333-4444-555555555555', identifier: 'Test Workspace 1' },
          { id: '21111111-2222-3333-4444-555555555555', identifier: 'Test Workspace 2' }
        ]);
        done();
      })
      .catch(done);
  });
});
