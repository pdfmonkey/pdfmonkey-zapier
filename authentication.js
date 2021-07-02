'use strict';

const connectionLabel = (z, bundle) => {
  let user = bundle.inputData.current_user;

  if (user.desired_name && user.desired_name.length > 0) {
    return `${user.desired_name} (${user.email})`;
  }

  return user.email;
};

module.exports = {
  type: 'custom',

  connectionLabel,

  fields: [
    {
      key: 'secretKey',
      type: 'password',
      label: 'Secret Key',
      helpText: 'You can find this key in the PDFMonkey dashboard, in the [My Account page](https://dashboard.pdfmonkey.io/account).',
      required: true
    }
  ],

  test: {
    url: 'https://api.pdfmonkey.io/api/v1/current_user',
    headers: {
      Authorization: 'Bearer {{bundle.authData.secretKey}}'
    }
  }
};
