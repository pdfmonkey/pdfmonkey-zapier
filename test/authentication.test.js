'use strict';

const App = require('../index');
const authentication = require('../authentication');
const zapier = require('zapier-platform-core');
const { bundleWithAuth, pdfmonkeyApi } = require('./test-helpers');

const appTester = zapier.createAppTester(App);

describe('Authentication ', () => {
  zapier.tools.env.inject();

  it('authenticates', (done) => {
    pdfmonkeyApi
      .get('/api/v1/current_user')
      .reply(200, { current_user: { email: 'jane@doe.com' } });

    appTester(App.authentication.test, bundleWithAuth)
      .then((response) => {
        expect(response.current_user.email).toEqual('jane@doe.com');
        done();
      })
      .catch(done);
  });

  describe('.connectionLabel', () => {
    describe('when the user has a desired name', () => {
      it('returns the right label', (done) => {
        const bundle = {
          inputData: {
            current_user: {
              desired_name: 'Jane Doe',
              email: 'jane@doe.com'
            }
          }
        };

        appTester(App.authentication.connectionLabel, bundle)
          .then((label) => {
            expect(label).toEqual('Jane Doe (jane@doe.com)');
            done();
          })
          .catch(done);
      });
    });

    describe('when the user has no desired name', () => {
      it('returns the right label', (done) => {
        const bundle = {
          inputData: {
            current_user: {
              email: 'jane@doe.com'
            }
          }
        };

        appTester(App.authentication.connectionLabel, bundle)
          .then((label) => {
            expect(label).toEqual('jane@doe.com');
            done();
          })
          .catch(done);
      });
    });
  });
});
