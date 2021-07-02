'use strict';

const nock = require('nock');

module.exports = {
  bundleWithAuth() {
    return {
      authData: {
        secretKey: 'test-api-key'
      }
    };
  },

  pdfmonkeyApi: nock('https://api.pdfmonkey.io', {
    reqHeaders: {
      Accept: 'application/json',
      Authorization: `Bearer test-api-key`
    }
  })
};
