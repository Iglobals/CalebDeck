import { randomBytes, timingSafeEqual } from 'crypto';

function createTrackingToken() {
  return randomBytes(32).toString('hex');
}

function trackingTokensMatch(expected, provided) {
  const left = String(expected || '');
  const right = String(provided || '');
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (!left || leftBuf.length !== rightBuf.length) {
    if (leftBuf.length > 0) timingSafeEqual(leftBuf, leftBuf);
    return false;
  }
  return timingSafeEqual(leftBuf, rightBuf);
}

const token = createTrackingToken();
if (token.length !== 64) throw new Error(`expected 64-char hex token, got ${token.length}`);
if (!trackingTokensMatch(token, token)) throw new Error('matching tokens should pass');
if (trackingTokensMatch(token, 'nope')) throw new Error('wrong token should fail');
const other = token.replace(/[0-9a-f]/, (ch) => (ch === '0' ? '1' : '0'));
if (trackingTokensMatch(token, other)) throw new Error('different same-length token should fail');
if (trackingTokensMatch('', '')) throw new Error('empty token must not match');
if (trackingTokensMatch(token, token + 'aa')) throw new Error('length mismatch must fail');
if (token.length > 80) throw new Error('token exceeds API max length');

console.log('tracking token tests passed');
