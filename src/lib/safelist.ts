// This file exists solely to make Tailwind's scanner aware of dynamically
// constructed color classes (e.g. `bg-${color}-50`). Tailwind v4 scans
// source files for class-like tokens — these literal strings ensure every
// shade is generated. Do not delete.

export const safelist = `
bg-primary-50 bg-primary-100 bg-primary-500 bg-primary-600 bg-primary-700
bg-secondary-50 bg-secondary-100 bg-secondary-500 bg-secondary-600 bg-secondary-700
bg-accent-50 bg-accent-100 bg-accent-500 bg-accent-600 bg-accent-700
bg-success-50 bg-success-100 bg-success-500 bg-success-600 bg-success-700
bg-warning-50 bg-warning-100 bg-warning-500 bg-warning-600 bg-warning-700
bg-error-50 bg-error-100 bg-error-500 bg-error-600 bg-error-700
bg-neutral-50 bg-neutral-100 bg-neutral-200

hover:bg-primary-50 hover:bg-secondary-50 hover:bg-accent-50
hover:bg-success-50 hover:bg-warning-50 hover:bg-error-50 hover:bg-neutral-50
hover:bg-primary-100 hover:bg-secondary-100 hover:bg-accent-100
hover:bg-success-100 hover:bg-warning-100 hover:bg-error-100

text-primary-500 text-primary-600 text-primary-700
text-secondary-500 text-secondary-600 text-secondary-700
text-accent-500 text-accent-600 text-accent-700
text-success-500 text-success-600 text-success-700
text-warning-500 text-warning-600 text-warning-700
text-error-500 text-error-600 text-error-700
text-neutral-500 text-neutral-600 text-neutral-700

border-primary-100 border-primary-200 border-primary-300 border-primary-400
border-secondary-200 border-secondary-300 border-secondary-400
border-accent-200 border-accent-300 border-accent-400
border-success-200 border-success-300 border-success-400
border-warning-200 border-warning-300 border-warning-400
border-error-200 border-error-300 border-error-400

from-primary-400 from-primary-500 from-primary-600 from-primary-700
from-secondary-400 from-secondary-500 from-secondary-600 from-secondary-700
from-accent-400 from-accent-500 from-accent-600 from-accent-700
from-success-400 from-success-500 from-success-600 from-success-700
from-warning-400 from-warning-500 from-warning-600 from-warning-700
from-error-400 from-error-500 from-error-600 from-error-700
from-neutral-800 from-neutral-900

to-primary-400 to-primary-500 to-primary-600 to-primary-700 to-primary-800
to-secondary-400 to-secondary-500 to-secondary-600 to-secondary-700 to-secondary-800
to-accent-400 to-accent-500 to-accent-600 to-accent-700 to-accent-800
to-success-400 to-success-500 to-success-600 to-success-700 to-success-800
to-warning-400 to-warning-500 to-warning-600 to-warning-700 to-warning-800
to-error-400 to-error-500 to-error-600 to-error-700 to-error-800
to-neutral-800 to-neutral-900

ring-primary-200 ring-primary-300 ring-primary-400
ring-secondary-200 ring-secondary-300
ring-accent-200 ring-accent-300
ring-success-200 ring-success-300
ring-warning-200 ring-warning-300
ring-error-200 ring-error-300

shadow-primary-600/30 shadow-secondary-500/30

h-4.5 w-4.5 h-5.5 w-5.5
`;
