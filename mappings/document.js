'use strict';

module.exports = {
  fields: [
    { key: 'id',                   label: 'ID',                               type: 'string'   },
    { key: 'app_id',               label: 'Workspace ID',                     type: 'string'   },
    { key: 'checksum',             label: 'Preview Checksum',                 type: 'string'   },
    { key: 'created_at',           label: 'Creation DateTime',                type: 'datetime' },
    { key: 'document_template_id', label: 'Template ID',                      type: 'string'   },
    { key: 'download_url',         label: 'Download URL (valid for 1h)',      type: 'string'   },
    { key: 'filename',             label: 'Filename',                         type: 'string'   },
    { key: 'meta',                 label: 'Meta',                             type: 'string'   },
    { key: 'payload',              label: 'Payload',                          type: 'string'   },
    { key: 'public_share_link',    label: 'Public Share Link (Premium only)', type: 'string'   },
    { key: 'status',               label: 'Status',                           type: 'string'   },
    { key: 'updated_at',           label: 'Generation DateTime',              type: 'datetime' },
  ]
};
