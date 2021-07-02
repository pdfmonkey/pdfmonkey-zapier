'use strict';

module.exports = {
  fields: [
    { key: 'id',                   label: 'ID',                          type: 'string'   },
    { key: 'app_id',               label: 'App ID',                      type: 'string'   },
    { key: 'checksum',             label: 'Preview Checksum',            type: 'string'   },
    { key: 'created_at',           label: 'Creation DateTime',           type: 'datetime' },
    { key: 'document_template_id', label: 'Template ID',                 type: 'string'   },
    { key: 'download_url',         label: 'Download URL (valid for 1h)', type: 'string'   },
    { key: 'filename',             label: 'Filename',                    type: 'string'   },
    { key: 'meta',                 label: 'Meta',                        type: 'string'   },
    { key: 'payload',              label: 'Payload',                     type: 'string'   },
    { key: 'preview_url',          label: 'Preview URL',                 type: 'string'   },
    { key: 'status',               label: 'Status',                      type: 'string'   },
    { key: 'updated_at',           label: 'Generation DateTime',         type: 'datetime' },
  ]
};
