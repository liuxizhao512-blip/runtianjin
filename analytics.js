/* Run Tianjin — privacy-friendly analytics loader.
 *
 * GoatCounter is cookieless and does not fingerprint visitors, so it needs no
 * consent banner. The site code is kept in one place here instead of being
 * repeated in six <head> blocks.
 *
 * To enable: replace GOATCOUNTER_CODE below with the subdomain you picked when
 * signing up at https://www.goatcounter.com/ (e.g. "runtianjin" for
 * https://runtianjin.goatcounter.com). While it is left empty nothing loads and
 * no network request is made, so local file:// previews stay silent.
 */
(function () {
  'use strict';

  var GOATCOUNTER_CODE = '';

  // Never track local previews or the file:// protocol.
  var host = location.hostname;
  var isLocal =
    location.protocol === 'file:' ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '' ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host);

  if (isLocal || !GOATCOUNTER_CODE) return;

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.setAttribute('data-goatcounter', 'https://' + GOATCOUNTER_CODE + '.goatcounter.com/count');
  document.head.appendChild(script);
})();
