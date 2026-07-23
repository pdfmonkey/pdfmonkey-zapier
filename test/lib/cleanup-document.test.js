'use strict';

const cleanupDocument = require('../../lib/cleanup-document');

const z = { JSON, console: { log: () => {} } };

describe('lib/cleanupDocument', () => {
  it('parses meta and payload into their `parsed*` counterparts', () => {
    const document = cleanupDocument(
      { meta: '{"foo":"bar"}', payload: '{"name":"Jane"}' },
      z
    );

    expect(document.parsedMeta).toEqual({ foo: 'bar' });
    expect(document.parsedPayload).toEqual({ name: 'Jane' });
  });

  it('strips the internal webhook channel when asked', () => {
    const document = cleanupDocument(
      { meta: '{"_filename":"doc.pdf","_webhook_channel":"zapier-1"}' },
      z,
      { stripWebhookChannel: true }
    );

    expect(document.parsedMeta).toEqual({ _filename: 'doc.pdf' });
  });

  it('tolerates malformed JSON without attaching a parsed field', () => {
    const document = cleanupDocument({ meta: '{not json' }, z);

    expect(document.parsedMeta).toBeUndefined();
  });

  it('ignores empty JSON objects', () => {
    const document = cleanupDocument({ meta: '{}' }, z);

    expect(document.parsedMeta).toBeUndefined();
  });
});
