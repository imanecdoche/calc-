/**
 * Math Engine for Calc+
 * Evaluates mathematical expressions securely with support for scientific functions
 */

export function evaluateExpression(expr: string, isDegree: boolean): string {
  try {
    if (!expr || expr.trim() === '') return '';

    // 1. Balance parentheses
    const balanced = balanceParentheses(expr);
    
    // 2. Insert implicit multiplication
    const preprocessed = insertImplicitMultiplication(balanced);
    
    // 3. Convert symbols to javascript-interpretable equivalents
    let evalStr = preprocessed
      .replace(/sin\(/g, 'sinVal(')
      .replace(/cos\(/g, 'cosVal(')
      .replace(/tan\(/g, 'tanVal(')
      .replace(/log\(/g, 'logVal(')
      .replace(/ln\(/g, 'lnVal(')
      .replace(/√\(/g, 'sqrtVal(')
      .replace(/π/g, 'Math.PI')
      .replace(/e/g, 'Math.E')
      .replace(/\^/g, '**')
      .replace(/÷/g, '/')
      .replace(/×/g, '*')
      .replace(/%/g, '*0.01');

    // Create safe mathematical context values
    const context: Record<string, any> = {
      sinVal: (x: number) => {
        const rad = isDegree ? (x * Math.PI) / 180 : x;
        const val = Math.sin(rad);
        return Math.abs(val) < 1e-14 ? 0 : val;
      },
      cosVal: (x: number) => {
        const rad = isDegree ? (x * Math.PI) / 180 : x;
        const val = Math.cos(rad);
        return Math.abs(val) < 1e-14 ? 0 : val;
      },
      tanVal: (x: number) => {
        const rad = isDegree ? (x * Math.PI) / 180 : x;
        if (isDegree && Math.abs((x - 90) % 180) === 0) {
          throw new Error('Undefined');
        }
        const val = Math.tan(rad);
        return Math.abs(val) < 1e-14 ? 0 : val;
      },
      logVal: (x: number) => {
        if (x <= 0) throw new Error('Invalid input');
        return Math.log10(x);
      },
      lnVal: (x: number) => {
        if (x <= 0) throw new Error('Invalid input');
        return Math.log(x);
      },
      sqrtVal: (x: number) => {
        if (x < 0) throw new Error('Invalid input');
        return Math.sqrt(x);
      },
      Math: Math
    };

    // Sanitize string to prevent execution of arbitrary Javascript code.
    // We remove all allowed function names and constants, then make sure no letters remain.
    const sanitized = evalStr.replace(/(sinVal|cosVal|tanVal|logVal|lnVal|sqrtVal|Math\.PI|Math\.E)/g, '');
    if (/[a-zA-Z_$]/.test(sanitized)) {
      throw new Error('Invalid syntax');
    }

    // Evaluate in context
    const paramNames = Object.keys(context);
    const paramValues = Object.values(context);
    const evaluator = new Function(...paramNames, `return (${evalStr});`);
    const val = evaluator(...paramValues);

    if (val === null || val === undefined || isNaN(val)) {
      return 'Error';
    }
    if (!isFinite(val)) {
      return 'Infinity';
    }

    // Format output cleanly: round to 10 decimal places, stripping unnecessary trailing zeros
    const rounded = Number(val.toFixed(10));
    return rounded.toString();
  } catch (error: any) {
    if (error?.message === 'Undefined' || error?.message === 'Invalid input') {
      return error.message;
    }
    return 'Error';
  }
}

function balanceParentheses(expr: string): string {
  let openCount = 0;
  for (let char of expr) {
    if (char === '(') openCount++;
    if (char === ')') openCount--;
  }
  let balanced = expr;
  while (openCount > 0) {
    balanced += ')';
    openCount--;
  }
  return balanced;
}

function insertImplicitMultiplication(expr: string): string {
  let result = expr;
  
  // 1. Number followed by parenthesis, constant, or function
  result = result.replace(/([0-9.])\s*(?=[(πesctl√])/g, '$1*');
  
  // 2. Parenthesis or constant followed by number, other constant, function, or parenthesis
  result = result.replace(/([)πe])\s*(?=[0-9.(πesctl√])/g, '$1*');
  
  return result;
}
