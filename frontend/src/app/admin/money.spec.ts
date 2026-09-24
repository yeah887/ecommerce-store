import { centsToEuroInput, parseEuroToCents } from './money';

describe('parseEuroToCents', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12.50', 1250],
    ['12,50', 1250],
    ['0.01', 1],
    ['19.99', 1999],
    ['0.29', 29],
    ['100000', 10000000],
    [' €12.50 ', 1250],
    ['12.50 €', 1250],
  ])('parses %s as %i cents', (input, cents) => {
    expect(parseEuroToCents(input)).toBe(cents);
  });

  it.each(['', '  ', 'abc', '12.505', '1,299.00', '1.299,00', '-5', '1e3', '12..50', '12.', '.50', '€'])(
    'rejects %s',
    (input) => {
      expect(parseEuroToCents(input)).toBeNull();
    },
  );

  it('has no floating-point drift', () => {
    // 0.29 * 100 is 28.999999999999996 in floating point.
    expect(parseEuroToCents('0.29')).toBe(29);
    expect(parseEuroToCents('1.15')).toBe(115);
    expect(parseEuroToCents('4.35')).toBe(435);
  });
});

describe('centsToEuroInput', () => {
  it.each([
    [1250, '12.50'],
    [1, '0.01'],
    [100, '1.00'],
    [129900, '1299.00'],
  ])('formats %i as %s', (cents, text) => {
    expect(centsToEuroInput(cents)).toBe(text);
  });

  it('round-trips through the parser', () => {
    for (const cents of [1, 29, 99, 100, 1999, 129900, 10000000]) {
      expect(parseEuroToCents(centsToEuroInput(cents))).toBe(cents);
    }
  });
});
