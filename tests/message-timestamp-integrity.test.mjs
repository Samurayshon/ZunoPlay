import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration=fs.readFileSync('supabase/migrations/20260830152708_harden_message_timestamp_integrity.sql','utf8');
const client=fs.readFileSync('zuno-messages.js','utf8');

assert.match(migration,/message_metadata_is_immutable/,'sender metadata must remain immutable after insert');
assert.match(migration,/message_edit_marker_without_content/,'edited_at cannot be forged without a content edit');
assert.match(migration,/new\.edited_at := v_now/,'message edit timestamps must be server-normalized');
assert.match(migration,/invalid_message_delete/,'delete marker must require the canonical delete transition');
assert.match(migration,/new\.deleted_at := v_now/,'message delete timestamps must be server-normalized');
assert.match(migration,/receipt_identity_is_immutable/,'receipt message/user identity must be immutable');
assert.match(migration,/message_receipts_timestamp_order_check/,'receipt read/delivered ordering must be constrained');
assert.match(migration,/before insert or update on public\.message_receipts/,'receipt writes must pass the integrity trigger');

assert.match(client,/update\(\{content:text\.trim\(\),edited_at:new Date\(\)\.toISOString\(\)\}\)/,'current edit client contract must remain recognized');
assert.match(client,/update\(\{content:null,deleted_at:new Date\(\)\.toISOString\(\)\}\)/,'current delete client contract must remain recognized');
assert.match(client,/message_receipts'\)\.upsert\(\{message_id:messageId,user_id:user\.id,delivered_at:new Date\(\)\.toISOString\(\)\}/,'current delivered receipt contract must remain recognized');
assert.match(client,/rpc\('zuno_mark_conversation_read'/,'read state must keep using the server RPC');

console.log('message timestamp integrity guard: ok');
