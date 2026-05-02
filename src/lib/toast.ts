export const toast = {
  success: (msg: string) => { console.log('SUCCESS:', msg); },
  error: (msg: string) => { console.error('ERROR:', msg); },
  info: (msg: string) => { console.log('INFO:', msg); },
  warning: (msg: string) => { console.warn('WARNING:', msg); },
};
