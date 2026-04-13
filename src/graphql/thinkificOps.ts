export const syncMyThinkificProgress = [
  'mutation SyncMyThinkificProgress($input: SyncThinkificProgressInput) {',
  '  syncMyThinkificProgress(input: $input) {',
  '    thinkificUserId',
  '    apcProgramProgress',
  '    updated',
  '    syncedAt',
  '    message',
  '  }',
  '}',
].join('\n');
