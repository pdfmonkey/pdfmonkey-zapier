'use strict';

// PDFMonkey returns `meta` (and, on full Documents, `payload`) as JSON strings.
// A value of `{}` serializes to two characters, so anything shorter is empty.
const parseField = (value, z) => {
  if (!value || value.length <= 2) return undefined;

  try {
    return z.JSON.parse(value);
  } catch (error) {
    z.console.log('Error parsing JSON field:', error);
    return undefined;
  }
};

// Exposes the JSON string fields as parsed objects for downstream Zap steps,
// tolerating malformed JSON rather than failing the run. `stripWebhookChannel`
// removes the internal routing key injected on async Generate Document runs.
const cleanupDocument = (document, z, { stripWebhookChannel = false } = {}) => {
  const parsedMeta = parseField(document.meta, z);

  if (parsedMeta) {
    if (stripWebhookChannel) delete parsedMeta._webhook_channel;
    document.parsedMeta = parsedMeta;
  }

  const parsedPayload = parseField(document.payload, z);
  if (parsedPayload) document.parsedPayload = parsedPayload;

  return document;
};

module.exports = cleanupDocument;
