export const RISING_STAR_KEY = 'STAR';

export const RISING_STAR_NOMINATE_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSe_q1rng3EzRGwk4jFx2ki8w86mEF0nIBCeaVtZwowUns8B-Q/viewform';

export const RISING_STAR_PROGRAM = {
  title: 'APS Rising Star / Young Leader Award',
  eyebrow: 'Rising Star Award',
  headline: 'Honor the next generation of automotive packaging leaders',
  summary:
    'The AutoPack Summit Rising Star Award is a yearly program designed to honor exceptional young (under 40) professionals in the automotive packaging industry. The top 3 nominees receive complimentary attendance to AutoPack Summit 2027.',
  criteria: [
    'Rising star in automotive packaging',
    'Young professional (under 40)',
    'Contributed to the automotive industry',
    'Top 3 nominees are invited to the event',
  ],
  goals: [
    'Acknowledge and celebrate young professionals who exhibit commitment, creativity, and innovative thinking.',
    'Motivate and encourage the next generation of talent in the industry.',
    'Showcase the achievements of emerging leaders and inspire others to follow their example.',
  ],
  judges: ['Kellen Mahoney', 'Tina Bolden', 'Bridget Grewal'],
} as const;

export function risingStarLabel(year?: number | null) {
  if (!year) return 'Rising Star';
  return `Rising Star ${year}`;
}

export function defaultRisingStarYear(now = new Date()) {
  return now.getFullYear();
}
