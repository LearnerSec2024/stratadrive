/* Synthetic UI failure fixture. Run as a browser DevTools Snippet on the exact
 * local enquiry page. It never forwards an enquiry API request. Refresh removes
 * the fixture; restore() removes interception without clearing the form.
 * This is UI simulation, not HTTP, database or durable-save evidence.
 */
(() => {
  const origin = 'http://127.0.0.1:3000';
  const path = '/api/v1/enquiries';
  if (window.location.origin !== origin || window.location.pathname !== '/enquire') {
    throw new Error('UI fixture requires http://127.0.0.1:3000/enquire');
  }
  if (window.strataUiFixture) throw new Error('Fixture already installed; reload the simulated case first');
  const nativeFetch = window.fetch;
  const calls = [];
  const fixtures = {
    invalid: [400, {code:'INVALID_REQUEST', message:'synthetic-server-marker', fieldErrors:{name:'synthetic-name-marker',email:'synthetic-email-marker',unexpected:'synthetic-unknown-marker'}}],
    forbidden: [403, {code:'REQUEST_NOT_ALLOWED',message:'synthetic-server-marker'}],
    timeout: [408, {code:'REQUEST_TIMEOUT',message:'synthetic-server-marker'}],
    conflict: [409, {code:'IDEMPOTENCY_CONFLICT',message:'synthetic-server-marker'}],
    tooLarge: [413, {code:'PAYLOAD_TOO_LARGE',message:'synthetic-server-marker'}],
    media: [415, {code:'UNSUPPORTED_MEDIA_TYPE',message:'synthetic-server-marker'}],
    rate: [429, {code:'RATE_LIMITED',message:'synthetic-server-marker'}],
    internal: [500, {code:'INTERNAL_ERROR',message:'synthetic-server-marker'}],
    unavailable: [503, {code:'STORAGE_UNAVAILABLE',message:'synthetic-server-marker'}],
    badReceipt: [201, {enquiryId:'5d826d0f-82a4-4867-ad59-38c850d9104d',receivedAt:'2026-10-25T01:00:00.000Z',status:'received',extra:true}],
    badJson: [200, '{'],
    mismatch: [400, {code:'RATE_LIMITED',message:'synthetic-server-marker'}]
  };
  let mode = 'network';
  const allowed = new Set(['network','pending',...Object.keys(fixtures)]);
  async function intercepted(input, init = {}) {
    const request = input instanceof Request ? input : null;
    const url = new URL(request ? request.url : String(input), window.location.href);
    if (url.pathname !== path) return nativeFetch.call(window, input, init);
    const method = (init.method ?? request?.method ?? 'GET').toUpperCase();
    if (window.location.origin !== origin || window.location.pathname !== '/enquire'
      || url.origin !== origin || url.search || url.hash || method !== 'POST') {
      throw new Error('UI fixture rejected an unexpected enquiry request');
    }
    const headers = new Headers(init.headers ?? request?.headers);
    const body = init.body ?? (request ? await request.clone().text() : null);
    const signal = init.signal ?? request?.signal;
    const selected = mode;
    calls.push({mode:selected,key:headers.get('Idempotency-Key'),body,method,url:url.href});
    if (selected === 'network') throw new TypeError('Synthetic network failure');
    if (selected === 'pending') {
      return new Promise((resolve, reject) => {
        const abort = () => reject(new DOMException('Synthetic aborted request','AbortError'));
        if (!signal || signal.aborted) abort();
        else signal.addEventListener('abort', abort, {once:true});
      });
    }
    const [status, value] = fixtures[selected];
    const responseHeaders = {'Content-Type':'application/json','Cache-Control':'no-store'};
    if (selected === 'rate') responseHeaders['Retry-After'] = '60';
    return new Response(selected === 'badJson' ? value : JSON.stringify(value), {status,headers:responseHeaders});
  }
  window.fetch = intercepted;
  Object.defineProperty(window,'strataUiFixture',{
    configurable:true,
    value:{
      setMode(next) { if (!allowed.has(next)) throw new Error('Unknown UI fixture mode'); mode=next; },
      get calls() { return calls.map(call => ({...call})); },
      restore() {
        if (window.fetch !== intercepted) throw new Error('Fetch changed after fixture installation; reload the simulated page');
        window.fetch=nativeFetch;
        delete window.strataUiFixture;
      }
    }
  });
  console.info('Synthetic UI fixture installed. Enquiry requests are intercepted; no record is saved.');
})();
