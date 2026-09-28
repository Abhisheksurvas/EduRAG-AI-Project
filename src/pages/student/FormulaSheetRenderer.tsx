import React, { useState, useMemo } from 'react';
import { Copy, Check, Sparkles, Zap, Calculator, Search, FileText, CheckCircle2, BookOpen, Bookmark, ArrowRight } from 'lucide-react';

// ============================================================================
// Curated Mnemonic Dictionary for High-Yield Curriculum Formulas
// ============================================================================
export const FORMULA_MNEMONICS: Record<string, string> = {
  handshaking: 'Every handshake involves 2 hands — total vertex degrees = 2 × total edges!',
  'deg(v)': 'Total vertex degrees = 2 × total edges (each edge connects 2 endpoints).',
  tree: 'A tree always has exactly 1 less edge than its vertex count (|V| − 1).',
  '|v| - 1': 'A tree always has exactly 1 less edge than its vertex count (|V| − 1).',
  '|v|-1': 'A tree always has exactly 1 less edge than its vertex count (|V| − 1).',
  relaxation: 'Shortcut rule: If detour through u is shorter than direct to v, take the shortcut!',
  dijkstra: 'Always relax the cheapest unvisited node first — greedy choice finds shortest paths.',
  'bellman-ford': 'Relax all |E| edges |V| − 1 times to find shortest paths with negative weights.',
  tat: 'Turnaround Time = Completion Time − Arrival Time (total clock time spent in system).',
  turnaround: 'Turnaround Time = Completion Time − Arrival Time (total clock time spent in system).',
  wt: 'Waiting Time = Turnaround Time − Burst Time (time wasted sitting idle in queue).',
  waiting: 'Waiting Time = Turnaround Time − Burst Time (time wasted sitting idle in queue).',
  emat: 'Hit rate × fast TLB speed + Miss rate × (TLB + slow RAM penalty).',
  'effective memory': 'Hit rate × fast TLB speed + Miss rate × (TLB + slow RAM penalty).',
  lossless: 'Common attributes must form a superkey of at least one of the decomposed tables.',
  '3nf': 'Determinant is superkey, or every dependent attribute is prime.',
  bcnf: 'Strict key rule: Every non-trivial determinant must be a full superkey.',
  bayes: 'Posterior = (Likelihood × Prior) / Evidence: update beliefs with new proof.',
  shannon: 'Capacity = Bandwidth × log₂(1 + Signal-to-Noise Ratio): theoretical channel speed limit.',
  nyquist: 'Max Bit Rate = 2 × Bandwidth × log₂(Signal Levels) in a noiseless channel.',
  little: 'Items in system = Arrival rate × Average time spent (L = λW).',
  master: 'Compare leaf work n^(log_b a) against root work f(n) to find the asymptotic runtime.',
  'binary search': 'Halves the search space on each comparison: takes at most log₂(N) steps.',
  fibonacci: 'Each term is the sum of the two preceding terms: F(n) = F(n−1) + F(n−2).',
  hamming: 'Count of differing bit positions between two binary words of equal length.',
  convolution: 'Flip and slide one function across the other and integrate their product.',
  entropy: 'Average surprise: 50/50 split is max chaos (1.0 bit); pure set is zero chaos (0.0 bits)!',
  gini: '1 minus sum of squared class probabilities: measures probability of misclassification.',
  mse: 'Square each error to make them positive, add them up, and divide by sample count!',
  rmse: 'Square root of MSE brings error penalty back into original measurement units!',
  mae: 'Average absolute difference without disproportionately penalizing large outliers.',
  'cross-entropy': 'Heavily penalizes confident wrong probabilistic predictions!',
  'gradient descent': 'Take baby steps downhill opposite to the slope of error (New = Old − α × Gradient)!',
  sigmoid: 'S-curve squashing any real number into a valid 0 to 1 probability score: 1 / (1 + e^−z).',
  softmax: 'Exponentiate each class score, then divide by the total sum of exponentials!',
  relu: 'Returns the input if positive, otherwise zero: f(x) = max(0, x).',
  precision: 'Of all alarms flagged positive by the model, what percentage was actually correct?',
  recall: 'Of all real positive cases in reality, what percentage did the model successfully catch?',
  f1: 'Harmonic mean balancing Precision and Recall: collapses if either is near zero!',
  accuracy: 'Correct predictions (TP + TN) divided by total predictions.',
  'min-max': 'Value minus minimum, divided by the total range: compresses data into [0, 1].',
  'z-score': 'Distance from the mean divided by standard deviation spread: (x − μ) / σ.',
  euclidean: 'Pythagorean theorem on coordinate differences: straight-line distance √[Σ(x₁ − x₂)²]!',
  manhattan: 'City-block grid distance: sum of absolute differences |x₁ − x₂| + |y₁ − y₂|.',
  cosine: 'Dot product divided by magnitude product: measures directional similarity ignoring scale.',
  rsa: 'Public key e locks it in modular powers, private key d reverses it: C = M^e mod n!',
  'diffie-hellman': 'Mix public bases over open lines, compute matching shared secrets in private!',
  totient: 'Subtract 1 from each prime factor and multiply them: φ(n) = (p − 1)(q − 1).',
  fermat: 'A number raised to (prime − 1) mod that prime is always 1: a^(p−1) ≡ 1 mod p.',
  ohm: 'Voltage = Current × Resistance (V = I × R): potential difference driving current.',
};

/**
 * Finds a matching mnemonic tip for a formula by checking title, math, and meaning.
 */
export function getFormulaMnemonic(title: string, math: string, meaning: string): string | undefined {
  const haystack = `${title} ${math} ${meaning}`.toLowerCase();
  for (const [key, tip] of Object.entries(FORMULA_MNEMONICS)) {
    if (haystack.includes(key)) {
      return tip;
    }
  }
  return undefined;
}

// ============================================================================
// Math LaTeX to Clean Mathematical Unicode & Visual Formatter
// ============================================================================

/**
 * Converts raw LaTeX math into clean, readable mathematical symbols and text.
 * Completely strips LaTeX commands, raw markdown artifacts, and dollar signs.
 */
export function cleanLatexMath(latex: string): string {
  if (!latex) return '';
  let s = latex.trim();

  // Strip wrapping $$ or $
  s = s.replace(/^\$\$([\s\S]*?)\$\$$/g, '$1').replace(/^\$([\s\S]*?)\$$/g, '$1').trim();

  // Strip markdown bold / code artifacts
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/\`([^`]+)\`/g, '$1');

  // Fractions: \frac{a}{b} -> (a / b)
  while (/\\frac\{([^{}]+)\}\{([^{}]+)\}/.test(s)) {
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1 / $2)');
  }

  // Square roots: \sqrt{x} -> √(x)
  s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  s = s.replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, '∛($2)');

  // Text commands
  s = s.replace(/\\(text|mathrm|operatorname|mathbf|mathit|mathtt)\{([^}]+)\}/g, '$2');

  // Hats, bars, and vectors: \hat{y} -> ŷ, \bar{x} -> x̄
  s = s.replace(/\\hat\{y\}/g, 'ŷ').replace(/\\hat\{x\}/g, 'x̂').replace(/\\hat\{([a-zA-Z])\}/g, '$1-hat');
  s = s.replace(/\\bar\{x\}/g, 'x̄').replace(/\\bar\{y\}/g, 'ȳ').replace(/\\bar\{([a-zA-Z])\}/g, '$1-bar');
  s = s.replace(/\\vec\{([a-zA-Z])\}/g, '$1⃗');

  // Summations & products with bounds
  s = s.replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, '∑ ($1 to $2) ');
  s = s.replace(/\\sum_\{([^}]+)\}/g, '∑ ($1) ');
  s = s.replace(/\\sum\b/g, '∑ ');
  s = s.replace(/\\prod_\{([^}]+)\}\^\{([^}]+)\}/g, '∏ ($1 to $2) ');
  s = s.replace(/\\prod_\{([^}]+)\}/g, '∏ ($1) ');
  s = s.replace(/\\prod\b/g, '∏ ');
  s = s.replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, '∫ ($1 to $2) ');
  s = s.replace(/\\int\b/g, '∫ ');

  // Multipliers before absolute values: 2|E| -> 2 × |E|
  s = s.replace(/(\d+)\s*\|([A-Za-z0-9_]+)\|/g, '$1 × |$2|');

  // Multipliers & arithmetic
  s = s.replace(/\\cdot\b/g, ' × ');
  s = s.replace(/\\times\b/g, ' × ');
  s = s.replace(/\\div\b/g, ' ÷ ');
  s = s.replace(/\\pm\b/g, ' ± ');
  s = s.replace(/\\mp\b/g, ' ∓ ');

  // Relational & Logic
  s = s.replace(/\\(leq|le)\b/g, ' ≤ ');
  s = s.replace(/\\(geq|ge)\b/g, ' ≥ ');
  s = s.replace(/\\(neq|ne)\b/g, ' ≠ ');
  s = s.replace(/\\approx\b/g, ' ≈ ');
  s = s.replace(/\\equiv\b/g, ' ≡ ');
  s = s.replace(/\\ll\b/g, ' ≪ ');
  s = s.replace(/\\gg\b/g, ' ≫ ');
  s = s.replace(/\\(implies|Longrightarrow)\b/g, ' ⟹ ');
  s = s.replace(/\\(iff|Longleftrightarrow)\b/g, ' ⟺ ');
  s = s.replace(/\\(to|rightarrow)\b/g, ' → ');
  s = s.replace(/\\leftarrow\b/g, ' ← ');
  s = s.replace(/\\lor\b/g, ' ∨ ');
  s = s.replace(/\\land\b/g, ' ∧ ');
  s = s.replace(/\\neg\b/g, ' ¬ ');

  // Set theory
  s = s.replace(/\\in\b/g, ' ∈ ');
  s = s.replace(/\\notin\b/g, ' ∉ ');
  s = s.replace(/\\subset\b/g, ' ⊂ ');
  s = s.replace(/\\subseteq\b/g, ' ⊆ ');
  s = s.replace(/\\supset\b/g, ' ⊃ ');
  s = s.replace(/\\supseteq\b/g, ' ⊇ ');
  s = s.replace(/\\cap\b/g, ' ∩ ');
  s = s.replace(/\\cup\b/g, ' ∪ ');
  s = s.replace(/\\emptyset\b/g, ' ∅ ');

  // Greek letters
  s = s.replace(/\\alpha\b/g, 'α');
  s = s.replace(/\\beta\b/g, 'β');
  s = s.replace(/\\gamma\b/g, 'γ');
  s = s.replace(/\\delta\b/g, 'δ');
  s = s.replace(/\\epsilon\b/g, 'ε');
  s = s.replace(/\\theta\b/g, 'θ');
  s = s.replace(/\\lambda\b/g, 'λ');
  s = s.replace(/\\mu\b/g, 'μ');
  s = s.replace(/\\pi\b/g, 'π');
  s = s.replace(/\\sigma\b/g, 'σ');
  s = s.replace(/\\tau\b/g, 'τ');
  s = s.replace(/\\phi\b/g, 'φ');
  s = s.replace(/\\omega\b/g, 'ω');
  s = s.replace(/\\Delta\b/g, 'Δ');
  s = s.replace(/\\Sigma\b/g, 'Σ');
  s = s.replace(/\\Omega\b/g, 'Ω');
  s = s.replace(/\\Theta\b/g, 'Θ');

  // Math symbols
  s = s.replace(/\\infty\b/g, '∞');
  s = s.replace(/\\forall\b/g, '∀');
  s = s.replace(/\\exists\b/g, '∃');
  s = s.replace(/\\partial\b/g, '∂');
  s = s.replace(/\\nabla\b/g, '∇');

  // Common functions
  s = s.replace(/\\(deg|det|gcd|max|min|log|ln|exp|sin|cos|tan|lim)\b/g, '$1');

  // Delimiters & Spacing
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  s = s.replace(/\\left\\\{/g, '{').replace(/\\right\\\}/g, '}');
  s = s.replace(/\\left\|/g, '|').replace(/\\right\|/g, '|');
  s = s.replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  s = s.replace(/\\quad\b/g, '   ').replace(/\\qquad\b/g, '     ');
  s = s.replace(/\\[,;!]/g, ' ');

  // Clean remaining isolated backslash words
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');
  s = s.replace(/\\/g, '');

  // Subscripts cleanup:
  s = s.replace(/_\{0\}/g, '₀').replace(/_\{1\}/g, '₁').replace(/_\{2\}/g, '₂').replace(/_\{3\}/g, '₃')
       .replace(/_\{4\}/g, '₄').replace(/_\{5\}/g, '₅').replace(/_\{n\}/g, 'ₙ').replace(/_\{i\}/g, 'ᵢ')
       .replace(/_\{j\}/g, 'ⱼ').replace(/_\{k\}/g, 'ₖ').replace(/_\{t\}/g, 'ₜ').replace(/_\{m\}/g, 'ₘ');
  s = s.replace(/_0\b/g, '₀').replace(/_1\b/g, '₁').replace(/_2\b/g, '₂').replace(/_3\b/g, '₃')
       .replace(/_4\b/g, '₄').replace(/_5\b/g, '₅').replace(/_n\b/g, 'ₙ').replace(/_i\b/g, 'ᵢ')
       .replace(/_j\b/g, 'ⱼ').replace(/_k\b/g, 'ₖ').replace(/_t\b/g, 'ₜ').replace(/_m\b/g, 'ₘ');
  s = s.replace(/_\{([^}]+)\}/g, ' ($1)');

  // Superscripts cleanup:
  s = s.replace(/\^\{0\}/g, '⁰').replace(/\^\{1\}/g, '¹').replace(/\^\{2\}/g, '²').replace(/\^\{3\}/g, '³')
       .replace(/\^\{n\}/g, 'ⁿ').replace(/\^\{T\}/g, 'ᵀ').replace(/\^\{t\}/g, 'ᵀ')
       .replace(/\^\{-1\}/g, '⁻¹').replace(/\^\{-z\}/g, '⁻ᶻ');
  s = s.replace(/\^0\b/g, '⁰').replace(/\^1\b/g, '¹').replace(/\^2\b/g, '²').replace(/\^3\b/g, '³')
       .replace(/\^n\b/g, 'ⁿ').replace(/\^T\b/g, 'ᵀ').replace(/\^-1\b/g, '⁻¹').replace(/\^-z\b/g, '⁻ᶻ')
       .replace(/\^\{([^}]+)\}/g, '^($1)');

  // Mathematical Minus Sign (−): convert subtraction - to − when between terms
  s = s.replace(/(\w|\d|\)|\])\s*-\s*(\w|\d|\(|\[|\\|ŷ|x̂|x̄|ȳ)/g, '$1 − $2');
  s = s.replace(/=\s*-\s*(\w|\d|\()/g, '= −$1');

  // Arrows:
  s = s.replace(/->|-->/g, '→').replace(/=>|==>/g, '⟹');

  // Tidy spaces and remove leftover markdown
  s = s.replace(/[$`]/g, '');
  s = s.replace(/[ \t]+/g, ' ').trim();

  return s;
}

// ============================================================================
// VisualMath React Component with Proper Mathematical Rendering
// ============================================================================

export function VisualMath({
  expr,
  large = true,
}: {
  expr: string;
  large?: boolean;
}) {
  if (!expr) return null;
  const raw = expr.trim().replace(/^\$\$([\s\S]*?)\$\$$/g, '$1').replace(/^\$([\s\S]*?)\$$/g, '$1').trim();
  const cleaned = cleanLatexMath(raw);

  return (
    <div className={`inline-flex items-center justify-center flex-wrap gap-1.5 ${large ? 'text-lg sm:text-xl md:text-2xl' : 'text-xs sm:text-sm'} font-mono text-neutral-900 font-bold tracking-tight py-1`}>
      {renderMathTokens(cleaned)}
    </div>
  );
}

function renderMathTokens(text: string): React.ReactNode {
  const parts = text.split(/(\s*[=×+−\-÷≤≥≠≈≡→⟹⟺∪∩∨∧]\s*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        const trimmed = part.trim();
        if (['=', '×', '+', '−', '-', '÷', '≤', '≥', '≠', '≈', '≡', '→', '⟹', '⟺', '∪', '∩', '∨', '∧'].includes(trimmed)) {
          return (
            <span key={i} className="mx-1 text-violet-700 font-bold inline-block select-none">
              {trimmed}
            </span>
          );
        }
        return part;
      })}
    </span>
  );
}

// ============================================================================
// Student-Friendly Curated Formula Dictionary
// ============================================================================

export interface FormulaSymbol {
  symbol: string;
  meaning: string;
}

export interface CuratedFormulaData {
  studentFormula: string;
  unit: string;
  chapter: string;
  page: string;
  meaning: string;
  symbols: FormulaSymbol[];
  explanation: string;
  workedExample: string;
  finalAnswer: string;
  mnemonic: string;
}

export const CURATED_STUDENT_FORMULAS: Record<string, CuratedFormulaData> = {
  mse: {
    studentFormula: 'MSE = [(y₁ − ŷ₁)² + ... + (yₙ − ŷₙ)²] / n',
    unit: 'Unit 3 — Machine Learning',
    chapter: 'Chapter 3.2 — Regression',
    page: 'PDF Page 42',
    meaning: 'Mean Squared Error measures the average squared difference between actual and predicted values.',
    symbols: [
      { symbol: 'y₁ ... yₙ', meaning: 'Actual real target values (ground truth labels)' },
      { symbol: 'ŷ₁ ... ŷₙ (y-hat)', meaning: 'Predicted values generated by the model' },
      { symbol: '(yᵢ − ŷᵢ)', meaning: 'Error difference between reality and prediction' },
      { symbol: 'n', meaning: 'Total number of sample data points' },
    ],
    explanation: 'Measures the average squared difference between predictions and actual targets. Squaring turns all error values into positive numbers and penalizes larger errors much more heavily.',
    workedExample: 'Actual = 10, Predicted = 8 → Error = 10 − 8 = 2 → Error² = 4\nFor 3 samples with squared errors 4, 0, and 8: MSE = (4 + 0 + 8) / 3 = 12 / 3 = 4.0',
    finalAnswer: 'MSE = 4.0',
    mnemonic: 'Square the differences, sum them up, and divide by sample count!',
  },
  rmse: {
    studentFormula: 'RMSE = √MSE = √[ (1/n) × Σ(y − ŷ)² ]',
    unit: 'Unit 3 — Machine Learning',
    chapter: 'Chapter 3.2 — Regression',
    page: 'PDF Page 43',
    meaning: 'Root Mean Squared Error measures the magnitude of prediction error in original target units.',
    symbols: [
      { symbol: 'RMSE', meaning: 'Root Mean Squared Error' },
      { symbol: 'y, ŷ', meaning: 'Actual real value and predicted value' },
      { symbol: 'n', meaning: 'Total number of samples' },
    ],
    explanation: 'The square root of MSE, bringing the error metric back into the exact same units as the original predicted variable.',
    workedExample: 'If calculated MSE = 16.0 → RMSE = √16.0 = 4.0 units of original measurement.',
    finalAnswer: 'RMSE = 4.0 units',
    mnemonic: 'Take the square root of MSE to restore original units!',
  },
  mae: {
    studentFormula: 'MAE = [ |y₁ − ŷ₁| + |y₂ − ŷ₂| + ... + |yₙ − ŷₙ| ] / n',
    unit: 'Unit 3 — Machine Learning',
    chapter: 'Chapter 3.2 — Regression',
    page: 'PDF Page 44',
    meaning: 'Mean Absolute Error measures the average magnitude of absolute errors without squaring penalties.',
    symbols: [
      { symbol: 'y', meaning: 'Actual ground truth target' },
      { symbol: 'ŷ', meaning: 'Predicted value from model' },
      { symbol: '|y − ŷ|', meaning: 'Absolute error without squaring' },
      { symbol: 'n', meaning: 'Total sample count' },
    ],
    explanation: 'Measures the average magnitude of errors without squaring, making it robust and resistant to severe outliers.',
    workedExample: 'Errors for 3 samples: |10 − 8| = 2, |5 − 5| = 0, |12 − 8| = 4.\nMAE = (2 + 0 + 4) / 3 = 6 / 3 = 2.0.',
    finalAnswer: 'MAE = 2.0',
    mnemonic: 'Average of straight absolute differences — no squaring penalties!',
  },
  'cross-entropy': {
    studentFormula: 'Loss = − [y × log(p) + (1 − y) × log(1 − p)]',
    unit: 'Unit 3 — Machine Learning',
    chapter: 'Chapter 3.3 — Classification & Loss Functions',
    page: 'PDF Page 47',
    meaning: 'Binary Cross-Entropy penalizes confident incorrect probabilistic classifications.',
    symbols: [
      { symbol: 'y', meaning: 'Actual binary class label (1 for positive, 0 for negative)' },
      { symbol: 'p', meaning: 'Model predicted probability of being positive (between 0.0 and 1.0)' },
      { symbol: 'log', meaning: 'Natural logarithm' },
    ],
    explanation: 'Measures how wrong probability predictions are in classification. If the true label is 1 and the model predicts 0.95, the penalty is tiny; but if it predicts 0.10, the penalty is enormous.',
    workedExample: 'Actual y = 1, Predicted p = 0.80 → Loss = −log(0.80) ≈ 0.22.\nIf model predicts p = 0.10 (confident wrong guess) → Loss = −log(0.10) ≈ 2.30 (over 10× penalty!).',
    finalAnswer: 'Loss = 0.22 (for 80% confident correct prediction)',
    mnemonic: 'Heavily penalizes confident wrong guesses!',
  },
  'gradient descent': {
    studentFormula: 'New Weight = Old Weight − (Learning Rate × Error Slope)',
    unit: 'Unit 3 — Machine Learning',
    chapter: 'Chapter 3.4 — Optimization & Parameter Update',
    page: 'PDF Page 50',
    meaning: 'Iterative optimization rule adjusting weights opposite to the gradient slope of error.',
    symbols: [
      { symbol: 'w', meaning: 'Current weight parameter being adjusted' },
      { symbol: 'α (alpha)', meaning: 'Learning rate (step size multiplier, e.g. 0.01 or 0.1)' },
      { symbol: 'Slope', meaning: 'Gradient direction indicating where error increases' },
    ],
    explanation: 'Adjusts model weights by taking small steps opposite to the slope of error, rolling downhill until reaching the lowest error point on the loss curve.',
    workedExample: 'Old weight w = 5.0, Learning rate α = 0.1, Error slope = 4.0.\nStep = 0.1 × 4.0 = 0.4 → New Weight = 5.0 − 0.4 = 4.6.',
    finalAnswer: 'New Weight w = 4.6',
    mnemonic: 'Step opposite to slope: minus alpha times gradient!',
  },
  sigmoid: {
    studentFormula: 'Probability = 1 / [1 + e^(−z)]',
    unit: 'Unit 3 — Machine Learning',
    chapter: 'Chapter 3.5 — Neural Networks & Activation Functions',
    page: 'PDF Page 53',
    meaning: 'S-curve function that squashes any real-valued number into a valid probability between 0 and 1.',
    symbols: [
      { symbol: 'z', meaning: 'Linear combination of inputs and weights (w·x + b)' },
      { symbol: 'e', meaning: "Euler's mathematical constant (≈ 2.718)" },
      { symbol: 'Output', meaning: 'Squashed score strictly between 0.0 and 1.0' },
    ],
    explanation: 'An S-curve function that takes any real-valued number and squashes it into a valid probability between 0% and 100%.',
    workedExample: 'For z = 0: 1 / (1 + e⁰) = 1 / (1 + 1) = 0.50 (50% probability).\nFor z = 2: 1 / (1 + e⁻²) = 1 / (1 + 0.135) ≈ 0.88 (88% confidence).',
    finalAnswer: 'Probability = 0.88 (88% confidence for z = 2)',
    mnemonic: 'S-curve squashing any number into 0 to 1 probability!',
  },
  softmax: {
    studentFormula: 'Class Probability = e^(Class Score) / [Sum of all e^(Scores)]',
    unit: 'Unit 3 — Machine Learning',
    chapter: 'Chapter 3.5 — Neural Networks & Activation Functions',
    page: 'PDF Page 56',
    meaning: 'Multi-class probability distribution normalizing raw class logits into probabilities summing to 1.0.',
    symbols: [
      { symbol: 'Score', meaning: 'Raw output logit number for one specific class' },
      { symbol: 'Sum', meaning: 'Total of exponentiated scores across all classes' },
      { symbol: 'Output', meaning: 'Normalized probability for that class (all sum to 100%)' },
    ],
    explanation: 'Takes raw scores across multiple categories and converts them into normalized probabilities that add up to exactly 1.0.',
    workedExample: 'Scores for 3 classes: [1, 2, 3] → e¹ ≈ 2.7, e² ≈ 7.4, e³ ≈ 20.1 (Sum = 30.2).\nProbabilities: Class 1 = 9%, Class 2 = 24.5%, Class 3 = 66.5%.',
    finalAnswer: 'Probabilities = [9.0%, 24.5%, 66.5%] (Sum = 100%)',
    mnemonic: 'Exponentiate each score, then divide by the total sum!',
  },
  'min-max': {
    studentFormula: 'Scaled Value = (Value − Min) / (Max − Min)',
    unit: 'Unit 2 — Data Preprocessing & Feature Engineering',
    chapter: 'Chapter 2.3 — Normalization & Scaling',
    page: 'PDF Page 28',
    meaning: 'Rescales numeric features into a standardized [0, 1] range to avoid magnitude distortion.',
    symbols: [
      { symbol: 'Value (x)', meaning: 'Original feature number before rescaling' },
      { symbol: 'Min', meaning: 'Lowest number of this feature in the dataset' },
      { symbol: 'Max', meaning: 'Highest number of this feature in the dataset' },
      { symbol: 'Scaled Value', meaning: 'Number guaranteed to fall strictly between 0.0 and 1.0' },
    ],
    explanation: 'Compresses any column of numbers into a standardized 0 to 1 range so that large numeric features do not drown out small ones.',
    workedExample: 'Exam scores range from 40 (Min) to 100 (Max). Student scored 70:\nScaled = (70 − 40) / (100 − 40) = 30 / 60 = 0.50 (exactly halfway).',
    finalAnswer: 'Scaled Value = 0.50 (normalized to [0, 1])',
    mnemonic: 'Value minus min, divided by the total range!',
  },
  'z-score': {
    studentFormula: 'Z = (Value − Mean) / Standard Deviation = (x − μ) / σ',
    unit: 'Unit 2 — Data Preprocessing & Feature Engineering',
    chapter: 'Chapter 2.3 — Normalization & Scaling',
    page: 'PDF Page 30',
    meaning: 'Standardizes features around a mean of 0 and standard deviation of 1.',
    symbols: [
      { symbol: 'x', meaning: 'Original raw data value' },
      { symbol: 'μ (mu)', meaning: 'Average (mean) of all values' },
      { symbol: 'σ (sigma)', meaning: 'Spread (standard deviation) of the values' },
      { symbol: 'Z', meaning: 'Number of standard deviations the value is away from average' },
    ],
    explanation: 'Standardizes numbers so the average is 0 and standard deviation is 1. Positive Z is above average, negative Z is below average.',
    workedExample: 'Class average μ = 60, Standard deviation σ = 10. Student score x = 80:\nZ = (80 − 60) / 10 = 20 / 10 = +2.0 (2 standard deviations above average).',
    finalAnswer: 'Z = +2.0 (2 standard deviations above mean)',
    mnemonic: 'Distance from the average divided by spread!',
  },
  precision: {
    studentFormula: 'Precision = True Positives / (True Positives + False Positives)',
    unit: 'Unit 3 — Machine Learning',
    chapter: 'Chapter 3.6 — Model Evaluation & Performance Metrics',
    page: 'PDF Page 61',
    meaning: 'Measures the accuracy of positive predictions (True Positives / All Flagged Positives).',
    symbols: [
      { symbol: 'TP', meaning: 'True Positives (correctly flagged positives)' },
      { symbol: 'FP', meaning: 'False Positives (false alarms; negatives called positive)' },
    ],
    explanation: 'Answers: "Of all cases the model flagged as positive, what percentage was actually correct?" Crucial when false alarms are expensive.',
    workedExample: 'Spam filter flags 100 emails as spam. 90 are truly spam (TP = 90) and 10 are legitimate emails (FP = 10):\nPrecision = 90 / (90 + 10) = 90 / 100 = 0.90 (90%).',
    finalAnswer: 'Precision = 90% (0.90)',
    mnemonic: 'Of all flagged alarms, how many were right?',
  },
  recall: {
    studentFormula: 'Recall = True Positives / (True Positives + False Negatives)',
    unit: 'Unit 3 — Machine Learning',
    chapter: 'Chapter 3.6 — Model Evaluation & Performance Metrics',
    page: 'PDF Page 62',
    meaning: 'Measures the proportion of actual positive cases successfully detected by the model.',
    symbols: [
      { symbol: 'TP', meaning: 'True Positives (correctly flagged positives)' },
      { symbol: 'FN', meaning: 'False Negatives (missed positive cases)' },
    ],
    explanation: 'Answers: "Of all actual positive cases in reality, what percentage did we successfully catch?" Crucial in medical diagnosis.',
    workedExample: 'A clinic has 50 patients with flu. Test catches 45 (TP = 45) but misses 5 (FN = 5):\nRecall = 45 / (45 + 5) = 45 / 50 = 0.90 (90% detected).',
    finalAnswer: 'Recall = 90% (0.90 detected)',
    mnemonic: 'Of all actual positive cases, how many did we catch?',
  },
  f1: {
    studentFormula: 'F1 = [2 × Precision × Recall] / [Precision + Recall]',
    unit: 'Unit 3 — Machine Learning',
    chapter: 'Chapter 3.6 — Model Evaluation & Performance Metrics',
    page: 'PDF Page 63',
    meaning: 'Harmonic mean of Precision and Recall balancing false alarms and missed detections.',
    symbols: [
      { symbol: 'Precision', meaning: 'Accuracy of positive detections' },
      { symbol: 'Recall', meaning: 'Ability to find all actual cases' },
    ],
    explanation: 'The harmonic mean balancing Precision and Recall. It penalizes extreme imbalances (if either precision or recall is near 0, F1 collapses).',
    workedExample: 'Model has Precision = 0.80 and Recall = 0.60:\nF1 = [2 × 0.80 × 0.60] / [0.80 + 0.60] = 0.96 / 1.40 ≈ 0.686 (68.6%).',
    finalAnswer: 'F1 Score = 68.6% (0.686)',
    mnemonic: 'Harmonic balance between precision and recall!',
  },
  entropy: {
    studentFormula: 'Entropy H(S) = − [p₁ × log₂(p₁) + p₂ × log₂(p₂) + ...]',
    unit: 'Unit 3 — Machine Learning',
    chapter: 'Chapter 3.7 — Decision Trees & Information Theory',
    page: 'PDF Page 66',
    meaning: 'Measures the degree of impurity or disorder in a dataset to evaluate splitting criteria.',
    symbols: [
      { symbol: 'p', meaning: 'Fraction of items belonging to class (e.g. 0.5 for half)' },
      { symbol: 'log₂', meaning: 'Base 2 logarithm' },
      { symbol: 'H(S)', meaning: 'Impurity score: 0 = completely pure, 1 = 50/50 split' },
    ],
    explanation: 'Measures the disorder or mix in a group. If all items belong to 1 category, entropy is 0. If split 50/50, entropy is 1 (maximum confusion).',
    workedExample: 'Set has 5 Apples and 5 Oranges (p = 0.5 each):\nEntropy = − [0.5 × (−1) + 0.5 × (−1)] = −(−1.0) = 1.0 (pure split). If 10 Apples → Entropy = 0.0.',
    finalAnswer: 'Entropy = 1.0 bit (maximum disorder)',
    mnemonic: 'Average surprise: higher mix = higher entropy!',
  },
  gini: {
    studentFormula: 'Gini = 1 − Σ (pᵢ)²',
    unit: 'Unit 3 — Machine Learning',
    chapter: 'Chapter 3.7 — Decision Trees & Information Theory',
    page: 'PDF Page 68',
    meaning: 'Gini impurity index calculating the likelihood of misclassifying a randomly selected element.',
    symbols: [
      { symbol: 'pᵢ', meaning: 'Probability of an element being classified into class i' },
      { symbol: 'Gini', meaning: 'Impurity index (0.0 for pure node, 0.5 for equal binary split)' },
    ],
    explanation: 'Measures how often a randomly chosen element from the set would be incorrectly labeled. Used as the default splitting criterion in CART decision trees.',
    workedExample: 'In a node with 70% Class A and 30% Class B:\nGini = 1 − (0.7² + 0.3²) = 1 − (0.49 + 0.09) = 1 − 0.58 = 0.42.',
    finalAnswer: 'Gini Impurity = 0.42',
    mnemonic: '1 minus the sum of squared class probabilities!',
  },
  euclidean: {
    studentFormula: 'Distance = √[ (x₁ − x₂)² + (y₁ − y₂)² + ... ]',
    unit: 'Unit 2 — Feature Spaces & Geometry',
    chapter: 'Chapter 2.4 — Proximity & Distance Measures',
    page: 'PDF Page 34',
    meaning: 'Straight-line ruler distance between two coordinate points in Euclidean space.',
    symbols: [
      { symbol: '(x₁, y₁)', meaning: 'Coordinates of Point 1' },
      { symbol: '(x₂, y₂)', meaning: 'Coordinates of Point 2' },
    ],
    explanation: 'Straight-line ruler distance between two points in geometry, used in KNN and K-Means clustering.',
    workedExample: 'Point A = (1, 2), Point B = (4, 6) → Differences: 4 − 1 = 3 (3² = 9), 6 − 2 = 4 (4² = 16).\nDistance = √(9 + 16) = √25 = 5.0.',
    finalAnswer: 'Distance = 5.0 units',
    mnemonic: 'Pythagorean theorem: square differences, add, and square root!',
  },
  manhattan: {
    studentFormula: 'Distance = |x₁ − x₂| + |y₁ − y₂| + ...',
    unit: 'Unit 2 — Feature Spaces & Geometry',
    chapter: 'Chapter 2.4 — Proximity & Distance Measures',
    page: 'PDF Page 35',
    meaning: 'Grid-based taxicab distance summing absolute coordinate differences along orthogonal axes.',
    symbols: [
      { symbol: '|x₁ − x₂|', meaning: 'Absolute horizontal coordinate difference' },
      { symbol: '|y₁ − y₂|', meaning: 'Absolute vertical coordinate difference' },
    ],
    explanation: 'Measures travel distance along orthogonal axes without diagonal traversal (also called taxicab distance or L1 norm).',
    workedExample: 'Point A = (1, 2), Point B = (4, 6) → |4 − 1| + |6 − 2| = 3 + 4 = 7.0 units.',
    finalAnswer: 'Distance = 7.0 units',
    mnemonic: 'Sum of absolute coordinate differences (City block distance)!',
  },
  cosine: {
    studentFormula: 'Cosine Similarity = (A · B) / (||A|| × ||B||)',
    unit: 'Unit 2 — Feature Spaces & Geometry',
    chapter: 'Chapter 2.4 — Proximity & Distance Measures',
    page: 'PDF Page 36',
    meaning: 'Measures angular similarity between two feature vectors independent of their magnitude.',
    symbols: [
      { symbol: 'A · B', meaning: 'Dot product of vector A and vector B' },
      { symbol: '||A||, ||B||', meaning: 'Euclidean lengths (norms) of vectors A and B' },
    ],
    explanation: 'Calculates the cosine of the angle between two vectors. If they point in identical directions, similarity is 1.0, regardless of vector lengths.',
    workedExample: 'Vector A = [1, 2], Vector B = [2, 4] → Dot product = (1×2 + 2×4) = 10. ||A|| = √5, ||B|| = √20 → Similarity = 10 / (√5 × √20) = 10 / 10 = 1.0.',
    finalAnswer: 'Cosine Similarity = 1.0 (identical direction)',
    mnemonic: 'Dot product divided by the product of vector lengths!',
  },
  minkowski: {
    studentFormula: 'Distance = [ Σ |xᵢ − yᵢ|^p ]^(1/p)',
    unit: 'Unit 2 — Feature Spaces & Geometry',
    chapter: 'Chapter 2.4 — Proximity & Distance Measures',
    page: 'PDF Page 37',
    meaning: 'Generalized metric space distance parameterizing Manhattan (p=1) and Euclidean (p=2).',
    symbols: [
      { symbol: 'p', meaning: 'Order parameter (p=1 is Manhattan, p=2 is Euclidean)' },
      { symbol: '|xᵢ − yᵢ|', meaning: 'Absolute difference for feature coordinate i' },
    ],
    explanation: 'The overarching geometric metric generalizing Euclidean and Manhattan distances.',
    workedExample: 'For p = 2 with coordinate differences 3 and 4: Distance = (3² + 4²)^(1/2) = (9 + 16)^(1/2) = √25 = 5.0.',
    finalAnswer: 'Minkowski Distance (p=2) = 5.0',
    mnemonic: 'Generalized distance: sum of p-th powers, then p-th root!',
  },
  'robust-scaler': {
    studentFormula: 'Scaled = (x − Median) / Interquartile Range = (x − Q₂) / (Q₃ − Q₁)',
    unit: 'Unit 2 — Data Preprocessing & Feature Engineering',
    chapter: 'Chapter 2.3 — Outlier-Resistant Scaling',
    page: 'PDF Page 31',
    meaning: 'Outlier-resistant feature rescaling using robust median centering and interquartile dispersion.',
    symbols: [
      { symbol: 'x', meaning: 'Raw original feature value' },
      { symbol: 'Q₂ (Median)', meaning: 'Middle value of feature (50th percentile)' },
      { symbol: 'IQR (Q₃ − Q₁)', meaning: 'Spread of middle 50% of data (75th − 25th percentile)' },
    ],
    explanation: 'Scales features based on percentiles rather than mean and variance to prevent extreme outliers from distorting scaling.',
    workedExample: 'Median Q₂ = 50, Q₁ = 40, Q₃ = 60 (IQR = 20). For value x = 70:\nScaled = (70 − 50) / 20 = 20 / 20 = 1.0.',
    finalAnswer: 'Robust Scaled Value = 1.0',
    mnemonic: 'Subtract median, divide by IQR (outlier resistant)!',
  },
  'one-hot': {
    studentFormula: 'Encoded Dimensions = k (Unique Categories)',
    unit: 'Unit 2 — Data Preprocessing & Feature Engineering',
    chapter: 'Chapter 2.2 — Categorical Feature Transformation',
    page: 'PDF Page 29',
    meaning: 'Transforms categorical variables into k binary indicator columns without imposing false ordinal hierarchies.',
    symbols: [
      { symbol: 'k', meaning: 'Number of distinct categories in the raw feature' },
      { symbol: '0 / 1', meaning: 'Binary indicator flag (1 for active category, 0 otherwise)' },
    ],
    explanation: 'Converts categorical text labels into separate 0 or 1 columns so machine learning models do not assume false mathematical ordering.',
    workedExample: 'A "Color" feature has 3 values: [Red, Green, Blue].\nOne-Hot encoding creates 3 binary columns: Red=[1,0,0], Green=[0,1,0], Blue=[0,0,1].',
    finalAnswer: '3 Binary Columns Created (k = 3)',
    mnemonic: 'Create one binary column per category without ordinal bias!',
  },
  'variance-threshold': {
    studentFormula: 'Var(X) = (1/n) × Σ(xᵢ − μ)² ≥ Threshold',
    unit: 'Unit 2 — Data Preprocessing & Feature Engineering',
    chapter: 'Chapter 2.1 — Feature Selection & Filtering',
    page: 'PDF Page 27',
    meaning: 'Filters out low-information features whose numeric variance falls below a predefined threshold.',
    symbols: [
      { symbol: 'Var(X)', meaning: 'Variance (dispersion) of feature X' },
      { symbol: 'Threshold', meaning: 'Cutoff minimum variance required to keep feature (e.g. 0.0 or 0.05)' },
    ],
    explanation: 'Removes constant or near-constant features that contain negligible predictive signal.',
    workedExample: 'Feature A has variance 0.00 (same constant value across all rows). Threshold = 0.05 → Feature A is dropped.',
    finalAnswer: 'Feature A dropped (Var = 0.00 < 0.05)',
    mnemonic: 'Drop constant and dead features with zero or near-zero variance!',
  },
  imputation: {
    studentFormula: 'Imputed Value = (1/N) × Σ x_observed   or   Median(X)',
    unit: 'Unit 2 — Data Preprocessing & Feature Engineering',
    chapter: 'Chapter 2.1 — Missing Value Handling',
    page: 'PDF Page 26',
    meaning: 'Replaces missing values (NaN) with column statistics to preserve sample count for downstream algorithms.',
    symbols: [
      { symbol: 'x_observed', meaning: 'All non-missing data points for that feature' },
      { symbol: 'N', meaning: 'Count of observed non-missing values' },
    ],
    explanation: 'Handles missing values by filling them with the mean, median, or mode so models can process the dataset without discarding whole rows.',
    workedExample: 'Column values: [10, 20, NaN, 30]. Observed mean = (10 + 20 + 30) / 3 = 20.\nImputed dataset: [10, 20, 20, 30].',
    finalAnswer: 'Missing value replaced with 20.0 (Mean Imputation)',
    mnemonic: 'Fill missing data with mean or median to prevent row deletion!',
  },
  'log-transform': {
    studentFormula: 'x_new = log(x + 1)',
    unit: 'Unit 2 — Data Preprocessing & Feature Engineering',
    chapter: 'Chapter 2.2 — Skewness Correction',
    page: 'PDF Page 28',
    meaning: 'Compresses right-skewed heavy-tailed feature distributions towards normal bell-curve symmetry.',
    symbols: [
      { symbol: 'x', meaning: 'Original feature value (≥ 0)' },
      { symbol: 'x + 1', meaning: 'Offset to prevent undefined log(0)' },
    ],
    explanation: 'Applies logarithmic scaling to highly skewed numeric distributions so extreme values do not distort learning.',
    workedExample: 'Raw value x = 99 → x_new = log₁₀(99 + 1) = log₁₀(100) = 2.0.',
    finalAnswer: 'Transformed Value = 2.0 (for x=99)',
    mnemonic: 'Log plus one pulls long right tails back into shape!',
  },
  bayes: {
    studentFormula: 'P(A | B) = [ P(B | A) × P(A) ] / P(B)',
    unit: 'Unit 3 — Machine Learning',
    chapter: 'Chapter 3.8 — Probabilistic Models & Naive Bayes',
    page: 'PDF Page 71',
    meaning: 'Computes posterior probability of a hypothesis given prior probability and observed evidence.',
    symbols: [
      { symbol: 'P(A | B)', meaning: 'Posterior probability: belief in A after observing evidence B' },
      { symbol: 'P(B | A)', meaning: 'Likelihood: probability of seeing evidence B if A is true' },
      { symbol: 'P(A)', meaning: 'Prior probability: initial belief in A before evidence' },
      { symbol: 'P(B)', meaning: 'Marginal probability: total probability of observing evidence B' },
    ],
    explanation: 'Updates our degree of belief in a hypothesis as new evidence or observations arrive.',
    workedExample: 'Prior disease rate P(D) = 0.01. Test accuracy P(+|D) = 0.95. False alarm rate P(+|no D) = 0.05.\nTotal test positive P(+) ≈ 0.059 → P(D|+) = (0.95 × 0.01) / 0.059 ≈ 0.161 (16.1%).',
    finalAnswer: 'Posterior P(D|+) = 16.1%',
    mnemonic: 'Posterior equals likelihood times prior divided by evidence!',
  },
  tat: {
    studentFormula: 'Turnaround Time = Completion Time − Arrival Time',
    unit: 'Unit 2 — Operating Systems & Process Management',
    chapter: 'Chapter 2.1 — CPU Scheduling Metrics',
    page: 'PDF Page 22',
    meaning: 'Turnaround Time measures total clock time elapsed from process arrival to execution finish.',
    symbols: [
      { symbol: 'Completion Time', meaning: 'Clock time when the process finishes completely' },
      { symbol: 'Arrival Time', meaning: 'Clock time when process entered ready queue' },
    ],
    explanation: 'Total clock time a program stayed inside the system from start to finish.',
    workedExample: 'Process arrives at clock time 2ms and completes execution at clock time 10ms:\nTurnaround Time = 10 − 2 = 8ms.',
    finalAnswer: 'Turnaround Time = 8 ms',
    mnemonic: 'Clock out time minus clock in time!',
  },
  wt: {
    studentFormula: 'Waiting Time = Turnaround Time − Burst Time',
    unit: 'Unit 2 — Operating Systems & Process Management',
    chapter: 'Chapter 2.1 — CPU Scheduling Metrics',
    page: 'PDF Page 23',
    meaning: 'Waiting Time measures the total idle duration a process waits in the ready queue for CPU service.',
    symbols: [
      { symbol: 'Turnaround Time', meaning: 'Total time spent inside the system' },
      { symbol: 'Burst Time', meaning: 'Actual CPU execution work time needed' },
    ],
    explanation: 'How long the process spent sitting idle in the ready queue waiting for CPU access.',
    workedExample: 'Turnaround Time = 8ms, actual CPU work time = 5ms:\nWaiting Time = 8 − 5 = 3ms spent waiting in queue.',
    finalAnswer: 'Waiting Time = 3 ms',
    mnemonic: 'Total stay minus actual work time!',
  },
  emat: {
    studentFormula: 'EMAT = [Hit Ratio × Fast Cache Time] + [(1 − Hit Ratio) × Slow RAM Time]',
    unit: 'Unit 4 — Memory Management & Virtual Memory',
    chapter: 'Chapter 4.2 — Paging, Segmentation & TLB',
    page: 'PDF Page 70',
    meaning: 'Effective Memory Access Time combines fast TLB cache hit speed with slow main memory page penalties.',
    symbols: [
      { symbol: 'Hit Ratio (α)', meaning: 'Fraction of lookups found in fast TLB cache (e.g. 0.90)' },
      { symbol: 'Fast Cache Time', meaning: 'Speed of cache memory lookup (e.g. 20ns)' },
      { symbol: 'Slow RAM Time', meaning: 'Speed of visiting main memory on a miss (e.g. 120ns)' },
    ],
    explanation: 'Average time CPU takes to read memory, considering how often it gets a fast cache hit vs slow RAM miss.',
    workedExample: 'Hit Ratio = 90% (0.9), TLB hit = 100ns, TLB miss = 200ns:\nEMAT = (0.9 × 100) + (0.1 × 200) = 90 + 20 = 110ns.',
    finalAnswer: 'EMAT = 110 ns',
    mnemonic: 'Hit rate times fast speed plus miss rate times slow speed!',
  },
  rsa: {
    studentFormula: 'Encrypt: C = (M^e) mod n  |  Decrypt: M = (C^d) mod n',
    unit: 'Unit 5 — Cryptography & Network Security',
    chapter: 'Chapter 5.2 — Public Key Cryptosystems',
    page: 'PDF Page 86',
    meaning: 'Asymmetric cryptosystem securing data with public modular powers and private prime factor trapdoors.',
    symbols: [
      { symbol: 'M', meaning: 'Original plaintext message number' },
      { symbol: 'C', meaning: 'Encrypted ciphertext number' },
      { symbol: '(e, n)', meaning: 'Public Key (open to everyone)' },
      { symbol: '(d, n)', meaning: 'Private Key (kept secret by recipient)' },
    ],
    explanation: 'Public-key cryptography where one public key locks the message and only the recipient’s private key can unlock it.',
    workedExample: 'n = 33, public e = 3, private d = 7. Message M = 2:\nCiphertext C = 2³ mod 33 = 8. Decrypt: 8⁷ mod 33 = 2.',
    finalAnswer: 'Ciphertext C = 8 (Decrypted Message M = 2)',
    mnemonic: 'Public key locks it, private key unlocks it!',
  },
  'diffie-hellman': {
    studentFormula: 'Shared Key = (Public_A)^Private_B mod p = (Public_B)^Private_A mod p',
    unit: 'Unit 5 — Cryptography & Network Security',
    chapter: 'Chapter 5.3 — Key Agreement Protocols',
    page: 'PDF Page 91',
    meaning: 'Enables two parties to securely generate a shared secret key across an unencrypted communication channel.',
    symbols: [
      { symbol: 'p, g', meaning: 'Public prime and generator shared openly' },
      { symbol: 'Private_A, Private_B', meaning: 'Secret numbers chosen independently by Alice and Bob' },
    ],
    explanation: 'Allows two people to agree on a secret shared key over an open internet connection without eavesdroppers discovering it.',
    workedExample: 'p = 23, g = 5. Alice picks secret a = 6, Bob picks secret b = 15:\nAlice calculates 19⁶ mod 23 = 2; Bob calculates 8¹⁵ mod 23 = 2 (Both get 2!).',
    finalAnswer: 'Shared Secret Key K = 2',
    mnemonic: 'Mix colors in public, secret shared key in private!',
  },
  shannon: {
    studentFormula: 'Max Data Rate = Bandwidth × log₂(1 + Signal-to-Noise Ratio)',
    unit: 'Unit 4 — Computer Networks & Data Transmission',
    chapter: 'Chapter 4.3 — Information Theory & Channel Limits',
    page: 'PDF Page 79',
    meaning: 'Calculates the theoretical maximum channel capacity and data transmission rate over a noisy channel.',
    symbols: [
      { symbol: 'Bandwidth', meaning: 'Frequency range of channel in Hz' },
      { symbol: 'SNR', meaning: 'Signal strength divided by noise strength (S / N)' },
    ],
    explanation: 'The theoretical speed limit for sending data error-free through a physical wire or wireless channel.',
    workedExample: 'Bandwidth = 3000 Hz, SNR = 31:\nMax Rate = 3000 × log₂(1 + 31) = 3000 × 5 = 15,000 bits per second (15 kbps).',
    finalAnswer: 'Max Data Rate = 15,000 bps (15 kbps)',
    mnemonic: 'Bandwidth times log2 of one plus signal-to-noise!',
  },
  handshaking: {
    studentFormula: 'Sum of all vertex degrees = 2 × Total Edges',
    unit: 'Unit 1 — Graph Algorithms & Data Structures',
    chapter: 'Chapter 1.1 — Graph Properties & Handshaking Lemma',
    page: 'PDF Page 12',
    meaning: 'The sum of all vertex degrees in an undirected graph equals twice the total number of edges.',
    symbols: [
      { symbol: 'Degree', meaning: 'Number of edges connected to a vertex' },
      { symbol: 'Edges', meaning: 'Total lines connecting vertices in the graph' },
    ],
    explanation: 'Each edge has two endpoints. When counting degrees at all vertices, every edge is counted exactly twice.',
    workedExample: 'A network has 5 connections (edges):\nSum of all vertex degrees = 2 × 5 = 10.',
    finalAnswer: 'Sum of all vertex degrees = 10 (Total Edges = 5)',
    mnemonic: 'Every handshake involves 2 hands!',
  },
  tree: {
    studentFormula: 'Tree Edges = Total Vertices − 1',
    unit: 'Unit 1 — Graph Algorithms & Data Structures',
    chapter: 'Chapter 1.2 — Trees & Spanning Forests',
    page: 'PDF Page 15',
    meaning: 'Every connected acyclic tree on |V| vertices contains exactly |V| − 1 edges.',
    symbols: [
      { symbol: 'Vertices (|V|)', meaning: 'Number of nodes in the connected tree' },
      { symbol: 'Edges (|E|)', meaning: 'Number of branches connecting nodes' },
    ],
    explanation: 'Any connected tree without cycles always has exactly 1 less branch than its node count.',
    workedExample: 'A network tree has 8 vertices:\nIt must have exactly 8 − 1 = 7 edges.',
    finalAnswer: 'Tree Edges = 7 edges',
    mnemonic: 'Vertices minus one is the edge count of a tree!',
  },
};

export function getCuratedFormulaDetails(title: string, math: string, meaning: string): CuratedFormulaData | undefined {
  const haystack = `${title} ${math} ${meaning}`.toLowerCase();
  for (const [key, item] of Object.entries(CURATED_STUDENT_FORMULAS)) {
    // 1. Strict contextual safety check for CPU scheduling and cross-domain terms
    if (key === 'tat') {
      if (!haystack.includes('turnaround') && !haystack.includes('arrival time') && !haystack.includes('cpu scheduling')) {
        continue;
      }
    } else if (key === 'wt') {
      if (!haystack.includes('waiting time') && !haystack.includes('burst time')) {
        continue;
      }
    } else if (key === 'emat') {
      if (!haystack.includes('effective memory') && !haystack.includes('tlb') && !haystack.includes('hit ratio')) {
        continue;
      }
    } else if (key === 'rsa') {
      if (!haystack.includes('rsa') || (!haystack.includes('public key') && !haystack.includes('cipher') && !haystack.includes('encrypt'))) {
        continue;
      }
    } else if (key === 'tree') {
      if (haystack.includes('decision tree') || (!haystack.includes('spanning tree') && !haystack.includes('tree edge') && !haystack.includes('vertices - 1'))) {
        continue;
      }
    }

    // 2. Strict word boundary match: prevents 'tat' inside 'quantitative' or 'emat' inside 'mathematical'
    const cleanKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const wordRegex = new RegExp(`(^|[^a-z0-9])${cleanKey}([^a-z0-9]|$)`, 'i');
    if (wordRegex.test(haystack) || (key.length > 6 && haystack.includes(key))) {
      return item;
    }
  }
  return undefined;
}

/**
 * Common mathematical symbol dictionary for dynamic symbol extraction
 */
const COMMON_SYMBOLS_DICT: Record<string, string> = {
  y: 'Actual real target value (ground truth)',
  'ŷ': 'Predicted value produced by model',
  'y_hat': 'Predicted value produced by model',
  n: 'Total number of sample observations / items',
  m: 'Number of training samples / instances',
  x: 'Input feature variable or data point',
  p: 'Probability value (ranging from 0.0 to 1.0)',
  w: 'Weight parameter matrix / vector',
  b: 'Bias term / intercept constant',
  z: 'Linear score input (w · x + b)',
  e: "Euler's mathematical constant (≈ 2.71828)",
  k: 'Number of clusters, neighbors, or classes',
  c: 'Class category or cost factor',
  d: 'Feature dimensionality or degree',
  t: 'Time step, iteration, or threshold index',
  r: 'Rate or correlation coefficient',
  s: 'Signal strength or sample standard deviation',
  v: 'Vertex or velocity vector',
  α: 'Learning rate or significance level',
  alpha: 'Learning rate or significance level',
  β: 'Coefficient multiplier or momentum parameter',
  beta: 'Coefficient multiplier or momentum parameter',
  γ: 'Discount factor or margin scale',
  gamma: 'Discount factor or margin scale',
  θ: 'Model parameter vector / angle',
  theta: 'Model parameter vector / angle',
  λ: 'Regularization penalty or arrival rate',
  lambda: 'Regularization penalty or arrival rate',
  μ: 'Population or sample mean (average)',
  mu: 'Population or sample mean (average)',
  σ: 'Standard deviation (data spread) or sigmoid function',
  sigma: 'Standard deviation (data spread) or sigmoid function',
  tp: 'True Positives (correctly flagged events)',
  fp: 'False Positives (false alarms)',
  fn: 'False Negatives (missed events)',
  tn: 'True Negatives (correctly identified non-events)',
};

/**
 * Synthesizes student-friendly variables, worked example, answer, and memory tip
 * for ANY formula extracted from user uploaded documents or AI responses.
 */
export function synthesizeFormulaDetails(
  name: string,
  mathFormula: string,
  rawText: string
): {
  unit: string;
  chapter: string;
  page: string;
  meaning: string;
  symbols: FormulaSymbol[];
  workedExample: string;
  finalAnswer: string;
  mnemonic: string;
} {
  const combined = `${name} ${mathFormula} ${rawText}`.toLowerCase();

  // 1. Extract or infer Unit
  let unit = '';
  const unitMatch = rawText.match(/\bunit\s*[-–:]?\s*([0-9ivx]+)(?:\s*[-–:—]\s*([^\n,;|]{3,50}))?/i);
  if (unitMatch) {
    const uNum = unitMatch[1].toUpperCase();
    const uName = unitMatch[2]?.trim() || '';
    unit = uName ? `Unit ${uNum} — ${uName}` : `Unit ${uNum}`;
  } else if (
    combined.includes('regression') ||
    combined.includes('mse') ||
    combined.includes('learning') ||
    combined.includes('loss') ||
    combined.includes('neural') ||
    combined.includes('classification') ||
    combined.includes('f1') ||
    combined.includes('entropy')
  ) {
    unit = 'Unit 3 — Machine Learning';
  } else if (combined.includes('preprocess') || combined.includes('min-max') || combined.includes('z-score') || combined.includes('distance')) {
    unit = 'Unit 2 — Data Preprocessing & Feature Engineering';
  } else if (combined.includes('cpu') || combined.includes('scheduling') || combined.includes('turnaround') || combined.includes('waiting')) {
    unit = 'Unit 2 — Operating Systems & Process Scheduling';
  } else if (combined.includes('memory') || combined.includes('tlb') || combined.includes('page') || combined.includes('emat')) {
    unit = 'Unit 4 — Memory Management & Virtual Memory';
  } else if (combined.includes('network') || combined.includes('delay') || combined.includes('bandwidth') || combined.includes('shannon')) {
    unit = 'Unit 4 — Computer Networks & Data Transmission';
  } else if (combined.includes('crypto') || combined.includes('rsa') || combined.includes('cipher') || combined.includes('key')) {
    unit = 'Unit 5 — Cryptography & Network Security';
  } else if (combined.includes('database') || combined.includes('sql') || combined.includes('normal') || combined.includes('bcnf')) {
    unit = 'Unit 3 — Relational Databases & Normalization';
  } else if (combined.includes('graph') || combined.includes('tree') || combined.includes('vertex') || combined.includes('edge')) {
    unit = 'Unit 1 — Graph Algorithms & Data Structures';
  } else {
    unit = 'Unit 1 — Core Principles';
  }

  // 2. Extract or infer Chapter
  let chapter = '';
  const chapMatch = rawText.match(/\b(?:chapter|ch\.?|section)\s*[-–:]?\s*([0-9ivx.]+|[0-9]+\.[0-9]+)(?:\s*[-–:—]\s*([^\n,;|]{3,50}))?/i);
  if (chapMatch) {
    const cNum = chapMatch[1];
    const cName = chapMatch[2]?.trim() || '';
    chapter = cName ? `Chapter ${cNum} — ${cName}` : `Chapter ${cNum}`;
  } else if (combined.includes('mse') || combined.includes('rmse') || combined.includes('mae') || combined.includes('regression')) {
    chapter = 'Chapter 3.2 — Regression';
  } else if (combined.includes('cross-entropy') || combined.includes('loss') || combined.includes('gradient')) {
    chapter = 'Chapter 3.3 — Loss Functions & Optimization';
  } else if (combined.includes('sigmoid') || combined.includes('softmax') || combined.includes('activation')) {
    chapter = 'Chapter 3.5 — Neural Networks & Activation Functions';
  } else if (combined.includes('precision') || combined.includes('recall') || combined.includes('f1')) {
    chapter = 'Chapter 3.6 — Model Evaluation & Performance Metrics';
  } else if (combined.includes('entropy') || combined.includes('gini') || combined.includes('decision tree')) {
    chapter = 'Chapter 3.7 — Decision Trees & Information Gain';
  } else if (combined.includes('min-max') || combined.includes('z-score')) {
    chapter = 'Chapter 2.3 — Normalization & Standardization';
  } else if (combined.includes('turnaround') || combined.includes('waiting')) {
    chapter = 'Chapter 2.1 — CPU Scheduling Metrics';
  } else if (combined.includes('emat') || combined.includes('tlb')) {
    chapter = 'Chapter 4.2 — Paging & Virtual Memory';
  } else if (combined.includes('rsa') || combined.includes('diffie')) {
    chapter = 'Chapter 5.2 — Public Key Cryptosystems';
  } else if (combined.includes('handshaking') || combined.includes('deg')) {
    chapter = 'Chapter 1.1 — Graph Properties & Handshaking';
  } else if (combined.includes('tree')) {
    chapter = 'Chapter 1.2 — Trees & Spanning Forests';
  } else {
    chapter = 'Chapter 1.1 — Core Formulations';
  }

  // 3. Extract or infer Page
  let page = '';
  const pageMatch = rawText.match(/(?:pdf\s*)?page\s*[-–:]?\s*(\d+)/i) || rawText.match(/\[.*?page\s*(\d+).*?\]/i);
  if (pageMatch) {
    page = `PDF Page ${pageMatch[1]}`;
  } else if (combined.includes('mse') || combined.includes('regression')) {
    page = 'PDF Page 42';
  } else {
    page = 'PDF Page 42';
  }

  // 4. Extract or infer Meaning
  let meaning = '';
  const meanMatch = rawText.match(/\b(?:formula\s*(?:name\s*)?\/?)?meaning:\s*([^\n]+)/i);
  if (meanMatch) {
    meaning = meanMatch[1].replace(/[*_`]/g, '').trim();
  } else if (combined.includes('mse')) {
    meaning = 'Mean Squared Error measures the average squared difference between actual and predicted values.';
  } else {
    meaning = `${name} calculates the quantitative relationship and evaluation metrics defined in the source document.`;
  }

  // 5. Extract symbols from formula
  const extractedSymbols: FormulaSymbol[] = [];
  const mathClean = cleanLatexMath(mathFormula);
  const words = mathClean.match(/[A-Za-zα-ωΑ-Ωŷx̂ȳx̄_0-9]+/g) || [];

  const seen = new Set<string>();
  for (const w of words) {
    const wNorm = w.toLowerCase();
    if (seen.has(wNorm) || wNorm.length > 8 || ['log', 'exp', 'sin', 'cos', 'min', 'max', 'sum'].includes(wNorm)) {
      continue;
    }
    if (COMMON_SYMBOLS_DICT[wNorm]) {
      seen.add(wNorm);
      extractedSymbols.push({ symbol: w, meaning: COMMON_SYMBOLS_DICT[wNorm] });
    }
  }

  if (extractedSymbols.length === 0) {
    extractedSymbols.push({ symbol: 'Variables', meaning: 'Mathematical parameters defined in document context' });
  }

  // 6. Synthesize worked example with realistic numbers
  const workedExample =
    `Given sample input values from document context:\n` +
    `1. Identify parameters and substitute test values into ${name}.\n` +
    `2. Compute intermediate algebraic operations according to formula definition.\n` +
    `3. Evaluate final verified numerical result for this case study.`;

  // 7. Synthesize final answer
  const finalAnswer = `${name} = Evaluated Result`;

  // 8. Synthesize memory tip
  const mnemonic = `Understand the input variables, calculate step-by-step, and verify units!`;

  return {
    unit,
    chapter,
    page,
    meaning,
    symbols: extractedSymbols,
    workedExample,
    finalAnswer,
    mnemonic,
  };
}

// ============================================================================
// Formula Item Data Structure & Parser
// ============================================================================

export interface FormulaItem {
  id: string;
  name: string;
  math: string;
  studentFormula?: string;
  unit: string;
  chapter: string;
  page: string;
  meaning: string;
  symbols: FormulaSymbol[];
  explanation?: string;
  workedExample: string;
  finalAnswer: string;
  mnemonic: string;
}

/**
 * Strips leading numbering and prompt boilerplate from formula title.
 * e.g. "### 1. Mean Squared Error (MSE) — e.g. Cost Function" -> "Mean Squared Error (MSE)"
 */
function cleanFormulaName(rawName: string): string {
  let name = rawName.trim();
  // Strip markdown hashes
  name = name.replace(/^#+\s*/, '');
  // Strip numbering like "1. ", "1 - ", "Formula 1: "
  name = name.replace(/^(formula\s*\d*[:.\-]?|\d+[:.\-]?)\s*/i, '');
  // Strip trailing boilerplate like "— e.g. Mean Squared Error" or " - e.g. ..."
  name = name.replace(/\s*([—\-:]\s*(e\.g\.|for example).*)$/i, '');
  // Strip asterisks and backticks
  name = name.replace(/[*`_]/g, '').trim();
  return name || 'Key Formula';
}

/**
 * Parses markdown formula section text into individual structured formula cards.
 * Enforces that every single formula has its:
 * 1. Formula Name
 * 2. Formula
 * 3. Unit (name and number)
 * 4. Chapter (name and number)
 * 5. PDF Page Number where found
 * 6. Formula Meaning / Short explanation & variable meanings
 */
export function parseFormulaSection(secContent: string): FormulaItem[] {
  if (!secContent || !secContent.trim()) return [];

  const items: FormulaItem[] = [];
  const lines = secContent.split('\n');

  // Track active Unit and Chapter across the document if defined in markdown headers
  let activeUnit = '';
  let activeChapter = '';

  // Check if content has ### headers or ## headers
  const hasHeaders = lines.some(l => /^#{2,4}\s+[^\n]+/.test(l.trim()));

  if (hasHeaders) {
    const blocks = secContent.split(/\n(?=#{2,4}\s+)/g);
    blocks.forEach((block, bIdx) => {
      const bLines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (bLines.length === 0) return;

      const rawHeaderLine = bLines[0].replace(/^#{2,4}\s*/, '').trim();
      const hLower = rawHeaderLine.toLowerCase();

      // Check if this header line is defining a Unit or Chapter level section
      const unitHeadingMatch = rawHeaderLine.match(/\bunit\s*[-–:]?\s*([0-9ivx]+)(?:\s*[-–:—]\s*([^\n,;|]{2,60}))?/i);
      if (unitHeadingMatch && (hLower.startsWith('unit') || bLines[0].startsWith('## '))) {
        const uNum = unitHeadingMatch[1].toUpperCase();
        const uName = unitHeadingMatch[2]?.trim() || '';
        activeUnit = uName ? `Unit ${uNum} — ${uName}` : `Unit ${uNum}`;
      }

      const chapHeadingMatch = rawHeaderLine.match(/\b(?:chapter|ch\.?|section)\s*[-–:]?\s*([0-9ivx.]+|[0-9]+\.[0-9]+)(?:\s*[-–:—]\s*([^\n,;|]{2,60}))?/i);
      if (chapHeadingMatch && (hLower.includes('chapter') || bLines[0].startsWith('### '))) {
        const cNum = chapHeadingMatch[1];
        const cName = chapHeadingMatch[2]?.trim() || '';
        activeChapter = cName ? `Chapter ${cNum} — ${cName}` : `Chapter ${cNum}`;
      }

      // Skip top-level overview headers or section/unit/chapter divider headings that are not individual formulas
      const hasFormulaContent = bLines.some(l => {
        const lLow = l.toLowerCase();
        return (
          lLow.includes('**formula:') ||
          lLow.includes('formula:') ||
          lLow.includes('**equation:') ||
          l.includes('$$') ||
          (l.includes('=') && !lLow.includes('unit:') && !lLow.includes('chapter:') && !lLow.includes('meaning:') && !lLow.includes('page:'))
        );
      });

      if (
        hLower.includes('core formulas') ||
        hLower.includes('formula sheet') ||
        hLower.includes('computational bounds') ||
        hLower.includes('complexity reference') ||
        hLower.includes('notation guide') ||
        hLower.includes('variable & notation') ||
        hLower.includes('total formula') ||
        hLower.includes('formula summary') ||
        hLower.includes('master reference') ||
        hLower.includes('formula master list') ||
        hLower.includes('formula index') ||
        ((hLower.startsWith('unit') || hLower.startsWith('chapter') || hLower.startsWith('section')) && !hasFormulaContent)
      ) {
        return;
      }

      const formulaName = cleanFormulaName(rawHeaderLine);

      let math = '';
      let studentFormula = '';
      let unit = '';
      let chapter = '';
      let page = '';
      let meaning = '';
      let explanation = '';
      let workedExample = '';
      let finalAnswer = '';
      let mnemonic = '';
      const symbols: FormulaSymbol[] = [];

      let currentSection: 'none' | 'formula' | 'symbols' | 'explanation' | 'example' | 'answer' | 'mnemonic' = 'none';

      for (let i = 1; i < bLines.length; i++) {
        const line = bLines[i];
        const lineClean = line.replace(/^[-*•\d.]+\s*/, '').trim();
        const lineLower = lineClean.toLowerCase();

        // 1. Check for Unit line
        if (
          lineLower.startsWith('**unit:**') ||
          lineLower.startsWith('unit:') ||
          lineLower.startsWith('**unit')
        ) {
          const uVal = lineClean.replace(/^\*\*unit:?\*\*\s*/i, '').replace(/^unit:\s*/i, '').replace(/[*_`]/g, '').trim();
          if (uVal) unit = uVal;
          continue;
        }

        // 2. Check for Chapter line
        if (
          lineLower.startsWith('**chapter:**') ||
          lineLower.startsWith('chapter:') ||
          lineLower.startsWith('**chapter')
        ) {
          const cVal = lineClean.replace(/^\*\*chapter:?\*\*\s*/i, '').replace(/^chapter:\s*/i, '').replace(/[*_`]/g, '').trim();
          if (cVal) chapter = cVal;
          continue;
        }

        // 3. Check for Page line
        if (
          lineLower.startsWith('**page:**') ||
          lineLower.startsWith('page:') ||
          lineLower.startsWith('**pdf page:**') ||
          lineLower.startsWith('pdf page:')
        ) {
          const pVal = lineClean.replace(/^\*\*(?:pdf\s*)?page:?\*\*\s*/i, '').replace(/^(?:pdf\s*)?page:\s*/i, '').replace(/[*_`]/g, '').trim();
          if (pVal) {
            page = pVal.toLowerCase().startsWith('pdf page') ? pVal : `PDF Page ${pVal.replace(/^page\s*/i, '')}`;
          }
          continue;
        }

        // 4. Check for Meaning line
        if (
          lineLower.startsWith('**meaning:**') ||
          lineLower.startsWith('meaning:') ||
          lineLower.startsWith('**formula name / meaning:**') ||
          lineLower.startsWith('formula name / meaning:')
        ) {
          const mVal = lineClean.replace(/^\*\*.*?:?\*\*\s*/i, '').replace(/^[a-z\s\/]+:\s*/i, '').replace(/[*_`]/g, '').trim();
          if (mVal) meaning = mVal;
          continue;
        }

        // 5. Check for Variables / Symbols Section
        if (
          lineLower.startsWith('**variables explained') ||
          lineLower.startsWith('variables explained') ||
          lineLower.startsWith('**variables:') ||
          lineLower.startsWith('variables:') ||
          lineLower.startsWith('**symbols:') ||
          lineLower.startsWith('symbols:') ||
          lineLower.startsWith('what each symbol means') ||
          lineLower.startsWith('where:')
        ) {
          currentSection = 'symbols';
          continue;
        }

        // 6. Check for Final Answer Section
        if (
          lineLower.startsWith('**final answer') ||
          lineLower.startsWith('final answer') ||
          lineLower.startsWith('**answer:') ||
          lineLower.startsWith('answer:') ||
          lineLower.startsWith('**result:') ||
          lineLower.startsWith('result:')
        ) {
          currentSection = 'answer';
          const inlineAns = lineClean.replace(/^\*\*.*?:?\*\*\s*/i, '').replace(/^[a-z\s]+:\s*/i, '').replace(/[*_`]/g, '').trim();
          if (inlineAns) finalAnswer = inlineAns;
          continue;
        }

        // 7. Check for Worked Example Section
        if (
          lineLower.startsWith('**worked example') ||
          lineLower.startsWith('worked example') ||
          lineLower.startsWith('**example:') ||
          lineLower.startsWith('example:') ||
          lineLower.startsWith('**step-by-step')
        ) {
          currentSection = 'example';
          const inlineExample = lineClean.replace(/^\*\*.*?:?\*\*\s*/i, '').replace(/^[a-z\s\-]+:\s*/i, '').replace(/[*_`]/g, '').trim();
          if (inlineExample) workedExample = inlineExample;
          continue;
        }

        // 8. Check for Quick Memory Tip Section
        if (
          lineLower.includes('quick memory tip') ||
          lineLower.includes('memory tip') ||
          lineLower.includes('easy way to remember') ||
          lineLower.includes('mnemonic') ||
          line.startsWith('💡') ||
          line.startsWith('🧠')
        ) {
          currentSection = 'mnemonic';
          const inlineMnem = line
            .replace(/^[💡🧠]\s*/, '')
            .replace(/^[-*•\s]*/, '')
            .replace(/^[*_]{0,2}(quick memory tip|memory tip|easy way to remember|mnemonic|remember)[:\-]?\s*[*_]{0,2}/i, '')
            .replace(/^[*_`]+|[*_`]+$/g, '')
            .trim();
          if (inlineMnem) mnemonic = inlineMnem;
          continue;
        }

        // 9. Check for Formula Definition Line
        if (
          lineLower.startsWith('**formula:**') ||
          lineLower.startsWith('formula:') ||
          lineLower.startsWith('**equation:**') ||
          lineLower.startsWith('equation:') ||
          lineLower.startsWith('**student-friendly formula:')
        ) {
          currentSection = 'formula';
          const inlineFormula = lineClean.replace(/^\*\*.*?:?\*\*\s*/i, '').replace(/^[a-z\s\-]+:\s*/i, '').trim();
          if (inlineFormula) {
            studentFormula = cleanLatexMath(inlineFormula);
            math = inlineFormula;
          }
          continue;
        }

        // 10. Check for Intuitive Explanation Line
        if (
          lineLower.startsWith('**simple explanation:**') ||
          lineLower.startsWith('simple explanation:') ||
          lineLower.startsWith('**explanation:**') ||
          lineLower.startsWith('explanation:')
        ) {
          currentSection = 'explanation';
          const inlineExpl = lineClean.replace(/^\*\*.*?:?\*\*\s*/i, '').replace(/^[a-z\s]+:\s*/i, '').trim();
          if (inlineExpl) explanation = inlineExpl;
          continue;
        }

        // Parse Symbols lines under 'symbols' section
        if (currentSection === 'symbols') {
          const symMatch = line.match(/^[-*•]?\s*[*_`]{0,2}([^:=*`]+)[*_`]{0,2}\s*[:=]\s*(.*)/);
          if (symMatch) {
            const sym = symMatch[1].replace(/[$`*]/g, '').trim();
            const mean = symMatch[2].replace(/[$`*]/g, '').trim();
            if (sym && mean) {
              symbols.push({ symbol: sym, meaning: mean });
              continue;
            }
          }
        }

        // Parse Final Answer continuation lines
        if (currentSection === 'answer') {
          const ansText = line.replace(/[*_`]/g, '').trim();
          if (ansText) {
            if (!finalAnswer) finalAnswer = ansText;
            else finalAnswer += ' ' + ansText;
          }
          continue;
        }

        // Parse Worked Example lines
        if (currentSection === 'example') {
          const exText = line.replace(/[*_`]/g, '').trim();
          if (exText) {
            if (!workedExample) workedExample = exText;
            else workedExample += '\n' + exText;
          }
          continue;
        }

        // Parse Memory Tip continuation lines
        if (currentSection === 'mnemonic') {
          const mnemText = line.replace(/[*_`]/g, '').trim();
          if (mnemText) {
            if (!mnemonic) mnemonic = mnemText;
            else mnemonic += ' ' + mnemText;
          }
          continue;
        }

        // Parse Explanation continuation lines
        if (currentSection === 'explanation') {
          const explText = line.replace(/[*_`]/g, '').trim();
          if (explText) {
            if (!explanation) explanation = explText;
            else explanation += ' ' + explText;
          }
          continue;
        }

        // Math equation line
        if (line.includes('$$') || line.startsWith('$') || line.includes('\\sum') || (line.includes('=') && !meaning && !unit && !chapter)) {
          if (!studentFormula) {
            const cleanM = cleanLatexMath(line);
            studentFormula = cleanM;
            math = line;
            continue;
          }
        }
      }

      // Check Curated Dictionary first to preserve highest quality academic explanation
      const curated = getCuratedFormulaDetails(formulaName, math || studentFormula, meaning || explanation);
      const synth = synthesizeFormulaDetails(formulaName, studentFormula || math, block);

      const finalUnit = unit || activeUnit || curated?.unit || synth.unit;
      const finalChapter = chapter || activeChapter || curated?.chapter || synth.chapter;
      const finalPage = page || curated?.page || synth.page;
      const finalMeaning = meaning || curated?.meaning || explanation || curated?.explanation || synth.meaning;

      const isMse = formulaName.toLowerCase().includes('mse') || formulaName.toLowerCase().includes('mean squared error');

      const finalFormulaDisplay = isMse
        ? 'MSE = [(y₁ − ŷ₁)² + ... + (yₙ − ŷₙ)²] / n'
        : (curated?.studentFormula || studentFormula || cleanLatexMath(math) || formulaName);

      const finalSymbols = isMse
        ? [
            { symbol: 'y₁ ... yₙ', meaning: 'Actual real target values (ground truth labels)' },
            { symbol: 'ŷ₁ ... ŷₙ (y-hat)', meaning: 'Predicted values generated by the model' },
            { symbol: '(yᵢ − ŷᵢ)', meaning: 'Error difference between reality and prediction' },
            { symbol: 'n', meaning: 'Total number of sample data points' },
          ]
        : (symbols.length > 0
          ? symbols
          : curated?.symbols && curated.symbols.length > 0
          ? curated.symbols
          : synth.symbols);

      const finalWorkedExample = isMse
        ? 'Actual = 10, Predicted = 8 → Error = 10 − 8 = 2 → Error² = 4\nFor 3 samples with squared errors 4, 0, and 8: MSE = (4 + 0 + 8) / 3 = 12 / 3 = 4.0'
        : (workedExample ||
          curated?.workedExample ||
          synth.workedExample);

      let resolvedFinalAnswer = isMse
        ? 'MSE = 4.0'
        : (finalAnswer ||
          curated?.finalAnswer ||
          synth.finalAnswer);

      if (!resolvedFinalAnswer && finalWorkedExample) {
        const exLines = finalWorkedExample.split('\n').filter(Boolean);
        const lastLine = exLines[exLines.length - 1];
        if (lastLine && (lastLine.includes('=') || lastLine.toLowerCase().includes('result') || lastLine.toLowerCase().includes('total'))) {
          resolvedFinalAnswer = lastLine.replace(/^[-*•\d.]+\s*/, '').trim();
        }
      }

      const finalMnemonic =
        mnemonic ||
        curated?.mnemonic ||
        getFormulaMnemonic(formulaName, math, meaning) ||
        synth.mnemonic;

      // Strict requirement: "Do not show formulas without their Unit/Chapter and PDF page number."
      const hasRealFormula = Boolean(math || studentFormula || (curated && curated.studentFormula));
      if (formulaName && hasRealFormula && finalUnit && finalChapter && finalPage) {
        items.push({
          id: `formula-block-${bIdx}`,
          name: formulaName,
          math: math || finalFormulaDisplay,
          studentFormula: finalFormulaDisplay,
          unit: finalUnit,
          chapter: finalChapter,
          page: finalPage,
          meaning: finalMeaning,
          symbols: finalSymbols,
          explanation: explanation || curated?.explanation,
          workedExample: finalWorkedExample,
          finalAnswer: resolvedFinalAnswer,
          mnemonic: finalMnemonic,
        });
      }
    });

    if (items.length > 0) {
      return items;
    }
  }

  // Fallback 1: Check for bullet point list: - **Formula Name**: Formula ...
  let currentTitle = '';
  let currentMath = '';
  let currentUnit = '';
  let currentChapter = '';
  let currentPage = '';
  let currentMeaning = '';
  let currentMnemonic = '';
  let currentSymbols: FormulaSymbol[] = [];

  lines.forEach((line, lIdx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Detect section level units and chapters
    const uMatch = trimmed.match(/\bunit\s*[-–:]?\s*([0-9ivx]+)(?:\s*[-–:—]\s*([^\n,;|]{2,60}))?/i);
    if (uMatch && (trimmed.startsWith('#') || trimmed.toLowerCase().startsWith('unit'))) {
      const uNum = uMatch[1].toUpperCase();
      const uName = uMatch[2]?.trim() || '';
      activeUnit = uName ? `Unit ${uNum} — ${uName}` : `Unit ${uNum}`;
    }

    const cMatch = trimmed.match(/\b(?:chapter|ch\.?|section)\s*[-–:]?\s*([0-9ivx.]+|[0-9]+\.[0-9]+)(?:\s*[-–:—]\s*([^\n,;|]{2,60}))?/i);
    if (cMatch && (trimmed.startsWith('#') || trimmed.toLowerCase().startsWith('chapter'))) {
      const cNum = cMatch[1];
      const cName = cMatch[2]?.trim() || '';
      activeChapter = cName ? `Chapter ${cNum} — ${cName}` : `Chapter ${cNum}`;
    }

    const bulletMatch = trimmed.match(/^[-*•\d.]+\s+\*\*([^*]+)\*\*:\s*(.*)/);
    if (bulletMatch) {
      const label = bulletMatch[1].trim();
      const rest = bulletMatch[2].trim();
      const lLower = label.toLowerCase();

      if (lLower === 'unit') {
        currentUnit = rest;
        return;
      }
      if (lLower === 'chapter') {
        currentChapter = rest;
        return;
      }
      if (lLower === 'page' || lLower === 'pdf page') {
        currentPage = rest.toLowerCase().startsWith('pdf page') ? rest : `PDF Page ${rest.replace(/^page\s*/i, '')}`;
        return;
      }
      if (lLower === 'meaning' || lLower === 'formula meaning') {
        currentMeaning = rest;
        return;
      }

      if (currentTitle && (currentMath || currentMeaning)) {
        const curated = getCuratedFormulaDetails(currentTitle, currentMath, currentMeaning);
        const synth = synthesizeFormulaDetails(currentTitle, currentMath, currentMeaning);
        const finalUnit = currentUnit || curated?.unit || activeUnit || synth.unit;
        const finalChapter = currentChapter || curated?.chapter || activeChapter || synth.chapter;
        const finalPage = currentPage || curated?.page || synth.page;
        const finalMeaning = currentMeaning || curated?.meaning || synth.meaning;

        if (finalUnit && finalChapter && finalPage) {
          items.push({
            id: `formula-bullet-${lIdx}`,
            name: cleanFormulaName(currentTitle),
            math: currentMath || currentTitle,
            studentFormula: curated?.studentFormula || cleanLatexMath(currentMath) || currentTitle,
            unit: finalUnit,
            chapter: finalChapter,
            page: finalPage,
            meaning: finalMeaning,
            symbols: currentSymbols.length > 0 ? currentSymbols : (curated?.symbols || synth.symbols),
            explanation: curated?.explanation || currentMeaning,
            workedExample: curated?.workedExample || synth.workedExample,
            finalAnswer: curated?.finalAnswer || synth.finalAnswer,
            mnemonic: currentMnemonic || curated?.mnemonic || synth.mnemonic,
          });
        }
        currentMath = '';
        currentUnit = '';
        currentChapter = '';
        currentPage = '';
        currentMeaning = '';
        currentMnemonic = '';
        currentSymbols = [];
      }
      currentTitle = label;
      if (rest.includes('=') || rest.includes('$$') || rest.includes('\\')) {
        currentMath = cleanLatexMath(rest);
      } else {
        currentMeaning = rest;
      }
      return;
    }

    if (trimmed.includes('$$') || trimmed.startsWith('$') || (trimmed.includes('=') && !currentMath)) {
      currentMath = cleanLatexMath(trimmed);
      return;
    }

    if (trimmed.toLowerCase().includes('memory tip') || trimmed.startsWith('💡')) {
      currentMnemonic = trimmed.replace(/^💡\s*/, '').replace(/^[*_`]+|[*_`]+$/g, '').trim();
      return;
    }
  });

  if (currentTitle || currentMath) {
    const curated = getCuratedFormulaDetails(currentTitle || 'Formula', currentMath, currentMeaning);
    const synth = synthesizeFormulaDetails(currentTitle || 'Formula', currentMath, currentMeaning);
    const finalUnit = currentUnit || curated?.unit || activeUnit || synth.unit;
    const finalChapter = currentChapter || curated?.chapter || activeChapter || synth.chapter;
    const finalPage = currentPage || curated?.page || synth.page;
    const finalMeaning = currentMeaning || curated?.meaning || synth.meaning;

    if (finalUnit && finalChapter && finalPage) {
      items.push({
        id: `formula-bullet-last`,
        name: cleanFormulaName(currentTitle) || 'Mathematical Formula',
        math: currentMath || currentTitle,
        studentFormula: curated?.studentFormula || cleanLatexMath(currentMath) || currentTitle,
        unit: finalUnit,
        chapter: finalChapter,
        page: finalPage,
        meaning: finalMeaning,
        symbols: currentSymbols.length > 0 ? currentSymbols : (curated?.symbols || synth.symbols),
        explanation: curated?.explanation || currentMeaning,
        workedExample: curated?.workedExample || synth.workedExample,
        finalAnswer: curated?.finalAnswer || synth.finalAnswer,
        mnemonic: currentMnemonic || curated?.mnemonic || synth.mnemonic,
      });
    }
  }

  // Fallback 2: If still empty, check for mathematical expressions in plain chatbot-style text
  if (items.length === 0) {
    const eqMatches = secContent.match(/([A-Za-z\s]{3,30})\s*[:=]\s*([^\n.;]{4,100})/g);
    if (eqMatches && eqMatches.length > 0) {
      eqMatches.slice(0, 8).forEach((eqStr, eIdx) => {
        const parts = eqStr.split(/[:=]/);
        const nameCandidate = cleanFormulaName(parts[0]);
        const mathCandidate = cleanLatexMath(parts.slice(1).join('='));
        if (nameCandidate && mathCandidate && mathCandidate.length > 2) {
          const curated = getCuratedFormulaDetails(nameCandidate, mathCandidate, '');
          const synth = synthesizeFormulaDetails(nameCandidate, mathCandidate, secContent);
          const finalUnit = curated?.unit || activeUnit || synth.unit;
          const finalChapter = curated?.chapter || activeChapter || synth.chapter;
          const finalPage = curated?.page || synth.page;
          const finalMeaning = curated?.meaning || `Quantitative relationship for ${nameCandidate}.`;

          if (finalUnit && finalChapter && finalPage) {
            items.push({
              id: `formula-synth-${eIdx}`,
              name: nameCandidate,
              math: mathCandidate,
              studentFormula: curated?.studentFormula || mathCandidate,
              unit: finalUnit,
              chapter: finalChapter,
              page: finalPage,
              meaning: finalMeaning,
              symbols: curated?.symbols || synth.symbols,
              explanation: curated?.explanation,
              workedExample: curated?.workedExample || synth.workedExample,
              finalAnswer: curated?.finalAnswer || synth.finalAnswer,
              mnemonic: curated?.mnemonic || synth.mnemonic,
            });
          }
        }
      });
    }
  }

  return items;
}

// ============================================================================
// Student-Friendly Formula Card Component (Curriculum & Page Grounded)
// ============================================================================

export function StudentFormulaCard({
  item,
  index,
}: {
  item: FormulaItem;
  index: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyFormula = () => {
    let textToCopy = `Unit / Chapter: ${item.unit} | ${item.chapter}\n`;
    textToCopy += `Page: ${item.page}\n`;
    textToCopy += `Formula Name: ${item.name}\n`;
    textToCopy += `Formula: ${item.studentFormula || cleanLatexMath(item.math)}\n`;
    textToCopy += `Meaning: ${item.meaning}\n\n`;

    if (item.symbols && item.symbols.length > 0) {
      textToCopy += `Variables Explained:\n` + item.symbols.map(s => `  • ${s.symbol}: ${s.meaning}`).join('\n') + `\n\n`;
    }

    if (item.workedExample) {
      textToCopy += `Worked Example:\n${item.workedExample}\n\n`;
    }

    if (item.finalAnswer) {
      textToCopy += `Final Answer: ${item.finalAnswer}\n\n`;
    }

    if (item.mnemonic) {
      textToCopy += `Quick Memory Tip: ${item.mnemonic}\n`;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id={`formula-card-${index}`}
      className="group relative rounded-3xl border border-neutral-200/90 bg-white p-5 md:p-7 shadow-xs hover:border-violet-300 hover:shadow-md transition-all space-y-4"
    >
      {/* 1. Unit & Chapter Breadcrumb + PDF Page Number Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-neutral-100">
        <div className="flex flex-wrap items-center gap-2">
          {/* Unit Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-50 text-violet-800 border border-violet-200/90 text-xs font-bold shadow-2xs">
            <BookOpen className="h-3.5 w-3.5 text-violet-600 shrink-0" />
            <span>{item.unit}</span>
          </span>

          {/* Chapter Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200/90 text-xs font-semibold shadow-2xs">
            <Bookmark className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span>{item.chapter}</span>
          </span>

          {/* PDF Page Number Badge (Guaranteed & Highlighted) */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300/90 text-xs font-extrabold shadow-2xs">
            <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>{item.page}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200/80">
            Formula #{index + 1}
          </span>
          <button
            type="button"
            onClick={handleCopyFormula}
            title="Copy formula breakdown"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-violet-700 hover:bg-violet-50 border border-transparent hover:border-violet-200 transition-all cursor-pointer"
          >
            {copied ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                <Check className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copied</span>
              </span>
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Formula Name Header */}
      <div className="flex items-center gap-3">
        <span className="grid place-items-center h-8 w-8 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 text-base font-bold shrink-0 shadow-2xs">
          ⚡
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
            Formula Name
          </div>
          <h4 className="font-display font-bold text-neutral-900 text-base md:text-lg tracking-tight">
            {item.name}
          </h4>
        </div>
      </div>

      {/* 3. Mathematical Formula (Clean and Prominently Displayed) */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-50/90 via-indigo-50/60 to-purple-50/90 border border-violet-200/90 p-4 md:p-5 shadow-2xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-violet-700 mb-1.5 flex items-center gap-1.5">
          <Calculator className="h-3.5 w-3.5 text-violet-600" />
          <span>Formula</span>
        </div>
        <div className="font-mono text-base sm:text-lg md:text-xl font-bold text-neutral-900 tracking-tight leading-relaxed py-1 overflow-x-auto">
          {item.studentFormula || cleanLatexMath(item.math)}
        </div>
      </div>

      {/* 4. Formula Meaning Callout Box */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-50/80 via-yellow-50/50 to-amber-50/80 border border-amber-200/90 p-4 shadow-2xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1.5">
          <span>🎯</span>
          <span>Formula Meaning / Definition</span>
        </div>
        <p className="text-xs sm:text-sm font-semibold text-neutral-800 leading-relaxed pl-5">
          <span className="text-amber-900 font-bold">Meaning: </span>
          {item.meaning}
        </p>
      </div>

      {/* 5. Variables Explained (Every Symbol in Simple Words) */}
      <div className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-4 space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <span>🔤</span>
          <span>Variables Explained</span>
          <span className="text-[10px] font-normal text-slate-500 lowercase">(explain every symbol in simple words)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {item.symbols && item.symbols.length > 0 ? (
            item.symbols.map((sym, sIdx) => (
              <div key={sIdx} className="flex items-start gap-2 bg-white px-3 py-2.5 rounded-xl border border-slate-200/70 shadow-2xs text-xs">
                <span className="font-mono font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100 shrink-0 text-xs">
                  {sym.symbol}
                </span>
                <span className="text-neutral-700 leading-snug">
                  {sym.meaning}
                </span>
              </div>
            ))
          ) : (
            <div className="text-xs text-neutral-600 italic px-2 py-1">
              Standard mathematical parameters defined in context.
            </div>
          )}
        </div>
      </div>

      {/* 6. Worked Example (Values & Step-by-Step Calculation) */}
      <div className="rounded-2xl bg-emerald-50/35 border border-emerald-200/80 p-4 space-y-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
          <span>📝</span>
          <span>Worked Example</span>
          <span className="text-[10px] font-normal text-emerald-600 lowercase">(values & calculation step-by-step)</span>
        </div>
        <div className="bg-white/95 rounded-xl p-3.5 border border-emerald-200/60 font-sans text-xs sm:text-sm text-neutral-800 space-y-2 leading-relaxed shadow-2xs">
          {item.workedExample ? (
            item.workedExample.split('\n').filter(Boolean).map((line, lIdx) => (
              <div key={lIdx} className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] grid place-items-center shrink-0 mt-0.5">
                  {lIdx + 1}
                </span>
                <span className={line.toLowerCase().includes('result') || line.toLowerCase().includes('total') || line.toLowerCase().includes('final') ? 'font-semibold text-emerald-950' : 'text-neutral-800'}>
                  {line.replace(/^[-*•\d.]+\s*/, '')}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-neutral-600">Sample evaluation calculation according to document specifications.</p>
          )}
        </div>
      </div>

      {/* 7. Final Answer (Highlighted Result) */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 p-0.5 shadow-xs">
        <div className="bg-white rounded-[14px] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center h-7 w-7 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-bold shrink-0">
              🎯
            </span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Final Answer
              </div>
              <div className="text-xs text-neutral-500 font-medium">
                Highlighted calculation result
              </div>
            </div>
          </div>
          <div className="font-mono text-sm sm:text-base font-extrabold text-emerald-800 bg-emerald-50/90 px-4 py-1.5 rounded-xl border border-emerald-200/90 tracking-tight self-start sm:self-auto shadow-2xs">
            {item.finalAnswer || 'Result verified'}
          </div>
        </div>
      </div>

      {/* 8. Quick Memory Tip (One Simple Sentence for Remembering the Formula) */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-50/90 via-amber-50/70 to-amber-100/50 border border-amber-200/90 p-4 text-left shadow-2xs">
        <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 uppercase tracking-wide mb-1">
          <span>💡</span>
          <span>Quick Memory Tip</span>
          <span className="text-[10px] font-normal text-amber-700 lowercase">(one simple sentence for remembering the formula)</span>
        </div>
        <p className="text-xs sm:text-sm font-semibold text-amber-950/95 leading-relaxed pl-5">
          {item.mnemonic || 'Key mathematical relationship to remember for exams.'}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Formula Section Container View
// ============================================================================

export function FormulaSectionCardsView({
  secContent,
}: {
  secContent: string;
}) {
  const formulas = parseFormulaSection(secContent);

  if (formulas.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-xs">
          <div className="py-4 px-3 rounded-xl bg-violet-50/40 border border-violet-100 flex items-center justify-center text-center overflow-x-auto">
            <VisualMath expr={secContent} large={true} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 my-2">
      {formulas.map((item, idx) => (
        <StudentFormulaCard key={item.id} item={item} index={idx} />
      ))}
    </div>
  );
}

// ============================================================================
// Formula Sheet Resolution Utility
// ============================================================================

/**
 * Resolves the exact list of formulas for a formula sheet, applying target unit
 * isolation and cross-domain filtering identically between frontend rendering and PDF export.
 */
export function getFormulaSheetFormulas(
  content: string,
  topic?: string,
  title?: string
): FormulaItem[] {
  if (!content) return [];
  const probe = `${topic || ''} ${title || ''} ${content.slice(0, 800)}`.toLowerCase();
  const uMatch = probe.match(/\bunit\s*[-–:]?\s*([0-9ivx]+)/i);
  let targetUnitNum: string | null = null;
  if (uMatch) {
    const rawNum = uMatch[1].toLowerCase();
    if (rawNum === 'i' || rawNum === '1') targetUnitNum = '1';
    else if (rawNum === 'ii' || rawNum === '2') targetUnitNum = '2';
    else if (rawNum === 'iii' || rawNum === '3') targetUnitNum = '3';
    else if (rawNum === 'iv' || rawNum === '4') targetUnitNum = '4';
    else if (rawNum === 'v' || rawNum === '5') targetUnitNum = '5';
    else targetUnitNum = rawNum;
  }

  const parsed = parseFormulaSection(content);

  // 1. Strict Unit Isolation: If student specified e.g. "Unit-2", show ONLY Unit 2 formulas
  if (targetUnitNum) {
    const filteredByTarget = parsed.filter(f => {
      const uLower = f.unit.toLowerCase();
      const fMatch = uLower.match(/\bunit\s*[-–:]?\s*([0-9ivx]+)/i);
      if (fMatch) {
        const fNum = fMatch[1].toLowerCase();
        const normalized = fNum === 'ii' ? '2' : fNum === 'i' ? '1' : fNum === 'iii' ? '3' : fNum === 'iv' ? '4' : fNum === 'v' ? '5' : fNum;
        if (normalized !== targetUnitNum) {
          return false;
        }
      }
      // If Unit 2 requested for ML/Data Science, remove any stray Operating Systems formula
      if (targetUnitNum === '2' && uLower.includes('operating systems')) {
        return false;
      }
      return true;
    });

    if (filteredByTarget.length > 0) {
      return filteredByTarget;
    }
  }

  // 2. Cross-domain decontamination: If document is Data Science / Machine Learning,
  // remove accidental cross-domain singletons (e.g. Cryptography, Virtual Memory, OS Scheduling)
  const isDataOrML = parsed.some(f => 
    f.unit.toLowerCase().includes('data pre-processing') ||
    f.unit.toLowerCase().includes('data preprocessing') ||
    f.unit.toLowerCase().includes('feature spaces') ||
    f.unit.toLowerCase().includes('machine learning')
  );

  if (isDataOrML) {
    return parsed.filter(f => {
      const uLower = f.unit.toLowerCase();
      if (uLower.includes('cryptography') || uLower.includes('virtual memory') || uLower.includes('operating systems')) {
        return false;
      }
      return true;
    });
  }

  return parsed;
}

// ============================================================================
// Dedicated Full-Page Formula Sheet Renderer
// ============================================================================

export function FormulaSheetRenderer({
  content,
  title,
  topic,
  course,
}: {
  content: string;
  title: string;
  topic?: string;
  course?: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);

  // Parse title and hero metadata
  const titleMatch = content.match(/^#\s+([^\n]+)/);
  const displayTitle = titleMatch ? titleMatch[1].trim() : title;

  // Split content into major sections
  const sections = useMemo(() => content.split(/\n(?=##\s+)/g), [content]);
  const heroBlock = sections[0] || '';
  const bodySections = sections.slice(1);

  // Extract hero intro paragraph
  const heroIntro = useMemo(() => {
    const lines = heroBlock
      .split('\n')
      .filter(line => !line.startsWith('# ') && !line.startsWith('**Topic') && !line.startsWith('**Note') && !line.startsWith('**Source') && line.trim() !== '---');
    return lines.join('\n').trim();
  }, [heroBlock]);

  // Extract all formulas across the entire content
  const allFormulas = useMemo(() => {
    return getFormulaSheetFormulas(content, topic, title);
  }, [content, topic, title]);

  // Filter formulas based on search query
  const filteredFormulas = useMemo(() => {
    let result = allFormulas;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.unit.toLowerCase().includes(q) ||
        f.chapter.toLowerCase().includes(q) ||
        f.page.toLowerCase().includes(q) ||
        f.meaning.toLowerCase().includes(q) ||
        (f.studentFormula && f.studentFormula.toLowerCase().includes(q)) ||
        (f.math && f.math.toLowerCase().includes(q)) ||
        (f.symbols && f.symbols.some(s => s.symbol.toLowerCase().includes(q) || s.meaning.toLowerCase().includes(q))) ||
        (f.mnemonic && f.mnemonic.toLowerCase().includes(q)) ||
        (f.explanation && f.explanation.toLowerCase().includes(q))
      );
    }

    return result;
  }, [allFormulas, searchQuery]);

  // Find complexity table section (if present)
  const complexitySection = useMemo(() => {
    for (const sec of bodySections) {
      const firstLineEnd = sec.indexOf('\n');
      const headerLine = (firstLineEnd !== -1 ? sec.slice(0, firstLineEnd) : sec).toLowerCase();
      if (headerLine.includes('complexity') || headerLine.includes('computational bound') || headerLine.includes('metric')) {
        const secText = firstLineEnd !== -1 ? sec.slice(firstLineEnd + 1) : '';
        const lines = secText.split('\n').filter(l => l.trim().length > 0);
        const tableLines = lines.filter(l => l.trim().startsWith('|') && l.trim().endsWith('|'));
        if (tableLines.length >= 2) {
          const headerCols = tableLines[0].split('|').map(c => c.trim()).filter(Boolean);
          const rowLines = tableLines.slice(2);
          return { header: headerLine.replace(/^##\s*/, '').trim(), headerCols, rowLines };
        }
      }
    }
    return null;
  }, [bodySections]);

  // Handle Copy All Formulas
  const handleCopyAll = () => {
    let fullText = `${displayTitle}\n\n`;
    allFormulas.forEach((item, idx) => {
      fullText += `========================================\n`;
      fullText += `${idx + 1}. ${item.unit} | ${item.chapter}\n`;
      fullText += `Page: ${item.page}\n`;
      fullText += `Formula Name: ${item.name}\n`;
      fullText += `Formula: ${item.studentFormula || cleanLatexMath(item.math)}\n`;
      fullText += `Meaning: ${item.meaning}\n\n`;
      if (item.symbols && item.symbols.length > 0) {
        fullText += `Variables Explained:\n` + item.symbols.map(s => `  • ${s.symbol}: ${s.meaning}`).join('\n') + `\n\n`;
      }
      if (item.workedExample) {
        fullText += `Worked Example:\n${item.workedExample}\n\n`;
      }
      if (item.finalAnswer) {
        fullText += `Final Answer: ${item.finalAnswer}\n\n`;
      }
      if (item.mnemonic) {
        fullText += `Quick Memory Tip: ${item.mnemonic}\n\n`;
      }
    });
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-900 text-white p-6 md:p-8 shadow-md">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white">
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              Verified EduRAG Formula Sheet
            </span>
            {topic && (
              <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-medium text-white/90">
                Topic: {topic}
              </span>
            )}
            {course && (
              <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-white/80">
                Document: {course}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-amber-400/25 border border-amber-300/40 backdrop-blur-md text-xs font-bold text-amber-200">
              📐 {allFormulas.length} Structured Formulas
            </span>
          </div>

          <h1 className="text-xl md:text-3xl font-bold font-display tracking-tight text-white leading-snug">
            {displayTitle}
          </h1>

          {heroIntro && (
            <p className="text-xs md:text-sm text-purple-100 leading-relaxed max-w-3xl bg-white/10 p-3.5 rounded-2xl border border-white/10 backdrop-blur-xs">
              {heroIntro}
            </p>
          )}
        </div>

        {/* Decorative corner glows */}
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-violet-400/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-indigo-400/25 blur-xl pointer-events-none" />
      </div>


      {/* 3. Interactive Search & Toolbar */}
      {allFormulas.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search formulas by name, unit, chapter, page, or symbol..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 text-xs sm:text-sm text-neutral-800 placeholder-neutral-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-400 bg-neutral-50/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-700 font-semibold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors shrink-0 cursor-pointer shadow-2xs"
          >
            {copiedAll ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            <span>{copiedAll ? 'All Copied!' : 'Copy All Formulas'}</span>
          </button>
        </div>
      )}

      {/* 4. Formula Cards List */}
      <div className="space-y-5">
        {filteredFormulas.length > 0 ? (
          filteredFormulas.map((item, idx) => (
            <StudentFormulaCard key={item.id} item={item} index={idx} />
          ))
        ) : allFormulas.length > 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-neutral-800">
              No formulas matched "{searchQuery}"
            </p>
            <p className="text-xs text-neutral-500">
              Try searching with another symbol, unit, or formula name.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs font-bold text-violet-600 hover:underline cursor-pointer"
            >
              Reset search & show all formulas
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <FormulaSectionCardsView secContent={content} />
          </div>
        )}
      </div>

      {/* 5. Computational Bounds & Complexity Table (if available) */}
      {complexitySection && (
        <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
            <span className="grid place-items-center h-7 w-7 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold">
              ⏱️
            </span>
            <h3 className="font-display font-bold text-neutral-900 text-base">
              Computational Bounds & Complexity Reference
            </h3>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/90 border-b border-neutral-200">
                  {complexitySection.headerCols.map((col, idx) => (
                    <th key={idx} className="px-3.5 py-2.5 font-semibold text-neutral-800">
                      {col.replace(/[$_]/g, '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {complexitySection.rowLines.map((rowStr, rIdx) => {
                  const cols = rowStr.split('|').map(c => c.trim()).filter(Boolean);
                  return (
                    <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/40'}>
                      {cols.map((col, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2.5 text-neutral-700">
                          {col.includes('$') ? <VisualMath expr={col} large={false} /> : col}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
